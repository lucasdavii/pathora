//mapa interativo com leaflet


// os numeros [-5.178, -40.667] são latitude e longitude aproximadas de Tianguá-CE
const mapa = L.map("mapa").setView([-5.178, -40.667], 7);


// adiciona o fundo do mapa.
// openStreetMap dá os tiles q o leaftlet usa.
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
}).addTo(mapa);

// é só a lista inicial de cidades monitoradas
// dps isso pode vir de uma API ou banco de dados
const regioes = [
    {
        nome: "Tianguá - CE",
        latitude: -3.7296,
        longitude: -40.9920,
        temperatura: 31,
        umidade: 82,
        chuva: true
    },
    {
        nome: "Sobral - CE",
        latitude: -3.6890,
        longitude: -40.3482,
        temperatura: 34,
        umidade: 87,
        chuva: true
    },
    {
        nome: "Fortaleza - CE",
        latitude: -3.7319,
        longitude: -38.5267,
        temperatura: 29,
        umidade: 76,
        chuva: false
    },
    {
        nome: "Juazeiro do Norte - CE",
        latitude: -7.2131,
        longitude: -39.3150,
        temperatura: 28,
        umidade: 62,
        chuva: false
    }
];


// calcula o risco com base nos mesmos critérios da Cypher
// alto: muito quente + muita umidade
// medio: quente + umidade alta
// baixo: condições menos favoráveis
function calcularRisco(temperatura, umidade, chuva) {
    if (temperatura > 32 && umidade > 85 && chuva === true) {
        return "alto";
    } else if (temperatura > 32 && umidade > 85 && chuva === false) {
        return "alto";
    } else if (temperatura > 28 && umidade > 70 && chuva === true) {
        return "medio";
    } else if (temperatura > 28 && umidade > 70 && chuva === false) {
        return "medio";
    } else {
        return "baixo";
    }
}


// define a cor de cada risco.
function corDoRisco(risco) {
    if (risco === "alto") {
        return "#ef4444";
    }

    if (risco === "medio") {
        return "#facc15";
    }

    return "#00c9a7";
}


// transforma o texto para aparecer bonito no popup.
function nomeDoRisco(risco) {
    if (risco === "alto") {
        return "Alto risco";
    }

    if (risco === "medio") {
        return "Médio risco";
    }

    return "Baixo risco";
}


// cria um círculo no mapa para cada região.
regioes.forEach((regiao) => {
    const risco = calcularRisco(regiao.temperatura, regiao.umidade, regiao.chuva);
    const cor = corDoRisco(risco);

    L.circleMarker([regiao.latitude, regiao.longitude], {
        radius: 14,
        color: cor,
        fillColor: cor,
        fillOpacity: 0.45,
        weight: 2
    })
    .addTo(mapa)
    .bindPopup(`
        <div class="popup-risco">
            <h3>${regiao.nome}</h3>
            <p><strong>${nomeDoRisco(risco)}</strong></p>
            <p>Temperatura: ${regiao.temperatura}°C</p>
            <p>Umidade: ${regiao.umidade}%</p>
            <p>Chuva recente: ${regiao.chuva ? "Sim" : "Não"}</p>
        </div>
    `);
});