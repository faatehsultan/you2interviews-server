require("dotenv").config();

const firebase = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

const app = firebase.initializeApp({
  credential: firebase.applicationDefault(),
});

const auth = getAuth(app);
const db = getFirestore(app);

module.exports = { auth, db };
