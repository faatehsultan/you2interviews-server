require("dotenv").config();

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
  addNewChannel,
  autoStartCloudRecording,
  getActiveUsersInChannel,
  createAdminUser,
  isUserAdmin,
  getCloudMp3ByChannelId,
} = require("./services");
const { SWAGGER_OPTIONS } = require("./constants");

const log = require("./logger");

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
 *       - in: query
 *         name: uid
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
  const { uid, channel } = req.query;

  const data = await getTokenWithUID(uid, channel);
  log(res, data);
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
  res.status(200).json({ ...channelList });
});

/**
 * @swagger
 * /api/agora/channel/users/list:
 *   get:
 *     summary: Get the list of active users in a channel
 *     parameters:
 *       - in: query
 *         name: channel
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A JSON object containing the list of active users in a channel
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
app.get("/api/agora/channel/users/list", async (req, res) => {
  const { channel } = req.query;

  if (!channel) return res.status(400).json({ error: "Missing channel" });

  const data = await getActiveUsersInChannel(channel);
  log(res, data);
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
  const { channel, token, uid, target_uid } = req.query;
  if (!channel || !token || !uid)
    return res.status(400).json({ error: "Missing channel or token or uid" });

  const data = await requestCloudRecording(channel, token, uid, target_uid);
  log(res, { ...data, uid: uid });
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
  const { channel, resource_id, token, uid, target_uid } = req.query;
  if (!channel || !resource_id || !token || !uid)
    return res
      .status(400)
      .json({ error: "Missing channel or resource_id or token or uid" });

  const data = await startCloudRecording(
    resource_id,
    channel,
    token,
    uid,
    target_uid
  );
  log(res, { ...data, uid: uid });
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
  log(res, { ...data, uid: uid });
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
  log(res, data);
});

/**
 * @swagger
 * /api/users/admin/new:
 *   post:
 *     summary: Create new admin user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
app.post("/api/users/admin/new", async (req, res) => {
  const { email, password } = req.body;
  const data = await createAdminUser(email, password);
  log(res, data);
});

/**
 * @swagger
 * /api/users/admin/verify:
 *   get:
 *     summary: Check if user is admin
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
app.get("/api/users/admin/verify", async (req, res) => {
  const { email } = req.query;
  const data = await isUserAdmin(email);
  log(res, data);
});

/**
 * @swagger
 * /api/channel/new:
 *   get:
 *     summary: Register new channel from agora to firebase database
 *     parameters:
 *       - in: query
 *         name: channel
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
app.get("/api/channel/new/", async (req, res) => {
  const { channel, uid } = req.query;

  const data = await addNewChannel(channel, uid);
  log(res, data);
});

/**
 * @swagger
 * /api/recording/automate:
 *   get:
 *     summary: Automate cloud recording, call this endpoint when user successfully joined the channel from the mobile device. Here uid is the target uid to be recorded (not the one used for recording request).
 *     parameters:
 *       - in: query
 *         name: channel
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
app.get("/api/agora/recording/automate/", async (req, res) => {
  const { channel, uid } = req.query;

  const data = await autoStartCloudRecording(channel, uid);
  log(res, data);
});

/**
 * @swagger
 * /api/channel/mp3/:
 *   get:
 *     summary: Get list of files in a recorded channel
 *     parameters:
 *       - in: query
 *         name: channel
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
app.get("/api/channel/mp3/", async (req, res) => {
  const { channel } = req.query;

  const data = await getCloudMp3ByChannelId(channel);
  log(res, data);
});

server.listen(3000, () => {
  console.log("Server listening on port 3000");
});
