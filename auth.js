const Auth = (() => {
  const KEY_TOKEN = "ferreiro_token";
  const KEY_USER = "ferreiro_user";
  const API_BASE = ""; // mesma origem quando serve pelo backend

  function toast(msg, type = "") {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.className = "toast is-visible" + (type ? ` toast--${type}` : "");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("is-visible"), 3000);
  }

  function salvarSessao(token, cliente) {
    localStorage.setItem(KEY_TOKEN, token);
    localStorage.setItem(KEY_USER, JSON.stringify(cliente));
  }

  function limparSessao() {
    localStorage.removeItem(KEY_TOKEN);
    localStorage.removeItem(KEY_USER);
  }

  function getToken() {
    return localStorage.getItem(KEY_TOKEN) || "";
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(KEY_USER) || "null");
    } catch {
      return null;
    }
  }

  async function api(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(API_BASE + path, { ...options, headers });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok) {
      const msg = data?.erro || data?.mensagem || `Erro ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }

  function pintarUsuario() {
    const user = getUser();
    const chip = document.getElementById("user-chip");
    const loginLink = document.getElementById("nav-login");
    if (!chip) return;

    if (user) {
      chip.classList.add("is-visible");
      chip.querySelector("[data-user-name]").textContent = user.nome;
      if (loginLink) loginLink.style.display = "none";
    } else {
      chip.classList.remove("is-visible");
      if (loginLink) loginLink.style.display = "";
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    pintarUsuario();
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        limparSessao();
        toast("Você saiu da conta.");
        pintarUsuario();
      });
    }
  });

  return {
    toast,
    api,
    salvarSessao,
    limparSessao,
    getToken,
    getUser,
    pintarUsuario,
  };
})();
