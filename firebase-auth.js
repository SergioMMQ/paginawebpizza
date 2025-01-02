// Importar Firebase y las funciones necesarias
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBV9-eyuQVff79BJmsYtPLl2SRKhXeyUZw",
    authDomain: "pizas-mushu-y-crepas-bella.firebaseapp.com",
    projectId: "pizas-mushu-y-crepas-bella",
    storageBucket: "pizas-mushu-y-crepas-bella.firebasestorage.app",
    messagingSenderId: "1045755902097",
    appId: "1:1045755902097:web:4a835fe205940d8f316730",
    measurementId: "G-L5DC3FSV8Y"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Referencias a los elementos del DOM
const userInfoDiv = document.getElementById('user-info');
const logoutBtn = document.getElementById('logout-btn');
const loginButton = document.getElementById('login-button');

// Verificar el estado de autenticación del usuario
onAuthStateChanged(auth, (user) => {
    if (user) {
        userInfoDiv.innerHTML = `<p>Usuario: ${user.email}</p>`;
        loginButton.style.display = "none";
        logoutBtn.style.display = "inline-block";
    } else {
        loginButton.style.display = "inline-block";
        logoutBtn.style.display = "none";
        userInfoDiv.innerHTML = "";
    }
});

// Lógica para cerrar sesión
logoutBtn.addEventListener('click', () => {
    signOut(auth)
        .then(() => {
            window.location.href = "index.html";
        })
        .catch((error) => {
            console.error("Error al cerrar sesión:", error);
        });
});
