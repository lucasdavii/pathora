import { auth, db } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const formulario = document.querySelector(".formulario-cadastro");
const nome = document.querySelector("#nome");
const email = document.querySelector("#email");
const senha = document.querySelector("#senha");
const check_senha = document.querySelector("#confirmar-senha");
const termos = document.querySelector("input[name='termos']");

// Esse evento roda quando o usuário clica no botão "Criar conta".
formulario.addEventListener("submit", async function(evento) {
    // Isso impede o formulário de recarregar a página sozinho.
    // Assim quem controla o cadastro é o JavaScript.
    evento.preventDefault();

    // Aqui eu pego só o texto que o usuário digitou dentro de cada input.
    // O .trim() remove espaços sobrando no começo e no fim.
    const valorNome = nome.value.trim();
    const valorEmail = email.value.trim();
    const valorSenha = senha.value.trim();
    const valorConfirmarSenha = check_senha.value.trim();

    // Aqui eu confiro se o checkbox dos termos foi marcado.
    const termosAceitos = termos.checked;

    // Essa validação confere se algum campo ficou vazio.
    if (valorNome === "" || valorEmail === "" || valorSenha === "" || valorConfirmarSenha === "") {
        alert("Preencha todos os campos.");
        return;
    }

    // Essa validação confere se as duas senhas são iguais.
    if (valorSenha !== valorConfirmarSenha) {
        alert("As senhas não são iguais.");
        return;
    }

    // Essa validação confere se o usuário aceitou os termos.
    if (termosAceitos === false) {
        alert("Você precisa aceitar os termos.");
        return;
    }

    try {
        // Aqui o Firebase cria a conta usando email e senha.
        const credencial = await createUserWithEmailAndPassword(auth, valorEmail, valorSenha);

        // Aqui eu pego o usuário criado pelo Firebase.
        // O uid é o ID único desse usuário.
        const usuario = credencial.user;

        // Aqui eu salvo o nome no perfil do usuário dentro do Authentication.
        await updateProfile(usuario, {
            displayName: valorNome
        });

        // Aqui eu salvo os dados extras do usuário no Firestore.
        // A senha NÃO vai para o banco, ela fica protegida no Authentication.
        await setDoc(doc(db, "usuarios", usuario.uid), {
            nome: valorNome,
            email: valorEmail,
            criadoEm: serverTimestamp()
        });

        // Se chegou aqui, deu tudo certo.
        alert("Conta criada com sucesso!");

        // Como cadastro.html está dentro da pasta html, ./entrar.html leva para html/entrar.html.
        window.location.href = "./entrar.html";

    } catch (erro) {
        // Mostra o erro completo no console pra facilitar a correção.
        console.log(erro);

        // Aqui eu trato alguns erros comuns do Firebase com mensagens melhores.
        if (erro.code === "auth/email-already-in-use") {
            alert("Esse email já está cadastrado.");
        } else if (erro.code === "auth/weak-password") {
            alert("A senha precisa ter pelo menos 6 caracteres.");
        } else if (erro.code === "auth/invalid-email") {
            alert("Email inválido.");
        } else {
            alert("Erro ao criar conta: " + erro.message);
        }
    }
});