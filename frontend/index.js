document.getElementById('start').addEventListener('click', startRecording);

let myRadarChart;
let allDatasets = [];
let isAudioEmpathyShowing = false;

document.getElementById("toggle-aud").addEventListener('click', function(){
    
    if(isAudioEmpathyShowing){
        document.getElementById('boxes-holder').style.display = 'none';
        document.getElementById('toggle-aud').innerHTML = '+ Show Audio Empathy';
    } else {
        document.getElementById('boxes-holder').style.display = 'block';
        document.getElementById('toggle-aud').innerHTML = '- Hide Audio Empathy';
    }
    isAudioEmpathyShowing = !isAudioEmpathyShowing;
})

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

function getColor(string){
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
    if(allDatasets.length > 20){
        allDatasets.pop();
    }
    allDatasets.unshift(dataset);
}

function createElements(datasets){
    document.getElementById('boxes-holder').innerHTML = '';

    datasets.forEach((ds, index) => {

        const dataset= ds.dataset
        const transcription = ds.transcription;

        console.log("indie dataset:", dataset);

        const arrayRep = Object.keys(dataset).map((key) => {
            return {label: key, score: dataset[key]};
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


async function startRemoteSocket(){
    const route = 'ws://34.91.59.59:8080';
    const socket = new WebSocket(route);
    socket.onmessage = async function(event) {
        try{
        const data = JSON.parse(event.data);


        const {emotion_data, transcription} = data.data;
        const {result: emotionResult} = emotion_data;

        console.log("emotionResult:", emotionResult);

        const dataset = {}
        for (let i = 0; i < 6; i++) {
            const {label, score} = emotionResult[i];
            dataset[label] = parseInt(score *70) +30;

        }

        const dsObj = {dataset, transcription};
        console.log("dsObj:", dsObj);

        if(transcription.split(" ").length > 3){    
            updateDatasets(dsObj);
        }
        

        console.log("allDatasets:", allDatasets);

        createElements(allDatasets);





       
        
        } catch(err) {
            // console.log("error");
        }

    };
}







// document.addEventListener('DOMContentLoaded', function() {
//     const dataSet = [{"sad":97,"neutral":3,"fear":2,"disgust":1,"anger":1}];

//     createRadarChart(dataSet);
// });

