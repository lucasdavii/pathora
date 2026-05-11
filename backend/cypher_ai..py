from flask import Flask, request, jsonify # aqui eu importo o Flask para criar o servidor, request para receber os dados do JS e jsonify para responder em JSON
from flask_cors import CORS # aqui eu importo o CORS para permitir que o JavaScript converse com o Python
from dotenv import load_dotenv # aqui eu importo o dotenv para carregar as chaves do arquivo .env
import requests # aqui eu importo o requests para fazer requisições para Ollama, Groq e Gemini
import os # aqui eu importo o os para pegar variáveis do .env


load_dotenv() # aqui eu carrego as informações que estão dentro do arquivo .env

app = Flask(__name__) # aqui eu crio o servidor Flask
CORS(app) # aqui eu libero o acesso do HTML/JS ao servidor Python


GROQ_API_KEY = os.getenv("GROQ_API_KEY") # aqui eu pego a chave do Groq que está no .env
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") # aqui eu pego a chave do Gemini que está no .env
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL") # aqui eu pego o modelo do Ollama que está no .env


INSTRUCAO_CYPHER = """
Você é a Cypher, a inteligência artificial modular do Pathora.

Responda sempre em português do Brasil.
Responda com no máximo 5 linhas.
nao pare de gerar sem ter acabado a resposta, se limite a 5 linhas a menos que o ususario peça.
seja direto, nao dê listas e nem explique por topicos, apenas se o usuario solicitar.
nao corte a geração no meio da frase.
use fontes confiaveis.
Só escreva mais se o usuário pedir para explicar mais.
Não use caracteres especiais de formatação como #, *, -, markdown ou listas, a menos que o usuario peça.
Não mande código, a não ser que o usuário peça código.
Não fique repetindo sua apresentação.
Use o histórico da conversa para entender mensagens curtas como sim, não, continua e explica mais.
seja etico.
reconheça p uso de palavras mais formais, tecnicas e as explique se o usuario solicitar.

Seu foco é ajudar com dados epidemiológicos, riscos, alertas e prevenção.
""" # aqui fica a personalidade principal da Cypher


def calcular_risco_epidemiologico(temperatura, umidade, chuva):
    # essa função calcula o risco epidemiologico usando temperatura, umidade e chuva

    pontos = 0 # aqui começa a pontuação do risco

    if temperatura >= 26 and temperatura <= 32: # aqui verifica se a temperatura está numa faixa favorável
        pontos += 1 # aqui soma 1 ponto no risco

    if umidade >= 60: # aqui verifica se a umidade está alta
        pontos += 1 # aqui soma 1 ponto no risco

    if chuva == True: # aqui verifica se choveu recentemente
        pontos += 1 # aqui soma 1 ponto no risco

    if pontos == 3: # se os 3 fatores forem favoráveis
        return "Alto risco epidemiológico. As condições favorecem vetores como mosquitos. Reforce prevenção, elimine água parada e mantenha monitoramento."

    elif pontos == 2: # se 2 fatores forem favoráveis
        return "Médio risco epidemiológico. Existem condições favoráveis. Mantenha atenção, prevenção e acompanhamento da região."

    else: # se tiver 0 ou 1 fator favorável
        return "Baixo risco epidemiológico. As condições atuais não indicam risco elevado, mas o monitoramento deve continuar."


def preparar_historico(historico):
    # essa função limpa o histórico que vem do JavaScript

    if not historico: # se não vier histórico
        return [] # retorna lista vazia

    historico_limpo = [] # aqui eu vou guardar só mensagens válidas

    for item in historico: # aqui eu passo por cada mensagem do histórico
        role = item.get("role") # aqui eu pego quem mandou: user ou assistant
        content = item.get("content") # aqui eu pego o texto da mensagem

        if role in ["user", "assistant"] and content: # aqui eu verifico se está no formato certo
            historico_limpo.append({
                "role": role,
                "content": content
            }) # aqui eu salvo a mensagem limpa

    return historico_limpo[-20:] # aqui eu pego só as últimas 20 mensagens para não pesar


def perguntar_ollama(historico):
    # essa função manda a conversa para o Ollama local

    if not OLLAMA_MODEL: # se o modelo do Ollama não estiver no .env
        return "O modelo do Ollama não foi encontrado no arquivo .env."

    mensagens = [
        {
            "role": "system",
            "content": INSTRUCAO_CYPHER
        }
    ] # aqui eu começo com a instrução principal da Cypher

    mensagens.extend(historico) # aqui eu adiciono o histórico da conversa

    resposta = requests.post(
        "http://localhost:11434/api/chat", # aqui é o endereço padrão do Ollama
        json={
            "model": OLLAMA_MODEL, # aqui usa o modelo do Ollama salvo no .env
            "messages": mensagens, # aqui manda o histórico inteiro
            "stream": False, # aqui pede a resposta completa de uma vez
            "options": {
                "temperature": 0.4,
                "num_predict": 220
            }
        }
    )

    dados = resposta.json() # aqui eu transformo a resposta em JSON

    if "message" not in dados: # se o Ollama responder diferente, evita quebrar o servidor
        print("ERRO OLLAMA:", dados)
        return "Ollama deu erro. Confira se ele está aberto e se o modelo está correto."

    return dados["message"]["content"] # aqui retorna só o texto da resposta


def perguntar_groq(historico):
    # essa função manda a conversa para o Groq

    if not GROQ_API_KEY: # se a chave do Groq não estiver no .env
        return "A chave do Groq não foi encontrada no arquivo .env."

    mensagens = [
        {
            "role": "system",
            "content": INSTRUCAO_CYPHER
        }
    ] # aqui começa com a instrução da Cypher

    mensagens.extend(historico) # aqui adiciona o histórico

    resposta = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {GROQ_API_KEY}" # aqui vai a chave do Groq
        },
        json={
            "model": "llama-3.1-8b-instant", # aqui o modelo do Groq fica fixo no código
            "messages": mensagens,
            "temperature": 0.4,
            "max_tokens": 220
        }
    )

    dados = resposta.json() # aqui transforma a resposta em JSON

    if "choices" not in dados: # se o Groq responder com erro, evita quebrar o servidor
        print("ERRO GROQ:", dados)
        return "Groq deu erro. Confira a chave do Groq no arquivo .env."

    return dados["choices"][0]["message"]["content"] # aqui retorna só o texto


def converter_historico_gemini(historico):
    # essa função converte o histórico para o formato do Gemini

    historico_gemini = [] # aqui eu crio a lista do Gemini

    for item in historico: # aqui passo por cada mensagem
        role = item.get("role") # aqui pego o role
        content = item.get("content") # aqui pego o texto

        if not content: # se não tiver texto
            continue # pula essa mensagem

        if role == "user": # se foi o usuário
            role_gemini = "user" # no Gemini continua user
        else: # se foi a IA
            role_gemini = "model" # no Gemini a IA é model

        historico_gemini.append({
            "role": role_gemini,
            "parts": [
                {
                    "text": content
                }
            ]
        }) # aqui adiciono no formato do Gemini

    return historico_gemini # aqui retorno o histórico convertido


def perguntar_gemini(historico):
    # essa função manda a conversa para o Gemini

    if not GEMINI_API_KEY:
        return "A chave do Gemini não foi encontrada no arquivo .env."

    historico_gemini = converter_historico_gemini(historico)

    resposta = requests.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}",
        headers={
            "Content-Type": "application/json"
        },
        json={
            "contents": historico_gemini,
            "systemInstruction": {
                "parts": [
                    {
                        "text": INSTRUCAO_CYPHER
                    }
                ]
            },
            "generationConfig": {
                "temperature": 0.5,
                "maxOutputTokens": 500,
                "thinkingConfig": {
                    "thinkingBudget": 0
                }
            }
        }
    )

    dados = resposta.json()

    if "candidates" not in dados:
        print("ERRO GEMINI:", dados)
        return "Gemini deu erro. Confira a chave do Gemini no arquivo .env."

    candidato = dados["candidates"][0]

    if "content" not in candidato:
        print("RESPOSTA GEMINI SEM CONTENT:", dados)
        return "Gemini não conseguiu gerar resposta completa."

    return candidato["content"]["parts"][0]["text"]

@app.route("/calcular", methods=["POST"])
def calcular():
    # essa é a rota que teu JavaScript chama

    dados = request.get_json() # aqui eu pego os dados enviados pelo JS

    if dados is None: # se não veio nada
        return jsonify({"resultado": "Nenhum dado foi recebido pelo servidor."})

    if "temperatura" in dados and "umidade" in dados and "chuva" in dados:
        # se vier temperatura, umidade e chuva, é cálculo de risco

        temperatura = dados.get("temperatura") # aqui pega temperatura
        umidade = dados.get("umidade") # aqui pega umidade
        chuva = dados.get("chuva") # aqui pega chuva

        resultado = calcular_risco_epidemiologico(temperatura, umidade, chuva) # aqui calcula o risco

        return jsonify({"resultado": resultado}) # aqui devolve o resultado para o JS

    mensagem = dados.get("mensagem", "") # aqui pega a mensagem do chat
    modo = dados.get("modo", "ollama") # aqui pega o modo escolhido
    historico = dados.get("historico", []) # aqui pega o histórico

    if mensagem == "": # se mensagem vier vazia
        return jsonify({"resultado": "Digite uma mensagem antes de enviar."})

    historico = preparar_historico(historico) # aqui limpa e limita o histórico

    try:
        if modo == "ollama": # se escolheu Ollama
            resultado = perguntar_ollama(historico)

        elif modo == "gemini": # se escolheu Gemini
            resultado = perguntar_gemini(historico)

        elif modo == "groq": # se escolheu Groq
            resultado = perguntar_groq(historico)

        else: # se modo vier errado
            resultado = "Modo de IA inválido. Escolha ollama, gemini ou groq."

    except Exception as erro:
        print("ERRO REAL:", erro) # aqui mostra o erro real no terminal
        resultado = "Erro real no Python: " + str(erro)

    return jsonify({"resultado": resultado}) # aqui manda a resposta para o JS


if __name__ == "__main__":
    app.run(debug=True, port=5000) # aqui inicia o servidor na porta 5000