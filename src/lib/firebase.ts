import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBSfHugjPJ52QBQSuHWt9iGBFhq6wBoh5g",
  authDomain: "hotel-7ac9f.firebaseapp.com",
  projectId: "hotel-7ac9f",
  storageBucket: "hotel-7ac9f.appspot.com",
  messagingSenderId: "102297833385",
  appId: "1:102297833385:web:f5605f4331c2b5f7173eb8",
  measurementId: "G-1TZYLRZXES"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
