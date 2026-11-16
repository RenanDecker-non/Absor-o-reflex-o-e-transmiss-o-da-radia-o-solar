"use strict";

const $ = id => document.getElementById(id);

const fmt = (n, d = 1) =>
  n.toLocaleString("pt-BR", {
    maximumFractionDigits: d,
    minimumFractionDigits: d
  });

const presets = {
  escuro: [90, 10],
  claro: [25, 75],
  transparente: [10, 10]
};

// SIMULADOR DE RADIAÇÃO
function radiation() {
  const a = Number($("abs").value);

  $("ref").max = 100 - a;

  if (Number($("ref").value) > 100 - a) {
    $("ref").value = 100 - a;
  }

  const r = Number($("ref").value);
  const t = 100 - a - r;
  const g = Number($("irr").value);

  $("absV").textContent = a + "%";
  $("refV").textContent = r + "%";
  $("irrV").textContent = g + " W/m²";

  $("bars").innerHTML = [
    ["Absorvida", a],
    ["Refletida", r],
    ["Transmitida", t]
  ].map(([label, value]) => `
    <div>
      <strong>${label}: ${value}%</strong>
      <div class="track" aria-hidden="true">
        <div class="fill" style="width: ${value}%"></div>
      </div>
    </div>
  `).join("");

  $("energy").textContent =
    `Em 1 m²: ${fmt(g * a / 100, 0)} W absorvidos + ` +
    `${fmt(g * r / 100, 0)} W refletidos + ` +
    `${fmt(g * t / 100, 0)} W transmitidos = ` +
    `${g} W incidentes.`;
}

$("material").addEventListener("change", () => {
  const [a, r] = presets[$("material").value];

  $("abs").value = a;
  $("ref").max = 100 - a;
  $("ref").value = r;

  radiation();
});

["abs", "ref", "irr"].forEach(id => {
  $(id).addEventListener("input", radiation);
});

// VALIDAÇÃO DOS CAMPOS
function valid(ids) {
  return ids.every(id =>
    $(id).value.trim() !== "" &&
    $(id).checkValidity() &&
    Number.isFinite(Number($(id).value))
  );
}

// SIMULADOR DE AQUECIMENTO
function heating() {
  if (!valid(["volume", "area", "hours", "sunlight"])) {
    $("error").textContent =
      "Confira os campos e os limites indicados.";

    $("poolResult").textContent =
      "Resultado indisponível: corrija os dados.";

    return;
  }

  $("error").textContent = "";

  const v = Number($("volume").value);
  const a = Number($("area").value);
  const h = Number($("hours").value);
  const g = Number($("sunlight").value);

  const calc = (tau, loss) =>
    (g * a * tau * 0.8 - loss * a) *
    h * 3600 / (v * 4186);

  const bare = calc(1, 250);
  const covered = calc(0.8, 60);

  $("poolResult").innerHTML = `
    <div class="metric">
      Sem cobertura
      <strong>${fmt(bare, 2)} °C</strong>
      Variação de temperatura
    </div>

    <div class="metric">
      Com cobertura transparente
      <strong>${fmt(covered, 2)} °C</strong>
      Variação de temperatura
    </div>

    <p>
      Diferença entre cenários:
      <strong>${fmt(covered - bare, 2)} °C</strong>
      em ${fmt(h)} h, sob as hipóteses abaixo.
    </p>
  `;
}

$("calculate").addEventListener("click", heating);

// SIMULADOR DO CONTROLADOR
let pump = false;

function control() {
  if (!valid(["collector", "poolTemp", "target"])) {
    pump = false;
    $("controllerState").textContent =
      "Bomba desligada: entrada inválida.";
    return;
  }

  const collector = Number($("collector").value);
  const pool = Number($("poolTemp").value);
  const target = Number($("target").value);
  const delta = collector - pool;

  if (pool >= target || delta <= 2) {
    pump = false;
  } else if (delta >= 4) {
    pump = true;
  }

  let message;

  if (pool >= target) {
    message = "Meta atingida.";
  } else if (pump) {
    message = "Circulação permitida pelo controlador.";
  } else {
    message = "Aguardando calor útil no coletor.";
  }

  $("controllerState").innerHTML = `
    <div class="metric">
      Simulação da bomba
      <strong>${pump ? "LIGADA" : "DESLIGADA"}</strong>
      Diferença coletor − piscina: ${fmt(delta)} °C.
    </div>
    <p>${message}</p>
  `;
}

$("control").addEventListener("click", control);

// AJUSTES DE LEITURA
let size = 18;

function saveReading() {
  try {
    localStorage.setItem(
      "solagua-reading",
      JSON.stringify({
        contrast: document.body.classList.contains("contrast"),
        reading: document.body.classList.contains("reading"),
        size
      })
    );
  } catch {
    // O site continua funcionando se o armazenamento estiver bloqueado.
  }
}

for (const [id, className] of [
  ["contrast", "contrast"],
  ["reading", "reading"]
]) {
  $(id).addEventListener("click", () => {
    const active = document.body.classList.toggle(className);
    $(id).setAttribute("aria-pressed", String(active));
    saveReading();
  });
}

$("font").addEventListener("click", () => {
  size = size >= 26 ? 18 : size + 2;

  document.documentElement.style.fontSize = size + "px";
  $("font").textContent = `Fonte: ${size}px (alterar)`;

  saveReading();
});

$("reset").addEventListener("click", () => {
  document.body.classList.remove("contrast", "reading");

  $("contrast").setAttribute("aria-pressed", "false");
  $("reading").setAttribute("aria-pressed", "false");

  size = 18;
  document.documentElement.style.fontSize = "18px";
  $("font").textContent = "Aumentar fonte";

  saveReading();
});

// RESTAURAR PREFERÊNCIAS
try {
  const preferences = JSON.parse(
    localStorage.getItem("solagua-reading") || "{}"
  );

  for (const className of ["contrast", "reading"]) {
    if (preferences[className]) {
      document.body.classList.add(className);
      $(className).setAttribute("aria-pressed", "true");
    }
  }

  if ([18, 20, 22, 24, 26].includes(preferences.size)) {
    size = preferences.size;
    document.documentElement.style.fontSize = size + "px";
  }
} catch {
  // Preferências indisponíveis: manter configuração padrão.
}

// ATIVAR VLIBRAS
$("loadLibras").addEventListener("click", () => {
  const button = $("loadLibras");

  button.disabled = true;
  $("librasStatus").textContent = "Carregando VLibras…";

  const script = document.createElement("script");
  script.src = "https://vlibras.gov.br/app/vlibras-plugin.js";

  function fail() {
    $("librasStatus").textContent =
      "Não foi possível iniciar o VLibras. " +
      "Verifique a conexão e tente novamente.";

    button.disabled = false;
  }

  script.onload = () => {
    try {
      new window.VLibras.Widget("https://vlibras.gov.br/app");

      $("librasStatus").textContent =
        "VLibras ativado. Use o botão flutuante do tradutor.";
    } catch {
      fail();
    }
  };

  script.onerror = fail;
  document.body.append(script);
});

// INICIAR SIMULADORES
radiation();
heating();
control();
