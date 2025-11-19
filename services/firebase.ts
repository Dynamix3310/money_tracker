import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// 改成讀取環境變數，不再直接寫死
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

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