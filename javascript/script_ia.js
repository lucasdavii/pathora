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
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const btnenviar = document.querySelector(".btn-enviar") // aqui vou ta criando uma variavel fixa pro botao q vou usar para enviar a msg no chat
const inputtxt = document.querySelector(".chat-input input") // aqui vou ta criando a variavel fixa pro input q vou digitar a mensagem para enviar para a ia
const areamsg = document.querySelector(".chat-msg") // aqui vou ta criando a variavel fixa para a area das mensagens, onde vai acontecer a interação entre o usuario e ia
const valorRisco = document.querySelector(".valor-risco") // aqui pego o texto do card de nivel de risco pra atualizar ele pelo js
const cardRisco = document.querySelector(".risco-geral") // aqui pego o card inteiro do risco, pq agora ele tambem vai mudar de cor
const btnCalcularRisco = document.querySelector(".btn-calcular-risco") // aqui vou ta pegando o botao q calcula o risco epidemiologico
const inputTemperatura = document.querySelector("#temperatura") // aqui vou ta pegando o input onde o usuario digita a temperatura
const inputUmidade = document.querySelector("#umidade") // aqui vou ta pegando o input onde o usuario digita a umidade
const selectChuva = document.querySelector("#chuva") // aqui vou ta pegando o select onde o usuario escolhe se choveu recentemente ou nao
const selectModoIa = document.querySelector("#modo-ia") // aqui vou ta pegando o select onde o usuario escolhe qual IA vai responder: ollama, gemini ou groq
const areaHistorico = document.querySelector(".lista-historico") // aqui pego a area onde o historico das analises vai aparecer

let historicoChat = [] // aqui vou guardar o historico da conversa, para ollama, gemini e groq lembrarem do contexto
let usuarioLogado = null // aqui vou guardar o usuario que esta logado no Firebase

onAuthStateChanged(auth, function(usuario) {
    usuarioLogado = usuario // quando o Firebase confirmar o login, eu salvo o usuario aqui

    if (usuarioLogado) {
        carregarHistorico() // se tiver usuario logado, ja carrega as analises antigas dele
    }
})

function limitarHistorico() { // essa função serve para o historico nao ficar gigante e pesado com muitas mensagens
    if (historicoChat.length > 20) { // se tiver mais de 20 mensagens salvas
        historicoChat = historicoChat.slice(-20) // aqui eu mantenho somente as ultimas 20 mensagens da conversa
    }
}

function criarMensagem(texto, tipo) { // essa função cria uma mensagem no chat sem precisar ficar usando innerHTML toda hora
    const mensagem = document.createElement("p") // aqui eu crio uma tag p pelo javascript

    mensagem.textContent = texto // aqui eu coloco o texto dentro da mensagem usando textContent, que é mais seguro que innerHTML

    if (tipo == "usuario") { // se o tipo for usuario
        mensagem.classList.add("msg-user") // adiciona a classe que deixa o balão do usuario do lado direito
    } else { // se nao for usuario, vai ser mensagem da ia
        mensagem.classList.add("msg-ia") // adiciona a classe que deixa o balão da Cypher do lado esquerdo
    }

    areamsg.appendChild(mensagem) // aqui eu coloco a mensagem nova dentro da area do chat
    areamsg.scrollTop = areamsg.scrollHeight // aqui o chat desce automaticamente para a ultima mensagem
}

function removerPensando() { // essa função remove a ultima mensagem temporaria da IA
    const mensagens = areamsg.querySelectorAll("p") // aqui eu pego todas as mensagens que existem no chat
    const ultimaMensagem = mensagens[mensagens.length - 1] // aqui eu pego a ultima mensagem da lista

    if (ultimaMensagem && (ultimaMensagem.textContent.includes("pensando") || ultimaMensagem.textContent.includes("calculando"))) {
        ultimaMensagem.remove() // remove a mensagem temporaria da tela
    }
}

function atualizarRisco(nivel) { // essa função troca o texto e a cor do card de risco
    const risco = nivel.toLowerCase() // transforma o texto em minusculo pra facilitar a comparação

    cardRisco.classList.remove("risco-alto", "risco-medio", "risco-baixo") // remove as classes antigas antes de colocar a nova

    if (risco.includes("alto")) { // se o texto tiver alto
        valorRisco.textContent = "ALTO" // mostra ALTO no card
        cardRisco.classList.add("risco-alto") // deixa o card vermelho
    } else if (risco.includes("medio") || risco.includes("médio")) { // se o texto tiver medio ou médio
        valorRisco.textContent = "MÉDIO" // mostra MÉDIO no card
        cardRisco.classList.add("risco-medio") // deixa o card amarelo
    } else if (risco.includes("baixo")) { // se o texto tiver baixo
        valorRisco.textContent = "BAIXO" // mostra BAIXO no card
        cardRisco.classList.add("risco-baixo") // deixa o card azul/ciano
    }
}

async function salvarAnaliseNoFirebase(temperatura, umidade, chuva, resultado) {
    if (!usuarioLogado) { // se nao tiver usuario logado, nao tem como salvar no documento certo
        criarMensagem("Cypher: faça login para salvar o histórico da análise.", "ia")
        return
    }

    try {
        // aqui eu salvo a analise dentro do usuario logado
        // caminho: usuarios / uidDoUsuario / analises / idAutomatico
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

        carregarHistorico() // depois de salvar, atualiza o historico na tela

    } catch (erro) {
        console.error("Erro ao salvar análise no Firestore:", erro)
        criarMensagem("Cypher: calculei o risco, mas não consegui salvar no histórico.", "ia")
    }
}

async function carregarHistorico() {
    if (!usuarioLogado || !areaHistorico) { // se nao tiver usuario logado ou se a area do historico nao existir no HTML, para aqui
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

inputtxt.addEventListener("keypress", function(event) { // quando o usuario apertar alguma tecla dentro do input do chat, essa função roda
    if (event.key == "Enter") { // se a tecla apertada for Enter
        btnenviar.click() // o JS clica automaticamente no botao enviar
    }
})

btnenviar.addEventListener("click", function() {
    const mensagem = inputtxt.value.trim() // essa variavel mensagem ta guardando o texto que o usuario digitou no input e tirando espaços vazios

    if (mensagem == "") { // aqui eu verifico se a mensagem ta vazia, pra nao enviar mensagem em branco pra ia
        return // se tiver vazia, o return para a função aqui mesmo
    }

    const modoIa = selectModoIa ? selectModoIa.value : "ollama" // aqui eu pego o modo de IA escolhido; se o select nao existir, o padrão vai ser ollama

    historicoChat.push({ // aqui eu salvo a mensagem do usuario no historico antes de mandar para a IA
        role: "user", // role user significa que essa mensagem veio do usuario
        content: mensagem // content guarda o texto que o usuario digitou
    })

    limitarHistorico() // aqui eu limito o historico para nao mandar coisa demais para a API

    criarMensagem("Você: " + mensagem, "usuario") // aqui adiciona a mensagem do usuario no chat com balão do lado direito
    criarMensagem("Cypher: pensando...", "ia") // aqui eu mostro uma mensagem temporaria enquanto a IA gera a resposta

    inputtxt.value = "" // aqui eu limpo o input depois que o usuario envia a mensagem, pra ele poder escrever outra

    fetch("http://127.0.0.1:5000/calcular", { // fetch é o mensageiro, ele manda a mensagem do js para o servidor python/flask
        method: "POST", // POST significa que o js vai enviar dados para o python
        headers: { "Content-Type": "application/json" }, // aqui eu aviso pro python que os dados estão indo em formato JSON
        body: JSON.stringify({
            mensagem: mensagem, // aqui eu mando a mensagem que o usuario digitou
            modo: modoIa, // aqui eu mando qual IA o usuario escolheu: ollama, gemini ou groq
            historico: historicoChat // aqui eu mando o historico completo da conversa para a IA lembrar do contexto
        }) // aqui eu transformo a mensagem, o modo e o historico em JSON, que é o formato que o python entende
    })

    .then(response => response.json()) // quando o python responder, isso transforma a resposta em objeto javascript

    .then(data => { // depois que transformar, o data guarda a resposta que veio do python
        removerPensando() // aqui eu removo a mensagem temporaria de pensando

        criarMensagem("Cypher: " + data.resultado, "ia") // aqui aparece a resposta da Cypher no chat com balão da IA

        historicoChat.push({ // aqui eu salvo a resposta da IA no historico tambem
            role: "assistant", // role assistant significa que essa mensagem veio da IA
            content: data.resultado // content guarda a resposta que a Cypher mandou
        })

        limitarHistorico() // aqui eu limito de novo depois de salvar a resposta da IA
    })

    .catch(error => { // se der erro na conexão com o python, esse bloco roda
        removerPensando() // aqui remove o pensando para nao ficar travado na tela

        criarMensagem("Cypher: não consegui conectar com o servidor Python.", "ia") // mensagem de erro pro usuario saber oq aconteceu
        console.error(error) // aqui eu mostro o erro real no console, pra facilitar descobrir o problema
    })
}) // o addEventListener sempre recebe o evento e a função que vai acontecer quando o evento for ativado

btnCalcularRisco.addEventListener("click", function() { // quando o usuario clicar no botao de calcular risco, essa função vai rodar
    const temperatura = Number(inputTemperatura.value) // aqui pega o valor da temperatura e transforma em numero, pq input vem como texto
    const umidade = Number(inputUmidade.value) // aqui pega o valor da umidade e transforma em numero tambem
    const chuva = selectChuva.value == "true" // aqui transforma o valor do select em true ou false, pra bater com o python

    if (inputTemperatura.value == "" || inputUmidade.value == "") { // aqui verifica se o usuario deixou temperatura ou umidade vazia
        criarMensagem("Cypher: preencha temperatura e umidade antes de calcular o risco.", "ia") // se tiver vazio, a Cypher avisa no chat
        return // para a função aqui pra nao mandar dados incompletos pro python
    }

    const mensagemRisco = "calcular risco com temperatura " + temperatura + "°C, umidade " + umidade + "% e chuva recente: " + selectChuva.value // aqui eu crio uma mensagem explicando o calculo que o usuario pediu

    criarMensagem("Você: " + mensagemRisco, "usuario") // aqui mostra no chat os dados que o usuario mandou calcular
    criarMensagem("Cypher: calculando risco epidemiológico...", "ia") // aqui mostra uma mensagem temporaria enquanto calcula

    historicoChat.push({ // aqui eu salvo o pedido de calculo de risco no historico tambem
        role: "user", // role user porque foi uma ação/pedido do usuario
        content: mensagemRisco // aqui fica salvo o texto do calculo de risco
    })

    limitarHistorico() // aqui eu limito o historico para nao ficar pesado

    fetch("http://127.0.0.1:5000/calcular", { // aqui o js chama a mesma rota /calcular do flask, mas agora mandando dados climaticos
        method: "POST", // POST porque estamos enviando temperatura, umidade e chuva para o servidor
        headers: { "Content-Type": "application/json" }, // avisa que os dados estão indo em JSON
        body: JSON.stringify({
            temperatura: temperatura, // aqui manda a temperatura para o python calcular o risco
            umidade: umidade, // aqui manda a umidade para o python calcular o risco
            chuva: chuva, // aqui manda se choveu recentemente ou nao
            historico: historicoChat // aqui mando o historico tambem, pra IA saber o que ja foi conversado
        }) // aqui manda os dados para o python calcular o risco
    })

    .then(response => response.json()) // quando o servidor python responder, transforma a resposta em objeto JS

    .then(async data => { // data guarda a resposta que veio do python
        removerPensando() // aqui eu removo a mensagem temporaria de calculando

        criarMensagem("Cypher: " + data.resultado, "ia") // aqui mostra o resultado do calculo de risco no chat

        historicoChat.push({ // aqui eu salvo a resposta do calculo no historico tambem
            role: "assistant", // role assistant porque a resposta veio da Cypher
            content: data.resultado // aqui salvo o resultado do calculo
        })

        limitarHistorico() // aqui eu limito o historico depois de salvar a resposta

        atualizarRisco(data.resultado) // aqui troca o card para vermelho, amarelo ou azul de acordo com o texto que veio do python

        await salvarAnaliseNoFirebase(temperatura, umidade, chuva, data.resultado) // aqui salvo a analise no Firestore
    })

    .catch(error => { // se der erro, tipo o python estar desligado, esse bloco aparece
        removerPensando() // remove a mensagem de calculando para nao ficar parada na tela

        criarMensagem("Cypher: não consegui calcular o risco. Verifique se o servidor Python está ligado.", "ia")
        console.error(error) // aqui eu mostro o erro real no console, pra facilitar descobrir o problema
    })
})