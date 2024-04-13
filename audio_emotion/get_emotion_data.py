import numpy as np
from audio_emotion.post_numpy_array import post_numpy_array
import requests
import io
import time


endpoint = "http://34.90.83.54:8080"


def get_emotion_data(numpy_array):

    startTime = time.time()
    # Convert the numpy_array from float32 to int16
    int16_audio = (numpy_array * 32767).astype(np.int16)  # Scale float32 to int16 range

    # Post the int16 audio data directly
    audio_bytes = int16_audio.astype(np.float64).tobytes()
    files = {'audio': ('audio_data', io.BytesIO(audio_bytes), 'application/octet-stream')}
    aud_emo_data = requests.post(endpoint, files=files)
    resp_json = aud_emo_data.json()
    endTime = time.time()
    print(f'duration is for audio int {endTime - startTime}: {resp_json}')
    return resp_json
