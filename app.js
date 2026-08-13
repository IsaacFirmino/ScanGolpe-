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
    detail: "O alerta considera um pedido para enviar, informar ou confirmar dados. A simples mencao a CPF, conta ou cartao nao e suficiente.",
    severity: "high",
    weight: 20,
    pattern: /\b(informe|envie|mande|digite|confirme|passe|compartilhe|valide|atualize|forneca).{0,55}\b(cpf|rg|senha|token|codigo|codigos|cartao|cvv|conta|agencia|biometria|selfie|documento)\b|\b(cpf|rg|senha|token|codigo|codigos|cartao|cvv|conta|agencia|biometria|selfie|documento).{0,55}\b(informe|envie|mande|digite|confirme|passe|compartilhe|valide|atualize|forneca)\b/i
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
    id: "pagamento_direcionado",
    label: "Pagamento por Pix em contexto sensivel",
    detail: "O alerta exige uma instrucao de pagamento ou transferencia; citar Pix por si so nao caracteriza golpe.",
    severity: "high",
    weight: 16,
    pattern: /\b(me\s+(faz|mande|manda|envie|envia)|faca|pague|deposite|transfira|realize|efetue|pagar|depositar|transferir).{0,60}\b(pix|chave pix|copia e cola|qr code|transferencia)\b|\b(pix|chave pix|copia e cola|qr code|transferencia).{0,60}\b(agora|hoje|urgente|imediato|para este numero|para essa chave|para minha conta)\b/i
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
    id: "recrutamento_renda_irreal",
    label: "Oferta de trabalho com ganho diario fora do padrao",
    detail: "Convites vagos para ser agente ou parceiro, com valores altos por dia, sao usados para atrair contatos e depois cobrar taxas ou pedir dados.",
    severity: "high",
    weight: 18,
    pattern: /\b(agente|parceir[oa]s?|representante|divulgador|afiliad[oa]s?).{0,140}\b(salario|pagamento|renda|ganhos?|comissao).{0,60}\b(diario|por dia)\b.{0,60}\br\$\s?[\d.]+|\b(salario|pagamento|renda|ganhos?|comissao).{0,60}\b(diario|por dia)\b.{0,60}\br\$\s?[\d.]+.{0,140}\b(agente|parceir[oa]s?|representante|divulgador|afiliad[oa]s?)\b/i
  },
  {
    id: "recrutamento_whatsapp",
    label: "Convite de trabalho direcionado ao WhatsApp",
    detail: "Uma vaga legitima pode usar WhatsApp, mas a combinacao de convite generico, remuneracao e contato externo merece confirmacao independente.",
    severity: "high",
    weight: 18,
    pattern: /\b(agente|parceir[oa]s?|representante|divulgador|afiliad[oa]s?|plataforma).{0,180}\b(salario|pagamento|renda|ganhos?|comissao).{0,140}\b(whatsapp|telegram)\b|\b(salario|pagamento|renda|ganhos?|comissao).{0,140}\b(whatsapp|telegram)\b.{0,140}\b(agente|parceir[oa]s?|representante|divulgador|afiliad[oa]s?|plataforma)\b/i
  },
  {
    id: "canal_informal",
    label: "Canal informal para tratar assunto sensivel",
    detail: "Bancos, governo e grandes empresas nao resolvem senha, token ou pagamento por conversa informal.",
    severity: "medium",
    weight: 10,
    pattern: /\b(whatsapp|telegram|direct|dm|inbox).{0,35}(banco|senha|token|pix|pagamento|conta)\b/i
  },
  {
    id: "troca_numero_whatsapp",
    label: "Possivel golpe do novo numero",
    detail: "Criminosos podem se passar por familiares e pedir Pix alegando troca de numero. Confirme por ligacao ou contato conhecido.",
    severity: "high",
    weight: 18,
    pattern: /\b(troquei|mudei|esse e|este e|salva ai).{0,45}\b(novo numero|numero novo|novo whatsapp|novo contato)\b|\b(novo numero|numero novo|novo whatsapp|novo contato).{0,45}\b(pix|transferencia|dinheiro|preciso)\b/i
  },
  {
    id: "falsa_central",
    label: "Possivel falsa central de atendimento",
    detail: "Alertas sobre compra suspeita ou bloqueio, acompanhados de pedido de codigo ou dados, costumam imitar bancos e empresas.",
    severity: "high",
    weight: 18,
    pattern: /\b(central de (seguranca|atendimento)|compra (suspeita|nao reconhecida)|movimentacao (suspeita|nao reconhecida)|acesso (suspeito|bloqueado)).{0,90}\b(codigo|senha|token|confirm|ligue|whatsapp)\b/i
  },
  {
    id: "aluguel_adiantado",
    label: "Pagamento antecipado em anuncio de aluguel",
    detail: "Sinal, reserva ou deposito antes de visitar e validar o imovel pode indicar anuncio falso. Confirme anuncio, proprietario e imovel presencialmente.",
    severity: "high",
    weight: 18,
    pattern: /\b(aluguel|alugar|imovel|apartamento|casa para alugar).{0,100}\b(sinal|reserva|deposito|pix|transferencia|adiantad[oa])\b|\b(sinal|reserva|deposito|pix|transferencia|adiantad[oa]).{0,100}\b(aluguel|alugar|imovel|apartamento|casa)\b/i
  },
  {
    id: "marketplace_fora_plataforma",
    label: "Possivel pagamento fora da plataforma",
    detail: "Em anuncios, pagamento por fora, taxa de liberacao ou conversa externa podem remover as protecoes da plataforma.",
    severity: "high",
    weight: 18,
    pattern: /\b(mercado livre|shopee|aliexpress|olx|shein|amazon).{0,120}\b(pix|transferencia|taxa|fora da plataforma|whatsapp|liberar venda)\b|\b(pix|transferencia|taxa|fora da plataforma|whatsapp|liberar venda).{0,120}\b(mercado livre|shopee|aliexpress|olx|shein|amazon)\b/i
  },
  {
    id: "aposta_retorno_garantido",
    label: "Promessa de retorno garantido em aposta ou cassino",
    detail: "Nenhuma aposta ou cassino pode garantir lucro. Nao deposite com base em promessa de retorno, saque imediato ou risco zero.",
    severity: "high",
    weight: 20,
    pattern: /\b(bet|aposta|cassino|casa de apostas|jogo).{0,100}\b(retorno garantido|lucro garantido|sem risco|dobr[ae]|ganho certo|saque imediato)\b|\b(retorno garantido|lucro garantido|sem risco|dobr[ae]|ganho certo|saque imediato).{0,100}\b(bet|aposta|cassino|casa de apostas|jogo)\b/i
  },
  {
    id: "extorsao_ameaca",
    label: "Possivel extorsao ou ameaca",
    detail: "Ameacas com pedido de dinheiro exigem cuidado imediato. Nao negocie sob pressao; preserve provas e procure ajuda oficial se houver risco real.",
    severity: "critical",
    weight: 32,
    pattern: /\b(estou com (seu|sua)|seu filho|sua filha|sequestr|ameaca|vou te matar|faca um pix|pague para nao|dinheiro ou).{0,100}\b(pix|transferencia|dinheiro|agora)\b|\b(pix|transferencia|dinheiro).{0,100}\b(seu filho|sua filha|sequestr|ameaca|vou te matar)\b/i
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
  const normalized = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Emojis e simbolos entre palavras sao comuns em mensagens de golpe.
    // Eles viram espacos para que "salario diario" seja lido como duas palavras.
    .replace(/[^\p{L}\p{N}\s:/?&.=#$%+@_-]/gu, " ")
    .replace(/[^\S\r\n]+/g, " ")
    .trim();

  // Corrige apenas formas frequentes de ofuscacao em golpes. A conversao
  // global de numeros quebraria CPF, chaves Pix e valores monetarios.
  return normalized
    .replace(/\bp[1il][xk]\b/gi, "pix")
    .replace(/\burg[3e]nte\b/gi, "urgente")
    .replace(/\bn[0o]v[0o]\b/gi, "novo")
    .replace(/\bc[0o]d[1i]g[0o]\b/gi, "codigo")
    .replace(/\bsenh[4a]\b/gi, "senha")
    .replace(/\bv[3e]r[1i]f[1i]c[4a]r\b/gi, "verificar")
    .replace(/\btr[4a]nsferenc[1i][4a]\b/gi, "transferencia")
    .replace(/\bpr[3e]m[1i][0o]\b/gi, "premio")
    .replace(/\bb[4a]nc[0o]\b/gi, "banco")
    .replace(/\bbl[0o]que[1i][0o]\b/gi, "bloqueio")
    .replace(/\b[4a]tu[4a]l[1i]z[4a]r\b/gi, "atualizar");
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

function getRegistrableDomain(hostname) {
  const labels = hostname.toLowerCase().replace(/^www\./, "").split(".").filter(Boolean);
  if (labels.length <= 2) return labels.join(".");

  // O projeto nao usa bundler. Esta lista cobre sufixos brasileiros comuns
  // sem transformar "www.nubank.com.br" em uma URL suspeita por ter 4 partes.
  const twoPartSuffixes = new Set(["com.br", "net.br", "org.br", "gov.br", "edu.br", "jus.br", "leg.br", "mil.br", "com.mx", "co.uk"]);
  const suffix = labels.slice(-2).join(".");
  return twoPartSuffixes.has(suffix) && labels.length >= 3
    ? labels.slice(-3).join(".")
    : labels.slice(-2).join(".");
}

function getRegistrableHint(hostname) {
  return getRegistrableDomain(hostname).replace(/\.[a-z]{2,}$/i, "").replace(/[^a-z0-9]/gi, "");
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
    
    // 1. Marca no dominio registravel (ex.: nubank-verificacao.com.br).
    if (clean.includes(compactBrand)) {
      detectedBrand = brand;
      spoofType = 'exact';

      // Marca em subdominio de outro site (ex.: nubank.suporte-exemplo.com).
      const registrable = getRegistrableDomain(hostname);
      const normalizedHostname = hostname.toLowerCase();
      const subdomain = normalizedHostname.endsWith(registrable)
        ? normalizedHostname.slice(0, -registrable.length).replace(/\.$/, "")
        : "";
      if (subdomain.replace(/[^a-z0-9]/gi, "").includes(compactBrand)) {
        spoofType = 'subdomain';
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
    const knownSafeDomain = isSafeDomain(hostname);

    if (confirmedScam) {
      const categoryDetail = confirmedScam.category
        ? ` Categoria cadastrada: ${confirmedScam.category}.`
        : "";

      addSignal(signals, {
        id: `dominio_confirmado_${confirmedScam.domain}`,
        label: "Dominio confirmado na base de golpes",
        detail: `O dominio ${confirmedScam.domain} foi confirmado como suspeito na base colaborativa.${categoryDetail}`,
        severity: "critical",
        weight: 40,
        source: "external-confirmed"
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

    if (!knownSafeDomain && urlRules.suspiciousWords.test(href)) {
      addSignal(signals, {
        id: "url_palavras_sensiveis",
        label: "URL usa termos de login, suporte ou verificacao",
        detail: "Termos como login, seguranca, atualizar e desbloquear exigem verificacao quando o dominio nao e reconhecido como oficial.",
        severity: "medium",
        weight: 11
      });
    }

    // Estrutura suspeita so pesa em dominios que nao constam como oficiais.
    const hyphenCount = (hostname.match(/-/g) || []).length;
    if (!knownSafeDomain && hyphenCount >= 3) {
      addSignal(signals, {
        id: "excesso_hifens",
        label: "URL com excesso de hifens",
        detail: "Dominios fraudulentos costumam usar muitos hifens para imitar caminhos legitimos (ex: seguranca-conta-verificacao).",
        severity: "medium",
        weight: 12
      });
    }

    const numberCount = (hostname.match(/\d/g) || []).length;
    if (!knownSafeDomain && numberCount >= 4) {
      addSignal(signals, {
        id: "excesso_numeros",
        label: "URL com excesso de numeros",
        detail: "Dominios com muitos numeros gerados aleatoriamente indicam baixa confiabilidade.",
        severity: "medium",
        weight: 10
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

    // A reputacao externa e aplicada depois pela Edge Function. Esta camada
    // local continua funcionando quando o provedor estiver indisponivel.
  });
}

function calculateRisk(signals) {
  const rawScore = signals.reduce((sum, signal) => sum + signal.weight, 0);
  const score = Math.min(100, rawScore);
  const criticalSignals = signals.filter((signal) => signal.severity === "critical").length;
  const highSignals = signals.filter((signal) => signal.severity === "high").length;
  const externalConfirmation = signals.some((signal) => signal.source === "external-confirmed");

  let risk = "low";
  if (externalConfirmation || criticalSignals > 0 || score >= 78) {
    risk = "critical";
  } else if (score >= 45 || highSignals >= 2) {
    risk = "high";
  } else if (score >= 18) {
    risk = "medium";
  }

  return { risk, score, externalConfirmation };
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
  const hasPixReference = /\b(pix|chave pix|copia e cola|qr code|transferencia)\b/i.test(normalized);
  const hasUrgency = signals.some((signal) => signal.id === "urgencia");
  const hasSensitiveDataRequest = signals.some((signal) => signal.id === "pedido_dados");
  const hasPaymentRequest = signals.some((signal) => signal.id === "pagamento_direcionado");

  if (urls.length > 0 && hasMoney && hasUrgency) {
    addSignal(signals, {
      id: "combo_link_dinheiro_urgencia",
      label: "Link com dinheiro e urgencia",
      detail: "Link, valor financeiro e pressa formam uma combinacao comum em golpes. Confirme o destino por canal oficial.",
      severity: "high",
      weight: 24
    });
  }

  if (hasPaymentRequest && hasUrgency && hasMoney) {
    addSignal(signals, {
      id: "pix_pressao",
      label: "Pagamento com pressao para agir",
      detail: "Nao faca Pix ou transferencia sob pressao. Confirme a identidade por um contato conhecido ou canal oficial.",
      severity: "high",
      weight: 20
    });
  }

  if (urls.length > 0 && hasSensitiveDataRequest) {
    addSignal(signals, {
      id: "link_pede_dados",
      label: "Link associado a pedido de dados",
      detail: "Uma mensagem que une link e pedido de senha, token, codigo ou documento merece verificacao rigorosa.",
      severity: "high",
      weight: 24
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

  if (type === "pix" && hasPixReference && !hasPaymentRequest && !urls.length && !hasUrgency) {
    addSignal(signals, {
      id: "pix_neutro",
      label: "Dados de pagamento exigem confirmacao externa",
      detail: "A simples presenca de uma chave Pix nao confirma golpe. Antes de pagar, confira nome, valor e destinatario no aplicativo oficial.",
      severity: "low",
      weight: 6
    });
  }

  return buildResult({ ...calculateRisk(signals), signals, urls, type });
}

function buildResult({ risk, score, externalConfirmation, signals, urls, type }) {
  const levels = {
    low: {
      className: "risk-low",
      label: "Baixo risco",
      title: "Nenhum sinal forte detectado",
      summary: "A varredura nao identificou combinacoes conhecidas de alto risco nesta amostra. Isso nao confirma que a mensagem ou link seja seguro; confirme por canal oficial antes de transferir dinheiro ou fornecer dados.",
      actions: [
        "Nunca compartilhe senhas, tokens ou codigos fora do app oficial.",
        "Confirme qualquer pagamento diretamente no aplicativo do banco.",
        "Em caso de duvida, contate a empresa pelo numero do verso do cartao ou site oficial."
      ]
    },
    medium: {
      className: "risk-medium",
      label: "Atencao",
      title: "Indicadores suspeitos detectados — verificacao necessaria",
      summary: "A varredura identificou elementos associados a fraudes. O resultado e uma triagem, nao uma confirmacao definitiva; valide antes de qualquer acao.",
      actions: [
        "Verifique o remetente por outro canal antes de responder.",
        "Acesse o site oficial digitando o endereco manualmente, nao use o link recebido.",
        "Suspenda qualquer Pix ou transferencia ate validar identidade e motivo."
      ]
    },
    high: {
      className: "risk-high",
      label: "Alto risco",
      title: "Multiplos sinais de alto risco detectados",
      summary: "Foram encontrados padroes fortes de engenharia social, phishing ou pagamento sob pressao. Interrompa a acao e valide pelo canal oficial.",
      actions: [
        "Nao clique em links, nao forneca dados e nao efetue pagamentos.",
        "Bloqueie o contato se houver pressao continua.",
        "Se dados ja foram fornecidos, contate seu banco imediatamente."
      ]
    },
    critical: {
      className: "risk-critical",
      label: "Risco muito alto",
      title: "Indicios fortes de fraude — trate como suspeita de golpe",
      summary: "O motor encontrou uma combinacao de alta severidade. Heuristicas nao substituem uma investigacao, mas voce deve interromper a interacao ate comprovar a legitimidade pelo canal oficial.",
      actions: [
        "Encerre a conversa ou feche a pagina sem interagir.",
        "Acione banco, operadora ou empresa pelo canal oficial verificado.",
        "Preserve capturas de tela e registre denuncia se houve perda financeira."
      ]
    }
  };

  const selected = levels[risk];
  const topSignals = [...signals]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);
  const hasExtortionSignal = signals.some((signal) => signal.id === "extorsao_ameaca");
  const hasRecruitmentScamSignal = signals.some((signal) =>
    signal.id === "recrutamento_renda_irreal" || signal.id === "recrutamento_whatsapp"
  );
  const hasAnySignal = signals.length > 0;
  const title = risk === "low" && hasAnySignal
    ? "Poucos sinais detectados — confirme antes de agir"
    : selected.title;
  const summary = externalConfirmation
    ? "Uma fonte externa de reputacao classificou pelo menos uma URL como ameaca. Ainda assim, nao interaja com o link e confirme qualquer comunicacao pelo canal oficial."
    : selected.summary;
  const actions = hasExtortionSignal
    ? [
        "Nao responda, nao negocie e nao envie dinheiro sob pressao.",
        "Preserve capturas, numeros, links e comprovantes sem apagar a conversa.",
        "Se houver risco imediato a sua seguranca, procure o canal oficial de emergencia da sua regiao."
      ]
    : hasRecruitmentScamSignal
      ? [
          "Nao pague taxa, curso, cadastro, liberacao ou deposito para comecar a trabalhar.",
          "Pesquise a empresa e o CNPJ; confirme a vaga pelo site ou canal oficial, nao apenas pelo WhatsApp recebido.",
          "Nao envie documentos, selfie ou dados bancarios antes de validar quem esta recrutando."
        ]
      : selected.actions;

  return {
    ...selected,
    risk,
    score,
    title,
    summary,
    actions,
    externalConfirmation: Boolean(externalConfirmation),
    indicatorCount: signals.length,
    signals: topSignals.length ? topSignals : [{
      label: "Sem indicadores detectados",
      detail: "O motor de varredura nao encontrou padroes relevantes nesta amostra.",
      severity: "low",
      weight: 0
    }],
    urls,
    urlCount: urls.length,
    type,
    domain: urls[0]?.hostname?.toLowerCase() || null
  };
}

function renderOnlineStatus(result) {
  if (result.onlineStatus === "checked") {
    return '<span class="online-badge" title="URLs verificadas por uma fonte externa de reputacao">✓ Verificacao online concluida</span>';
  }
  if (result.onlineStatus === "partial") {
    return '<span class="online-badge online-badge-warning" title="Parte das URLs nao pode ser verificada online">! Verificacao online parcial</span>';
  }
  if (result.onlineStatus === "unavailable") {
    return '<span class="online-badge online-badge-unavailable" title="A analise abaixo usa apenas indicadores locais">! Verificacao online indisponivel</span>';
  }
  return "";
}

function renderResult(result) {
  elements.result.className = `result-card show ${result.className}`;
  elements.result.setAttribute("aria-hidden", "false");

  const signalMarkup = result.signals.map((signal) => `
    <div class="signal-item">
      <strong>${escapeHtml(signal.label)}</strong>
      <span>${escapeHtml(signal.detail)}</span>
    </div>
  `).join("");

  const actionMarkup = result.actions.map((action) => `<li>${escapeHtml(action)}</li>`).join("");
  const indicatorLabel = result.indicatorCount === 1 ? "indicio" : "indicios";

  elements.result.innerHTML = `
    <div class="result-top">
      <div>
        <span class="risk-label"><span class="risk-dot"></span>${escapeHtml(result.label)}</span>
        ${renderOnlineStatus(result)}
        <h3 class="risk-title">${escapeHtml(result.title)}</h3>
      </div>
      <div class="indicator-count" aria-label="${result.indicatorCount} ${indicatorLabel} encontrados">
        <div>
          <strong>${result.indicatorCount}</strong>
          <span>${indicatorLabel}</span>
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

async function checkUrlsOnline(urls) {
  if (!Array.isArray(urls) || urls.length === 0) {
    return { status: "not-requested", results: [] };
  }

  if (!window.supabaseClient) {
    return {
      status: "unavailable",
      results: [],
      message: "A verificacao externa nao esta configurada. O resultado usa somente indicadores locais."
    };
  }

  // Extrai apenas os hrefs e limita a 5, igual ao limite da Edge Function.
  const list = urls.map((u) => u.href).slice(0, 5);
  try {
    const { data, error } = await window.supabaseClient.functions.invoke("scan-url", {
      body: { urls: list }
    });
    if (error) {
      return {
        status: "unavailable",
        results: [],
        message: "A verificacao externa esta indisponivel no momento. O resultado usa somente indicadores locais."
      };
    }

    const results = Array.isArray(data?.results) ? data.results : [];
    if (results.length === 0) {
      return {
        status: "unavailable",
        results: [],
        message: "A verificacao externa nao retornou uma resposta valida. O resultado usa somente indicadores locais."
      };
    }

    const unavailableCount = results.filter((entry) => entry?.safe !== true && entry?.safe !== false).length;
    return {
      status: unavailableCount > 0 ? "partial" : "checked",
      results,
      message: unavailableCount > 0
        ? "Parte das URLs nao pode ser verificada online; os demais sinais continuam sendo locais."
        : "URLs verificadas por uma fonte externa de reputacao."
    };
  } catch {
    return {
      status: "unavailable",
      results: [],
      message: "A verificacao externa esta indisponivel no momento. O resultado usa somente indicadores locais."
    };
  }
}

function mergeOnlineSignals(result, onlineResults) {
  const trustLabel = {
    MALWARE: "Malware confirmado",
    SOCIAL_ENGINEERING: "Phishing confirmado pelo Google",
    UNWANTED_SOFTWARE: "Software indesejado confirmado",
    POTENTIALLY_HARMFUL_APPLICATION: "Aplicativo potencialmente perigoso"
  };

  onlineResults.forEach((entry) => {
    if (entry.safe === false) {
      addSignal(result.signals, {
        id: `gsb_${entry.threatType}_${entry.url}`,
        label: `Google Safe Browsing: ${trustLabel[entry.threatType] || entry.threatType}`,
        detail: `A URL ${entry.url} foi classificada como ${entry.threatType} pela base do Google Safe Browsing.`,
        severity: "critical",
        weight: 35,
        source: "external-confirmed"
      });
    }
  });

  const updated = buildResult({
    ...calculateRisk(result.signals),
    signals: result.signals,
    urls: result.urls || [],
    type: result.type
  });
  Object.assign(result, updated);
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

  // A consulta externa complementa a analise local; a indisponibilidade fica
  // visivel para a pessoa usuaria e nunca e tratada como URL segura.
  const onlineCheck = await checkUrlsOnline(result.urls);
  if (onlineCheck.results.length > 0) mergeOnlineSignals(result, onlineCheck.results);
  result.onlineStatus = onlineCheck.status;
  result.onlineMessage = onlineCheck.message || "";
  result.onlineChecked = onlineCheck.status === "checked";

  state.currentAnalysis = { ...result, content: input };
  renderResult(state.currentAnalysis);
  document.dispatchEvent(new CustomEvent("scangolpe:analysis-complete", {
    detail: { analysis: { ...state.currentAnalysis } }
  }));
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
    // Campo legado da tabela de denuncias. A pontuacao nao e uma probabilidade,
    // portanto nao enviamos mais uma "confianca" artificial.
    confianca: 0
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

// Banner opcional: aparece no topo do scanner quando ha sessao ativa.
// NUNCA bloqueia o scanner; o history.js cuida da persistencia privada.
function maybeInjectAuthBanner() {
  if (!window.supabaseClient || !window.supabaseClient.auth) return;
  if (document.getElementById("scanner-auth-banner")) return;

  window.supabaseClient.auth.getSession().then(({ data }) => {
    const session = data?.session;
    if (!session?.user) return;

    const scannerShell = document.querySelector(".scanner-shell");
    if (!scannerShell) return;

    const banner = document.createElement("div");
    banner.id = "scanner-auth-banner";
    banner.className = "scanner-auth-banner";
    banner.innerHTML = `
      <span class="scanner-auth-dot" aria-hidden="true"></span>
      <span class="scanner-auth-text">
        Sessao ativa como <strong>${escapeHtml(session.user.email || session.user.phone || "usuario")}</strong> — novas analises serao salvas no seu historico.
      </span>
      <a class="scanner-auth-action" href="#historico">Ver historico</a>
      <button type="button" class="scanner-auth-action" id="scanner-auth-logout">Sair</button>
    `;

    scannerShell.prepend(banner);

    document.getElementById("scanner-auth-logout")?.addEventListener("click", async () => {
      try {
        await window.supabaseClient.auth.signOut();
        banner.remove();
      } catch (error) {
        console.warn("Falha ao encerrar sessao.", error);
      }
    });
  }).catch(() => {
    // Sessao nao checavel — segue normalmente sem banner.
  });
}

async function init() {
  initTheme();
  bindEvents();
  updateCharacterCount();
  await Promise.all([loadBrands(), loadConfirmedScamDomains()]);
  maybeInjectAuthBanner();
}

init();
