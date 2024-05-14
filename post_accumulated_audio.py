import requests
import base64

# API URLs for the speaker processing endpoint
api_urls = [
    'http://34.34.9.101:8080/api/v1/speaker',
    'http://34.91.134.10:8080/api/v1/speaker'
]

def post_accumulated_audio(audio_bytes):
    print("Posting accumulated audio to the speaker processing endpoints...")
    try:
        # Encode the audio bytes to base64
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')

        # Prepare the payload
        data = {
            'b64': audio_base64
        }

        # Iterate through the list of API URLs and post the data to each one
        for url in api_urls:
            try:
                response = requests.post(url, json=data)

                # Check the response
                if response.status_code == 200:
                    print(f"Successfully processed the speaker audio at {url}.")
                    print("Response:", response.json())
                else:
                    print(f"Error at {url}: {response.status_code} - {response.text}")

            except requests.exceptions.RequestException as e:
                print(f"HTTP request failed at {url}: {e}")

    except Exception as e:
        print(f"An error occurred: {e}")

