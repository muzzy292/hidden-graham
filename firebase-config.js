// ─────────────────────────────────────────────────────────────────────────────
// SETUP INSTRUCTIONS
// ─────────────────────────────────────────────────────────────────────────────
//
// 1. Go to https://console.firebase.google.com
// 2. Create a new project (e.g. "hidden-graham")
// 3. Add a Web app to the project
// 4. Copy the firebaseConfig values below from the Firebase console
// 5. Enable Authentication → Sign-in method → Google
// 6. Enable Firestore Database (start in production mode)
// 7. Set Firestore rules (see FIRESTORE_RULES.txt)
//
// This file contains only PUBLIC config values — safe to commit to GitHub.
// Your Claude API key is stored in Firestore, never here.
// ─────────────────────────────────────────────────────────────────────────────

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyC4HudfQ6ZRrJvkGDC-PFSgzx3Cqa6Mmbw",
  authDomain:        "totaldomination-a455b.firebaseapp.com",
  projectId:         "totaldomination-a455b",
  storageBucket:     "totaldomination-a455b.firebasestorage.app",
  messagingSenderId: "197083754338",
  appId:             "1:197083754338:web:f5bdb36470f837b969063b"
};

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE CALENDAR SETUP
// ─────────────────────────────────────────────────────────────────────────────
//
// 1. Go to https://console.cloud.google.com
// 2. Enable the Google Calendar API for your Firebase project
// 3. Create OAuth 2.0 credentials (Web application)
//    - Authorised JS origins: https://YOUR-GITHUB-USERNAME.github.io
// 4. Replace the values below
// ─────────────────────────────────────────────────────────────────────────────

const GAPI_CONFIG = {
  clientId:   "197083754338-0lme2dj37r1slfbhemkl316ncvrpp21k.apps.googleusercontent.com",
  apiKey:     "AIzaSyDe5E9WJJmcJ_BoKUWd9ZMh_WFxhZHzJK8",
  discoveryDoc: "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
  scopes:     "https://www.googleapis.com/auth/calendar.events"
};
