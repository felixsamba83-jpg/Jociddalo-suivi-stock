import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBtTybaTBCJcdcBYDw6iOwjICXxJT505V4",
  authDomain: "jociddalo-stock.firebaseapp.com",
  databaseURL: "https://jociddalo-stock-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "jociddalo-stock",
  storageBucket: "jociddalo-stock.firebasestorage.app",
  messagingSenderId: "378217374912",
  appId: "1:378217374912:web:85081aede393a3adf17925"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
