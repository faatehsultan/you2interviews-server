const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const fs = require("fs");
const AWS = require("aws-sdk");
const multer = require("multer");
const path = require("path");

require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const s3BucketName = process.env.AWS_S3_BUCKET_NAME;

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
const s3 = new AWS.S3();

// Multer setup for file uploads
const upload = multer({ dest: "uploads/" });

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Handle client connection
io.on("connection", (socket) => {
  console.log("A user connected");

  let chunks = [];
  let recordingFile = null;

  socket.on("startRecording", () => {
    recordingFile = fs.createWriteStream(`uploads/${Date.now()}.wav`);
    chunks = [];
  });

  socket.on("audioStream", (data) => {
    const buffer = Buffer.from(data);
    chunks.push(buffer);
    recordingFile.write(buffer);

    // Broadcast audio stream to all clients
    socket.broadcast.emit("audioStream", data);
  });

  socket.on("stopRecording", () => {
    recordingFile.end();
    const fullAudioBuffer = Buffer.concat(chunks);
    fs.writeFileSync(`uploads/${Date.now()}_complete.wav`, fullAudioBuffer);

    // Optionally upload to S3
    const uploadParams = {
      Bucket: s3BucketName,
      Key: `audioChunks/${Date.now()}_complete.wav`,
      Body: fullAudioBuffer,
    };

    s3.upload(uploadParams, (err, data) => {
      if (err) {
        console.error("Error uploading to S3:", err);
      } else {
        console.log("Successfully uploaded to S3:", data);
      }
    });
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

// Upload endpoint for recordings
app.post("/upload", upload.single("file"), (req, res) => {
  const file = req.file;
  const uploadParams = {
    Bucket: s3BucketName,
    Key: `recordings/${file.originalname}`,
    Body: fs.createReadStream(file.path),
  };

  s3.upload(uploadParams, (err, data) => {
    if (err) {
      return res.status(500).send("Error uploading to S3");
    }
    res.status(200).send("File uploaded successfully");
  });
});

// Search endpoint for recordings
app.get("/search", (req, res) => {
  const query = req.query.query;
  const params = {
    Bucket: s3BucketName,
    Prefix: "recordings/",
  };

  s3.listObjectsV2(params, (err, data) => {
    if (err) {
      return res.status(500).send("Error searching recordings");
    }

    const recordings = data.Contents.filter((item) => item.Key.includes(query));
    res.status(200).json({ recordings });
  });
});

server.listen(3000, () => {
  console.log("Server listening on port 3000");
});
