document.getElementById('start').addEventListener('click', startRecording);

async function startRecording(){
    //set socket to whatever it is
    const socket = null;
    
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    let recorder = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/wav',
        recorderType: RecordRTC.StereoAudioRecorder,
        timeSlice: 250,
        desiredSampRate: 16000,
        numberOfAudioChannels: 1,
        bufferSize: 16384,
        audioBitsPerSecond: 128000,
        ondataavailable: async (blob) => {
          if (socket && socket.readyState === WebSocket.OPEN) {
    

            //socket information below
            // socket.send(JSON.stringify({
            //   data: base64String,
            // }));
    
        
    
          }
        }
      });
    
      recorder.startRecording();
}

