import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Configuração do Firebase que conecta o Pathora ao projeto criado no console.
const firebaseConfig = {
    apiKey: "AIzaSyBrGowGguPkfdKX5Viv0q05Sv94_Yo2AhE",
    authDomain: "pathora-d285b.firebaseapp.com",
    projectId: "pathora-d285b",
    storageBucket: "pathora-d285b.firebasestorage.app",
    messagingSenderId: "260362302253",
    appId: "1:260362302253:web:78b4523dd031d1761cd9a4",
    measurementId: "G-Q1QFQDXHZ8"
};
// Inicializa o Firebase no site.
const app = initializeApp(firebaseConfig);
// auth cuida de cadastro, login e usuário logado.
const auth = getAuth(app);
// db é a conexão com o banco Firestore.
const db = getFirestore(app);
// Exporta para cadastro.js, entrar.js e outros arquivos usarem.
export { auth, db };