

// document.addEventListener('DOMContentLoaded', function() {
//     const dataSet = [{"sad":97,"neutral":3,"fear":2,"disgust":1,"anger":1}];

//     createRadarChart(dataSet);
// });
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/controls/OrbitControls.js';

// const remoteUrl = "http://34.32.228.101:8080/generate_animation"
const remoteUrl = "http://localhost:8080/generate_animation"
// 1. Set up the Scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75,  550/ 400, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
const startIndex = 256
let meshes = [];
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

renderer.setSize(550, 400);
document.getElementById("canopy-rend").appendChild(renderer.domElement);
let startAnimationTime = Date.now()
let endAnimationTime = Date.now()

// Add a basic light
const ambientLight = new THREE.AmbientLight(0xcccccc, 1);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 0).normalize();
scene.add(directionalLight);

// Add a PointLight
const pointLight = new THREE.PointLight(0xffffff, 1, 100);
pointLight.position.set(5, 5, 5); // Position is x, y, z
scene.add(pointLight);


// 2. Load the GLB Model
// const loader = new GLTFLoader();
// Assuming loader.load() has already been called
// loader.load('dd1.glb', function (gltf) {

//     const object = gltf.scene;
//     meshes = object.children[0].children
//     const mesh = meshes[0]; // Example: working with the first mesh

//     if (mesh.morphTargetDictionary) {
//         // Iterate over the morphTargetDictionary to print names and indices
//         for (const [name, index] of Object.entries(mesh.morphTargetDictionary)) {
//             console.log(`${name}: ${index}`);
//         }
//     } else {
//         console.log('No morph targets found on this mesh.');
//     }
//     scene.add(object);


//     // Compute the bounding box after adding the model to the scene
//     const box = new THREE.Box3().setFromObject(object);
//     const center = box.getCenter(new THREE.Vector3());

//     // Move the camera to focus on the center of the bounding box
//     camera.position.x = center.x;
//     camera.position.y = center.y;
//     // Adjust the Z position based on the size of the model for a good view distance
//     const size = box.getSize(new THREE.Vector3());
//     const maxDim = Math.max(size.x, size.y, size.z);
//     const fov = camera.fov * (Math.PI / 180);
//     const cameraZ = Math.abs(maxDim / 4 * Math.tan(fov * 2));

//     // Perhaps a bit far back
//     camera.position.z = 30; // Adjust the 1.5 as needed

//     // Update the camera's matrices
//     camera.updateProjectionMatrix();

//     // Point the camera to the center of the model
//     camera.lookAt(center);

//     // Update controls to rotate around the center of the model
//     controls.target.set(center.x, center.y, center.z);
//     controls.update();

// }, undefined, function (error) {
//     console.error(error);
// });


// 3. Add OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);

camera.position.z = 5;

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

animate();

function animateBlendShapes(animations) {
    console.log("animations being animated", animations)
    let currentAnimationIndex = 0;
    startAnimationTime = Date.now()

    function animateNext() {
        if (currentAnimationIndex >= animations.length) {
  
            endAnimationTime = Date.now()
            console.log('Animation time:', endAnimationTime - startAnimationTime)
            return; // Exit if we've animated all objects in the array
        }

        const animation = animations[currentAnimationIndex];
        // Copy initial blend shape values for each mesh
        const initialValuesArray = meshes[0].morphTargetInfluences.slice();
        let { targets, duration } = animation;
        let zeros = new Array(startIndex).fill(0); // Create an array of 256 zeros
        let updatedTargets = zeros.concat(targets); // Concatenate zeros array with the original targets array
        targets = updatedTargets;

        const startTime = performance.now();

        function animate() {
            const elapsedTime = performance.now() - startTime;
            const progress = elapsedTime / duration;

            if (progress < 1) {
                // console.log(progress)
                // Update each blend shape influence for each mesh based on linear interpolation
                meshes.forEach((mesh, meshIndex) => {
                    const initialValues = initialValuesArray;
                    for (let i = 0; i < targets.length; i++) {
                        mesh.morphTargetInfluences[i] = THREE.MathUtils.lerp(initialValues[i], targets[i], progress);
                    }
                });

                requestAnimationFrame(animate); // Continue animation
            } else {
                // Set final values to ensure accuracy for each mesh
                meshes.forEach((mesh, meshIndex) => {
                    for (let i = 0; i < targets.length; i++) {
                        mesh.morphTargetInfluences[i] = targets[i];
                    }
                });

                currentAnimationIndex++; // Move to the next animation
                animateNext(); // Start the next animation
            }
        }

        animate(); // Start animating
    }

    animateNext(); // Start the animation sequence
}

async function playQueue() {

    if (audioQueue.length > 0) {
        const {audioData:audio, visemes} = audioQueue.shift();

        animateBlendShapes(visemes);
        
        const audioBlob = base64ToBlob(audio);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audioElement = new Audio(audioUrl);
        // currentAudioNodes.push(audioElement);
        audioElement.play();

        audioElement.onended = () => {
            // playQueue();
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
    startRemoteSocket();
    // Set the WebSocket route
    const route = 'ws://34.91.82.222:8080';
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
    document.getElementById("tot-lat").innerHTML = Math.floor(sum - latencies["audio"] - latencies["transcription"]) + " ms";


}
async function startRemoteSocket() {

    const route = 'ws://34.91.59.59:8080';
    const socket = new WebSocket(route);
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
                if (mainConversationIndex <= conversationIndex) {
                    // audioQueue.push({
                    //     audioData, 
                    //     visemes
                    // });
                    if (!isQueuePlaying) {
                        isQueuePlaying = true;
                        // playQueue();
                    }
                } else {
                    console.log("skipping audio");
                }
                
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






