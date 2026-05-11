const btnenviar = document.querySelector(".btn-enviar") // aqui vou ta criando uma variavel fixa pro botao q vou usar para enviar a msg no chat
const inputtxt = document.querySelector(".chat-input input") // aqui vou ta criando a variavel fixa pro input q vou digitar a mensagem para enviar para a ia
const areamsg = document.querySelector(".chat-msg") // aqui vou ta criando a variavel fixa para a area das mensagens, onde vai acontecer a interação entre o usuario e ia
const valorRisco = document.querySelector(".valor-risco") // aqui pego o texto do card de nivel de risco pra atualizar ele pelo js
const btnCalcularRisco = document.querySelector(".btn-calcular-risco") // aqui vou ta pegando o botao q calcula o risco epidemiologico
const inputTemperatura = document.querySelector("#temperatura") // aqui vou ta pegando o input onde o usuario digita a temperatura
const inputUmidade = document.querySelector("#umidade") // aqui vou ta pegando o input onde o usuario digita a umidade
const selectChuva = document.querySelector("#chuva") // aqui vou ta pegando o select onde o usuario escolhe se choveu recentemente ou nao
const selectModoIa = document.querySelector("#modo-ia") // aqui vou ta pegando o select onde o usuario escolhe qual IA vai responder: ollama, gemini ou groq

let historicoChat = [] // aqui vou guardar o historico da conversa, para ollama, gemini e groq lembrarem do contexto

function limitarHistorico() { // essa função serve para o historico nao ficar gigante e pesado com muitas mensagens
    if (historicoChat.length > 20) { // se tiver mais de 20 mensagens salvas
        historicoChat = historicoChat.slice(-20) // aqui eu mantenho somente as ultimas 20 mensagens da conversa
    }
}

inputtxt.addEventListener("keypress", function(event) { // quando o usuario apertar alguma tecla dentro do input do chat, essa função roda
    if (event.key == "Enter") { // se a tecla apertada for Enter
        btnenviar.click() // o JS clica automaticamente no botao enviar
    }
})

btnenviar.addEventListener("click", function() {
    const mensagem = inputtxt.value // essa variavel mensagem ta guardando o texto que o usuario digitou no input

    if (mensagem == "") { // aqui eu verifico se a mensagem ta vazia, pra nao enviar mensagem em branco pra ia
        return // se tiver vazia, o return para a função aqui mesmo
    }

    const modoIa = selectModoIa ? selectModoIa.value : "ollama" // aqui eu pego o modo de IA escolhido; se o select nao existir, o padrão vai ser ollama

    historicoChat.push({ // aqui eu salvo a mensagem do usuario no historico antes de mandar para a IA
        role: "user", // role user significa que essa mensagem veio do usuario
        content: mensagem // content guarda o texto que o usuario digitou
    })

    limitarHistorico() // aqui eu limito o historico para nao mandar coisa demais para a API

    areamsg.innerHTML += "<p>Você: " + mensagem + "</p>" // aqui adiciona a mensagem do usuario dentro do chat, sem apagar as mensagens antigas
    areamsg.innerHTML += "<p>Cypher: pensando...</p>" // aqui eu mostro uma mensagem temporaria enquanto a IA gera a resposta

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
        const mensagensPensando = areamsg.querySelectorAll("p") // aqui eu pego todas as mensagens do chat
        mensagensPensando[mensagensPensando.length - 1].remove() // aqui eu removo a ultima mensagem, que era o "Cypher: pensando..."

        areamsg.innerHTML += "<p>Cypher: " + data.resultado + "</p>" // aqui aparece a resposta da Cypher no chat

        historicoChat.push({ // aqui eu salvo a resposta da IA no historico tambem
            role: "assistant", // role assistant significa que essa mensagem veio da IA
            content: data.resultado // content guarda a resposta que a Cypher mandou
        })

        limitarHistorico() // aqui eu limito de novo depois de salvar a resposta da IA
    })

    .catch(error => { // se der erro na conexão com o python, esse bloco roda
        const mensagensPensando = areamsg.querySelectorAll("p") // aqui eu pego todas as mensagens do chat
        mensagensPensando[mensagensPensando.length - 1].remove() // aqui eu removo a mensagem de "pensando..." para nao ficar travada na tela

        areamsg.innerHTML += "<p>Cypher: não consegui conectar com o servidor Python.</p>" // mensagem de erro pro usuario saber oq aconteceu
        console.error(error) // aqui eu mostro o erro real no console, pra facilitar descobrir o problema
    })
}) // o addEventListener sempre recebe o evento e a função que vai acontecer quando o evento for ativado

btnCalcularRisco.addEventListener("click", function() { // quando o usuario clicar no botao de calcular risco, essa função vai rodar
    const temperatura = Number(inputTemperatura.value) // aqui pega o valor da temperatura e transforma em numero, pq input vem como texto
    const umidade = Number(inputUmidade.value) // aqui pega o valor da umidade e transforma em numero tambem
    const chuva = selectChuva.value == "true" // aqui transforma o valor do select em true ou false, pra bater com o python

    if (inputTemperatura.value == "" || inputUmidade.value == "") { // aqui verifica se o usuario deixou temperatura ou umidade vazia
        areamsg.innerHTML += "<p>Cypher: preencha temperatura e umidade antes de calcular o risco.</p>" // se tiver vazio, a Cypher avisa no chat
        return // para a função aqui pra nao mandar dados incompletos pro python
    }

    const mensagemRisco = "calcular risco com temperatura " + temperatura + "°C, umidade " + umidade + "% e chuva recente: " + selectChuva.value // aqui eu crio uma mensagem explicando o calculo que o usuario pediu

    areamsg.innerHTML += "<p>Você: " + mensagemRisco + "</p>" // aqui mostra no chat os dados que o usuario mandou calcular

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

    .then(data => { // data guarda a resposta que veio do python
        areamsg.innerHTML += "<p>Cypher: " + data.resultado + "</p>" // aqui mostra o resultado do calculo de risco no chat

        historicoChat.push({ // aqui eu salvo a resposta do calculo no historico tambem
            role: "assistant", // role assistant porque a resposta veio da Cypher
            content: data.resultado // aqui salvo o resultado do calculo
        })

        limitarHistorico() // aqui eu limito o historico depois de salvar a resposta

        if (data.resultado.includes("Alto risco")) { // se a resposta do python tiver escrito Alto risco
            valorRisco.innerHTML = "ALTO" // troca o texto do card principal para ALTO
        } else if (data.resultado.includes("Médio risco")) { // se a resposta do python tiver escrito Médio risco
            valorRisco.innerHTML = "MÉDIO" // troca o texto do card principal para MÉDIO
        } else if (data.resultado.includes("Baixo risco")) { // se a resposta do python tiver escrito Baixo risco
            valorRisco.innerHTML = "BAIXO" // troca o texto do card principal para BAIXO
        }
    })

    .catch(error => { // se der erro, tipo o python estar desligado, esse bloco aparece
        areamsg.innerHTML += "<p>Cypher: não consegui calcular o risco. Verifique se o servidor Python está ligado.</p>"
        console.error(error) // aqui eu mostro o erro real no console, pra facilitar descobrir o problema
    })
})