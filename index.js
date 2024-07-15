const express = require("express");
const http = require("http");
const {
  getTokenWithUID,
  getActiveChannelsList,
  requestCloudRecording,
} = require("./services");

require("dotenv").config();

const app = express();
const server = http.createServer(app);

app.get("/api/agora/token/new/", async (req, res) => {
  const { uid, channel, role } = req.query;
  const { token, is_host } = await getTokenWithUID(uid, channel, role);
  res.status(200).json({ token, is_host });
});

app.get("/api/agora/channel/list", async (req, res) => {
  const channelList = await getActiveChannelsList();
  console.log("channelList:", channelList);
  res.status(200).json({ channels: channelList });
});

app.get("/api/agora/recording/request", async (req, res) => {
  const { channel } = req.query;
  if (!channel) return res.status(400).json({ error: "Missing channel" });

  const data = await requestCloudRecording(channel);
  console.log(data);
  res.status(200).json(data);
});

server.listen(3000, () => {
  console.log("Server listening on port 3000");
});
