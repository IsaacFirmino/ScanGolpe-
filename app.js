const tabConfig = {
  mensagem: {
    label: "Cole a mensagem suspeita que voce recebeu:",
    placeholder: "Ex: Parabens! Voce ganhou R$ 5.000 no Pix. Clique aqui para resgatar: bit.ly/premio"
  },
  link: {
    label: "Cole o link ou URL suspeita:",
    placeholder: "Ex: http://bradesco-seguranca.com.br/atualizar-dados"
  },
  pix: {
    label: "Cole a chave Pix, dados bancarios, boleto ou pedido de pagamento:",
    placeholder: "Ex: Chave Pix: 098.765.432-10 - Nome: Joao da Silva - Banco XYZ"
  },
  anuncio: {
    label: "Cole o texto do anuncio, oferta ou perfil suspeito:",
    placeholder: "Ex: iPhone novo por R$ 800. Ultimas unidades. Pague via Pix e receba em 24h."
  }
};

const knownBrands = [
  "nubank",
  "itau",
  "bradesco",
  "caixa",
  "santander",
  "bancodobrasil",
  "bb",
  "inter",
  "picpay",
  "mercadolivre",
  "olx",
  "instagram",
  "whatsapp",
  "facebook",
  "correios",
  "gov",
  "serasa"
];

const safeDomains = [
  "nubank.com.br",
  "itau.com.br",
  "bradesco.com.br",
  "caixa.gov.br",
  "santander.com.br",
  "bb.com.br",
  "bancointer.com.br",
  "picpay.com",
  "mercadolivre.com.br",
  "olx.com.br",
  "instagram.com",
  "whatsapp.com",
  "facebook.com",
  "correios.com.br",
  "gov.br",
  "serasa.com.br"
];

const rules = [
  {
    id: "premio_dinheiro",
    label: "Promessa de dinheiro facil",
    detail: "Promessas de premio, sorteio, resgate ou dinheiro liberado sao muito usadas para induzir cliques e pagamentos.",
    severity: "high",
    weight: 18,
    pattern: /\b(ganh(ei|ou|amos)|sortead[oa]|premio|resgat(e|ar)|pix liberado|dinheiro liberado|saque disponivel)\b/i
  },
  {
    id: "bloqueio_conta",
    label: "Medo de bloqueio ou cancelamento",
    detail: "Golpes comuns usam ameaca de bloqueio de conta para fazer a vitima agir sem verificar o canal oficial.",
    severity: "high",
    weight: 18,
    pattern: /\b(conta|cartao|acesso|senha).{0,35}(bloquead[oa]|suspens[ao]|cancelad[oa]|expirad[ao])\b/i
  },
  {
    id: "pedido_dados",
    label: "Pedido de dados sensiveis",
    detail: "Senhas, tokens, codigos, CPF, cartao e dados bancarios nunca devem ser enviados por mensagem ou link externo.",
    severity: "high",
    weight: 20,
    pattern: /\b(cpf|rg|senha|token|codigo|codigos|cartao|cvv|conta|agencia|biometria|selfie)\b/i
  },
  {
    id: "urgencia",
    label: "Pressao por urgencia",
    detail: "Urgencia artificial reduz a chance de verificacao e e um sinal forte de engenharia social.",
    severity: "medium",
    weight: 12,
    pattern: /\b(urgente|agora|imediato|hoje|ultim[ao] chance|expira|vence hoje|em ate \d+ minutos?|prazo final)\b/i
  },
  {
    id: "pagamento_pix",
    label: "Pagamento por Pix em contexto sensivel",
    detail: "Pix e irreversivel na maioria dos casos; ofertas com pressa e Pix exigem cuidado reforcado.",
    severity: "medium",
    weight: 13,
    pattern: /\b(pix|chave pix|copia e cola|qr code|pagamento imediato|transferencia)\b/i
  },
  {
    id: "oferta_irreal",
    label: "Oferta ou retorno fora do padrao",
    detail: "Descontos extremos, renda facil e retorno garantido costumam aparecer em golpes de venda falsa e investimento.",
    severity: "medium",
    weight: 14,
    pattern: /\b(desconto de \d{2,3}%|preco imperdivel|renda extra|ganhe dinheiro|retorno garantido|sem risco|i?phone.{0,20}r\$\s?\d{2,3})\b/i
  },
  {
    id: "canal_informal",
    label: "Canal informal para tratar assunto sensivel",
    detail: "Bancos, governo e grandes empresas nao resolvem senha, token ou pagamento por conversa informal.",
    severity: "medium",
    weight: 10,
    pattern: /\b(whatsapp|telegram|direct|dm|inbox).{0,35}(banco|senha|token|pix|pagamento|conta)\b/i
  }
];

const urlRules = {
  shortener: /(^|\.)((bit\.ly)|(tinyurl\.com)|(ow\.ly)|(t\.co)|(is\.gd)|(cutt\.ly)|(rebrand\.ly)|(encurtador\.com\.br))$/i,
  riskyTld: /\.(xyz|tk|ml|ga|cf|top|click|zip|mov|country)(?:[/?#:]|$)/i,
  ipAddress: /^(?:\d{1,3}\.){3}\d{1,3}$/,
  suspiciousWords: /(login|seguranca|seguranca|atualizar|verificar|confirmar|desbloquear|premio|resgate|suporte|validar)/i
};

const state = {
  currentTab: "mensagem",
  running: false
};

const elements = {
  tabs: document.querySelectorAll(".scan-tab"),
  input: document.getElementById("scan-input"),
  label: document.getElementById("scan-label"),
  count: document.getElementById("char-count"),
  button: document.getElementById("scan-button"),
  result: document.getElementById("result-card"),
  themeToggle: document.getElementById("theme-toggle"),
  themeLabel: document.getElementById("theme-label")
};

function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\S\r\n]+/g, " ")
    .trim();
}

function extractUrls(rawText) {
  const matches = rawText.match(/(?<![@\w.-])(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:[/?#][^\s]*)?|(?<![@\w.-])(?:https?:\/\/)?(?:\d{1,3}\.){3}\d{1,3}(?:[/?#][^\s]*)?/gi) || [];
  return matches.map((url) => {
    const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    try {
      return new URL(withProtocol);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

function getRegistrableHint(hostname) {
  return hostname.replace(/^www\./, "").replace(/[^a-z0-9]/gi, "");
}

function isSafeDomain(hostname) {
  const clean = hostname.replace(/^www\./, "");
  return safeDomains.some((domain) => clean === domain || clean.endsWith(`.${domain}`));
}

function detectBrandSpoof(hostname) {
  const clean = getRegistrableHint(hostname);
  if (isSafeDomain(hostname)) return null;

  return knownBrands.find((brand) => {
    const compactBrand = brand.replace(/[^a-z0-9]/g, "");
    return clean.includes(compactBrand) && !safeDomains.some((domain) => getRegistrableHint(domain) === clean);
  });
}

function addSignal(signals, signal) {
  if (!signals.some((item) => item.id === signal.id && item.label === signal.label)) {
    signals.push(signal);
  }
}

function analyzeUrls(urls, signals) {
  urls.forEach((url) => {
    const hostname = url.hostname.toLowerCase();
    const href = url.href.toLowerCase();

    if (url.protocol !== "https:") {
      addSignal(signals, {
        id: "url_sem_https",
        label: "Link sem HTTPS",
        detail: "Links sem HTTPS podem expor dados e sao mais arriscados quando pedem login, pagamento ou informacoes pessoais.",
        severity: "medium",
        weight: 10
      });
    }

    if (urlRules.shortener.test(hostname)) {
      addSignal(signals, {
        id: "link_encurtado",
        label: "Link encurtado",
        detail: "Encurtadores escondem o destino final. Em mensagens de premio, Pix ou banco, isso aumenta muito o risco.",
        severity: "high",
        weight: 18
      });
    }

    if (urlRules.ipAddress.test(hostname)) {
      addSignal(signals, {
        id: "ip_direto",
        label: "URL usando IP direto",
        detail: "Servicos legitimos raramente pedem dados sensiveis em links com IP direto.",
        severity: "high",
        weight: 22
      });
    }

    if (urlRules.riskyTld.test(href)) {
      addSignal(signals, {
        id: "tld_suspeito",
        label: "Dominio com extensao arriscada",
        detail: "Algumas extensoes sao usadas com frequencia em campanhas rapidas de phishing.",
        severity: "medium",
        weight: 12
      });
    }

    if (urlRules.suspiciousWords.test(href)) {
      addSignal(signals, {
        id: "url_palavras_sensiveis",
        label: "URL usa termos de login, suporte ou verificacao",
        detail: "Termos como login, seguranca, atualizar e desbloquear sao comuns em paginas falsas.",
        severity: "medium",
        weight: 11
      });
    }

    const spoofedBrand = detectBrandSpoof(hostname);
    if (spoofedBrand) {
      addSignal(signals, {
        id: `spoof_${spoofedBrand}`,
        label: `Dominio possivelmente imita ${spoofedBrand}`,
        detail: "O dominio contem nome de marca conhecida, mas nao corresponde aos dominios oficiais conhecidos pelo scanner.",
        severity: "critical",
        weight: 28
      });
    }
  });
}

function analyzeContent(rawText, type) {
  const normalized = normalizeText(rawText);
  const urls = extractUrls(rawText);
  const signals = [];

  rules.forEach((rule) => {
    if (rule.pattern.test(normalized)) {
      addSignal(signals, rule);
    }
  });

  analyzeUrls(urls, signals);

  const exclamationCount = (rawText.match(/!/g) || []).length;
  if (exclamationCount >= 3) {
    addSignal(signals, {
      id: "exclamacoes",
      label: "Excesso de exclamacoes",
      detail: "Mensagens fraudulentas usam euforia ou panico para acelerar a decisao.",
      severity: "low",
      weight: 5
    });
  }

  const uppercaseWords = (rawText.match(/\b[A-ZÀ-Ú]{3,}\b/g) || []).length;
  if (uppercaseWords >= 3) {
    addSignal(signals, {
      id: "capslock",
      label: "Muitas palavras em maiusculas",
      detail: "Caixa alta em excesso pode indicar tentativa de pressao ou urgencia artificial.",
      severity: "low",
      weight: 5
    });
  }

  const hasMoney = /r\$\s?[\d.,]+|\b\d+[,.]\d{2}\b/.test(normalized);
  const hasUrgency = signals.some((signal) => signal.id === "urgencia");
  const hasSensitiveData = signals.some((signal) => signal.id === "pedido_dados");
  const hasPix = signals.some((signal) => signal.id === "pagamento_pix");

  if (urls.length > 0 && hasMoney && hasUrgency) {
    addSignal(signals, {
      id: "combo_link_dinheiro_urgencia",
      label: "Combinacao link + dinheiro + urgencia",
      detail: "Esse trio e um dos padroes mais fortes de golpe digital.",
      severity: "critical",
      weight: 30
    });
  }

  if (hasPix && hasUrgency && hasMoney) {
    addSignal(signals, {
      id: "pix_pressao",
      label: "Pix com pressao para pagamento",
      detail: "Pagamentos via Pix sob pressao devem ser interrompidos ate confirmacao por canal oficial.",
      severity: "high",
      weight: 20
    });
  }

  if (urls.length > 0 && hasSensitiveData) {
    addSignal(signals, {
      id: "link_pede_dados",
      label: "Link associado a dados sensiveis",
      detail: "Quando uma mensagem junta link com senha, token, CPF ou cartao, o risco de phishing sobe bastante.",
      severity: "critical",
      weight: 26
    });
  }

  if (type === "link" && urls.length === 0) {
    addSignal(signals, {
      id: "link_invalido",
      label: "Nenhuma URL clara foi encontrada",
      detail: "Confira se o link foi copiado por completo antes de tomar qualquer decisao.",
      severity: "low",
      weight: 4
    });
  }

  if (type === "pix" && hasPix && hasMoney && !urls.length && !hasUrgency) {
    addSignal(signals, {
      id: "pix_neutro",
      label: "Pedido de Pix exige confirmacao externa",
      detail: "Mesmo sem sinais fortes de golpe, confirme nome, valor e destinatario no aplicativo oficial.",
      severity: "low",
      weight: 6
    });
  }

  const rawScore = signals.reduce((sum, signal) => sum + signal.weight, 0);
  const score = Math.min(100, rawScore);
  const criticalSignal = signals.some((signal) => signal.severity === "critical");
  const highSignals = signals.filter((signal) => signal.severity === "high").length;

  let risk = "low";
  if (score >= 72 || criticalSignal) {
    risk = "critical";
  } else if (score >= 45 || highSignals >= 2) {
    risk = "high";
  } else if (score >= 18) {
    risk = "medium";
  }

  const confidence = Math.min(96, Math.max(42, score + signals.length * 8));

  return buildResult({ risk, score, confidence, signals, urls, type });
}

function buildResult({ risk, score, confidence, signals, urls, type }) {
  const levels = {
    low: {
      className: "risk-low",
      label: "Baixo risco",
      title: "Nenhum padrao forte de golpe foi detectado",
      summary: "O conteudo nao apresenta sinais fortes conhecidos pelo scanner. Ainda assim, confirme por canais oficiais quando houver dinheiro, dados pessoais ou pressa.",
      actions: [
        "Nao compartilhe senhas, tokens ou codigos fora do app oficial.",
        "Confirme pagamentos diretamente no aplicativo do banco.",
        "Se a mensagem parecer estranha, procure a empresa por um canal oficial."
      ]
    },
    medium: {
      className: "risk-medium",
      label: "Atencao",
      title: "Existem sinais que merecem verificacao",
      summary: "O conteudo tem indicios usados em golpes, mas ainda precisa de contexto. Nao clique nem pague antes de confirmar a origem.",
      actions: [
        "Verifique o remetente por outro canal antes de responder.",
        "Digite o site oficial manualmente no navegador em vez de usar o link recebido.",
        "Evite Pix ou transferencia ate validar identidade, valor e motivo."
      ]
    },
    high: {
      className: "risk-high",
      label: "Alto risco",
      title: "O conteudo parece uma tentativa de golpe",
      summary: "Foram encontrados sinais fortes de engenharia social, phishing ou pagamento arriscado. Interrompa a acao e confirme por canais oficiais.",
      actions: [
        "Nao clique no link, nao envie dados e nao faca pagamentos.",
        "Bloqueie o contato se ele continuar pressionando.",
        "Se voce ja informou dados, fale com seu banco imediatamente."
      ]
    },
    critical: {
      className: "risk-critical",
      label: "Risco critico",
      title: "Padrao muito compativel com fraude digital",
      summary: "O scanner encontrou combinacoes criticas, como dominio falso, pedido de dados, urgencia ou dinheiro. Trate como golpe ate prova em contrario.",
      actions: [
        "Feche a conversa ou pagina sem interagir.",
        "Acione banco, operadora ou empresa pelo canal oficial.",
        "Preserve prints e registre denuncia se houve perda financeira ou vazamento de dados."
      ]
    }
  };

  const selected = levels[risk];
  const topSignals = signals
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);

  return {
    ...selected,
    risk,
    score,
    confidence,
    signals: topSignals.length ? topSignals : [{
      label: "Sem indicadores fortes",
      detail: "O motor local nao encontrou padroes relevantes nesta amostra.",
      severity: "low",
      weight: 0
    }],
    urlCount: urls.length,
    type
  };
}

function renderResult(result) {
  elements.result.className = `result-card show ${result.className}`;
  elements.result.setAttribute("aria-hidden", "false");
  elements.result.style.setProperty("--confidence", `${result.confidence}%`);

  const signalMarkup = result.signals.map((signal) => `
    <div class="signal-item">
      <strong>${escapeHtml(signal.label)}</strong>
      <span>${escapeHtml(signal.detail)}</span>
    </div>
  `).join("");

  const actionMarkup = result.actions.map((action) => `<li>${escapeHtml(action)}</li>`).join("");

  elements.result.innerHTML = `
    <div class="result-top">
      <div>
        <span class="risk-label"><span class="risk-dot"></span>${escapeHtml(result.label)}</span>
        <h3 class="risk-title">${escapeHtml(result.title)}</h3>
      </div>
      <div class="confidence-ring" aria-label="Confianca da analise ${result.confidence}%">
        <div>
          <strong>${result.confidence}%</strong>
          <span>confianca</span>
        </div>
      </div>
    </div>
    <div class="result-body">
      <div>
        <p>${escapeHtml(result.summary)}</p>
        <div class="signal-stack">${signalMarkup}</div>
      </div>
      <div>
        <h3>O que fazer agora</h3>
        <ul class="next-actions">${actionMarkup}</ul>
      </div>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setTab(tab) {
  state.currentTab = tab;
  const config = tabConfig[tab];

  elements.tabs.forEach((button) => {
    const active = button.dataset.tab === tab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });

  elements.label.textContent = config.label;
  elements.input.placeholder = config.placeholder;
  elements.input.value = "";
  updateCharacterCount();
  hideResult();
  elements.input.focus();
}

function hideResult() {
  elements.result.className = "result-card";
  elements.result.setAttribute("aria-hidden", "true");
  elements.result.innerHTML = "";
}

function updateCharacterCount() {
  const total = elements.input.value.length;
  elements.count.textContent = `${total} ${total === 1 ? "caractere" : "caracteres"}`;
}

function setLoading(isLoading) {
  state.running = isLoading;
  elements.button.disabled = isLoading;
  elements.button.classList.toggle("loading", isLoading);
  elements.button.lastChild.textContent = isLoading ? " Analisando ameacas..." : " Analisar seguranca";
}

async function runAnalysis() {
  if (state.running) return;

  const input = elements.input.value.trim();
  const type = state.currentTab;
  if (!input) {
    elements.input.focus();
    return;
  }

  setLoading(true);
  hideResult();

  await new Promise((resolve) => setTimeout(resolve, 650));

  const result = analyzeContent(input, type);
  renderResult(result);
  setLoading(false);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const isLight = theme === "light";
  elements.themeLabel.textContent = isLight ? "Tema claro" : "Tema escuro";
  localStorage.setItem("scangolpe-theme", theme);
}

function initTheme() {
  const saved = localStorage.getItem("scangolpe-theme");
  const preferred = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  applyTheme(saved || preferred);
}

function bindEvents() {
  elements.tabs.forEach((button) => {
    button.addEventListener("click", () => setTab(button.dataset.tab));
  });

  elements.input.addEventListener("input", updateCharacterCount);
  elements.button.addEventListener("click", runAnalysis);
  elements.themeToggle.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme || "dark";
    applyTheme(current === "dark" ? "light" : "dark");
  });

  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.key === "Enter") {
      runAnalysis();
    }
  });
}

initTheme();
bindEvents();
updateCharacterCount();
