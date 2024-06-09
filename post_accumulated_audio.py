import base64
import numpy as np
import wave
import aiohttp
import asyncio
import librosa
import random
import string

# API URLs for the speaker processing endpoint
api_urls = [
    'http://34.34.2.18:8080/api/v1/speaker',
    'http://34.32.129.161:8080/api/v1/speaker'
]

def save_audio_to_file(audio_bytes, sample_rate=24000, num_channels=1, filename="accumulated_audio.wav"):
    with wave.open(filename, 'wb') as wf:
        wf.setnchannels(num_channels)
        wf.setsampwidth(2)  # 2 bytes for int16
        wf.setframerate(sample_rate)
        wf.writeframes(audio_bytes)

async def post_accumulated_audio(accumulated_audio, original_sample_rate=16000, target_sample_rate=24000, num_channels=1):
    print("Posting accumulated audio to the speaker processing endpoints...")
    try:
        # Resample the accumulated_audio from original_sample_rate to target_sample_rate using librosa
        resampled_audio = librosa.resample(accumulated_audio, orig_sr=original_sample_rate, target_sr=target_sample_rate)

        # Convert the resampled_audio NumPy array to int16 before converting to bytes
        int16_audio = (resampled_audio * 32767).astype(np.int16)
        audio_bytes = int16_audio.tobytes()
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')

        # Prepare the payload
        data = {
            'b64': audio_base64
        }

        # Iterate through the list of API URLs and post the data to each one
        async with aiohttp.ClientSession() as session:
            for url in api_urls:
                try:
                    async with session.post(url, json=data) as response:
                        if response.status == 200:
                            print(f"Successfully processed the speaker audio at {url}.")
                            print("Response:", await response.json())
                        else:
                            print(f"Error at {url}: {response.status} - {await response.text()}")

                except aiohttp.ClientError as e:
                    print(f"HTTP request failed at {url}: {e}")

    except Exception as e:
        print(f"An error occurred: {e}")

# Example usage (replace with actual accumulated audio array)
accumulated_audio = np.random.randn(16000).astype(np.float32)  # Example audio data
asyncio.run(post_accumulated_audio(accumulated_audio))
