import torch
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline
import time


device = "cpu"
if torch.cuda.is_available():
    device = "cuda"
print(f"Using device: {device}")
torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

model_id = "openai/whisper-medium.en"

model = AutoModelForSpeechSeq2Seq.from_pretrained(
    model_id, torch_dtype=torch_dtype, use_safetensors=True, attn_implementation="sdpa",
)

model.to(device)

processor = AutoProcessor.from_pretrained(model_id)

pipe = pipeline(
    "automatic-speech-recognition",
    
    model=model,
    tokenizer=processor.tokenizer,
    feature_extractor=processor.feature_extractor,
    max_new_tokens=128,
    torch_dtype=torch_dtype,
    device=device,
    
    
)


def transcribe(audio_data):
    tensor_audio_data = torch.from_numpy(audio_data)
    startTime = time.time()
    audio_input = {"array": audio_data, "sampling_rate": 16000}
    result = pipe(audio_input)
    #print(result["text"])
    endTime = time.time()
    print(f'duration is {endTime - startTime}: {result["text"]}')


    return result["text"]  