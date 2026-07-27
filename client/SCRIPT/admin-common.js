/* Shared admin helpers: token, auth guard, fetch, toast */
(function (global) {
  const TOKEN_KEY = "adminToken";
  const API = "/api/admin";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("adminName");
    localStorage.removeItem("adminEmail");
  }

  function isTokenExpired(token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (!payload.exp) return false;
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }

  function requireAdmin() {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
      clearSession();
      window.location.href = "admin-login.html";
      return false;
    }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.role !== "admin") {
        clearSession();
        window.location.href = "admin-login.html";
        return false;
      }
    } catch {
      clearSession();
      window.location.href = "admin-login.html";
      return false;
    }
    return true;
  }

  async function adminFetch(path, options = {}) {
    const token = getToken();
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    if (res.status === 401 || res.status === 403) {
      clearSession();
      window.location.href = "admin-login.html";
      return null;
    }
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    return { ok: res.ok, status: res.status, data };
  }

  function toast(message, isError) {
    let el = document.getElementById("adminToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "adminToast";
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.toggle("error", !!isError);
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 3200);
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function logout() {
    clearSession();
    window.location.href = "admin-login.html";
  }

  function initShell(active) {
    document.querySelectorAll(".admin-nav a[data-nav]").forEach((a) => {
      if (a.getAttribute("data-nav") === active) a.classList.add("is-active");
    });
    const menuBtn = document.getElementById("adminMenuBtn");
    const sidebar = document.getElementById("adminSidebar");
    const overlay = document.getElementById("adminOverlay");
    menuBtn?.addEventListener("click", () => {
      const open = sidebar?.classList.toggle("open");
      if (overlay) {
        overlay.classList.toggle("open", !!open);
        overlay.style.display = open ? "block" : "none";
      }
    });
    overlay?.addEventListener("click", () => {
      sidebar?.classList.remove("open");
      overlay.classList.remove("open");
      overlay.style.display = "none";
    });
    document.getElementById("adminLogoutBtn")?.addEventListener("click", logout);
  }

  global.AdminCommon = {
    TOKEN_KEY,
    API,
    getToken,
    setToken,
    clearSession,
    requireAdmin,
    adminFetch,
    toast,
    escapeHtml,
    logout,
    initShell,
  };
})(window);
