const crc32 = require("crc-32");

const alphanumericToNumericUID = (alphanumericUID) => {
  // if (alphanumericUID === "0") return "0";

  // return crc32.str(alphanumericUID) >>> 0;

  return alphanumericUID;
};

const getAgoraCloudRecordingStartConfig = (token, uid) => ({
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
    subscribeAudioUids: ["#allstream#"],
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
  alphanumericToNumericUID,
  getAgoraCloudRecordingStartConfig,
};
