import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig: FirebaseOptions = {
  projectId: "agridetect-b3lh3",
  appId: "1:535616839449:web:ef1441f2d4ab5fa772af88",
  storageBucket: "agridetect-b3lh3.firebasestorage.app",
  apiKey: "AIzaSyALEKQ3W1na6gubE5WBu1NOAwNQrHO0ak8",
  authDomain: "agridetect-b3lh3.firebaseapp.com",
  messagingSenderId: "535616839449",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
