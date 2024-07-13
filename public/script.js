const socket = io();

let mediaRecorder;
let audioChunks = [];

// DOM elements
const startRecordingButton = document.getElementById("startRecording");
const stopRecordingButton = document.getElementById("stopRecording");
const audioPlayback = document.getElementById("audioPlayback");
const liveStreams = document.getElementById("liveStreams");
const recordingsList = document.getElementById("recordingsList");
const searchForm = document.getElementById("searchForm");
const searchQuery = document.getElementById("searchQuery");

// Start recording
startRecordingButton.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
      const reader = new FileReader();
      reader.onload = () => {
        socket.emit("audioStream", reader.result);
      };
      reader.readAsArrayBuffer(event.data);
    };

    mediaRecorder.start();
    startRecordingButton.disabled = true;
    stopRecordingButton.disabled = false;
    socket.emit("startRecording");
  } catch (error) {
    console.error("Error accessing microphone:", error);
  }
});

// Stop recording
stopRecordingButton.addEventListener("click", () => {
  mediaRecorder.stop();
  startRecordingButton.disabled = false;
  stopRecordingButton.disabled = true;
  socket.emit("stopRecording");

  const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
  const audioUrl = URL.createObjectURL(audioBlob);
  audioPlayback.src = audioUrl;
  audioChunks = [];
});

// Handle live audio stream
socket.on("audioStream", (data) => {
  const audioUrl = URL.createObjectURL(new Blob([data], { type: "audio/wav" }));
  const audioElement = document.createElement("audio");
  audioElement.src = audioUrl;
  audioElement.controls = true;
  audioElement.className = "streamItem";
  liveStreams.appendChild(audioElement);
});

// Fetch and display recordings
const fetchRecordings = async () => {
  try {
    const response = await fetch("/search");
    const data = await response.json();
    recordingsList.innerHTML = "";
    data.recordings.forEach((recording) => {
      const listItem = document.createElement("li");
      listItem.innerHTML = `
        <a href="https://uploads-audio.s3.eu-south-1.amazonaws.com/${recording.Key}" target="_blank">${recording.Key}</a>
      `;
      recordingsList.appendChild(listItem);
    });
  } catch (error) {
    console.error("Error fetching recordings:", error);
  }
};

fetchRecordings(); // Fetch recordings on page load

// Search for recordings
searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = searchQuery.value;

  try {
    const response = await fetch(`/search?query=${query}`);
    const data = await response.json();
    recordingsList.innerHTML = "";
    data.recordings.forEach((recording) => {
      const listItem = document.createElement("li");
      listItem.innerHTML = `
        <a href="https://uploads-audio.s3.eu-south-1.amazonaws.com/${recording.Key}" target="_blank">${recording.Key}</a>
      `;
      recordingsList.appendChild(listItem);
    });
  } catch (error) {
    console.error("Error searching recordings:", error);
  }
});

// Handle server connection
socket.on("connect", () => {
  console.log("Connected to server");
});
