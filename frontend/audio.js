let allDatasets = [];
let isAudioEmpathyShowing = false;
let audioQueue = [];
let isQueuePlaying = false;
let mainConversationIndex = 0
const latencies = {
    transcription: 0,
    audio: 0,
    background: 0,
    empathy: 0,
    LLM: 0,
    TTS: 0,
    animation: 0

}
let currentAudioNodes = [];

let llmSocket = null


async function playQueue() {

    if (audioQueue.length > 0) {
        const {audioData:audio, visemes} = audioQueue.shift();

        // animateBlendShapes(visemes);
        
        const audioBlob = base64ToBlob(audio);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audioElement = new Audio(audioUrl);
        currentAudioNodes.push(audioElement);
        audioElement.play();

        audioElement.onended = () => {
            playQueue();
        }


        function base64ToBlob(base64) {
            const binaryString = window.atob(base64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return new Blob([bytes], { type: 'audio/wav' });
        }
    } else {
        isQueuePlaying = false;
    }
}

function startInputVideo(){
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // Define the video and audio constraints
        var constraints = { video: true, audio: false };

        // Access webcam
        navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
            // Get the video element
            var video = document.getElementById('videoElement');
            // Set the source of the video element to the webcam stream
            video.srcObject = stream;

            video.onloadedmetadata = function(e) {
                // Play the video
                video.play();
            };
        }).catch(function(err) {
            console.error("Error accessing media devices.", err);
        });
    } else {
        alert('Your browser does not support getUserMedia API');
    }
}

startInputVideo()

document.getElementById('start').addEventListener('click', startRecording);



document.getElementById("toggle-aud").addEventListener('click', function () {

    if (isAudioEmpathyShowing) {
        document.getElementById('boxes-holder').style.display = 'none';
        document.getElementById('toggle-aud').innerHTML = '+ Show Audio Empathy';
    } else {
        document.getElementById('boxes-holder').style.display = 'block';
        document.getElementById('toggle-aud').innerHTML = '- Hide Audio Empathy';
    }
    isAudioEmpathyShowing = !isAudioEmpathyShowing;
})

async function startRecording() {

    document.getElementById('start').style.opacity = '0.6';
    document.getElementById('start').innerText = "Started Conversation..."
    startRemoteSocket();
    // Set the WebSocket route
    const route = 'ws://34.91.97.74:8080';
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
        timeSlice: 200,
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
    socket.onerror = function (event) {
        console.error("WebSocket error:", event);
    };
}

function getColor(string) {
    const colors = {
        "sad": "#a8662c",
        "neutral": "#d3d925",
        "fear": "#0e5940",
        "disgust": "#7d6740",
        "anger": "#822726",
        "happy": "#278283"
    };

    return colors[string];

}

function updateDatasets(dataset) {
    if (allDatasets.length > 20) {
        allDatasets.pop();
    }
    allDatasets.unshift(dataset);
}

function createElements(datasets) {
    document.getElementById('boxes-holder').innerHTML = '';

    datasets.forEach((ds, index) => {

        const dataset = ds.dataset
        const transcription = ds.transcription;

        const arrayRep = Object.keys(dataset).map((key) => {
            return { label: key, score: dataset[key] };
        });

        //now sort array by score in descending order

        arrayRep.sort((a, b) => {
            return b.score - a.score;
        });




        html = `<div class="empathy-box">
        <div class="emp-transcription">${transcription}</div>
            <div class="emp-opt"> 
                <div class="emp-opt-ttl">${arrayRep[0].label.toUpperCase()}</div>
                <div class="emp-opt-bar" >
                <div class="emp-opt-fill" style="width:${arrayRep[0].score}%; background-color:${getColor(arrayRep[0].label)}"></div>
                </div>
            </div>
            <div class="emp-opt" > 
                <div class="emp-opt-ttl">${arrayRep[1].label.toUpperCase()}</div>
                <div class="emp-opt-bar" >
                <div class="emp-opt-fill" style="width:${arrayRep[1].score}%; background-color:${getColor(arrayRep[1].label)}"></div>
                </div>
            </div>
            <div class="emp-opt"> 
                <div class="emp-opt-ttl">${arrayRep[2].label.toUpperCase()}</div>
                <div class="emp-opt-bar" >
                <div class="emp-opt-fill" style="width:${arrayRep[2].score}%; background-color:${getColor(arrayRep[2].label)}"></div>
                </div>
            </div>
        </div>`;

        document.getElementById('boxes-holder').innerHTML += html;
    })



}


function updateNetLatency() {

    let sum = 0; for (let key in latencies) { sum += latencies[key]; }
    document.getElementById("tot-lat").innerHTML = Math.floor(sum - latencies["empathy"] - latencies["audio"] - latencies["transcription"]) + " ms";


}
async function startRemoteSocket() {

    const route = 'ws://34.147.74.133:8080';
    const socket = new WebSocket(route);
    llmSocket = socket;
    socket.onmessage = async function (event) {

        try {
            const data = JSON.parse(event.data);



            const { messageType } = data;


            if (messageType === "transcription") {

                const { emotion_data, transcription, inference_time } = data.data;
                const { result: emotionResult, inference_time: emotionInferenceTime } = emotion_data;

                const dataset = {}
                for (let i = 0; i < 6; i++) {
                    const { label, score } = emotionResult[i];
                    dataset[label] = parseInt(score * 70) + 30;

                }

                const dsObj = { dataset, transcription }

                if (transcription.split(" ").length > 3) {
                    updateDatasets(dsObj);
                }


                latencies.transcription = inference_time * 1000;
                latencies.empathy = emotionInferenceTime * 1000;

                createElements(allDatasets);
                document.getElementById("trans-lat").innerHTML = `${Math.floor((inference_time * 1000))} ms`;
                document.getElementById("aud-lat").innerHTML = `${Math.floor((emotionInferenceTime * 1000))} ms`;
            } else if (messageType === "empathy") {
                const { latency: empathyLatency, audioData } = data;

                latencies.empathy = empathyLatency;
                document.getElementById("emp-lat").innerHTML = `${Math.floor((empathyLatency))} ms`;
            } else if (messageType === "LLMLatency") {
                const { latency: LLMLatency } = data;
                latencies.LLMLatency = LLMLatency;

                document.getElementById("llm-lat").innerHTML = `${Math.floor((LLMLatency))} ms`;
            } else if (messageType === "animationLatency") {

                const { segmentsLatency, TTSLatency } = data;
                latencies.animation = segmentsLatency * 1000;
                latencies.TTS = TTSLatency * 1000;
                document.getElementById("ani-lat").innerHTML = `${Math.floor((segmentsLatency * 1000))} ms`;
                document.getElementById("tts-lat").innerHTML = `${Math.floor((TTSLatency * 1000))} ms`;

            } else if (messageType === "animationData") {
                const { audioData, conversationIndex, visemes } = data;

                const newAnimationEvent = new CustomEvent("animationReceived", {detail:data})

                window.dispatchEvent(newAnimationEvent)

                console.log("audioData", conversationIndex, mainConversationIndex);
                // if (mainConversationIndex <= conversationIndex) {
                    audioQueue.push({
                        audioData, 
                        visemes
                    });
                    if (!isQueuePlaying) {
                        isQueuePlaying = true;
                        // playQueue();
                    }
                // } else {
                //     console.log("skipping audio");
                // }
                
            }
            else if (messageType === "clearQueue") {
                const { conversationIndex } = data;
                console.log("clear queue", conversationIndex);
                
                if (conversationIndex > mainConversationIndex) {
                    console.log("clearing queue");
                    mainConversationIndex = conversationIndex;
                    isQueuePlaying = false;
                    audioQueue = []
    
                    currentAudioNodes.forEach(node => {
                        if (!node.paused) {
                            node.pause();
                            node.currentTime = 0; // Optionally reset the playback position
                        }
                    });
                    currentAudioNodes.length = 0;


                } else {
                    console.log("skipping clear queue");
                }

            }


            updateNetLatency();







        } catch (err) {
            // console.log("error");
        }

    };
}




document.getElementById("toggle-lat").addEventListener("click", () => {
    if (document.getElementById("toggle-lat").innerHTML === "+ Show Latency") {
        document.getElementById("toggle-lat").innerHTML = "- Hide Latency";
        document.getElementById("latencies").style.display = 'block';
    } else {
        document.getElementById("toggle-lat").innerHTML = "+ Show Latency";
        document.getElementById("latencies").style.display = 'none';
    }
})






document.getElementById("pill1").addEventListener("click", () => {
    document.getElementById("pill1").classList.add("selected-pill")
    document.getElementById("pill2").classList.remove("selected-pill");
    document.getElementById("pill2").classList.remove("selected-pill");


})

document.getElementById("pill2").addEventListener("click", () => {
    document.getElementById("pill1").classList.add("selected-pill")
    document.getElementById("pill2").classList.add("selected-pill");
    document.getElementById("pill3").classList.remove("selected-pill");
    llmSocket.send(
        JSON.stringify({
             messageType: "audioEmpathy", 
             data: { 
                isAudioEmpathy: false 
            } 
        }));
})

document.getElementById("pill3").addEventListener("click", () => {
    document.getElementById("pill1").classList.add("selected-pill")
    document.getElementById("pill2").classList.add("selected-pill");
    document.getElementById("pill3").classList.add("selected-pill");

    llmSocket.send(
        JSON.stringify({
             messageType: "audioEmpathy", 
             data: { 
                isAudioEmpathy: true 
            } 
        }));
})