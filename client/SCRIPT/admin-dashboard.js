document.addEventListener("DOMContentLoaded", async () => {
  if (!AdminCommon.requireAdmin()) return;
  AdminCommon.initShell("dashboard");

  // Fix mobile overlay visibility
  const overlay = document.getElementById("adminOverlay");
  const sidebar = document.getElementById("adminSidebar");
  const menuBtn = document.getElementById("adminMenuBtn");
  menuBtn?.addEventListener("click", () => {
    const open = sidebar.classList.toggle("open");
    if (overlay) overlay.style.display = open ? "block" : "none";
  });
  overlay?.addEventListener("click", () => {
    sidebar?.classList.remove("open");
    overlay.style.display = "none";
  });

  const { adminFetch, escapeHtml, toast } = AdminCommon;
  const res = await adminFetch("/dashboard");
  if (!res) return;
  if (!res.ok) {
    toast(res.data.message || "Failed to load dashboard", true);
    return;
  }

  const { stats, recentDonors, recentRequests } = res.data;
  const set = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = Number(v || 0).toLocaleString();
  };
  set("statTotalDonors", stats.totalDonors);
  set("statAvailable", stats.availableDonors);
  set("statUnavailable", stats.unavailableDonors);
  set("statTotalReq", stats.totalRequests);
  set("statOpen", stats.openRequests);
  set("statFulfilled", stats.fulfilledRequests);

  const chart = document.getElementById("statusChart");
  const bars = [
    { label: "Open", value: stats.openRequests || 0, color: "var(--amber)" },
    { label: "Urgent", value: stats.urgentRequests || 0, color: "var(--crimson)" },
    { label: "Fulfilled", value: stats.fulfilledRequests || 0, color: "var(--green)" },
  ];
  const max = Math.max(1, ...bars.map((b) => b.value));
  chart.innerHTML = bars
    .map(
      (b) => `
    <div class="bar-wrap">
      <div class="bar" style="height:${Math.round((b.value / max) * 100)}%;background:${b.color};"></div>
      <span class="bar-label">${escapeHtml(b.label)}<br><strong>${b.value}</strong></span>
    </div>`
    )
    .join("");

  const statusBadge = (s) => {
    const t = (s || "Open").toLowerCase();
    const cls = t === "fulfilled" ? "badge-green" : t === "urgent" ? "badge-red" : "badge-amber";
    return `<span class="badge ${cls}">${escapeHtml(s || "Open")}</span>`;
  };

  const donorsBody = document.getElementById("recentDonorsBody");
  if (!recentDonors?.length) {
    donorsBody.innerHTML = `<tr><td colspan="4" class="empty-state">No donors yet</td></tr>`;
  } else {
    donorsBody.innerHTML = recentDonors
      .map(
        (d) => `<tr>
        <td>${escapeHtml(d.name || "—")}</td>
        <td style="font-family:var(--font-mono);font-weight:700;">${escapeHtml(d.bloodGroup || "—")}</td>
        <td>${escapeHtml(d.district || "—")}</td>
        <td>${d.isAvailable !== false ? '<span class="badge badge-green">Available</span>' : '<span class="badge badge-gray">Unavailable</span>'}</td>
      </tr>`
      )
      .join("");
  }

  const reqBody = document.getElementById("recentRequestsBody");
  if (!recentRequests?.length) {
    reqBody.innerHTML = `<tr><td colspan="4" class="empty-state">No requests yet</td></tr>`;
  } else {
    reqBody.innerHTML = recentRequests
      .map(
        (r) => `<tr>
        <td>${escapeHtml(r.patientName || "—")}</td>
        <td style="font-family:var(--font-mono);font-weight:700;">${escapeHtml(r.bloodGroup || "—")}</td>
        <td>${escapeHtml(r.district || "—")}</td>
        <td>${statusBadge(r.status)}</td>
      </tr>`
      )
      .join("");
  }
});
