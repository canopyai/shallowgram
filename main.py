import asyncio
import websockets
from websockets import exceptions
import numpy as np
import torch
from glob import glob
from transcribe import transcribe
import json
import torch
from concurrent.futures import ThreadPoolExecutor
from longer_than_one_word import is_longer_than_one_word, is_valid_string
from audio_emotion.get_emotion_data import get_emotion_data

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')


vad_model, vad_utils = torch.hub.load(repo_or_dir='snakers4/silero-vad',
                                      model='silero_vad',
                                      force_reload=True)
(get_speech_timestamps, save_audio, read_audio,
 VADIterator, collect_chunks) = vad_utils

vad_model = vad_model.to(device)

print("Models loaded")


def int2float(sound):
    abs_max = np.abs(sound).max()
    sound = sound.astype('float32')
    if abs_max > 0:
        sound *= 1/32768
    sound = sound.squeeze()
    return sound


BUFFER_SIZE = 1000
audio_buffer = np.array([], dtype=np.float32)
accumulated_audio = np.array([], dtype=np.float32)
full_accumulated_audio = np.array([], dtype=np.float32)
last_confidence = 0
processed_time_ms = 0
confidence_threshold = 0.1
clients = set()



# create a random id for each frame
# call the transcribe function and the text attached to that id should be processed

server_uri = "ws://34.91.59.59:8080"
# server_uri = "ws://192.76.8.94:8080"

async def audio_processor(websocket, path):
    global audio_buffer, accumulated_audio, last_confidence, processed_time_ms, full_accumulated_audio, is_speaking, last_frame, is_new_packet
    is_speaking = False
    is_new_packet = False
    clients.add(websocket)
    try:
        async with websockets.connect(server_uri) as fsocket:
            async for packet in websocket:
                audio_int16 = np.frombuffer(packet, np.int16)
                audio_float32 = int2float(audio_int16)
                last_frame = audio_float32

                audio_buffer = np.concatenate((audio_buffer, audio_float32))
                is_new_packet = True
  

         

                while len(audio_buffer) >= BUFFER_SIZE:
                    tensor_audio = torch.from_numpy(
                        audio_buffer[:BUFFER_SIZE]).unsqueeze(0)
                    tensor_audio = tensor_audio.to(device)
                    # Use the VAD model for voice activity detection
                    confidence = vad_model(tensor_audio, 16000).item()
                    processed_time_ms += (BUFFER_SIZE / 16000) * 1000

                    if(confidence> confidence_threshold):
                        is_speaking = True
                    else:
                        is_speaking = False

                    if(is_speaking and is_new_packet):
                        is_new_packet = False
                        accumulated_audio = np.concatenate(
                            (accumulated_audio, audio_float32))  # Accumulate audio data
                        full_accumulated_audio = np.concatenate(
                            (full_accumulated_audio, audio_float32))

                    if last_confidence > confidence_threshold and confidence < confidence_threshold:
                        print("sending end vad")

                        await fsocket.send(json.dumps({
                            "messageType": "vad",
                            "data": {
                                "vad_type":"end", 
                            }
                        }))
                        if len(accumulated_audio) > 0:  # Ensure there's audio to save


                            with ThreadPoolExecutor(max_workers=2) as executor:
                                future_emotion = executor.submit(get_emotion_data, accumulated_audio)
                                future_transcribe = executor.submit(transcribe, accumulated_audio)

                                emotion_data = future_emotion.result()
                                transcription, inference_time = future_transcribe.result()

                                print("Emotion Data:", emotion_data)
                                print("Transcription:", transcription)
                                print("Inference Time:", inference_time)
                            
               
                            



                            if (is_longer_than_one_word(transcription) and is_valid_string(transcription) ):
                            
                                await fsocket.send(json.dumps({
                                    "messageType": "transcription",
                                    "data": {
                                        "transcription": transcription,
                                        "inference_time": inference_time, 
                                        "emotion_data": emotion_data
                                    }

                                }))  # Send transcription back to client
                            # await websocket.send(fulltranscription)

                            # Reset accumulation buffer
                            accumulated_audio = np.array([], dtype=np.float32)

                    elif last_confidence < confidence_threshold and confidence > confidence_threshold:
                        print("sending start vad")
                        await websocket.send(json.dumps({
                            "messageType": "vad",
                            "data": {
                                "vad_type":"start", 
                            }
                        }))

                    last_confidence = confidence
                    audio_buffer = audio_buffer[BUFFER_SIZE:]

    except exceptions.ConnectionClosed:
        print("Connection closed")


async def main():
    async with websockets.serve(audio_processor, "0.0.0.0", 8080):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
