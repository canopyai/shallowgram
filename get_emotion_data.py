import numpy as np
import io
import requests
import wave
import time
import os


endpoint = "https://127.0.0.1:8083"
def get_emotion_data(numpy_array):
    return True
    # Save the audio data as a WAV file
    timestamp = str(int(time.time()))[-6:]
    wav_file = f'/Users/amartyavarma/Desktop/shallowgram/tests/audio_{timestamp}.wav'

    # Ensure the directory exists
    os.makedirs(os.path.dirname(wav_file), exist_ok=True)

    # Open the WAV file for writing
    with wave.open(wav_file, 'wb') as wf:
        wf.setnchannels(1)  # Mono audio
        wf.setsampwidth(2)  # 16 bits per sample
        wf.setframerate(16000)  # Sample rate

        # Convert float32 array to int16
        int16_audio = (numpy_array * 32767).astype(np.int16)  # Scale float32 to int16 range
        wf.writeframes(int16_audio.tobytes())

        print(f"Audio file saved as {wav_file}")

    # Send the audio file to the endpoint
    # files = {'audio': open(wav_file, 'rb')}
    # response = requests.post(endpoint, files=files)
    # return response.json()
    return
    audio_bytes = numpy_array.astype(np.float64).tobytes()
    files = {'audio': ('audio_data', io.BytesIO(audio_bytes), 'application/octet-stream')}
    response = requests.post(endpoint, files=files)
    return response.json()
