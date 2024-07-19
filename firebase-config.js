require("dotenv").config();

const firebase = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const app = firebase.initializeApp({
  credential: firebase.applicationDefault(),
});

const auth = getAuth(app);

module.exports = { auth };
