import time
import io
import requests
import numpy as np

endpoint = "http://34.90.83.54:8080"

def post_numpy_array(numpy_array):
    # Convert the numpy array to a list for JSON serialization
    print("sending sending")
 
    audio_bytes = numpy_array.astype(np.float64).tobytes()
    files = {'audio': ('audio_data', io.BytesIO(audio_bytes), 'application/octet-stream')}
    response = requests.post(endpoint, files=files)
    
    return response
