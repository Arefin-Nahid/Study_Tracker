// Firebase web-app configuration for Study Tracker.
// Loaded by index.html as a normal script (no import/export), so it cannot cause module errors.
// These values are public identifiers, not secrets; data is protected by your Firestore rules.
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyAOUDKk5iBK8zwcIV-arsv9nQHnS3qOyOk",
  authDomain: "studytracker-fab75.firebaseapp.com",
  projectId: "studytracker-fab75",
  storageBucket: "studytracker-fab75.firebasestorage.app",
  messagingSenderId: "112345197317",
  appId: "1:112345197317:web:d9ac3b9d2e77f9effaa56c"
};

// AI plan (Gemini through Firebase AI Logic). Change only if Google retires a model name.
// The app tries the models in order and remembers the one that works.
window.AI_CONFIG = {
  version: "13.1.0",
  models: ["gemini-3.5-flash", "gemini-2.5-flash"]
};
