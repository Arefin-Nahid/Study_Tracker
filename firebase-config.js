// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAOUDKk5iBK8zwcIV-arsv9nQHnS3qOyOk",
  authDomain: "studytracker-fab75.firebaseapp.com",
  projectId: "studytracker-fab75",
  storageBucket: "studytracker-fab75.firebasestorage.app",
  messagingSenderId: "112345197317",
  appId: "1:112345197317:web:d9ac3b9d2e77f9effaa56c",
  measurementId: "G-703JFX0FJJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);