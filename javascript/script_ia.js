// Pathora - script da Cypher IA.
// Este arquivo controla envio de mensagens, escolha do modo de resposta, cálculo de risco e histórico.
// Os seletores principais foram mantidos para não quebrar o HTML atualizado.

import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    orderBy,
    getDocs,
    limit
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const btnenviar = document.querySelector(".btn-enviar")
const inputtxt = document.querySelector(".chat-input input")
const areamsg = document.querySelector(".chat-msg")
const valorRisco = document.querySelector(".valor-risco")
const cardRisco = document.querySelector(".risco-geral")
const btnCalcularRisco = document.querySelector(".btn-calcular-risco")
const inputTemperatura = document.querySelector("#temperatura")
const inputUmidade = document.querySelector("#umidade")
const selectChuva = document.querySelector("#chuva")
const selectModoIa = document.querySelector("#modo-ia")
const areaHistorico = document.querySelector(".lista-historico")

let historicoChat = []
let usuarioLogado = null

onAuthStateChanged(auth, async function(usuario) {
    usuarioLogado = usuario

    if (usuarioLogado) {
        await carregarHistorico()
        await carregarConversaFirebase()
    }
})

function limitarHistorico() {
    if (historicoChat.length > 20) {
        historicoChat = historicoChat.slice(-20)
    }
}

function criarMensagem(texto, tipo) {
    const mensagem = document.createElement("p")

    mensagem.textContent = texto

    if (tipo == "usuario") {
        mensagem.classList.add("msg-user")
    } else {
        mensagem.classList.add("msg-ia")
    }

    areamsg.appendChild(mensagem)
    areamsg.scrollTop = areamsg.scrollHeight
}

function removerPensando() {
    const mensagens = areamsg.querySelectorAll("p")
    const ultimaMensagem = mensagens[mensagens.length - 1]

    if (ultimaMensagem && (ultimaMensagem.textContent.includes("pensando") || ultimaMensagem.textContent.includes("calculando"))) {
        ultimaMensagem.remove()
    }
}

function atualizarRisco(nivel) {
    const risco = nivel.toLowerCase()

    cardRisco.classList.remove("risco-alto", "risco-medio", "risco-baixo")

    if (risco.includes("alto")) {
        valorRisco.textContent = "ALTO"
        cardRisco.classList.add("risco-alto")
    } else if (risco.includes("medio") || risco.includes("médio")) {
        valorRisco.textContent = "MÉDIO"
        cardRisco.classList.add("risco-medio")
    } else if (risco.includes("baixo")) {
        valorRisco.textContent = "BAIXO"
        cardRisco.classList.add("risco-baixo")
    }
}

async function salvarAnaliseNoFirebase(temperatura, umidade, chuva, resultado) {
    if (!usuarioLogado) {
        criarMensagem("Cypher: faça login para salvar o histórico da análise.", "ia")
        return
    }

    try {
        await addDoc(collection(db, "usuarios", usuarioLogado.uid, "analises"), {
            cidade: "Tianguá-CE",
            doenca: "Dengue",
            temperatura: temperatura,
            umidade: umidade,
            chuva: chuva,
            resultado: resultado,
            criadoEm: serverTimestamp()
        })

        console.log("Análise salva no Firestore com sucesso.")

        carregarHistorico()

    } catch (erro) {
        console.error("Erro ao salvar análise no Firestore:", erro)
        criarMensagem("Cypher: calculei o risco, mas não consegui salvar no histórico.", "ia")
    }
}

async function carregarHistorico() {
    if (!usuarioLogado || !areaHistorico) {
        return
    }

    try {
        const consulta = query(
            collection(db, "usuarios", usuarioLogado.uid, "analises"),
            orderBy("criadoEm", "desc")
        )

        const resultados = await getDocs(consulta)

        areaHistorico.innerHTML = ""

        if (resultados.empty) {
            areaHistorico.innerHTML = '<p class="historico-vazio">Nenhuma análise salva ainda.</p>'
            return
        }

        resultados.forEach(function(documento) {
            const analise = documento.data()

            areaHistorico.innerHTML += `
                <div class="card-historico">
                    <h3>${analise.doenca || "Análise epidemiológica"}</h3>
                    <p><strong>Cidade:</strong> ${analise.cidade || "Não informada"}</p>
                    <p><strong>Temperatura:</strong> ${analise.temperatura}°C</p>
                    <p><strong>Umidade:</strong> ${analise.umidade}%</p>
                    <p><strong>Chuva recente:</strong> ${analise.chuva ? "Sim" : "Não"}</p>
                    <p><strong>Resultado:</strong> ${analise.resultado}</p>
                </div>
            `
        })

    } catch (erro) {
        console.error("Erro ao carregar histórico:", erro)

        if (areaHistorico) {
            areaHistorico.innerHTML = '<p class="historico-vazio">Não foi possível carregar o histórico.</p>'
        }
    }
}

async function salvarMensagemChatFirebase(role, content) {
    if (!usuarioLogado) {
        console.log("Usuário não logado. Mensagem da Cypher não foi salva.")
        return
    }

    if (!content || content.trim() == "") {
        return
    }

    try {
        await addDoc(
            collection(
                db,
                "usuarios",
                usuarioLogado.uid,
                "conversas",
                "principal",
                "mensagens"
            ),
            {
                role: role,
                content: content,
                criadoEm: serverTimestamp()
            }
        )

        console.log("Mensagem da conversa salva no Firestore.")
    } catch (erro) {
        console.error("Erro ao salvar mensagem da conversa no Firestore:", erro)
    }
}

async function carregarConversaFirebase() {
    if (!usuarioLogado || !areamsg) {
        return
    }

    try {
        const consulta = query(
            collection(
                db,
                "usuarios",
                usuarioLogado.uid,
                "conversas",
                "principal",
                "mensagens"
            ),
            orderBy("criadoEm", "asc"),
            limit(30)
        )

        const resultados = await getDocs(consulta)

        if (resultados.empty) {
            return
        }

        historicoChat = []
        areamsg.innerHTML = ""

        resultados.forEach(function(documento) {
            const msg = documento.data()

            if (!msg.role || !msg.content) {
                return
            }

            historicoChat.push({
                role: msg.role,
                content: msg.content
            })

            if (msg.role == "user") {
                criarMensagem("Você: " + msg.content, "usuario")
            } else {
                criarMensagem("Cypher: " + msg.content, "ia")
            }
        })

        limitarHistorico()
        console.log("Conversa da Cypher carregada do Firestore.")
    } catch (erro) {
        console.error("Erro ao carregar conversa da Cypher:", erro)
    }
}

inputtxt.addEventListener("keypress", function(event) {
    if (event.key == "Enter") {
        btnenviar.click()
    }
})

btnenviar.addEventListener("click", async function() {
    const mensagem = inputtxt.value.trim()

    if (mensagem == "") {
        return
    }

    const modoIa = selectModoIa ? selectModoIa.value : "ollama"

    historicoChat.push({
        role: "user",
        content: mensagem
    })

    limitarHistorico()

    criarMensagem("Você: " + mensagem, "usuario")
    criarMensagem("Cypher: pensando...", "ia")

    await salvarMensagemChatFirebase("user", mensagem)

    inputtxt.value = ""

    fetch("http://127.0.0.1:5000/calcular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            mensagem: mensagem,
            modo: modoIa,
            historico: historicoChat
        })
    })

    .then(response => response.json())

    .then(async data => {
        removerPensando()

        criarMensagem("Cypher: " + data.resultado, "ia")

        historicoChat.push({
            role: "assistant",
            content: data.resultado
        })

        limitarHistorico()

        await salvarMensagemChatFirebase("assistant", data.resultado)
    })

    .catch(error => {
        removerPensando()

        criarMensagem("Cypher: não consegui conectar com o servidor Python.", "ia")
        console.error(error)
    })
})

btnCalcularRisco.addEventListener("click", async function() {
    const temperatura = Number(inputTemperatura.value)
    const umidade = Number(inputUmidade.value)
    const chuva = selectChuva.value == "true"

    if (inputTemperatura.value == "" || inputUmidade.value == "") {
        criarMensagem("Cypher: preencha temperatura e umidade antes de calcular o risco.", "ia")
        return
    }

    const mensagemRisco = "calcular risco com temperatura " + temperatura + "°C, umidade " + umidade + "% e chuva recente: " + selectChuva.value

    criarMensagem("Você: " + mensagemRisco, "usuario")
    criarMensagem("Cypher: calculando risco epidemiológico...", "ia")

    await salvarMensagemChatFirebase("user", mensagemRisco)

    historicoChat.push({
        role: "user",
        content: mensagemRisco
    })

    limitarHistorico()

    fetch("http://127.0.0.1:5000/calcular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            temperatura: temperatura,
            umidade: umidade,
            chuva: chuva,
            historico: historicoChat
        })
    })

    .then(response => response.json())

    .then(async data => {
        removerPensando()

        criarMensagem("Cypher: " + data.resultado, "ia")

        historicoChat.push({
            role: "assistant",
            content: data.resultado
        })

        limitarHistorico()

        atualizarRisco(data.resultado)

        await salvarMensagemChatFirebase("assistant", data.resultado)
        await salvarAnaliseNoFirebase(temperatura, umidade, chuva, data.resultado)
    })

    .catch(error => {
        removerPensando()

        criarMensagem("Cypher: não consegui calcular o risco. Verifique se o servidor Python está ligado.", "ia")
        console.error(error)
    })
})