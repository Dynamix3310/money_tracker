import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD8_09Vq_F1udK11L0FSvcyoKUayveSF50",
  authDomain: "wealthflow-nice.firebaseapp.com",
  projectId: "wealthflow-nice",
  storageBucket: "wealthflow-nice.firebasestorage.app",
  messagingSenderId: "708790786998",
  appId: "1:708790786998:web:1880747ff6fccc0524ff17",
  measurementId: "G-E1RD2CY9H4"
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