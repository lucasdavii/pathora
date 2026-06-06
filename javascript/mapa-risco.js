// Pathora - mapa de risco epidemiológico
// Mapa interativo com Leaflet, marcadores customizados, popup no estilo do sistema e filtros de risco.

// Cria o mapa centralizado no Ceará.
const mapa = L.map("mapa", {
    zoomControl: true,
    attributionControl: true
}).setView([-5.178, -40.667], 7);

// Camada escura do mapa, mais compatível com o visual do Pathora.
L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: "abcd",
    maxZoom: 20
}).addTo(mapa);

// Lista inicial de regiões monitoradas.
// Depois isso pode vir do Firebase, API climática ou backend.
const regioes = [
    {
        nome: "Tianguá - CE",
        latitude: -3.7296,
        longitude: -40.9920,
        temperatura: 31,
        umidade: 82,
        chuva: true,
        doenca: "Dengue",
        leitura: "Hoje · 01:20"
    },
    {
        nome: "Sobral - CE",
        latitude: -3.6890,
        longitude: -40.3482,
        temperatura: 34,
        umidade: 87,
        chuva: true,
        doenca: "Dengue",
        leitura: "Hoje · 01:20"
    },
    {
        nome: "Fortaleza - CE",
        latitude: -3.7319,
        longitude: -38.5267,
        temperatura: 29,
        umidade: 76,
        chuva: false,
        doenca: "Chikungunya",
        leitura: "Hoje · 01:20"
    },
    {
        nome: "Juazeiro do Norte - CE",
        latitude: -7.2131,
        longitude: -39.3150,
        temperatura: 28,
        umidade: 62,
        chuva: false,
        doenca: "Zika",
        leitura: "Hoje · 01:20"
    },
    {
    nome: "Viçosa do Ceará - CE",
    latitude: -3.5621,
    longitude: -41.0922,
    temperatura: 24,
    umidade: 48,
    chuva: false,
    doenca: "Dengue",
    leitura: "Hoje · 01:20"
},
];

let marcadores = [];

// Calcula risco com lógica parecida com a Cypher.
function calcularRisco(temperatura, umidade, chuva) {
    let pontos = 0;

    if (temperatura >= 26 && temperatura <= 32) {
        pontos++;
    }

    if (umidade >= 60) {
        pontos++;
    }

    if (chuva === true) {
        pontos++;
    }

    if (pontos === 3) {
        return "alto";
    }

    if (pontos === 2) {
        return "medio";
    }

    return "baixo";
}

// Cor de cada risco no padrão Pathora.
function corDoRisco(risco) {
    if (risco === "alto") {
        return "#ef4444";
    }

    if (risco === "medio") {
        return "#f59e0b";
    }

    return "#38bdf8";
}

// Nome bonito para aparecer na tela.
function nomeDoRisco(risco) {
    if (risco === "alto") {
        return "Alto risco";
    }

    if (risco === "medio") {
        return "Médio risco";
    }

    return "Baixo risco";
}

// Texto de motivo para o popup.
function motivoDoRisco(regiao, risco) {
    if (risco === "alto") {
        return "Umidade elevada, chuva recente e condições favoráveis ao avanço do vetor.";
    }

    if (risco === "medio") {
        return "Condições ambientais favoráveis. A região merece atenção preventiva.";
    }

    return "Condições atuais sem sinal crítico, mas o monitoramento deve continuar.";
}

// Ação sugerida para o popup.
function acaoSugerida(risco) {
    if (risco === "alto") {
        return "Verificar focos de água parada e reforçar alerta preventivo.";
    }

    if (risco === "medio") {
        return "Manter vistoria preventiva e acompanhar clima nos próximos dias.";
    }

    return "Continuar monitoramento e ações básicas de prevenção.";
}

// Cria marcador visual com glow, ponto interno e pulso no risco alto.
function criarIconeRisco(risco) {
    const cor = corDoRisco(risco);

    return L.divIcon({
        className: "",
        html: `
            <div class="marcador-risco marcador-${risco}" style="--cor-risco: ${cor}">
                <span></span>
            </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18]
    });
}

// Cria o HTML do popup.
function criarPopup(regiao, risco) {
    return `
        <div class="popup-risco popup-${risco}">
            <div class="popup-header">
                <div>
                    <span class="popup-label">${nomeDoRisco(risco)}</span>
                    <h3>${regiao.nome}</h3>
                </div>
                <strong class="popup-doenca">${regiao.doenca}</strong>
            </div>

            <div class="popup-grid">
                <div>
                    <span>Temperatura</span>
                    <strong>${regiao.temperatura}°C</strong>
                </div>

                <div>
                    <span>Umidade</span>
                    <strong>${regiao.umidade}%</strong>
                </div>

                <div>
                    <span>Chuva</span>
                    <strong>${regiao.chuva ? "Recente" : "Não recente"}</strong>
                </div>
            </div>

            <div class="popup-bloco">
                <span>Motivo</span>
                <p>${motivoDoRisco(regiao, risco)}</p>
            </div>

            <div class="popup-bloco">
                <span>Ação sugerida</span>
                <p>${acaoSugerida(risco)}</p>
            </div>

            <div class="popup-footer">
                <span>Última leitura</span>
                <strong>${regiao.leitura}</strong>
            </div>
        </div>
    `;
}

// Renderiza regiões no mapa.
function renderizarRegioes(filtro = "todos") {
    marcadores.forEach(function(marcador) {
        mapa.removeLayer(marcador);
    });

    marcadores = [];

    regioes.forEach(function(regiao) {
        const risco = calcularRisco(regiao.temperatura, regiao.umidade, regiao.chuva);

        if (filtro !== "todos" && risco !== filtro) {
            return;
        }

        const marcador = L.marker([regiao.latitude, regiao.longitude], {
            icon: criarIconeRisco(risco)
        })
        .addTo(mapa)
        .bindPopup(criarPopup(regiao, risco), {
            className: "popup-pathora",
            closeButton: true,
            maxWidth: 340
        });

        marcadores.push(marcador);
    });
}

// Faz os botões Baixo, Médio e Alto filtrarem o mapa.
// Se clicar no botão ativo, volta para todos.
function configurarFiltros() {
    const botoes = document.querySelectorAll(".baixo-overlay button");

    botoes.forEach(function(botao) {
        botao.addEventListener("click", function() {
            const texto = botao.textContent.trim().toLowerCase();

            let filtro = "todos";

            if (texto.includes("baixo")) {
                filtro = "baixo";
            }

            if (texto.includes("médio") || texto.includes("medio")) {
                filtro = "medio";
            }

            if (texto.includes("alto")) {
                filtro = "alto";
            }

            const jaAtivo = botao.classList.contains("ativo");

            botoes.forEach(function(item) {
                item.classList.remove("ativo");
            });

            if (jaAtivo) {
                renderizarRegioes("todos");
                return;
            }

            botao.classList.add("ativo");
            renderizarRegioes(filtro);
        });
    });
}

// Inicialização.
renderizarRegioes("todos");
configurarFiltros();