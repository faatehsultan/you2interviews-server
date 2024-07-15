require("dotenv").config();

const {
  AGORA_CHANNEL_LIST_ENDPOINT,
  AGORA_REQUEST_RECORDING_ENDPOINT,
  AGORA_TOKEN_EXPIRY_SECONDS,
} = require("./constants");

const RtcTokenBuilder =
  require("./agoraTokenLib/RtcTokenBuilder2").RtcTokenBuilder;
const RtcRole = require("./agoraTokenLib/RtcTokenBuilder2").Role;

const roleMap = {
  sub: RtcRole.SUBSCRIBER,
  pub: RtcRole.PUBLISHER,
};

const appId = process.env.AGORA_APP_ID;
const appCertificate = process.env.AGORA_APP_CERTIFICATE;

console.log("App Id:", appId);
console.log("App Certificate:", appCertificate);
if (
  appId == undefined ||
  appId == "" ||
  appCertificate == undefined ||
  appCertificate == ""
) {
  console.log(
    "Need to set environment variable AGORA_APP_ID and AGORA_APP_CERTIFICATE"
  );
  process.exit(1);
}

const getTokenWithUID = async (uid = 0, channelName = "*", role = "pub") => {
  const resToken = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    roleMap[role],
    AGORA_TOKEN_EXPIRY_SECONDS,
    AGORA_TOKEN_EXPIRY_SECONDS
  );
  console.log("Token with int uid:", resToken);

  // also check if the requesting user is host
  const allChannels = await getActiveChannelsList();
  const channelList = allChannels?.data?.channels
    ?.filter((c) => c?.user_count > 0)
    ?.map((c) => c?.channel_name);

  let is_host = true;

  if (channelList.includes(channelName)) is_host = false;

  return { token: resToken, is_host };
};

const getActiveChannelsList = async () => {
  const url = AGORA_CHANNEL_LIST_ENDPOINT.replace("APP_ID", appId);

  const encodedCredential =
    "Basic " +
    Buffer.from(
      process.env.AGORA_REST_KEY + ":" + process.env.AGORA_REST_SECRET
    ).toString("base64");

  const options = {
    method: "GET",
    headers: { Authorization: encodedCredential, Accept: "application/json" },
  };
  try {
    const response = await fetch(url, options);
    const data = await response.json();

    console.log(data);

    return data;
  } catch (error) {
    console.error(error);
  }
};

const requestCloudRecording = async (channelName) => {
  const url = AGORA_REQUEST_RECORDING_ENDPOINT.replace("APP_ID", appId);

  const encodedCredential =
    "Basic " +
    Buffer.from(
      process.env.AGORA_REST_KEY + ":" + process.env.AGORA_REST_SECRET
    ).toString("base64");

  const options = {
    method: "POST",
    headers: {
      Authorization: encodedCredential,
      "Content-Type": "application/json;charset=utf-8",
    },
    body: JSON.stringify({
      cname: channelName,
      uid: "0",
      clientRequest: {},
    }),
  };
  try {
    const response = await fetch(url, options);
    const data = await response.json();

    console.log(response);
    console.log(data);
    console.log(response.status, response.statusText);

    return data;
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  getTokenWithUID,
  getActiveChannelsList,
  requestCloudRecording,
};
