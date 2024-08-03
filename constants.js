const AGORA_TOKEN_EXPIRY_SECONDS = 3600 * 24;

const AGORA_BASE_URL = "https://api.agora.io";

const AGORA_CHANNEL_LIST_ENDPOINT = `${AGORA_BASE_URL}/dev/v1/channel/APP_ID?page_size=500`;
const AGORA_CHANNEL_USER_LIST_ENDPOINT = `${AGORA_BASE_URL}/dev/v1/channel/user/APP_ID/CHANNEL_NAME`;

const AGORA_REQUEST_RECORDING_ENDPOINT = `${AGORA_BASE_URL}/v1/apps/APP_ID/cloud_recording/acquire`;
const AGORA_START_RECORDING_ENDPOINT = `${AGORA_BASE_URL}/v1/apps/APP_ID/cloud_recording/resourceid/RESOURCE_ID/mode/individual/start`;
const AGORA_STOP_RECORDING_ENDPOINT = `${AGORA_BASE_URL}/v1/apps/APP_ID/cloud_recording/resourceid/RESOURCE_ID/sid/SID/mode/individual/stop`;

const SWAGGER_OPTIONS = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "You2 Interviews API",
      version: "1.0.0",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development Server (Local)",
      },
      {
        url: "https://maggot-sound-evidently.ngrok-free.app",
        description: "Development Server (ngrok)",
      },
      {
        url: "https://allowed-iguana-tops.ngrok-free.app",
        description: "Production Server",
      },
    ],
  },

  apis: ["index.js"],
};

module.exports = {
  SWAGGER_OPTIONS,
  AGORA_TOKEN_EXPIRY_SECONDS,
  AGORA_CHANNEL_LIST_ENDPOINT,
  AGORA_CHANNEL_USER_LIST_ENDPOINT,
  AGORA_REQUEST_RECORDING_ENDPOINT,
  AGORA_START_RECORDING_ENDPOINT,
  AGORA_STOP_RECORDING_ENDPOINT,
};
