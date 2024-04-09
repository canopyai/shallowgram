import asyncio
import websockets
from websockets import exceptions
import numpy as np
import torch
from glob import glob
from transcribe import transcribe
import json
import torch

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')



vad_model, vad_utils = torch.hub.load(repo_or_dir='snakers4/silero-vad',
                                      model='silero_vad',
                                      force_reload=True)
(get_speech_timestamps, save_audio, read_audio, VADIterator, collect_chunks) = vad_utils

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
total_length_ms = 0


#create a random id for each frame 
# call the transcribe function and the text attached to that id should be processed 


async def audio_processor(websocket, path):
    global audio_buffer, accumulated_audio, last_confidence, processed_time_ms, total_length_ms, full_accumulated_audio
    try:
        async for packet in websocket:
            audio_int16 = np.frombuffer(packet, np.int16)
            audio_float32 = int2float(audio_int16)
            
            audio_buffer = np.concatenate((audio_buffer, audio_float32))
            accumulated_audio = np.concatenate((accumulated_audio, audio_float32))  # Accumulate audio data
            full_accumulated_audio = np.concatenate((full_accumulated_audio, audio_float32))
            packet_duration_ms = (len(audio_float32) / 16000) * 1000
            total_length_ms += packet_duration_ms
            
            while len(audio_buffer) >= BUFFER_SIZE:
                tensor_audio = torch.from_numpy(audio_buffer[:BUFFER_SIZE]).unsqueeze(0)
                tensor_audio = tensor_audio.to(device)
                confidence = vad_model(tensor_audio, 16000).item()  # Use the VAD model for voice activity detection

                processed_time_ms += (BUFFER_SIZE / 16000) * 1000
                
                if last_confidence > 0.1 and confidence < 0.1:
                    if len(accumulated_audio) > 0:  # Ensure there's audio to save
                        transcription, inference_time = transcribe(accumulated_audio)
                        
                        await websocket.send(json.dumps([transcription, inference_time]))  # Send transcription back to client
                        # await websocket.send(fulltranscription)
               
                        accumulated_audio = np.array([], dtype=np.float32)  # Reset accumulation buffer

                last_confidence = confidence
                audio_buffer = audio_buffer[BUFFER_SIZE:]

    except exceptions.ConnectionClosed:
        print("Connection closed")

async def main():
    async with websockets.serve(audio_processor, "0.0.0.0", 8080):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
