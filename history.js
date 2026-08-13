/* ScanGolpe — histórico privado de análises, protegido por Supabase RLS. */
(function () {
  "use strict";

  const supabase = window.supabaseClient;
  const PAGE_SIZE = 10;

  const elements = {
    guest: document.getElementById("history-guest"),
    account: document.getElementById("history-account"),
    accountEmail: document.getElementById("history-account-email"),
    status: document.getElementById("history-status"),
    empty: document.getElementById("history-empty"),
    list: document.getElementById("history-list"),
    refresh: document.getElementById("history-refresh"),
    loadMore: document.getElementById("history-load-more")
  };

  const state = {
    user: null,
    loading: false,
    hasMore: false,
    cursor: null,
    records: []
  };

  const riskLabels = {
    low: "Baixo risco",
    medium: "Atencao",
    high: "Alto risco",
    critical: "Risco critico"
  };

  const typeLabels = {
    mensagem: "Mensagem",
    link: "Link / URL",
    pix: "Pix / Dados",
    anuncio: "Anuncio"
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function truncate(value, limit) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length > limit ? text.slice(0, limit - 1) + "…" : text;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Data indisponivel";
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(date);
  }

  function setStatus(message, tone) {
    if (!elements.status) return;
    elements.status.textContent = message || "";
    elements.status.hidden = !message;
    if (tone) elements.status.dataset.tone = tone;
    else elements.status.removeAttribute("data-tone");
  }

  function setLoading(loading, message) {
    state.loading = loading;
    if (elements.refresh) {
      elements.refresh.disabled = loading;
      elements.refresh.classList.toggle("loading", loading);
    }
    if (elements.loadMore) elements.loadMore.disabled = loading;
    if (loading && message) setStatus(message, null);
  }

  function setAuthenticatedView(user) {
    state.user = user || null;
    const authenticated = Boolean(user);
    if (elements.guest) elements.guest.hidden = authenticated;
    if (elements.account) elements.account.hidden = !authenticated;
    if (elements.accountEmail) {
      elements.accountEmail.textContent = user?.email || user?.phone || "Conta conectada";
    }
    if (!authenticated) resetHistory();
  }

  function resetHistory() {
    state.records = [];
    state.cursor = null;
    state.hasMore = false;
    if (elements.list) elements.list.innerHTML = "";
    if (elements.empty) elements.empty.hidden = true;
    if (elements.loadMore) elements.loadMore.hidden = true;
    setStatus("", null);
  }

  function buildSignals(record) {
    if (!Array.isArray(record.sinais) || record.sinais.length === 0) return "";
    const items = record.sinais.slice(0, 5).map((signal) => `
      <li>
        <strong>${escapeHtml(signal.label || "Sinal detectado")}</strong>
        <span>${escapeHtml(signal.detail || "")}</span>
      </li>
    `).join("");
    return `<ul class="history-signals">${items}</ul>`;
  }

  function renderHistory() {
    if (!elements.list || !elements.empty || !elements.loadMore) return;
    elements.empty.hidden = state.records.length !== 0;
    elements.loadMore.hidden = !state.hasMore || state.records.length === 0;

    elements.list.innerHTML = state.records.map((record) => {
      const indicatorCount = Array.isArray(record.sinais) ? record.sinais.length : 0;
      const indicatorLabel = indicatorCount === 1 ? "indicio" : "indicios";
      return `
      <article class="history-card risk-${escapeHtml(record.risco)}" data-history-id="${record.id}">
        <div class="history-card-top">
          <div class="history-card-meta">
            <span class="history-risk"><i aria-hidden="true"></i>${escapeHtml(riskLabels[record.risco] || record.risco)}</span>
            <span>${escapeHtml(typeLabels[record.tipo] || record.tipo)}</span>
            <time datetime="${escapeHtml(record.criado_em)}">${escapeHtml(formatDate(record.criado_em))}</time>
          </div>
          <button class="history-delete" type="button" data-action="delete-history" data-id="${record.id}" aria-label="Excluir analise de ${escapeHtml(formatDate(record.criado_em))}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 15H6L5 6"/><path d="M10 11v5M14 11v5"/></svg>
          </button>
        </div>

        <h3>${escapeHtml(record.titulo)}</h3>
        <p class="history-content">${escapeHtml(truncate(record.conteudo, 260))}</p>

        <div class="history-card-stats" aria-label="Resultado da analise">
          <span><strong>${indicatorCount}</strong> ${indicatorLabel}</span>
          <span><strong>${Number(record.pontuacao)}</strong> pontos</span>
          ${record.dominio ? `<span title="Dominio analisado"><strong>${escapeHtml(record.dominio)}</strong></span>` : ""}
          ${record.verificado_online ? "<span class=\"history-online\">Verificado online</span>" : ""}
        </div>

        <details class="history-details">
          <summary>Ver resultado completo</summary>
          <div class="history-details-body">
            <p>${escapeHtml(record.resumo)}</p>
            ${buildSignals(record)}
          </div>
        </details>
      </article>
    `;
    }).join("");
  }

  function mapAnalysisToRow(analysis) {
    return {
      tipo: analysis.type,
      conteudo: String(analysis.content || "").slice(0, 10000),
      dominio: analysis.domain || null,
      risco: analysis.risk,
      pontuacao: Math.round(Number(analysis.score) || 0),
      // Coluna legada mantida para compatibilidade com a tabela ja publicada.
      // A UI nao trata mais esse campo como uma probabilidade ou confianca.
      confianca: 0,
      titulo: analysis.title,
      resumo: analysis.summary,
      sinais: Array.isArray(analysis.signals)
        ? analysis.signals.map(({ id, label, detail, severity, weight, source }) => ({
            id: id || null,
            label: label || "Sinal detectado",
            detail: detail || "",
            severity: severity || "low",
            weight: Number(weight) || 0,
            source: source || "local"
          }))
        : [],
      verificado_online: Boolean(analysis.onlineChecked)
    };
  }

  async function saveAnalysis(analysis) {
    if (!supabase || !analysis) return;

    // O evento INITIAL_SESSION pode chegar alguns milissegundos depois da UI.
    // Confirma a sessão aqui para não perder um scan feito logo após o carregamento.
    if (!state.user && supabase.auth?.getSession) {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) setAuthenticatedView(data.session.user);
    }
    if (!state.user) return;

    const row = mapAnalysisToRow(analysis);
    setStatus("Salvando esta analise no seu historico…", null);

    try {
      const { data, error } = await supabase
        .from("historico_analises")
        .insert(row)
        .select("id, tipo, conteudo, dominio, risco, pontuacao, titulo, resumo, sinais, verificado_online, criado_em")
        .single();

      if (error) throw error;
      state.records.unshift(data);
      renderHistory();
      setStatus("Analise salva no seu historico privado.", "success");
    } catch (error) {
      console.warn("[ScanGolpe historico] Falha ao salvar analise.", error);
      setStatus("A analise foi concluida, mas nao conseguimos salva-la agora.", "error");
    }
  }

  async function loadHistory(options) {
    if (!supabase || !state.user || state.loading) return;
    const append = Boolean(options?.append);

    setLoading(true, append ? "Carregando analises anteriores…" : "Carregando seu historico…");
    try {
      let query = supabase
        .from("historico_analises")
        .select("id, tipo, conteudo, dominio, risco, pontuacao, titulo, resumo, sinais, verificado_online, criado_em")
        .order("id", { ascending: false })
        .limit(PAGE_SIZE + 1);

      if (append && state.cursor) {
        query = query.lt("id", state.cursor);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = Array.isArray(data) ? data : [];
      state.hasMore = rows.length > PAGE_SIZE;
      const page = rows.slice(0, PAGE_SIZE);
      state.records = append ? state.records.concat(page) : page;

      const last = page[page.length - 1];
      state.cursor = last ? last.id : state.cursor;
      renderHistory();
      setStatus("", null);
    } catch (error) {
      console.warn("[ScanGolpe historico] Falha ao carregar historico.", error);
      setStatus("Nao foi possivel carregar seu historico. Tente novamente.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function deleteHistoryRecord(id, button) {
    if (!supabase || !state.user || !id || state.loading) return;

    const originalLabel = button?.getAttribute("aria-label") || "Excluir analise";
    if (button) {
      button.disabled = true;
      button.setAttribute("aria-label", "Excluindo analise");
    }

    try {
      const { error } = await supabase
        .from("historico_analises")
        .delete()
        .eq("id", id);
      if (error) throw error;

      state.records = state.records.filter((record) => String(record.id) !== String(id));
      renderHistory();
      setStatus("Analise excluida do seu historico.", "success");
    } catch (error) {
      console.warn("[ScanGolpe historico] Falha ao excluir analise.", error);
      setStatus("Nao foi possivel excluir esta analise.", "error");
      if (button) {
        button.disabled = false;
        button.setAttribute("aria-label", originalLabel);
      }
    }
  }

  function bindEvents() {
    document.addEventListener("scangolpe:analysis-complete", (event) => {
      saveAnalysis(event.detail?.analysis);
    });

    elements.refresh?.addEventListener("click", () => {
      state.cursor = null;
      loadHistory({ append: false });
    });

    elements.loadMore?.addEventListener("click", () => {
      loadHistory({ append: true });
    });

    elements.list?.addEventListener("click", (event) => {
      const button = event.target.closest('[data-action="delete-history"]');
      if (!button) return;
      if (!window.confirm("Excluir esta analise do seu historico? Esta acao nao pode ser desfeita.")) return;
      deleteHistoryRecord(button.dataset.id, button);
    });
  }

  function bindAuthState() {
    if (!supabase?.auth) {
      setAuthenticatedView(null);
      return;
    }

    supabase.auth.onAuthStateChange((event, session) => {
      window.setTimeout(() => {
        if (session?.user) {
          const userChanged = state.user?.id !== session.user.id;
          setAuthenticatedView(session.user);
          if (userChanged || event === "INITIAL_SESSION" || event === "SIGNED_IN") {
            state.cursor = null;
            loadHistory({ append: false });
          }
        } else {
          setAuthenticatedView(null);
        }
      }, 0);
    });
  }

  function init() {
    if (!elements.guest || !elements.account) return;
    bindEvents();
    bindAuthState();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
