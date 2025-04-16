// Firebase configuration and initialization
const firebaseConfig = {
    apiKey: "AIzaSyDJSYHuitCkQ9QheBj147HygjJoO6fjARk",
    authDomain: "travelgenie-9cf22.firebaseapp.com",
    databaseURL: "https://travelgenie-9cf22-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "travelgenie-9cf22",
    storageBucket: "travelgenie-9cf22.firebasestorage.app",
    messagingSenderId: "62698712170",
    appId: "1:62698712170:web:3a14d59966ac9a8515ee13",
    measurementId: "G-HTG4FT7CPR"
  };
  
  // Initialize Firebase
  const app = firebase.initializeApp(firebaseConfig);
  
  // Initialize services
  const auth = app.auth();
  const db = app.database();
  const storage = app.storage();
  