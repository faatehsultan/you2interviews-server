const crc32 = require("crc-32");
const AWS = require("aws-sdk");

// Configure AWS SDK with your environment variables
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

async function getS3BucketFilesList(channelName = null) {
  const bucketName = process.env.AWS_S3_BUCKET_NAME;

  const params = {
    Bucket: bucketName,
  };

  try {
    const data = await s3.listObjectsV2(params).promise();
    let files = data.Contents.map((item) => ({
      key: item.Key,
      url: s3.getSignedUrl("getObject", {
        Bucket: bucketName,
        Key: item.Key,
      }),
    }));
    if (channelName) {
      files = files.filter((file) => file.key.includes(channelName));
    }
    return files;
  } catch (error) {
    console.error("Error fetching file list:", error);
    throw error;
  }
}

const alphanumericToNumericUID = (alphanumericUID) =>
  alphanumericUID === "0" ? "0" : crc32.str(alphanumericUID) >>> 0;

const getAgoraCloudRecordingStartConfig = (token, targetUid) => ({
  token: token,
  storageConfig: {
    vendor: 1,
    region: 25,
    bucket: process.env.AWS_S3_BUCKET_NAME,
    accessKey: process.env.AWS_ACCESS_KEY_ID,
    secretKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  recordingConfig: {
    maxIdleTime: 30,
    channelType: 0,
    streamTypes: 0,
    subscribeAudioUids: targetUid ? [targetUid] : ["#allstream#"],
    subscribeUidGroup: 0,
    streamMode: "original",
  },
  // recordingFileConfig: {
  //   avFileType: ["hls"],
  // },
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

  // appsCollection: {
  //   combinationPolicy: "default",
  // },
  // transcodeOptions: {
  //   transConfig: {
  //     transMode: "audioMix",
  //   },
  //   container: {
  //     format: "mp3",
  //   },
  //   audio: {
  //     sampleRate: "48000",
  //     bitrate: "48000",
  //     channels: "2",
  //   },
  // },
});

module.exports = {
  getS3BucketFilesList,
  alphanumericToNumericUID,
  getAgoraCloudRecordingStartConfig,
};
