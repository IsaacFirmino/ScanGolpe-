/* ScanGolpe — fluxo progressivo de autenticação com Supabase Auth. */
(function () {
  "use strict";

  const supabase = window.supabaseClient;
  const DEFAULT_REDIRECT = "index.html#scanner";
  const AUTH_PAGE_URL = new URL("auth.html", window.location.href).href.split("#")[0].split("?")[0];

  const elements = {
    card: document.querySelector(".auth-card"),
    views: Array.from(document.querySelectorAll("[data-view]")),
    forms: {
      email: document.getElementById("auth-form-email"),
      signup: document.getElementById("auth-form-signup"),
      recover: document.getElementById("auth-form-recover"),
      reset: document.getElementById("auth-form-reset")
    },
    inputs: {
      email: document.getElementById("auth-email"),
      password: document.getElementById("auth-password"),
      signupEmail: document.getElementById("auth-signup-email"),
      signupPassword: document.getElementById("auth-signup-password"),
      signupConfirm: document.getElementById("auth-signup-confirm"),
      recoverEmail: document.getElementById("auth-recover-email"),
      resetPassword: document.getElementById("auth-reset-password"),
      resetConfirm: document.getElementById("auth-reset-confirm")
    },
    messages: {
      method: document.getElementById("auth-message-method"),
      email: document.getElementById("auth-message-email"),
      signup: document.getElementById("auth-message-signup"),
      recover: document.getElementById("auth-message-recover"),
      reset: document.getElementById("auth-message-reset")
    },
    signedEmail: document.getElementById("auth-signed-email")
  };

  const state = {
    currentView: "method",
    submitting: false,
    recoveryActive: false
  };

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("scangolpe-theme", theme); } catch (_) {}
  }

  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem("scangolpe-theme"); } catch (_) {}
    if (saved === "light" || saved === "dark") applyTheme(saved);
  }

  function getView(name) {
    return elements.views.find((view) => view.dataset.view === name);
  }

  function clearMessage(target) {
    if (!target) return;
    target.hidden = true;
    target.textContent = "";
    target.removeAttribute("data-tone");
  }

  function clearAllMessages() {
    Object.values(elements.messages).forEach(clearMessage);
  }

  function setMessage(target, text, tone) {
    if (!target) return;
    if (!text) {
      clearMessage(target);
      return;
    }
    target.textContent = text;
    target.hidden = false;
    if (tone) target.dataset.tone = tone;
    else target.removeAttribute("data-tone");
  }

  function showView(name, options) {
    const next = getView(name);
    if (!next) return;

    elements.views.forEach((view) => {
      view.hidden = view !== next;
      view.classList.remove("is-entering");
    });

    state.currentView = name;
    if (elements.card) elements.card.dataset.currentView = name;
    if (!options?.keepMessages) clearAllMessages();

    void next.offsetWidth;
    next.classList.add("is-entering");

    const focusTarget = options?.focus;
    if (focusTarget) window.setTimeout(() => focusTarget.focus(), 180);
  }

  function returnToMethodSelector() {
    showView("method");
  }

  function setLoading(button, loading) {
    if (!button) return;
    state.submitting = loading;
    button.classList.toggle("loading", loading);
    button.disabled = loading;
    button.setAttribute("aria-busy", String(loading));
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || "");
  }

  function getRedirectTarget() {
    const rawTarget = new URLSearchParams(window.location.search).get("redirectTo");
    if (!rawTarget || !rawTarget.startsWith("/") || rawTarget.startsWith("//")) {
      return DEFAULT_REDIRECT;
    }

    try {
      const target = new URL(rawTarget, window.location.origin);
      if (target.origin !== window.location.origin) return DEFAULT_REDIRECT;
      return target.pathname + target.search + target.hash;
    } catch (_) {
      return DEFAULT_REDIRECT;
    }
  }

  function redirectAfterLogin(delay) {
    window.setTimeout(() => {
      window.location.href = getRedirectTarget();
    }, delay || 0);
  }

  function isAuthCallback() {
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    return params.has("code") || hash.has("access_token") || hash.has("refresh_token");
  }

  function isRecoveryCallback() {
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    return params.get("type") === "recovery" || hash.get("type") === "recovery";
  }

  function friendlyAuthError(error) {
    if (!error) return null;
    const code = String(error.code || "").toLowerCase();
    const message = String(error.message || "").toLowerCase();

    if (
      code === "provider_disabled"
      || (message.includes("provider") && message.includes("not enabled"))
    ) {
      return "Este método de entrada ainda não está disponível. Tente outra opção.";
    }
    if (code === "captcha_failed") {
      return "A verificação de segurança falhou. Atualize a página e tente novamente.";
    }
    if (message.includes("invalid login credentials")) {
      return "E-mail ou senha incorretos. Verifique e tente novamente.";
    }
    if (message.includes("email not confirmed")) {
      return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
    }
    if (message.includes("user already registered") || message.includes("already been registered")) {
      return "Este e-mail já está cadastrado. Tente entrar ou recupere sua senha.";
    }
    if (message.includes("password should be at least") || message.includes("password must be at least")) {
      return "A senha precisa ter pelo menos 6 caracteres.";
    }
    if (message.includes("rate limit") || message.includes("too many requests")) {
      return "Muitas tentativas em pouco tempo. Aguarde alguns instantes.";
    }
    if (message.includes("network") || message.includes("failed to fetch")) {
      return "Falha de rede. Verifique sua conexão e tente novamente.";
    }
    return "Algo deu errado. Tente novamente em instantes.";
  }

  async function signInWithEmail(email, password) {
    if (!supabase) throw new Error("network unavailable");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUpWithEmail(email, password) {
    if (!supabase) throw new Error("network unavailable");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: AUTH_PAGE_URL }
    });
    if (error) throw error;
    return data;
  }

  async function startGoogleOAuth() {
    if (!supabase) throw new Error("network unavailable");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: AUTH_PAGE_URL }
    });
    if (error) throw error;
  }

  async function requestPasswordRecovery(email) {
    if (!supabase) throw new Error("network unavailable");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: AUTH_PAGE_URL
    });
    if (error) throw error;
  }

  async function updateRecoveredPassword(password) {
    if (!supabase) throw new Error("network unavailable");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  function bindActions() {
    document.addEventListener("click", async (event) => {
      const target = event.target.closest("[data-action]");
      if (!target || state.submitting) return;

      switch (target.dataset.action) {
        case "select-method":
          returnToMethodSelector();
          break;
        case "select-email":
          showView("email", { focus: elements.inputs.email });
          break;
        case "select-signup":
          showView("signup", { focus: elements.inputs.signupEmail });
          break;
        case "forgot-password":
          if (elements.inputs.recoverEmail && elements.inputs.email) {
            elements.inputs.recoverEmail.value = elements.inputs.email.value;
          }
          showView("recover", { focus: elements.inputs.recoverEmail });
          break;
        case "toggle-password": {
          const input = document.getElementById(target.dataset.target);
          if (!input) break;
          const willShow = input.type === "password";
          input.type = willShow ? "text" : "password";
          target.setAttribute("aria-pressed", String(willShow));
          target.setAttribute("aria-label", willShow ? "Ocultar senha" : "Mostrar senha");
          break;
        }
        case "oauth-google":
          setLoading(target, true);
          setMessage(elements.messages.method, "Abrindo a entrada segura do Google...", null);
          try {
            await startGoogleOAuth();
          } catch (error) {
            setMessage(elements.messages.method, friendlyAuthError(error), "error");
            setLoading(target, false);
          }
          break;
        case "logout":
          setLoading(target, true);
          try {
            await signOut();
            returnToMethodSelector();
          } catch (_) {
            showView("signed");
          } finally {
            setLoading(target, false);
          }
          break;
      }
    });
  }

  function bindForms() {
    elements.forms.email?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (state.submitting) return;

      const email = elements.inputs.email.value.trim();
      const password = elements.inputs.password.value;
      const button = event.currentTarget.querySelector(".auth-primary-button");

      if (!isValidEmail(email)) {
        setMessage(elements.messages.email, "Informe um e-mail válido.", "error");
        return;
      }
      if (!password) {
        setMessage(elements.messages.email, "Informe sua senha.", "error");
        return;
      }

      setLoading(button, true);
      clearMessage(elements.messages.email);
      try {
        await signInWithEmail(email, password);
        setMessage(elements.messages.email, "Login realizado. Redirecionando...", "success");
        redirectAfterLogin(650);
      } catch (error) {
        setMessage(elements.messages.email, friendlyAuthError(error), "error");
        setLoading(button, false);
      }
    });

    elements.forms.signup?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (state.submitting) return;

      const email = elements.inputs.signupEmail.value.trim();
      const password = elements.inputs.signupPassword.value;
      const confirmation = elements.inputs.signupConfirm.value;
      const button = event.currentTarget.querySelector(".auth-primary-button");

      if (!isValidEmail(email)) {
        setMessage(elements.messages.signup, "Informe um e-mail válido.", "error");
        return;
      }
      if (password.length < 6) {
        setMessage(elements.messages.signup, "A senha precisa ter pelo menos 6 caracteres.", "error");
        return;
      }
      if (password !== confirmation) {
        setMessage(elements.messages.signup, "As senhas não coincidem.", "error");
        return;
      }

      setLoading(button, true);
      clearMessage(elements.messages.signup);
      try {
        const data = await signUpWithEmail(email, password);
        if (data?.session) {
          setMessage(elements.messages.signup, "Conta criada. Redirecionando...", "success");
          redirectAfterLogin(750);
        } else {
          setMessage(elements.messages.signup, "Conta criada! Confirme seu e-mail pelo link enviado antes de entrar.", "success");
          setLoading(button, false);
        }
      } catch (error) {
        setMessage(elements.messages.signup, friendlyAuthError(error), "error");
        setLoading(button, false);
      }
    });

    elements.forms.recover?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (state.submitting) return;

      const email = elements.inputs.recoverEmail.value.trim();
      const button = event.currentTarget.querySelector(".auth-primary-button");
      if (!isValidEmail(email)) {
        setMessage(elements.messages.recover, "Informe um e-mail válido.", "error");
        return;
      }

      setLoading(button, true);
      clearMessage(elements.messages.recover);
      try {
        await requestPasswordRecovery(email);
        setMessage(elements.messages.recover, "Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha.", "success");
      } catch (error) {
        setMessage(elements.messages.recover, friendlyAuthError(error), "error");
      } finally {
        setLoading(button, false);
      }
    });

    elements.forms.reset?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (state.submitting) return;

      const password = elements.inputs.resetPassword.value;
      const confirmation = elements.inputs.resetConfirm.value;
      const button = event.currentTarget.querySelector(".auth-primary-button");
      if (password.length < 6) {
        setMessage(elements.messages.reset, "A senha precisa ter pelo menos 6 caracteres.", "error");
        return;
      }
      if (password !== confirmation) {
        setMessage(elements.messages.reset, "As senhas não coincidem.", "error");
        return;
      }

      setLoading(button, true);
      clearMessage(elements.messages.reset);
      try {
        await updateRecoveredPassword(password);
        state.recoveryActive = false;
        setMessage(elements.messages.reset, "Senha atualizada. Redirecionando...", "success");
        redirectAfterLogin(850);
      } catch (error) {
        setMessage(elements.messages.reset, friendlyAuthError(error), "error");
        setLoading(button, false);
      }
    });

  }

  function showSignedUser(user) {
    if (elements.signedEmail) {
      elements.signedEmail.textContent = user?.email || "Conta conectada";
    }
    showView("signed");
  }

  function bindAuthStateListener() {
    if (!supabase?.auth) return;

    supabase.auth.onAuthStateChange((event, session) => {
      window.setTimeout(() => {
        if (event === "PASSWORD_RECOVERY") {
          state.recoveryActive = true;
          showView("reset", { focus: elements.inputs.resetPassword });
          return;
        }

        if (event === "SIGNED_OUT") {
          state.recoveryActive = false;
          returnToMethodSelector();
          return;
        }

        if (!session?.user || state.recoveryActive) return;
        if (isRecoveryCallback()) {
          state.recoveryActive = true;
          showView("reset", { focus: elements.inputs.resetPassword });
          return;
        }
        if (isAuthCallback()) {
          setMessage(elements.messages.method, "Entrada confirmada. Redirecionando...", "success");
          redirectAfterLogin(500);
          return;
        }
        if (event === "INITIAL_SESSION") showSignedUser(session.user);
      }, 0);
    });
  }

  async function checkExistingSession() {
    if (!supabase?.auth || state.recoveryActive || isRecoveryCallback()) return;
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (data?.session?.user) {
        if (isAuthCallback()) redirectAfterLogin(350);
        else showSignedUser(data.session.user);
      }
    } catch (error) {
      console.warn("[ScanGolpe auth] Não foi possível verificar a sessão.", error);
    }
  }

  function init() {
    initTheme();
    state.recoveryActive = isRecoveryCallback();
    bindActions();
    bindForms();
    bindAuthStateListener();

    if (state.recoveryActive) {
      showView("reset", { focus: elements.inputs.resetPassword });
    } else {
      showView("method");
      window.setTimeout(checkExistingSession, 80);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

