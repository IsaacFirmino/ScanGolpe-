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

let knownBrands = [];
let safeDomains = [];
let confirmedScamDomains = [];

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
  running: false,
  currentAnalysis: null
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

function getConfirmedScamDomain(hostname) {
  const clean = hostname.replace(/^www\./, "").toLowerCase();
  return confirmedScamDomains.find(({ domain }) => clean === domain || clean.endsWith(`.${domain}`));
}

function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
  }
  return matrix[b.length][a.length];
}

function detectBrandSpoof(hostname) {
  const clean = getRegistrableHint(hostname);
  if (isSafeDomain(hostname)) return { brand: null, type: null };

  let detectedBrand = null;
  let spoofType = null;

  for (const brand of knownBrands) {
    const compactBrand = brand.replace(/[^a-z0-9]/g, "");
    
    // 1. Exact inclusion (e.g. nubank in nubank-verificacao)
    if (clean.includes(compactBrand)) {
      detectedBrand = brand;
      spoofType = 'exact';
      
      // Check if it's a deceptive subdomain (e.g. nubank.suporte.com)
      const parts = hostname.split('.');
      if (parts.length > 2) {
         const subdomainParts = parts.slice(0, -2);
         if (subdomainParts.some(p => p.includes(compactBrand))) {
            spoofType = 'subdomain';
         }
      }
      break;
    }
    
    // 2. Typosquatting (Levenshtein distance 1 or 2)
    if (Math.abs(clean.length - compactBrand.length) <= 2) {
      const distance = levenshteinDistance(clean, compactBrand);
      if (distance > 0 && distance <= 2) {
        detectedBrand = brand;
        spoofType = 'typo';
        break;
      }
    }
  }

  if (detectedBrand) {
    const matchesSafe = safeDomains.some((domain) => getRegistrableHint(domain) === clean);
    if (!matchesSafe) {
      return { brand: detectedBrand, type: spoofType };
    }
  }

  return { brand: null, type: null };
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
    const confirmedScam = getConfirmedScamDomain(hostname);

    if (confirmedScam) {
      const categoryDetail = confirmedScam.category
        ? ` Categoria cadastrada: ${confirmedScam.category}.`
        : "";

      addSignal(signals, {
        id: `dominio_confirmado_${confirmedScam.domain}`,
        label: "Dominio confirmado na base de golpes",
        detail: `O dominio ${confirmedScam.domain} foi confirmado como suspeito na base colaborativa.${categoryDetail}`,
        severity: "critical",
        weight: 40
      });
    }

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

    // Structure Checks
    const hyphenCount = (hostname.match(/-/g) || []).length;
    if (hyphenCount >= 3) {
      addSignal(signals, {
        id: "excesso_hifens",
        label: "URL com excesso de hifens",
        detail: "Dominios fraudulentos costumam usar muitos hifens para imitar caminhos legitimos (ex: seguranca-conta-verificacao).",
        severity: "medium",
        weight: 12
      });
    }

    const numberCount = (hostname.match(/\d/g) || []).length;
    if (numberCount >= 4) {
      addSignal(signals, {
        id: "excesso_numeros",
        label: "URL com excesso de numeros",
        detail: "Dominios com muitos numeros gerados aleatoriamente indicam baixa confiabilidade.",
        severity: "medium",
        weight: 10
      });
    }

    const partsCount = hostname.split('.').length;
    if (partsCount >= 4) {
      addSignal(signals, {
        id: "excesso_subdominios",
        label: "URL com muitos subdominios",
        detail: "Dominios verdadeiros geralmente sao curtos. Excesso de subdominios pode tentar esconder a origem real do site.",
        severity: "medium",
        weight: 12
      });
    }

    if (hostname.includes('xn--')) {
      addSignal(signals, {
        id: "punycode",
        label: "Uso de Punycode (caracteres invisiveis/homoglifos)",
        detail: "O dominio usa caracteres especiais para parecer com letras normais, uma tatica comum de phishing para enganar a vitima.",
        severity: "high",
        weight: 20
      });
    }

    const spoofInfo = detectBrandSpoof(hostname);
    if (spoofInfo.brand) {
      let detailMsg = `O dominio contem o nome da marca ${spoofInfo.brand}, mas nao e oficial.`;
      if (spoofInfo.type === 'typo') detailMsg = `O dominio possui pequenos erros de digitacao propositais para imitar a marca ${spoofInfo.brand}.`;
      if (spoofInfo.type === 'subdomain') detailMsg = `O nome da marca ${spoofInfo.brand} esta sendo usado em um subdominio para dar falsa credibilidade ao link.`;

      addSignal(signals, {
        id: `spoof_${spoofInfo.brand}`,
        label: `Dominio imita a marca ${spoofInfo.brand}`,
        detail: detailMsg,
        severity: "critical",
        weight: 28
      });
    }

    // TODO (Backend): Integrar API de reputacao de dominio (ex: Google Safe Browsing / PhishTank) aqui em versoes futuras.
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
      title: "Nenhum indicador de fraude detectado",
      summary: "Varredura concluída sem padrões relevantes. O motor não identificou combinações de risco conhecidas nesta amostra. Ainda assim, confirme por canal oficial antes de transferir dinheiro ou fornecer dados.",
      actions: [
        "Nunca compartilhe senhas, tokens ou códigos fora do app oficial.",
        "Confirme qualquer pagamento diretamente no aplicativo do banco.",
        "Em caso de dúvida, contate a empresa pelo número do verso do cartão ou site oficial."
      ]
    },
    medium: {
      className: "risk-medium",
      label: "Atenção",
      title: "Indicadores suspeitos detectados — verificação necessária",
      summary: "A varredura identificou elementos frequentemente associados a fraudes. Nível insuficiente para classificar como golpe confirmado, mas exige confirmação antes de qualquer ação.",
      actions: [
        "Verifique o remetente por outro canal antes de responder.",
        "Acesse o site oficial digitando o endereço manualmente, não use o link recebido.",
        "Suspenda qualquer Pix ou transferência até validar identidade e motivo."
      ]
    },
    high: {
      className: "risk-high",
      label: "Alto risco",
      title: "Múltiplos sinais de alto risco detectados",
      summary: "Padrões críticos de engenharia social, phishing ou pagamento fraudulento identificados. Interrompa qualquer ação em andamento e acione canal oficial.",
      actions: [
        "Não clique em links, não forneça dados e não efetue pagamentos.",
        "Bloqueie o contato se houver pressão contínua.",
        "Se dados já foram fornecidos, contate seu banco imediatamente."
      ]
    },
    critical: {
      className: "risk-critical",
      label: "Risco crítico",
      title: "Combinação de alto risco confirmada — trate como fraude",
      summary: "O motor detectou combinações de máxima severidade: domínio fraudulento, solicitação de dados sensíveis, urgência ou promessa de dinheiro em conjunto. Trate como golpe até comprovação contrária.",
      actions: [
        "Encerre a conversa ou feche a página sem interagir.",
        "Acione banco, operadora ou empresa pelo canal oficial verificado.",
        "Preserve capturas de tela e registre denúncia se houve perda financeira."
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
      label: "Sem indicadores detectados",
      detail: "O motor de varredura não encontrou padrões relevantes nesta amostra.",
      severity: "low",
      weight: 0
    }],
    urlCount: urls.length,
    type,
    domain: urls[0]?.hostname?.toLowerCase() || null
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
      <div class="confidence-ring" aria-label="Confiança da análise ${result.confidence}%">
        <div>
          <strong>${result.confidence}%</strong>
          <span>conf.</span>
        </div>
      </div>
    </div>
    <div class="result-body">
      <div>
        <p>${escapeHtml(result.summary)}</p>
        <div class="signal-stack">${signalMarkup}</div>
      </div>
      <div>
        <h3>Protocolo recomendado</h3>
        <ul class="next-actions">${actionMarkup}</ul>
        <button class="report-button" id="report-button" type="button">Denunciar este golpe</button>
        <span class="report-status" id="report-status" aria-live="polite"></span>
      </div>
    </div>
  `;

  document.getElementById("report-button")
    ?.addEventListener("click", () => reportGolpe(result));
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
  elements.button.lastChild.textContent = isLoading ? " Varrendo ameaças..." : " Iniciar varredura";
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
  state.currentAnalysis = { ...result, content: input };
  renderResult(state.currentAnalysis);
  setLoading(false);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const isLight = theme === "light";
  const nextTheme = isLight ? "escuro" : "claro";
  elements.themeToggle.setAttribute("aria-pressed", String(!isLight));
  elements.themeToggle.setAttribute("aria-label", `Ativar tema ${nextTheme}`);
  elements.themeLabel.textContent = `Ativar tema ${nextTheme}`;
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

async function loadConfirmedScamDomains() {
  if (!window.supabaseClient) return;
  try {
    const { data, error } = await window.supabaseClient
      .from("dominios_golpe")
      .select("dominio, categoria")
      .eq("confirmado", true);
    if (error) throw error;
    confirmedScamDomains = (data || []).map((row) => ({
      domain: row.dominio.toLowerCase(),
      category: row.categoria
    }));
  } catch (error) {
    console.warn("Falha ao carregar dominios confirmados do Supabase.", error);
  }
}

async function reportGolpe(analysis) {
  const btn = document.getElementById("report-button");
  const status = document.getElementById("report-status");
  if (!window.supabaseClient) {
    status.textContent = "Denúncia indisponível agora.";
    return;
  }

  btn.disabled = true;
  const { error } = await window.supabaseClient.from("relatos_golpe").insert({
    tipo: analysis.type,
    conteudo: analysis.content,
    dominio: analysis.domain,
    risco: analysis.risk,
    confianca: analysis.confidence
  });

  status.textContent = error
    ? "Não foi possível enviar agora. Tente novamente mais tarde."
    : "Denúncia enviada — obrigado por ajudar outras pessoas!";
  if (error) btn.disabled = false;
}

async function loadBrands() {
  try {
    setLoading(true);
    elements.button.lastChild.textContent = " Carregando bases...";
    const response = await fetch('brands.json');
    if (!response.ok) throw new Error('Erro ao carregar brands.json');
    const data = await response.json();
    knownBrands = data.knownBrands || [];
    safeDomains = data.safeDomains || [];
  } catch (error) {
    console.warn("Falha ao carregar brands.json. Usando fallback local.", error);
    knownBrands = ["nubank", "itau", "bradesco", "caixa", "santander", "bancodobrasil", "bb"];
    safeDomains = ["nubank.com.br", "itau.com.br", "bradesco.com.br", "caixa.gov.br", "santander.com.br", "bb.com.br"];
  } finally {
    setLoading(false);
  }
}

async function init() {
  initTheme();
  bindEvents();
  updateCharacterCount();
  await Promise.all([loadBrands(), loadConfirmedScamDomains()]);
}

init();
