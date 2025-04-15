const firebaseConfig = {
    apiKey: "AIzaSyDJSYHuitCkQ9QheBj147HygjJoO6fjARk",
    authDomain: "travelgenie-9cf22.firebaseapp.com",
    projectId: "travelgenie-9cf22",
    storageBucket: "travelgenie-9cf22.firebasestorage.app",
    messagingSenderId: "62698712170",
    appId: "1:62698712170:web:3a14d59966ac9a8515ee13",
    measurementId: "G-HTG4FT7CPR"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();