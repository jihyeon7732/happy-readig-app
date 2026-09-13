import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

/** 교사 계정으로 로그인. Firestore 규칙이 이 계정만 채점 권한으로 인정합니다. */
export const signInTeacher = (email, password) =>
  signInWithEmailAndPassword(auth, email.trim(), password);

/** 학생은 익명 인증으로 접속하고, 신원은 명단 대조로 확인합니다. */
export const signInStudentAnon = () => signInAnonymously(auth);

export const signOutAll = () => signOut(auth);

export const watchAuth = (cb) => onAuthStateChanged(auth, cb);
