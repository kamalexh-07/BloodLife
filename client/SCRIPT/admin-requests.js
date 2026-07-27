document.addEventListener("DOMContentLoaded", () => {
  if (!AdminCommon.requireAdmin()) return;
  AdminCommon.initShell("requests");

  const { adminFetch, escapeHtml, toast } = AdminCommon;
  let page = 1;
  const limit = 10;

  function queryParams() {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("limit", String(limit));
    const q = document.getElementById("q").value.trim();
    const status = document.getElementById("status").value;
    const bg = document.getElementById("bloodGroup").value;
    const district = document.getElementById("district").value.trim();
    if (q) p.set("q", q);
    if (status) p.set("status", status);
    if (bg) p.set("bloodGroup", bg);
    if (district) p.set("district", district);
    return p.toString();
  }

  function statusBadge(s) {
    const t = (s || "Open").toLowerCase();
    const cls = t === "fulfilled" ? "badge-green" : t === "urgent" ? "badge-red" : "badge-amber";
    return `<span class="badge ${cls}">${escapeHtml(s || "Open")}</span>`;
  }

  function fmtDate(d) {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleString();
    } catch {
      return "—";
    }
  }

  async function load() {
    const res = await adminFetch(`/requests?${queryParams()}`);
    if (!res) return;
    if (!res.ok) {
      toast(res.data.message || "Failed to load requests", true);
      return;
    }
    const { requests, total, pages } = res.data;
    document.getElementById("pageInfo").textContent = `Page ${page} of ${pages} · ${total} requests`;
    const body = document.getElementById("requestsBody");
    if (!requests.length) {
      body.innerHTML = `<tr><td colspan="7" class="empty-state">No requests found</td></tr>`;
      return;
    }
    body.innerHTML = requests
      .map(
        (r) => `<tr>
        <td>${escapeHtml(r.patientName || "—")}</td>
        <td style="font-family:var(--font-mono);font-weight:700;">${escapeHtml(r.bloodGroup || "—")}</td>
        <td>${escapeHtml(r.district || "—")}</td>
        <td>${escapeHtml(r.hospitalName || "—")}</td>
        <td>
          <select data-status="${r._id}" class="form-input" style="height:32px;padding:0 8px;min-width:110px;">
            ${["Open", "Urgent", "Fulfilled"]
              .map((s) => `<option value="${s}" ${r.status === s ? "selected" : ""}>${s}</option>`)
              .join("")}
          </select>
        </td>
        <td style="white-space:nowrap;font-size:0.8rem;">${escapeHtml(fmtDate(r.createdAt))}</td>
        <td>
          <button type="button" class="btn btn-danger btn-sm" data-del="${r._id}">Delete</button>
        </td>
      </tr>`
      )
      .join("");
  }

  document.getElementById("requestsBody").addEventListener("change", async (e) => {
    const sel = e.target.closest("select[data-status]");
    if (!sel) return;
    const id = sel.dataset.status;
    const status = sel.value;
    const res = await adminFetch(`/requests/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    if (!res) return;
    if (!res.ok) {
      toast(res.data.message || "Update failed", true);
      load();
      return;
    }
    toast("Status updated");
  });

  document.getElementById("requestsBody").addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-del]");
    if (!btn) return;
    if (!confirm("Delete this blood request permanently?")) return;
    const res = await adminFetch(`/requests/${btn.dataset.del}`, { method: "DELETE" });
    if (!res) return;
    if (!res.ok) {
      toast(res.data.message || "Delete failed", true);
      return;
    }
    toast("Request deleted");
    load();
  });

  document.getElementById("searchBtn").addEventListener("click", () => {
    page = 1;
    load();
  });
  document.getElementById("prevPage").addEventListener("click", () => {
    if (page > 1) {
      page -= 1;
      load();
    }
  });
  document.getElementById("nextPage").addEventListener("click", () => {
    page += 1;
    load();
  });

  load();
});
