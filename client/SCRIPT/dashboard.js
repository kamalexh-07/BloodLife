/* =========================================================
   BloodLife Dashboard — dashboard.js
   Responsibilities:
   - Verify JWT before rendering anything
   - Fetch logged-in user (GET /api/auth/me)
   - Load stats from aggregates (GET /api/donors/stats, GET /api/requests)
   - Render recent requests (table on desktop, cards on mobile)
   - Handle availability toggle + logout
   - Redirect to login.html if the token is missing/invalid
   ========================================================= */

(() => {
  const API_BASE = "/api";
  const TOKEN_KEY = "userToken";
  const LOGIN_PAGE = "login.html";

  const $ = (id) => document.getElementById(id);

  const els = {
    userName: $("userName"),
    userBloodGroup: $("userBloodGroup"),
    userPhone: $("userPhone"),
    userDistrict: $("userDistrict"),
    avatarInitial: $("avatarInitial"),
    availabilityToggle: $("availabilityToggle"),
    updateAvailabilityAction: $("updateAvailabilityAction"),
    statTotalDonors: $("statTotalDonors"),
    statActiveRequests: $("statActiveRequests"),
    statAvailableDonors: $("statAvailableDonors"),
    requestsTableBody: $("requestsTableBody"),
    requestsCardList: $("requestsCardList"),
    logoutBtn: $("logoutBtn"),
    menuToggle: $("menuToggle"),
    sidebar: $("sidebar"),
    toast: $("toast"),
  };

  /* ---------------- Token / auth helpers ---------------- */

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function isTokenExpired(token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (!payload.exp) return false; // no exp claim, trust the server to reject it
      return Date.now() >= payload.exp * 1000;
    } catch (err) {
      return true; // malformed token, treat as invalid
    }
  }

  function redirectToLogin() {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = LOGIN_PAGE;
  }

  async function authedFetch(path, options = {}) {
    const token = getToken();
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    if (res.status === 401 || res.status === 403) {
      redirectToLogin();
      return null;
    }
    if (!res.ok) {
      throw new Error(`Request to ${path} failed with status ${res.status}`);
    }
    return res.json();
  }

  /* ---------------- Toast ---------------- */

  let toastTimer = null;
  function showToast(message, isError = false) {
    els.toast.textContent = message;
    els.toast.classList.toggle("is-error", isError);
    els.toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), 3000);
  }

  /* ---------------- Rendering ---------------- */


  function formatPersonName(raw) {
    const parts = String(raw || "").trim().split(/\s+/).filter(Boolean);
    const deduped = [];
    for (const part of parts) {
      const lower = part.toLowerCase();
      if (deduped.length && deduped[deduped.length - 1].toLowerCase() === lower) continue;
      deduped.push(part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
    }
    return deduped.join(" ");
  }

  function initials(name) {
    if (!name) return "–";
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");
  }

  function renderUser(user) {
    els.userName.textContent = formatPersonName(user.name) || user.name || "Unnamed Donor";
    els.userBloodGroup.textContent = user.bloodGroup || "—";
    els.userPhone.textContent = user.phone || "No phone on file";
    els.userDistrict.textContent = user.district || "No district set";
    els.avatarInitial.textContent = initials(formatPersonName(user.name) || user.name);
    setAvailabilityUI(Boolean(user.isAvailable));
  }

  function setAvailabilityUI(isAvailable) {
    const state = isAvailable ? "available" : "unavailable";
    els.availabilityToggle.dataset.state = state;
    els.availabilityToggle.setAttribute("aria-checked", String(isAvailable));
    els.availabilityToggle.querySelector(".availability__text").textContent = isAvailable
      ? "Available"
      : "Unavailable";
  }

  function renderStatsFromAggregates(stats) {
    els.statTotalDonors.textContent = Number(stats.totalDonors || 0).toLocaleString();
    els.statActiveRequests.textContent = Number(stats.activeRequests || 0).toLocaleString();
    els.statAvailableDonors.textContent = Number(stats.availableDonors || 0).toLocaleString();
  }

  function statusPillClass(status) {
    switch ((status || "").toLowerCase()) {
      case "fulfilled":
        return "status-pill status-pill--fulfilled";
      case "urgent":
        return "status-pill status-pill--urgent";
      default:
        return "status-pill status-pill--open";
    }
  }

  function renderRecentRequests(requests) {
    const recent = [...requests]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5);

    if (recent.length === 0) {
      els.requestsTableBody.innerHTML =
        '<tr class="table-loading-row"><td colspan="4">No blood requests yet.</td></tr>';
      els.requestsCardList.innerHTML = '<li class="table-loading-row">No blood requests yet.</li>';
      return;
    }

    els.requestsTableBody.innerHTML = recent
      .map(
        (r) => `
        <tr>
          <td>${escapeHtml(r.name || "Unknown")}</td>
          <td>${escapeHtml(r.bloodGroup || "—")}</td>
          <td>${escapeHtml(r.district || "—")}</td>
          <td><span class="${statusPillClass(r.status)}">${escapeHtml(r.status || "Open")}</span></td>
        </tr>`
      )
      .join("");

    els.requestsCardList.innerHTML = recent
      .map(
        (r) => `
        <li class="request-card">
          <div class="request-card__top">
            <span class="request-card__name">${escapeHtml(r.name || "Unknown")}</span>
            <span class="${statusPillClass(r.status)}">${escapeHtml(r.status || "Open")}</span>
          </div>
          <div class="request-card__meta">${escapeHtml(r.bloodGroup || "—")} · ${escapeHtml(
          r.district || "—"
        )}</div>
        </li>`
      )
      .join("");
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* ---------------- Data loading ---------------- */

  async function loadDashboard() {
    try {
      const [user, stats, requests] = await Promise.all([
        authedFetch("/auth/me"),
        authedFetch("/donors/stats"),
        authedFetch("/requests"),
      ]);

      // Any of these being null means authedFetch already redirected to login.
      if (!user || !stats || !requests) return;

      renderUser(user);
      renderStatsFromAggregates(stats);
      renderRecentRequests(requests);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
      showToast("Couldn't load your dashboard. Please try again.", true);
    }
  }

  /* ---------------- Actions ---------------- */

  async function toggleAvailability() {
    const current = els.availabilityToggle.dataset.state === "available";
    const next = !current;

    // Optimistic UI update
    setAvailabilityUI(next);

    try {
      const updated = await authedFetch("/auth/me/availability", {
        method: "PATCH",
        body: JSON.stringify({ isAvailable: next }),
      });
      if (updated) {
        showToast(next ? "You're marked as available." : "You're marked as unavailable.");
        // Refresh stats so Available Donors count stays accurate
        try {
          const stats = await authedFetch("/donors/stats");
          if (stats) renderStatsFromAggregates(stats);
        } catch (_) { /* non-fatal */ }
      }
    } catch (err) {
      // Roll back on failure
      setAvailabilityUI(current);
      showToast("Couldn't update availability. Please try again.", true);
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = LOGIN_PAGE;
  }

  function toggleMobileMenu() {
    const isOpen = els.sidebar.classList.toggle("is-open");
    els.menuToggle.setAttribute("aria-expanded", String(isOpen));
  }

  /* ---------------- Init ---------------- */

  function init() {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
      redirectToLogin();
      return;
    }

    els.logoutBtn.addEventListener("click", logout);
    els.availabilityToggle.addEventListener("click", toggleAvailability);
    els.updateAvailabilityAction.addEventListener("click", toggleAvailability);
    els.menuToggle?.addEventListener("click", toggleMobileMenu);

    loadDashboard();
  }

  document.addEventListener("DOMContentLoaded", init);
})();