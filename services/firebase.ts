
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Augment ImportMeta to fix TS error regarding 'env' property
declare global {
  interface ImportMeta {
    env: any;
  }
}

// Initialize Firebase
// We use guarded access (import.meta.env && ...) to prevent crashes in environments where import.meta.env is undefined.
// We also include process.env fallbacks for compatibility.
// Note: We must reference the VITE_ keys explicitly for Vite to perform build-time replacement.

const firebaseConfig = {
  apiKey: (import.meta.env && import.meta.env.VITE_FIREBASE_API_KEY) || (typeof process !== 'undefined' && process.env && process.env.VITE_FIREBASE_API_KEY),
  authDomain: (import.meta.env && import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) || (typeof process !== 'undefined' && process.env && process.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: (import.meta.env && import.meta.env.VITE_FIREBASE_PROJECT_ID) || (typeof process !== 'undefined' && process.env && process.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: (import.meta.env && import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) || (typeof process !== 'undefined' && process.env && process.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: (import.meta.env && import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID) || (typeof process !== 'undefined' && process.env && process.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: (import.meta.env && import.meta.env.VITE_FIREBASE_APP_ID) || (typeof process !== 'undefined' && process.env && process.env.VITE_FIREBASE_APP_ID),
  measurementId: (import.meta.env && import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) || (typeof process !== 'undefined' && process.env && process.env.VITE_FIREBASE_MEASUREMENT_ID)
};

let app;
let auth: any = null;
let db: any = null;

// Only initialize if we have an API Key to prevent immediate crash
if (firebaseConfig.apiKey) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error("Firebase Initialization Error:", error);
  }
} else {
  console.warn("Firebase Config missing. VITE_FIREBASE_API_KEY not found in environment.");
}

export { auth, db };

const APP_ID = 'wealthflow-stable-restore';

// Helper to determine collection path based on context (private vs group)
export const getCollectionPath = (userId: string, groupId: string | null, collectionName: string) => {
  // Assets are ALWAYS private
  if (['holdings', 'platforms', 'accounts', 'bankLogs', 'creditCards', 'cardLogs', 'history'].includes(collectionName)) {
    return `artifacts/${APP_ID}/users/${userId}/${collectionName}`;
  }
  // Ledger items depend on Group context
  if (groupId) {
    return `artifacts/${APP_ID}/groups/${groupId}/${collectionName}`;
  }
  // Default to private ledger if no group
  return `artifacts/${APP_ID}/users/${userId}/${collectionName}`;
};

export const getUserProfilePath = (uid: string) => `artifacts/${APP_ID}/users/${uid}`;
export const getGroupMetaPath = (groupId: string) => `artifacts/${APP_ID}/groups/${groupId}`;
