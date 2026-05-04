import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAsfkKZTgY-Q15bTgosJzmZucN6CksACRo",
  authDomain: "aruma-cafe.firebaseapp.com",
  projectId: "aruma-cafe",
  storageBucket: "aruma-cafe.firebasestorage.app",
  messagingSenderId: "1092150504121",
  appId: "1:1092150504121:web:7f64f89fb87319118c8968"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export { app, firebaseConfig };
export const auth = getAuth(app);
export const db   = getFirestore(app);
