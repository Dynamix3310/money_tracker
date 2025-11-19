import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Helper to get env vars with support for standard, CRA (REACT_APP_) and Vite (VITE_) prefixes
const getEnv = (key: string) => {
  let value = undefined;
  
  // 1. Try import.meta.env for Vite
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      value = import.meta.env[key] || import.meta.env[`VITE_${key}`] || import.meta.env[`REACT_APP_${key}`];
    }
  } catch (e) {}

  // 2. Try process.env for CRA/Node/Next.js
  if (!value) {
    try {
      if (typeof process !== 'undefined' && process.env) {
        value = process.env[key] || 
               process.env[`REACT_APP_${key}`] || 
               process.env[`VITE_${key}`];
      }
    } catch (e) {}
  }
  
  return value;
};

const firebaseConfig = {
  apiKey: getEnv("FIREBASE_API_KEY"),
  authDomain: getEnv("FIREBASE_AUTH_DOMAIN"),
  projectId: getEnv("FIREBASE_PROJECT_ID"),
  storageBucket: getEnv("FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnv("FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("FIREBASE_APP_ID"),
  measurementId: getEnv("FIREBASE_MEASUREMENT_ID")
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
  console.warn("Firebase Config missing. Please set VITE_FIREBASE_API_KEY in your environment.");
}

export { auth, db };

// Helper to determine collection path based on context (private vs group)
export const getCollectionPath = (userId: string, groupId: string | null, collectionName: string) => {
  const appId = 'wealthflow-stable-restore';
  // Assets are ALWAYS private
  if (['holdings', 'platforms', 'accounts', 'bankLogs', 'creditCards', 'cardLogs', 'history'].includes(collectionName)) {
    return `artifacts/${appId}/users/${userId}/${collectionName}`;
  }
  // Ledger items depend on Group context
  if (groupId) {
    return `artifacts/${appId}/groups/${groupId}/${collectionName}`;
  }
  // Default to private ledger if no group
  return `artifacts/${appId}/users/${userId}/${collectionName}`;
};