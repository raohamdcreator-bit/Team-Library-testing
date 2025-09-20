// src/lib/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBcYB3tV69sMwrAITnx7nTTj_F6GoKQs8E",
  authDomain: "prompt-teams.firebaseapp.com",
  projectId: "prompt-teams",
  storageBucket: "prompt-teams.firebasestorage.app",
  messagingSenderId: "23790440707",
  appId: "1:23790440707:web:a1fc8818998437c21fd936",
  measurementId: "G-43GMTX4JY5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
