require("dotenv").config();

const {
  AGORA_CHANNEL_LIST_ENDPOINT,
  AGORA_REQUEST_RECORDING_ENDPOINT,
  AGORA_TOKEN_EXPIRY_SECONDS,
  AGORA_START_RECORDING_ENDPOINT,
  AGORA_STOP_RECORDING_ENDPOINT,
} = require("./constants");
const { auth, db } = require("./firebase-config");
const { getAgoraCloudRecordingStartConfig } = require("./utils");
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

const _getCredentials = () => {
  return (
    "Basic " +
    Buffer.from(
      process.env.AGORA_REST_KEY + ":" + process.env.AGORA_REST_SECRET
    ).toString("base64")
  );
};

const getTokenWithUID = async (uid = "0", channelName = "*") => {
  const allChannels = await getActiveChannelsList();
  const channelList = allChannels?.data?.channels
    ?.filter((c) => c?.user_count > 0)
    ?.map((c) => c?.channel_name);

  let is_host = true;

  if (channelList?.includes(channelName)) is_host = false;

  const resToken = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    roleMap[is_host ? "pub" : "sub"],
    AGORA_TOKEN_EXPIRY_SECONDS,
    AGORA_TOKEN_EXPIRY_SECONDS
  );

  return { token: resToken, is_host };
};

const getActiveChannelsList = async () => {
  const url = AGORA_CHANNEL_LIST_ENDPOINT.replace("APP_ID", appId);

  const options = {
    method: "GET",
    headers: { Authorization: _getCredentials(), Accept: "application/json" },
  };

  try {
    let response = await fetch(url, options);
    const agoraData = await response.json();

    response = await db.collection("channels").get();
    const firebaseData = await response.docs.map((doc) => ({
      ...doc.data(),
      channel_name: doc.id,
    }));

    const resultant = [];

    firebaseData?.forEach((channel) => {
      const elem = agoraData?.data?.channels?.find(
        (c) => c.channel_name === channel.channel_name
      );
      if (elem) {
        resultant.push({ ...channel, ...elem });
      }
    });

    console.log("agoraData", agoraData);
    console.log("firebaseData", firebaseData);
    console.log("resultant", resultant);

    return resultant;
  } catch (error) {
    console.error(error);
  }
};

const requestCloudRecording = async (channelName, token, uid) => {
  const url = AGORA_REQUEST_RECORDING_ENDPOINT.replace("APP_ID", appId);

  const options = {
    method: "POST",
    headers: {
      Authorization: _getCredentials(),
      "Content-Type": "application/json;charset=utf-8",
    },
    body: JSON.stringify({
      cname: channelName,
      uid: uid,
      clientRequest: {
        scene: 0,
        region: "EU",
        startParameter: getAgoraCloudRecordingStartConfig(token, uid),
      },
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

const startCloudRecording = async (resourceId, channelName, token, uid) => {
  const url = AGORA_START_RECORDING_ENDPOINT.replace("APP_ID", appId).replace(
    "RESOURCE_ID",
    resourceId
  );

  const options = {
    method: "POST",
    headers: {
      Authorization: _getCredentials(),
      "Content-Type": "application/json;charset=utf-8",
    },
    body: JSON.stringify({
      cname: channelName,
      uid: uid,
      clientRequest: getAgoraCloudRecordingStartConfig(token, uid),
    }),
  };
  try {
    console.log("stuff>>>>", options, url);
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

const stopCloudRecording = async (resourceId, channelName, sid, uid) => {
  const url = AGORA_STOP_RECORDING_ENDPOINT.replace("APP_ID", appId)
    .replace("RESOURCE_ID", resourceId)
    .replace("SID", sid);

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
      uid: uid,
      clientRequest: {
        async_stop: false,
      },
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

const listAllUsers = async (nextPageToken) => {
  try {
    const listUsersResult = await auth.listUsers(1000, nextPageToken);
    const users = listUsersResult.users.map((userRecord) => ({
      uid: userRecord.uid,
      displayName: userRecord.displayName,
      email: userRecord.email,
      emailVerified: userRecord.emailVerified,
      disabled: userRecord.disabled,
      photoURL: userRecord.photoURL,
    }));
    if (listUsersResult.pageToken) {
      // List next batch of users.
      const nextUsers = await listAllUsers(listUsersResult.pageToken);
      return users.concat(nextUsers);
    }
    return users;
  } catch (error) {
    console.log("Error listing users:", error);
    return [];
  }
};

const addNewChannel = async (channelName, hostUid) => {
  try {
    const res = await db.collection("channels").add({
      title: channelName,
      createdAt: new Date().toUTCString(),
      hostUid: hostUid,
    });
    if (res) {
      return res.id;
    } else {
      return null;
    }
  } catch (error) {
    console.log("Error creating channel:", error);
    return null;
  }
};

module.exports = {
  getTokenWithUID,
  getActiveChannelsList,
  requestCloudRecording,
  startCloudRecording,
  stopCloudRecording,
  listAllUsers,
  addNewChannel,
};
