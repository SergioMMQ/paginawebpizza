// Importar Firebase Authentication
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

// Inicializar el servicio de autenticación
const auth = getAuth();

// Obtener referencias a los elementos del DOM
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const messageDiv = document.getElementById('message');

// Función para mostrar mensajes
const showMessage = (message, isError = false) => {
  messageDiv.textContent = message;
  messageDiv.style.color = isError ? 'red' : 'green';
};

// Lógica para el botón "Iniciar Sesión"
loginBtn.addEventListener('click', () => {
  const email = emailInput.value;
  const password = passwordInput.value;

  // Iniciar sesión con Firebase Authentication
  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      showMessage(`¡Bienvenido, ${user.email}!`);
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      showMessage(`Error: ${errorMessage}`, true);
    });
});

// Lógica para el botón "Registrarse"
signupBtn.addEventListener('click', () => {
  const email = emailInput.value;
  const password = passwordInput.value;

  // Registrar nuevo usuario con Firebase Authentication
  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      showMessage(`Usuario registrado: ${user.email}`);
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      showMessage(`Error: ${errorMessage}`, true);
    });
});
