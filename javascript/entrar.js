import { auth } from "./firebase.js";

import {
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const formulario = document.querySelector(".formulario-entrar");
const email = document.querySelector("#email");
const senha = document.querySelector("#senha");
const btnMostrarSenha = document.querySelector(".toggle-senha");

// Esse evento roda quando o usuário clica no botão "Entrar".
formulario.addEventListener("submit", async function(evento) {
    // Impede o formulário de recarregar a página.
    // Assim quem controla o login é o JavaScript.
    evento.preventDefault();

    // Aqui eu pego o que o usuário digitou nos campos.
    const valorEmail = email.value.trim();
    const valorSenha = senha.value.trim();

    // Verifica se os campos estão vazios antes de tentar logar.
    if (valorEmail === "" || valorSenha === "") {
        alert("Preencha email e senha.");
        return;
    }

    try {
        // Aqui o Firebase tenta fazer login usando email e senha.
        await signInWithEmailAndPassword(auth, valorEmail, valorSenha);

        // Se chegou aqui, o login deu certo.
        alert("Login feito com sucesso!");

        // Como entrar.html está dentro da pasta html, ./modulo-ia.html leva para html/modulo-ia.html.
        window.location.href = "./modulo-ia.html";

    } catch (erro) {
        // Mostra o erro completo no console pra facilitar a correção.
        console.log(erro);

        // Aqui eu trato os erros mais comuns do Firebase.
        if (erro.code === "auth/invalid-credential") {
            alert("Email ou senha incorretos.");
        } else if (erro.code === "auth/invalid-email") {
            alert("Email inválido.");
        } else if (erro.code === "auth/user-not-found") {
            alert("Usuário não encontrado.");
        } else if (erro.code === "auth/wrong-password") {
            alert("Senha incorreta.");
        } else {
            alert("Erro ao entrar: " + erro.message);
        }
    }
});

// Esse trecho faz o botão "Mostrar" alternar entre mostrar e esconder a senha.
btnMostrarSenha.addEventListener("click", function() {
    if (senha.type === "password") {
        senha.type = "text";
        btnMostrarSenha.textContent = "Ocultar";
    } else {
        senha.type = "password";
        btnMostrarSenha.textContent = "Mostrar";
    }
});