// src/lib/firebase.js - SECURE VERSION
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ✅ SECURE: Load config from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate that all required config values are present
const requiredConfigKeys = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId'
];

const missingKeys = requiredConfigKeys.filter(key => !firebaseConfig[key]);

if (missingKeys.length > 0) {
  console.error('❌ Missing Firebase configuration keys:', missingKeys);
  throw new Error(
    `Missing required Firebase configuration. Please check your .env file. Missing: ${missingKeys.join(', ')}`
  );
}

// Log configuration status (without exposing sensitive values)
if (import.meta.env.DEV) {
  console.log('🔥 Firebase Configuration Status:');
  console.log('✓ API Key:', firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : '❌ Missing');
  console.log('✓ Auth Domain:', firebaseConfig.authDomain || '❌ Missing');
  console.log('✓ Project ID:', firebaseConfig.projectId || '❌ Missing');
  console.log('✓ Storage Bucket:', firebaseConfig.storageBucket || '❌ Missing');
}

// Initialize Firebase
let app;
let analytics;
let auth;
let db;

try {
  app = initializeApp(firebaseConfig);
  
  // Initialize Analytics only in production and if measurement ID exists
  if (!import.meta.env.DEV && firebaseConfig.measurementId) {
    analytics = getAnalytics(app);
  }
  
  // Initialize Auth and Firestore
  auth = getAuth(app);
  db = getFirestore(app);
  
  // Configure Auth settings
  auth.languageCode = 'en';
  
  if (import.meta.env.DEV) {
    console.log('✅ Firebase initialized successfully');
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  throw new Error('Failed to initialize Firebase. Please check your configuration.');
}

// Export initialized instances
export { app, analytics, auth, db };

// Export helper functions for Firebase operations
export const FirebaseHelpers = {
  /**
   * Check if Firebase is properly initialized
   */
  isInitialized() {
    return !!(app && auth && db);
  },

  /**
   * Get current environment
   */
  getEnvironment() {
    return import.meta.env.MODE || 'development';
  },

  /**
   * Check if running in development mode
   */
  isDevelopment() {
    return import.meta.env.DEV;
  },

  /**
   * Get project information (safe for logging)
   */
  getProjectInfo() {
    return {
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
      environment: this.getEnvironment()
    };
  }
};

// Optional: Add connection state monitoring
if (import.meta.env.DEV) {
  import('firebase/firestore').then(({ onSnapshot, collection }) => {
    // Monitor connection state
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log('🔐 User authenticated:', user.email);
      } else {
        console.log('🔓 User not authenticated');
      }
    });
  });
}

export default app;
