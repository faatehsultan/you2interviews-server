require("dotenv").config();

const {
  AGORA_CHANNEL_LIST_ENDPOINT,
  AGORA_REQUEST_RECORDING_ENDPOINT,
  AGORA_TOKEN_EXPIRY_SECONDS,
  AGORA_START_RECORDING_ENDPOINT,
  AGORA_STOP_RECORDING_ENDPOINT,
} = require("./constants");
const { auth } = require("./firebase-config");
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

const requestCloudRecording = async (channelName, token, uid) => {
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
      uid: uid,
      clientRequest: {
        // token: token,
        scene: 0,
        region: "EU",
        resourceExpiredHour: 72,
        startParameter: {
          token: token,
          storageConfig: {
            vendor: 1,
            region: 25,
            bucket: process.env.AWS_S3_BUCKET_NAME,
            accessKey: process.env.AWS_ACCESS_KEY_ID,
            secretKey: process.env.AWS_SECRET_ACCESS_KEY,
            // fileNamePrefix: ["directory1", "directory2"],
          },
          recordingConfig: {
            channelType: 0,
            decryptionMode: 0,
            streamTypes: 0,
            subscribeAudioUids: ["#allstream#"],
            subscribeUidGroup: 1,
            streamMode: "original",
          },
          recordingFileConfig: {
            avFileType: ["hls"],
          },
          // extensionServiceConfig: {
          //   errorHandlePolicy: "error_abort",
          //   extensionServices: [
          //     {
          //       serviceName: "string",
          //       errorHandlePolicy: "string",
          //       serviceParam: {
          //         url: "string",
          //         audioProfile: 0,
          //         videoWidth: 240,
          //         videoHeight: 240,
          //         maxRecordingHour: 1,
          //         videoBitrate: 0,
          //         videoFps: 15,
          //         mobile: false,
          //         maxVideoDuration: 120,
          //         onhold: false,
          //         readyTimeout: 0,
          //       },
          //     },
          //   ],
          // },
          appsCollection: {
            combinationPolicy: "default",
          },
          transcodeOptions: {
            transConfig: {
              transMode: "audioMix",
            },
            container: {
              format: "mp3",
            },
            audio: {
              sampleRate: "48000",
              bitrate: "48000",
              channels: "2",
            },
          },
        },
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
        token: token,
        scene: 0,
        region: "EU",
        resourceExpiredHour: 72,
        startParameter: {
          token: token,
          storageConfig: {
            vendor: 1,
            region: 25,
            bucket: process.env.AWS_S3_BUCKET_NAME,
            accessKey: process.env.AWS_ACCESS_KEY_ID,
            secretKey: process.env.AWS_SECRET_ACCESS_KEY,
            // fileNamePrefix: ["directory1", "directory2"],
          },
          recordingConfig: {
            channelType: 0,
            decryptionMode: 0,
            streamTypes: 0,
            subscribeAudioUids: ["#allstream#"],
            subscribeUidGroup: 1,
            streamMode: "original",
          },
          recordingFileConfig: {
            avFileType: ["hls"],
          },
          // extensionServiceConfig: {
          //   errorHandlePolicy: "error_abort",
          //   extensionServices: [
          //     {
          //       serviceName: "string",
          //       errorHandlePolicy: "string",
          //       serviceParam: {
          //         url: "string",
          //         audioProfile: 0,
          //         videoWidth: 240,
          //         videoHeight: 240,
          //         maxRecordingHour: 1,
          //         videoBitrate: 0,
          //         videoFps: 15,
          //         mobile: false,
          //         maxVideoDuration: 120,
          //         onhold: false,
          //         readyTimeout: 0,
          //       },
          //     },
          //   ],
          // },
          appsCollection: {
            combinationPolicy: "default",
          },
          transcodeOptions: {
            transConfig: {
              transMode: "audioMix",
            },
            container: {
              format: "mp3",
            },
            audio: {
              sampleRate: "48000",
              bitrate: "48000",
              channels: "2",
            },
          },
        },
      },
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

module.exports = {
  getTokenWithUID,
  getActiveChannelsList,
  requestCloudRecording,
  startCloudRecording,
  stopCloudRecording,
  listAllUsers,
};
