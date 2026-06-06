# Pathora

Pathora é uma plataforma web de vigilância epidemiológica em desenvolvimento, criada para apoiar o monitoramento de riscos, a análise de dados climáticos e a prevenção de surtos.

O sistema reúne interface web, mapa de risco, histórico de análises, autenticação de usuários, banco de dados e integração com inteligência artificial por meio da Cypher IA.

## Status do projeto

Em desenvolvimento.

O Pathora funciona atualmente como um protótipo funcional, com foco em demonstração, validação da ideia e testes de integração entre front-end, Firebase, backend em Python e modelos de IA.

## Objetivo

O objetivo do Pathora é facilitar a leitura de riscos epidemiológicos por região, ajudando usuários e agentes de saúde a entenderem sinais de alerta com base em fatores como temperatura, umidade, chuva recente e histórico de análises.

A plataforma não substitui órgãos de saúde, atendimento médico ou decisões oficiais. O Pathora atua como uma ferramenta de apoio à prevenção, monitoramento e comunicação de risco.

## Funcionalidades

- Landing page institucional
- Cadastro e login de usuários
- Autenticação com Firebase
- Perfil de usuário
- Central de análise com a Cypher IA
- Chat com histórico salvo no Firestore
- Cálculo de risco epidemiológico
- Histórico de análises por usuário
- Mapa de risco epidemiológico
- Marcadores de risco baixo, médio e alto
- Popups informativos no mapa
- Backend em Python com Flask
- Integração com modelos de IA locais e online

## Cypher IA

A Cypher IA é uma inteligência artificial desenvolvida por Lucas Davi e integrada ao Pathora para auxiliar na análise, explicação e monitoramento de riscos epidemiológicos.

Dentro da plataforma, a Cypher atua como uma assistente de vigilância epidemiológica, ajudando o usuário a interpretar dados como temperatura, umidade, chuva recente, histórico de análises e níveis de risco.

A integração foi preparada para funcionar com diferentes modelos de IA:

- Ollama
- Groq
- Gemini

A Cypher utiliza arquivos de identidade e base de conhecimento para manter suas respostas alinhadas ao objetivo do Pathora.

## Tecnologias utilizadas

### Front-end

- HTML5
- CSS3
- JavaScript
- Leaflet
- Lucide Icons

### Backend

- Python
- Flask
- Flask-CORS
- Requests
- Python Dotenv

### Banco de dados e autenticação

- Firebase Authentication
- Cloud Firestore

### Inteligência artificial

- Ollama
- Groq
- Gemini

## Estrutura geral do projeto

```txt
pathora/
├── html/
├── css/
├── javascript/
├── backend/
└── imgs/
```

## Firebase

O Pathora usa Firebase para autenticação e armazenamento de dados.

Atualmente, o Firestore salva os dados na seguinte estrutura:

```txt
usuarios
  uid
    analises
    conversas
      principal
        mensagens
```

As análises de risco e o histórico da Cypher ficam vinculados ao usuário logado.

## Limitações atuais

- O sistema ainda funciona como protótipo.
- Parte dos dados do mapa é simulada.
- O cálculo de risco usa regras iniciais baseadas em temperatura, umidade e chuva.
- A Cypher não substitui orientação médica ou decisão oficial de órgãos de saúde.
- A integração com bases públicas de saúde ainda pode ser expandida.

## Próximos passos

- Integrar dados climáticos reais
- Melhorar o mapa de risco
- Criar sistema de alertas
- Expandir doenças monitoradas
- Adicionar filtros por região e período
- Melhorar a análise com histórico epidemiológico
- Implementar painel para agentes de saúde

## Autores e contribuições

### Lucas Davi

- Desenvolvimento da Cypher IA
- Integração da Cypher IA ao Pathora
- Backend em Python com Flask
- Integração com modelos de IA
- JavaScript principal da aplicação
- Desenvolvimento e ajustes do mapa de risco
- Identidade visual do projeto
- Estrutura geral do sistema
- Desenvolvimento das páginas principais

GitHub: [Lucas Davi](https://github.com/lucasdavii)

### Pedro Cauã

- Apoio no desenvolvimento do projeto
- Participação na construção da proposta do Pathora
- Auxílio na organização da interface
- Testes do sistema
- Revisão da experiência visual
- Documentação e apresentação do projeto

GitHub: [Pedro Cauã](https://github.com/pedrocaua898)

## Uso do projeto

Este projeto foi desenvolvido para fins educacionais e de demonstração, como protótipo da plataforma Pathora.