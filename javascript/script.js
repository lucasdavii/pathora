// aqui vou selecionar os links do menu, praticamente vou chamar a classe(e os elementos q ela contem)e selecionar ela

const links = document.querySelectorAll(".nav-links a") //o querySelectorAll vai buscar os links, que são os "a"(o all vai buscar todos os links, ja sem ele busca so primeiro q tem la)
                                                        //que nem no css eu uso o ponto no começo da classe pra chamar ela, ja o "a" ela pega todos os "a"(link) q tem dentro daquela especifica classe.

links.forEach(link => {   //links é a variavel que eu criei com o const, nela vai estar a classe e os links que eu chamei. o foreach funciona pra chamar os 4 links que existem na classe, e o link é cada "a" que tem na classe
    link.addEventListener("click", function(e) { //o addeventlistener serve basicamente para servir como um gatilho, é tipo dizer "eu estou esperando certo evento para funcionar", e esse evento é o "click" 
                                                //o function é o que faz o evento que é o "click" acontecer, no caso sem ele o addeventlistener so ia reconhecer o click mas nao ia fazer nada
                                                //então depois de todo evento eu tenho que colocar o function()
                                                //o "e" é uma abreviação de event(evento em ingles) — quando o usuario clica, o navegador cria um objeto com todas as informacoes daquele clique
                                             //passando o "e" pro function, a gente consegue usar essas informacoes dentro dele, como cancelar o comportamento padrao do link
        
        e.preventDefault() //o navegador por padrao ja faz o scroll quando clica num link, so que ele pula direto sem animacao
                           //o preventDefault cancela esse comportamento padrao do navegador, pra que o nosso codigo possa controlar o scroll do jeito que a gente quer

        const destino = link.getAttribute("href") //aqui eu crio uma variavel fixa chamado destino, nela o "link" que e cada link que existe na variavel "links"
                                                  //o getattribute vai estar pegando os "a href" de cada "link" — praticamente pegando o endereço (#problema, #solucao...) que cada link tem guardado dentro dele

        const secao = document.querySelector(destino) //aqui e a variavel fixa das seções, ela vai selecionar a variavel destino que ja tem todos os endereços dos ids das seções
                                                      //Então como cada # ja ta com o mesmo nome dos ids das seções que eu fiz no html, ja vai reconhecer todas pra eu n ter que escrever de uma em uma.

        secao.scrollIntoView({ behavior: "smooth"}) //aqui eu chamo a variavel secao(que ja tem a seção certa guardada dentro dela)
                                                     //o scrollIntoView fala pra pagina: "role ate essa seção aparecer na tela"
                                                     //o { behavior: "smooth" } e a configuração de como vai rolar — "smooth" significa suave, entao a pagina rola suavemente ate a seção em vez de pular direto

    }) //fecha o function() e o addEventListener — tudo que o usuario precisava fazer ao clicar ja foi executado aqui dentro
}) //fecha o forEach — ele ja passou por todos os 4 links e adicionou o evento de clique em cada um
