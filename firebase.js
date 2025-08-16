// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDKuA-SdYpLKGh58vLyG0NqPYp21OR5utU",
  authDomain: "armazenamentodevideo.firebaseapp.com",
  projectId: "armazenamentodevideo",
  storageBucket: "armazenamentodevideo.firebasestorage.app",
  messagingSenderId: "595080056859",
  appId: "1:595080056859:web:ffe89475a382650bcda8be",
  measurementId: "G-HQ247500DR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);