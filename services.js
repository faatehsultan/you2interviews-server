require("dotenv").config();

const {
  AGORA_CHANNEL_LIST_ENDPOINT,
  AGORA_REQUEST_RECORDING_ENDPOINT,
  AGORA_TOKEN_EXPIRY_SECONDS,
  AGORA_START_RECORDING_ENDPOINT,
  AGORA_STOP_RECORDING_ENDPOINT,
  AGORA_CHANNEL_USER_LIST_ENDPOINT,
} = require("./constants");
const { auth, db } = require("./firebase-config");
const {
  getAgoraCloudRecordingStartConfig,
  alphanumericToNumericUID,
  getS3BucketFilesList,
} = require("./utils");
const { processRecordingConversion } = require("./file-service");
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

    const bucketFilesList = (await getS3BucketFilesList()).map((i) => i.key);

    const liveChannels = [];
    const recordedChannels = [];

    firebaseData?.forEach((channel) => {
      const elem = agoraData?.data?.channels?.find(
        (c) => c.channel_name === channel.channel_name
      );
      if (elem) {
        liveChannels.push({ ...channel, ...elem });
      }

      bucketFilesList?.forEach((file) => {
        if (
          recordedChannels.findIndex(
            (c) => c.channel_name === channel.channel_name
          ) === -1 &&
          file.includes(channel.channel_name)
        ) {
          recordedChannels.push(channel);
        }
      });
    });

    return { live: liveChannels, recorded: recordedChannels };
  } catch (error) {
    console.error(error);
  }
};

const getActiveUsersInChannel = async (channelName) => {
  const url = AGORA_CHANNEL_USER_LIST_ENDPOINT.replace("APP_ID", appId).replace(
    "CHANNEL_NAME",
    channelName
  );

  const options = {
    method: "GET",
    headers: { Authorization: _getCredentials(), Accept: "application/json" },
  };

  try {
    let response = await fetch(url, options);

    return await response.json();
  } catch (error) {
    console.error(error);
  }
};

const requestCloudRecording = async (channelName, token, uid, targetUid) => {
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
        startParameter: getAgoraCloudRecordingStartConfig(token, targetUid),
      },
    }),
  };
  try {
    const response = await fetch(url, options);
    const data = await response.json();

    return data;
  } catch (error) {
    console.error(error);
  }
};

const startCloudRecording = async (
  resourceId,
  channelName,
  token,
  uid,
  targetUid
) => {
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
      clientRequest: getAgoraCloudRecordingStartConfig(token, targetUid),
    }),
  };
  try {
    const response = await fetch(url, options);
    const data = await response.json();

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
    const status = response.status;
    const data = await response.json();

    if (status !== 200) {
      throw data;
    } else {
      const channelFileList = (await getS3BucketFilesList(channelName)).map(
        (i) => i.url
      );
      const conversionRes = await processRecordingConversion(
        channelFileList,
        channelName
      );

      if (conversionRes) {
        return data;
      } else {
        throw data;
      }
    }
  } catch (error) {
    console.error(error);
  }
};

const listAllUsers = async (nextPageToken) => {
  try {
    const listUsersResult = await auth.listUsers(1000, nextPageToken);
    const users = listUsersResult.users
      .filter((userRecord) => !userRecord.customClaims?.admin)
      .map((userRecord) => ({
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

const createAdminUser = async (email, password) => {
  try {
    const userRecord = await auth.createUser({
      email: email,
      password: password,
    });
    auth.setCustomUserClaims(userRecord.uid, {
      admin: true,
    });
    return userRecord;
  } catch (error) {
    console.log("Error creating admin user:", error);
    return { error: error };
  }
};

const isUserAdmin = async (email) => {
  try {
    const userRecord = await auth.getUserByEmail(email);
    return userRecord?.customClaims?.admin;
  } catch (error) {
    console.log("Error fetching admin user:", error);
    return { error: error };
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

const autoStartCloudRecording = async (channelName, targetUid_) => {
  const targetUid = targetUid_?.toString() || targetUid_;

  // step 1 - get all users
  const users = await listAllUsers();
  console.log("users", users);

  // step 2 - map all uids to agora compatible integers
  const uids = users.map((user) => alphanumericToNumericUID(user.uid));
  console.log("uids", uids);

  // step 3 - generate a random uid to be used for recording requester which is not in uids
  let requesterUid = Math.floor(Math.random() * 10000);
  while (uids.includes(requesterUid)) {
    requesterUid = Math.floor(Math.random() * 10000);
  }
  requesterUid = requesterUid.toString();
  console.log("requesterUid", requesterUid);

  // step 4 - get token for requester
  const { token: requesterToken } = await getTokenWithUID(
    requesterUid,
    channelName
  );
  console.log("requesterToken", requesterToken);

  // step 5 - check if target user has already joined the channel
  const channelUsers = await getActiveUsersInChannel(channelName);
  console.log("channelUsers", channelUsers);
  if (
    !channelUsers?.data?.channel_exist ||
    !channelUsers?.data?.users?.includes(parseInt(targetUid))
  ) {
    console.log("user does not exists in the channel, failure");
    return null;
  }
  console.log("user exists in the channel, success");

  // step 6 - request recording
  const recordingResource = await requestCloudRecording(
    channelName,
    requesterToken,
    requesterUid,
    targetUid
  );
  console.log("recordingResource", recordingResource);

  // step 7 - start recording
  const recordingSid = await startCloudRecording(
    recordingResource.resourceId,
    channelName,
    requesterToken,
    requesterUid,
    targetUid
  );
  console.log("recordingSid", recordingSid);

  // step 8 - prepare data to return
  try {
    const resultant = {};
    resultant["resourceId"] = recordingResource.resourceId;
    resultant["sid"] = recordingSid?.sid;
    resultant["cname"] = recordingSid?.cname;
    resultant["requesterUid"] = requesterUid;
    resultant["requesterToken"] = requesterToken;
    resultant["targetUid"] = targetUid;

    return resultant;
  } catch (error) {
    console.error(error);
  }

  return null;
};

const getCloudMp3ByChannelId = async (channelId) => {
  return (await getS3BucketFilesList(channelId)).find((i) =>
    i.key.endsWith(".mp3")
  );
};

const updateUserData = async (
  uid,
  newName = undefined,
  newEmail = undefined,
  newPassword = undefined
) => {
  try {
    let userRecord =
      newName && (await auth.updateUser(uid, { displayName: newName }));
    userRecord =
      newEmail && (await auth.updateUser(uid, { displayName: newEmail }));
    userRecord =
      newPassword && (await auth.updateUser(uid, { displayName: newPassword }));

    return userRecord;
  } catch (error) {
    console.log("Error updating user data:", error);
    return { error: error };
  }
};

module.exports = {
  getTokenWithUID,
  getActiveChannelsList,
  getActiveUsersInChannel,
  requestCloudRecording,
  startCloudRecording,
  stopCloudRecording,
  listAllUsers,
  createAdminUser,
  isUserAdmin,
  addNewChannel,
  autoStartCloudRecording,
  getCloudMp3ByChannelId,
  updateUserData,
};
