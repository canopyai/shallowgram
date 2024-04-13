document.getElementById('start').addEventListener('click', startRecording);

async function startRecording() {
    startRemoteSocket();
    // Set the WebSocket route
    const route = 'ws://34.141.221.82:8080';
    // const route = 'ws://127.0.0.1:8080';

    // Create a new WebSocket connection
    const socket = new WebSocket(route);

    // Request access to the user's microphone
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Configure the audio recorder
    let recorder = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/wav',
        recorderType: RecordRTC.StereoAudioRecorder,
        timeSlice: 20,
        desiredSampRate: 16000,
        numberOfAudioChannels: 1,
        bufferSize: 16384,
        audioBitsPerSecond: 128000,
        ondataavailable: async (blob) => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                const arrayBuffer = await blob.arrayBuffer();
                // Send the audio data as an ArrayBuffer
                socket.send(arrayBuffer);
            }
        }
    });

    // Start recording
    recorder.startRecording();

    // Optional: Listen for errors
    socket.onerror = function(event) {
        console.error("WebSocket error:", event);
    };
}


async function startRemoteSocket(){
    const route = 'ws://34.91.59.59:8080';
    const socket = new WebSocket(route);
    socket.onmessage = async function(event) {
        console.log("rem from server:", event.data);
    };
}