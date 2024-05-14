import asyncio
import websockets
import numpy as np
import torch
import json
from concurrent.futures import ThreadPoolExecutor
from transcribe import transcribe
from longer_than_one_word import is_longer_than_one_word, is_valid_string
from audio_emotion.get_emotion_data import get_emotion_data
from is_longer_than_five_words import is_longer_than_five_words
from post_accumulated_audio import post_accumulated_audio

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

vad_model, vad_utils = torch.hub.load(repo_or_dir='snakers4/silero-vad', model='silero_vad', force_reload=True)
(get_speech_timestamps, save_audio, read_audio, VADIterator, collect_chunks) = vad_utils
vad_model = vad_model.to(device)

BUFFER_SIZE = 1000
audio_buffer = np.array([], dtype=np.float32)
accumulated_audio = np.array([], dtype=np.float32)
full_accumulated_audio = np.array([], dtype=np.float32)
last_confidence = 0
processed_time_ms = 0
confidence_threshold = 0.5
clients = set()

def int2float(sound):
    abs_max = np.abs(sound).max()
    sound = sound.astype('float32')
    if abs_max > 0:
        sound *= 1 / 32768
    sound = sound.squeeze()
    return sound

server_uri = "ws://34.91.59.59:8080"

async def audio_processor(websocket, path):
    global audio_buffer, accumulated_audio, last_confidence, processed_time_ms, full_accumulated_audio
    clients.add(websocket)
    try:
        async with websockets.connect(server_uri) as fsocket:
            async for packet in websocket:
                # Remove the WAV header if present
                if packet[:4].decode('utf-8') == "RIFF":
                    packet = packet[44:]
                audio_int16 = np.frombuffer(packet, np.int16)
                audio_float32 = audio_int16.astype(np.float32) / 32768.0  # Normalizing the float32 values

                audio_buffer = np.concatenate((audio_buffer, audio_float32))
                while len(audio_buffer) >= BUFFER_SIZE:
                    tensor_audio = torch.from_numpy(audio_buffer[:BUFFER_SIZE]).unsqueeze(0).to(device)
                    confidence = vad_model(tensor_audio, 16000).item()
                    processed_time_ms += (BUFFER_SIZE / 16000) * 1000

                    if confidence > confidence_threshold:
                        accumulated_audio = np.concatenate((accumulated_audio, audio_float32))
                        full_accumulated_audio = np.concatenate((full_accumulated_audio, audio_float32))
                        if last_confidence <= confidence_threshold:
                            await fsocket.send(json.dumps({"messageType": "vad", "data": {"vad_type": "start"}}))

                    elif last_confidence > confidence_threshold:
                        await fsocket.send(json.dumps({"messageType": "vad", "data": {"vad_type": "end"}}))
                        if len(accumulated_audio) > 0:
                            with ThreadPoolExecutor(max_workers=2) as executor:
                                future_emotion = executor.submit(get_emotion_data, accumulated_audio)
                                future_transcribe = executor.submit(transcribe, accumulated_audio)

                                emotion_data = future_emotion.result()
                                transcription, inference_time = future_transcribe.result()

                                if is_longer_than_one_word(transcription) and is_valid_string(transcription):
                                    await fsocket.send(json.dumps({
                                        "messageType": "transcription",
                                        "data": {
                                            "transcription": transcription,
                                            "inference_time": inference_time,
                                            "emotion_data": emotion_data
                                        }
                                    }))
                                    if is_longer_than_five_words(transcription):
                                        print("beginning to post audio", transcription)
                                        asyncio.create_task(post_accumulated_audio(accumulated_audio))
                                else:
                                    await fsocket.send(json.dumps({
                                        "messageType": "transcription",
                                        "data": {"transcription": "", "isEmpty": True}
                                    }))
                                accumulated_audio = np.array([], dtype=np.float32)
                        else:
                            await fsocket.send(json.dumps({
                                "messageType": "transcription",
                                "data": {"transcription": "", "isEmpty": True}
                            }))
                    last_confidence = confidence
                    audio_buffer = audio_buffer[BUFFER_SIZE:]
    except websockets.exceptions.ConnectionClosed:
        print("Connection closed")

async def main():
    async with websockets.serve(audio_processor, "0.0.0.0", 8080):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
