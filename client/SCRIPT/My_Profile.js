/* =========================================================================
   BLOODLIFE — My_Profile.js
   Read-only profile view. Uses GET /api/auth/me
   ========================================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  const card = document.getElementById("profileCard");
  const token = localStorage.getItem("userToken");

  if (!token) {
    window.location.href = "login.html";
    return;
  }


  function formatPersonName(raw) {
    const parts = String(raw || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const deduped = [];
    for (const part of parts) {
      const lower = part.toLowerCase();
      if (deduped.length && deduped[deduped.length - 1].toLowerCase() === lower) continue;
      const titled = part
        .split(/([-'])/)
        .map((seg) => {
          if (seg === "-" || seg === "'") return seg;
          if (!seg) return seg;
          return seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase();
        })
        .join("");
      deduped.push(titled);
    }
    return deduped.join(" ");
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  try {
    const response = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();

    if (!response.ok) {
      card.innerHTML = `<p class="error-message active">${escapeHtml(data.message || "Could not load profile.")}</p>`;
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("userToken");
        window.location.href = "login.html";
      }
      return;
    }

    const displayName = formatPersonName(data.name) || "User";
    const initial = displayName.charAt(0).toUpperCase();
    const available = data.isAvailable !== false;
    const availLabel = available ? "Available" : "Unavailable";
    const availColor = available ? "#1f6b46" : "var(--color-crimson)";

    card.innerHTML = `
      <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1.5rem;">
        <div class="profile-avatar" style="position:static; width:56px; height:56px; font-size:1.4rem;">${escapeHtml(initial)}</div>
        <div>
          <h2 style="font-size:1.15rem;">${escapeHtml(displayName)}</h2>
          <p style="color:var(--color-ink-soft); font-size:0.85rem;">${escapeHtml(data.email || "")}</p>
          <p style="margin-top:0.35rem; font-size:0.82rem; font-weight:600; color:${availColor};">${escapeHtml(availLabel)}</p>
        </div>
      </div>
      <div class="form-row">
        <div><p class="form-label">Phone</p><p style="color:var(--color-ink-soft);">${escapeHtml(data.phone || data.mobileNumber || "—")}</p></div>
        <div><p class="form-label">WhatsApp</p><p style="color:var(--color-ink-soft);">${escapeHtml(data.whatsappNumber || "—")}</p></div>
      </div>
      <div class="form-row" style="margin-top:1rem;">
        <div><p class="form-label">Blood Group</p><p style="color:var(--color-ink-soft);">${escapeHtml(data.bloodGroup || "—")}</p></div>
        <div><p class="form-label">Pincode</p><p style="color:var(--color-ink-soft);">${escapeHtml(data.pincode || "—")}</p></div>
      </div>
      <div class="form-row" style="margin-top:1rem;">
        <div><p class="form-label">State</p><p style="color:var(--color-ink-soft);">${escapeHtml(data.state || "—")}</p></div>
        <div><p class="form-label">District</p><p style="color:var(--color-ink-soft);">${escapeHtml(data.district || "—")}</p></div>
      </div>
      <div style="margin-top:1rem;">
        <p class="form-label">Street Address</p>
        <p style="color:var(--color-ink-soft);">${escapeHtml(data.streetAddress || "—")}</p>
      </div>
      <div style="display:flex; flex-wrap:wrap; gap:0.75rem; margin-top:1.5rem;">
        <a href="edit_profile.html" class="btn btn-primary">Edit Profile</a>
        <a href="dashboard.html" class="btn btn-outline">Back to Dashboard</a>
        <a href="index.html" class="btn btn-ghost">Home</a>
      </div>
    `;
  } catch (error) {
    console.error("Profile load error:", error);
    card.innerHTML = `<p class="error-message active">Could not connect to the server.</p>`;
  }
});
