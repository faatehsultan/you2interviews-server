const express = require("express");
const http = require("http");
const cors = require("cors");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const {
  getTokenWithUID,
  getActiveChannelsList,
  requestCloudRecording,
  startCloudRecording,
  stopCloudRecording,
  listAllUsers,
} = require("./services");
const { SWAGGER_OPTIONS } = require("./constants");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

app.use(cors());

app.use(express.json());

const swaggerSpecs = swaggerJsdoc(SWAGGER_OPTIONS);

app.get("/", (req, res) => {
  res.redirect("/docs");
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

/**
 * @swagger
 * /api/agora/token/new:
 *   get:
 *     summary: Get a new token
 *     parameters:
 *       - in: query
 *         name: channel
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A JSON object containing the token and host status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 is_host:
 *                   type: boolean
 */
app.get("/api/agora/token/new", async (req, res) => {
  const { uid, channel, role } = req.query;
  const { token, is_host } = await getTokenWithUID(uid, channel, role);
  res.status(200).json({ token, is_host });
});

/**
 * @swagger
 * /api/agora/channel/list:
 *   get:
 *     summary: Get the list of active channels
 *     responses:
 *       200:
 *         description: A JSON object containing the list of active channels
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 channels:
 *                   type: array
 *                   items:
 *                     type: string
 */
app.get("/api/agora/channel/list", async (req, res) => {
  const channelList = await getActiveChannelsList();
  console.log("channelList:", channelList);
  res.status(200).json({ channels: channelList });
});

/**
 * @swagger
 * /api/agora/recording/request:
 *   get:
 *     summary: Request cloud recording
 *     parameters:
 *       - in: query
 *         name: channel
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A JSON object containing the recording data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Missing channel parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
app.get("/api/agora/recording/request", async (req, res) => {
  const { channel, token, uid } = req.query;
  if (!channel || !token || !uid)
    return res.status(400).json({ error: "Missing channel or token or uid" });

  const data = await requestCloudRecording(channel, token, uid);
  console.log(data);
  res.status(200).json(data);
});

/**
 * @swagger
 * /api/agora/recording/start:
 *   get:
 *     summary: Start cloud recording
 *     parameters:
 *       - in: query
 *         name: channel
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: resource_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A JSON object containing the recording data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Missing channel or resource_id
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
app.get("/api/agora/recording/start", async (req, res) => {
  const { channel, resource_id, token, uid } = req.query;
  if (!channel || !resource_id || !token || !uid)
    return res
      .status(400)
      .json({ error: "Missing channel or resource_id or token or uid" });

  const data = await startCloudRecording(resource_id, channel, token, uid);
  console.log(data);
  res.status(200).json(data);
});

/**
 * @swagger
 * /api/agora/recording/stop:
 *   get:
 *     summary: Stop cloud recording
 *     parameters:
 *       - in: query
 *         name: channel
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: resource_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: sid
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: uid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A JSON object containing the recording data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Missing channel or resource_id
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
app.get("/api/agora/recording/stop", async (req, res) => {
  const { channel, resource_id, sid, uid } = req.query;
  if (!channel || !resource_id || !sid || !uid)
    return res
      .status(400)
      .json({ error: "Missing channel or resource_id or sid or uid" });

  const data = await stopCloudRecording(resource_id, channel, sid, uid);
  console.log(data);
  res.status(200).json(data);
});

/**
 * @swagger
 * /api/users/list:
 *   get:
 *     summary: Get All Users List
 *     responses:
 *       200:
 *         description: A JSON object containing the list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
app.get("/api/users/list", async (req, res) => {
  const data = await listAllUsers();
  console.log("LIST ALL USERS: ", data);

  res.status(200).json(data);
});

server.listen(3000, () => {
  console.log("Server listening on port 3000");
});
