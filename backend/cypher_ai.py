
import os
from typing import Any, Dict, List

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS


# Pega a pasta onde este arquivo está.
PASTA_ATUAL = os.path.dirname(__file__)

# Carrega o .env exatamente da pasta do backend.
CAMINHO_ENV = os.path.join(PASTA_ATUAL, ".env")
load_dotenv(CAMINHO_ENV)

# Chaves e configurações vindas do .env.
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

# Modelos usados por padrão.
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b").strip()
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()

# Tempo máximo esperando uma API responder.
REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "30"))

# Porta do Flask.
PORT = int(os.getenv("PORT", "5000"))


FRONTEND_ORIGINS = os.getenv("FRONTEND_ORIGINS", "*").strip()


# Cria o servidor Flask.
app = Flask(__name__)

# Libera o front-end para conversar com o backend.
if FRONTEND_ORIGINS == "*":
    CORS(app)
else:
    origens = [origem.strip() for origem in FRONTEND_ORIGINS.split(",") if origem.strip()]
    CORS(app, origins=origens)



IDENTIDADE_PADRAO = """
Você é a Cypher, a inteligência artificial modular do Pathora.
Você ajuda a interpretar dados epidemiológicos, riscos, alertas e prevenção.
Responda sempre em português do Brasil, com clareza, seriedade e objetividade.
"""

BASE_PADRAO = """
O Pathora é uma plataforma de vigilância epidemiológica.
Ele monitora riscos relacionados a doenças como dengue, zika e chikungunya.
A análise pode considerar temperatura, umidade, chuva, localização e histórico.
A Cypher não diagnostica doenças, não promete previsão perfeita e não inventa dados.
"""


def ler_arquivo_texto(nome_arquivo: str, texto_padrao: str) -> str:
    """
    Lê um arquivo .txt da mesma pasta do backend.

    Se o arquivo não existir, o backend não quebra.
    Ele usa um texto padrão.
    """
    caminho = os.path.join(PASTA_ATUAL, nome_arquivo)

    try:
        with open(caminho, "r", encoding="utf-8") as arquivo:
            conteudo = arquivo.read().strip()

        if conteudo:
            return conteudo

    except FileNotFoundError:
        print(f"Aviso: {nome_arquivo} não encontrado. Usando texto padrão.")

    except Exception as erro:
        print(f"Erro ao ler {nome_arquivo}:", erro)

    return texto_padrao.strip()


def carregar_instrucao_cypher() -> str:
    """
    Junta identidade.txt + base_conhecimento.txt + regras finais.

    Isso vira a instrução principal enviada para Ollama, Groq e Gemini.
    """
    identidade = ler_arquivo_texto("identidade.txt", IDENTIDADE_PADRAO)
    base = ler_arquivo_texto("base_conhecimento.txt", BASE_PADRAO)

    regras_finais = """
REGRAS FINAIS:
Responda com base na identidade e na base de conhecimento.
Não invente dados, porcentagens, fontes, estatísticas ou previsões.
Não diagnostique doenças.
Não prometa previsão 100% correta.
Quando não houver dados suficientes, diga que não tem dados suficientes para afirmar com segurança.
Quando o assunto envolver sintomas ou suspeita de doença, oriente procurar um serviço de saúde.
Responda normalmente com no máximo 5 linhas, a menos que o usuário peça uma explicação maior.
Evite markdown, listas, tópicos, #, * e formatação especial, a menos que o usuário peça.
Não repita sua apresentação em toda resposta.
"""

    return f"""
IDENTIDADE DA CYPHER:
{identidade}

BASE DE CONHECIMENTO DO PATHORA:
{base}

{regras_finais}
""".strip()


# Instrução usada pelas três IAs.
INSTRUCAO_CYPHER = carregar_instrucao_cypher()


# ============================================================
# 3. FUNÇÕES AUXILIARES
# ============================================================

def texto_limpo(valor: Any) -> str:
    """Transforma qualquer valor em texto limpo."""
    if valor is None:
        return ""
    return str(valor).strip()


def limitar_texto(valor: Any, limite: int = 2500) -> str:
    """Impede mensagens grandes demais no histórico."""
    texto = texto_limpo(valor)

    if len(texto) > limite:
        return texto[:limite] + "..."

    return texto


def converter_bool(valor: Any) -> bool:
    """
    Converte valores vindos do JavaScript para True ou False.

    Aceita:
    true, false, "true", "false", "sim", "não", "1", "0"
    """
    if isinstance(valor, bool):
        return valor

    texto = texto_limpo(valor).lower()

    return texto in ["true", "sim", "s", "1", "yes", "y"]


def preparar_historico(historico: Any, mensagem_atual: str = "") -> List[Dict[str, str]]:
    """
    Limpa o histórico vindo do JavaScript.

    Formato aceito:
    [
        {"role": "user", "content": "texto"},
        {"role": "assistant", "content": "texto"}
    ]

    Também adiciona a mensagem atual no final, caso o JS ainda não tenha adicionado.
    """
    historico_limpo: List[Dict[str, str]] = []

    if isinstance(historico, list):
        for item in historico:
            if not isinstance(item, dict):
                continue

            role = texto_limpo(item.get("role"))
            content = limitar_texto(item.get("content"))

            if role in ["user", "assistant"] and content:
                historico_limpo.append({
                    "role": role,
                    "content": content
                })

    mensagem_atual = limitar_texto(mensagem_atual)

    if mensagem_atual:
        ultima_mensagem = historico_limpo[-1]["content"] if historico_limpo else ""

        if ultima_mensagem != mensagem_atual:
            historico_limpo.append({
                "role": "user",
                "content": mensagem_atual
            })

    # Limita para não pesar a API.
    return historico_limpo[-20:]


def montar_mensagens_chat(historico: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """
    Monta mensagens no formato de chat usado por Groq e Ollama.
    """
    mensagens = [
        {
            "role": "system",
            "content": INSTRUCAO_CYPHER
        }
    ]

    mensagens.extend(historico)
    return mensagens


# ============================================================
# 4. CÁLCULO DE RISCO EPIDEMIOLÓGICO
# ============================================================

def calcular_risco_epidemiologico(temperatura: Any, umidade: Any, chuva: Any) -> Dict[str, Any]:
    """
    Calcula risco epidemiológico com base em temperatura, umidade e chuva.

    Esse cálculo ainda é simples, mas retorna dados organizados.
    Assim o front pode usar nível, pontos, fatores e recomendações.
    """
    try:
        temperatura = float(temperatura)
        umidade = float(umidade)
        chuva = converter_bool(chuva)

    except (TypeError, ValueError):
        return {
            "nivel": "erro",
            "pontos": 0,
            "resultado": "Dados inválidos. Informe temperatura e umidade como números.",
            "fatores": [],
            "recomendacoes": []
        }

    pontos = 0
    fatores = []

    if 26 <= temperatura <= 32:
        pontos += 1
        fatores.append("temperatura em faixa favorável para vetores")

    if umidade >= 60:
        pontos += 1
        fatores.append("umidade elevada")

    if chuva:
        pontos += 1
        fatores.append("chuva recente")

    if pontos == 3:
        return {
            "nivel": "alto",
            "pontos": pontos,
            "resultado": "Alto risco epidemiológico. As condições favorecem vetores como mosquitos. Reforce prevenção, elimine água parada e mantenha monitoramento.",
            "fatores": fatores,
            "recomendacoes": [
                "eliminar água parada",
                "verificar caixas d'água, calhas e recipientes",
                "monitorar bairros com histórico de focos"
            ]
        }

    if pontos == 2:
        return {
            "nivel": "medio",
            "pontos": pontos,
            "resultado": "Médio risco epidemiológico. Existem condições favoráveis. Mantenha atenção, prevenção e acompanhamento da região.",
            "fatores": fatores,
            "recomendacoes": [
                "manter vistoria preventiva",
                "acompanhar chuva e umidade nos próximos dias",
                "reforçar orientação contra focos domésticos"
            ]
        }

    return {
        "nivel": "baixo",
        "pontos": pontos,
        "resultado": "Baixo risco epidemiológico. As condições atuais não indicam risco elevado, mas o monitoramento deve continuar.",
        "fatores": fatores,
        "recomendacoes": [
            "manter monitoramento",
            "continuar ações básicas de prevenção",
            "registrar mudanças climáticas relevantes"
        ]
    }


# ============================================================
# 5. CHAMADAS PARA OLLAMA, GROQ E GEMINI
# ============================================================

def perguntar_ollama(historico: List[Dict[str, str]]) -> str:
    """Envia a conversa para o Ollama local."""
    if not OLLAMA_MODEL:
        return "O modelo do Ollama não foi encontrado no arquivo .env."

    try:
        resposta = requests.post(
            "http://localhost:11434/api/chat",
            json={
                "model": OLLAMA_MODEL,
                "messages": montar_mensagens_chat(historico),
                "stream": False,
                "options": {
                    "temperature": 0.4,
                    "num_predict": 220
                }
            },
            timeout=REQUEST_TIMEOUT
        )

        resposta.raise_for_status()
        dados = resposta.json()

        if "message" not in dados:
            print("ERRO OLLAMA:", dados)
            return "Ollama respondeu em formato inesperado. Confira se o modelo está correto."

        return texto_limpo(dados["message"].get("content"))

    except requests.exceptions.ConnectionError:
        return "Não consegui conectar ao Ollama. Confira se ele está aberto no computador."

    except requests.exceptions.Timeout:
        return "Ollama demorou demais para responder. Tente novamente em alguns segundos."

    except Exception as erro:
        print("ERRO OLLAMA:", erro)
        return "Ollama encontrou um erro ao gerar a resposta."


def perguntar_groq(historico: List[Dict[str, str]]) -> str:
    """Envia a conversa para a API da Groq."""
    if not GROQ_API_KEY:
        return "A chave do Groq não foi encontrada no arquivo .env."

    try:
        resposta = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {GROQ_API_KEY}"
            },
            json={
                "model": GROQ_MODEL,
                "messages": montar_mensagens_chat(historico),
                "temperature": 0.4,
                "max_tokens": 220
            },
            timeout=REQUEST_TIMEOUT
        )

        resposta.raise_for_status()
        dados = resposta.json()

        if "choices" not in dados:
            print("ERRO GROQ:", dados)
            return "Groq respondeu em formato inesperado. Confira a chave e o modelo."

        return texto_limpo(dados["choices"][0]["message"]["content"])

    except requests.exceptions.Timeout:
        return "Groq demorou demais para responder. Tente novamente em alguns segundos."

    except Exception as erro:
        print("ERRO GROQ:", erro)
        return "Groq encontrou um erro ao gerar a resposta."


def converter_historico_gemini(historico: List[Dict[str, str]]) -> List[Dict[str, Any]]:
    """
    Converte histórico para o formato do Gemini.

    No Gemini:
    - usuário = user
    - resposta da IA = model
    """
    historico_gemini = []

    for item in historico:
        role = item.get("role")
        content = texto_limpo(item.get("content"))

        if not content:
            continue

        role_gemini = "user" if role == "user" else "model"

        historico_gemini.append({
            "role": role_gemini,
            "parts": [
                {
                    "text": content
                }
            ]
        })

    return historico_gemini


def perguntar_gemini(historico: List[Dict[str, str]]) -> str:
    """Envia a conversa para a API do Gemini."""
    if not GEMINI_API_KEY:
        return "A chave do Gemini não foi encontrada no arquivo .env."

    try:
        resposta = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}",
            headers={
                "Content-Type": "application/json"
            },
            json={
                "contents": converter_historico_gemini(historico),
                "systemInstruction": {
                    "parts": [
                        {
                            "text": INSTRUCAO_CYPHER
                        }
                    ]
                },
                "generationConfig": {
                    "temperature": 0.5,
                    "maxOutputTokens": 500
                }
            },
            timeout=REQUEST_TIMEOUT
        )

        resposta.raise_for_status()
        dados = resposta.json()

        if "candidates" not in dados:
            print("ERRO GEMINI:", dados)
            return "Gemini respondeu em formato inesperado. Confira a chave e o modelo."

        candidato = dados["candidates"][0]

        if "content" not in candidato:
            print("RESPOSTA GEMINI SEM CONTENT:", dados)
            return "Gemini não conseguiu gerar uma resposta completa."

        return texto_limpo(candidato["content"]["parts"][0]["text"])

    except requests.exceptions.Timeout:
        return "Gemini demorou demais para responder. Tente novamente em alguns segundos."

    except Exception as erro:
        print("ERRO GEMINI:", erro)
        return "Gemini encontrou um erro ao gerar a resposta."


def gerar_resposta_ia(modo: str, historico: List[Dict[str, str]]) -> str:
    """Escolhe qual IA vai responder."""
    modo = texto_limpo(modo).lower()

    if modo == "ollama":
        return perguntar_ollama(historico)

    if modo == "groq":
        return perguntar_groq(historico)

    if modo == "gemini":
        return perguntar_gemini(historico)

    return "Modo de IA inválido. Escolha ollama, groq ou gemini."


# ============================================================
# 6. ROTAS DO FLASK
# ============================================================

@app.route("/health", methods=["GET"])
def health():
    """
    Testa se o backend está vivo.

    Acesse no navegador:
    http://localhost:5000/health
    """
    identidade_path = os.path.join(PASTA_ATUAL, "identidade.txt")
    base_path = os.path.join(PASTA_ATUAL, "base_conhecimento.txt")

    return jsonify({
        "status": "online",
        "servico": "Cypher IA",
        "porta": PORT,
        "ollamaModel": OLLAMA_MODEL,
        "groqConfigurado": bool(GROQ_API_KEY),
        "geminiConfigurado": bool(GEMINI_API_KEY),
        "identidadeCarregada": os.path.exists(identidade_path),
        "baseCarregada": os.path.exists(base_path)
    })


@app.route("/risco", methods=["POST"])
def rota_risco():
    """
    Rota nova e separada para cálculo de risco.

    Espera JSON:
    {
        "temperatura": 30,
        "umidade": 80,
        "chuva": true
    }
    """
    dados = request.get_json(silent=True) or {}

    resultado = calcular_risco_epidemiologico(
        dados.get("temperatura"),
        dados.get("umidade"),
        dados.get("chuva")
    )

    status = 400 if resultado.get("nivel") == "erro" else 200
    return jsonify(resultado), status


@app.route("/chat", methods=["POST"])
def rota_chat():
    """
    Rota nova e separada para conversa com a Cypher.

    Espera JSON:
    {
        "mensagem": "texto do usuário",
        "modo": "ollama",
        "historico": []
    }
    """
    dados = request.get_json(silent=True) or {}

    mensagem = texto_limpo(dados.get("mensagem"))
    modo = texto_limpo(dados.get("modo")) or "ollama"

    if not mensagem:
        return jsonify({
            "resultado": "Digite uma mensagem antes de enviar."
        }), 400

    historico = preparar_historico(dados.get("historico", []), mensagem)
    resposta = gerar_resposta_ia(modo, historico)

    return jsonify({
        "resultado": resposta,
        "resposta": resposta,
        "modo": modo
    })


@app.route("/calcular", methods=["POST"])
def rota_calcular():
    """
    Rota antiga, mantida para não quebrar teu JavaScript atual.

    Ela aceita duas coisas:
    1. cálculo de risco, se vier temperatura, umidade e chuva
    2. chat com IA, se vier mensagem, modo e histórico
    """
    dados = request.get_json(silent=True) or {}

    # Caso 1: cálculo de risco.
    if "temperatura" in dados and "umidade" in dados and "chuva" in dados:
        risco = calcular_risco_epidemiologico(
            dados.get("temperatura"),
            dados.get("umidade"),
            dados.get("chuva")
        )

        # Mantém "resultado" para o JS antigo continuar funcionando,
        # mas também envia dados extras para melhorias futuras no front.
        return jsonify({
            "resultado": risco.get("resultado"),
            "nivel": risco.get("nivel"),
            "pontos": risco.get("pontos"),
            "fatores": risco.get("fatores"),
            "recomendacoes": risco.get("recomendacoes")
        })

    # Caso 2: chat com IA.
    mensagem = texto_limpo(dados.get("mensagem"))
    modo = texto_limpo(dados.get("modo")) or "ollama"

    if not mensagem:
        return jsonify({
            "resultado": "Digite uma mensagem antes de enviar."
        })

    historico = preparar_historico(dados.get("historico", []), mensagem)
    resposta = gerar_resposta_ia(modo, historico)

    return jsonify({
        "resultado": resposta,
        "resposta": resposta,
        "modo": modo
    })


# ============================================================
# 7. INICIAR SERVIDOR
# ============================================================

if __name__ == "__main__":
    print("Cypher IA rodando...")
    print(f"Servidor: http://localhost:{PORT}")
    print(f"Teste: http://localhost:{PORT}/health")

    app.run(debug=True, port=PORT)
