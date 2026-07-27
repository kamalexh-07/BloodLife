document.addEventListener("DOMContentLoaded", () => {
  if (!AdminCommon.requireAdmin()) return;
  AdminCommon.initShell("donors");

  const { adminFetch, escapeHtml, toast } = AdminCommon;
  let page = 1;
  const limit = 10;

  const modal = document.getElementById("donorModal");
  const modalBody = document.getElementById("donorModalBody");
  const modalFooter = document.getElementById("donorModalFooter");
  const modalTitle = document.getElementById("donorModalTitle");

  function closeModal() {
    modal.classList.remove("open");
  }
  document.getElementById("closeDonorModal")?.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  function queryParams() {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("limit", String(limit));
    const q = document.getElementById("q").value.trim();
    const bg = document.getElementById("bloodGroup").value;
    const district = document.getElementById("district").value.trim();
    const availability = document.getElementById("availability").value;
    if (q) p.set("q", q);
    if (bg) p.set("bloodGroup", bg);
    if (district) p.set("district", district);
    if (availability) p.set("availability", availability);
    return p.toString();
  }

  async function load() {
    const res = await adminFetch(`/users?${queryParams()}`);
    if (!res) return;
    if (!res.ok) {
      toast(res.data.message || "Failed to load donors", true);
      return;
    }
    const { users, total, pages } = res.data;
    const body = document.getElementById("donorsBody");
    document.getElementById("pageInfo").textContent = `Page ${page} of ${pages} · ${total} donors`;

    if (!users.length) {
      body.innerHTML = `<tr><td colspan="7" class="empty-state">No donors found</td></tr>`;
      return;
    }

    body.innerHTML = users
      .map(
        (u) => `<tr>
        <td>${escapeHtml(u.name || "—")}</td>
        <td>${escapeHtml(u.email || "—")}</td>
        <td style="font-family:var(--font-mono);font-weight:700;">${escapeHtml(u.bloodGroup || "—")}</td>
        <td>${escapeHtml(u.district || "—")}</td>
        <td>${escapeHtml(u.mobileNumber || "—")}</td>
        <td>${u.isAvailable !== false ? '<span class="badge badge-green">Available</span>' : '<span class="badge badge-gray">Unavailable</span>'}</td>
        <td style="white-space:nowrap;">
          <button type="button" class="btn btn-outline btn-sm" data-view="${u._id}">View</button>
          <button type="button" class="btn btn-outline btn-sm" data-edit="${u._id}">Edit</button>
          <button type="button" class="btn btn-danger btn-sm" data-del="${u._id}">Delete</button>
        </td>
      </tr>`
      )
      .join("");
  }

  async function openView(id) {
    const res = await adminFetch(`/users/${id}`);
    if (!res || !res.ok) {
      toast(res?.data?.message || "Failed to load donor", true);
      return;
    }
    const u = res.data;
    modalTitle.textContent = "Donor profile";
    modalBody.innerHTML = `
      <p><strong>Name:</strong> ${escapeHtml(u.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(u.email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(u.mobileNumber || "—")}</p>
      <p><strong>WhatsApp:</strong> ${escapeHtml(u.whatsappNumber || "—")}</p>
      <p><strong>Blood:</strong> ${escapeHtml(u.bloodGroup || "—")}</p>
      <p><strong>Location:</strong> ${escapeHtml([u.district, u.state, u.country].filter(Boolean).join(", ") || "—")}</p>
      <p><strong>Address:</strong> ${escapeHtml(u.streetAddress || "—")} ${escapeHtml(u.pincode || "")}</p>
      <p><strong>Available:</strong> ${u.isAvailable !== false ? "Yes" : "No"}</p>
    `;
    modalFooter.innerHTML = `<button type="button" class="btn btn-outline" id="modalClose2">Close</button>`;
    document.getElementById("modalClose2").onclick = closeModal;
    modal.classList.add("open");
  }

  async function openEdit(id) {
    const res = await adminFetch(`/users/${id}`);
    if (!res || !res.ok) {
      toast(res?.data?.message || "Failed to load donor", true);
      return;
    }
    const u = res.data;
    modalTitle.textContent = "Edit donor";
    modalBody.innerHTML = `
      <div class="form-group"><label class="form-label">Name</label><input class="form-input" id="e_name" value="${escapeHtml(u.name || "")}" /></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Mobile</label><input class="form-input" id="e_mobile" value="${escapeHtml(u.mobileNumber || "")}" /></div>
        <div class="form-group"><label class="form-label">WhatsApp</label><input class="form-input" id="e_wa" value="${escapeHtml(u.whatsappNumber || "")}" /></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Blood group</label>
          <select class="form-input" id="e_bg">${["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(b=>`<option ${u.bloodGroup===b?"selected":""}>${b}</option>`).join("")}</select>
        </div>
        <div class="form-group"><label class="form-label">Available</label>
          <select class="form-input" id="e_avail"><option value="true" ${u.isAvailable!==false?"selected":""}>Yes</option><option value="false" ${u.isAvailable===false?"selected":""}>No</option></select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">District</label><input class="form-input" id="e_district" value="${escapeHtml(u.district || "")}" /></div>
        <div class="form-group"><label class="form-label">Pincode</label><input class="form-input" id="e_pin" value="${escapeHtml(u.pincode || "")}" /></div>
      </div>
      <div class="form-group"><label class="form-label">Street address</label><input class="form-input" id="e_street" value="${escapeHtml(u.streetAddress || "")}" /></div>
    `;
    modalFooter.innerHTML = `
      <button type="button" class="btn btn-outline" id="modalCancel">Cancel</button>
      <button type="button" class="btn btn-primary" id="modalSave">Save</button>`;
    document.getElementById("modalCancel").onclick = closeModal;
    document.getElementById("modalSave").onclick = async () => {
      const payload = {
        name: document.getElementById("e_name").value.trim(),
        mobileNumber: document.getElementById("e_mobile").value.trim(),
        whatsappNumber: document.getElementById("e_wa").value.trim(),
        bloodGroup: document.getElementById("e_bg").value,
        isAvailable: document.getElementById("e_avail").value === "true",
        district: document.getElementById("e_district").value.trim(),
        pincode: document.getElementById("e_pin").value.trim(),
        streetAddress: document.getElementById("e_street").value.trim(),
      };
      const up = await adminFetch(`/users/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      if (!up) return;
      if (!up.ok) {
        toast(up.data.message || "Update failed", true);
        return;
      }
      toast("Donor updated");
      closeModal();
      load();
    };
    modal.classList.add("open");
  }

  async function deleteUser(id) {
    if (!confirm("Delete this donor permanently? This cannot be undone.")) return;
    const res = await adminFetch(`/users/${id}`, { method: "DELETE" });
    if (!res) return;
    if (!res.ok) {
      toast(res.data.message || "Delete failed", true);
      return;
    }
    toast("Donor deleted");
    load();
  }

  document.getElementById("donorsBody").addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.dataset.view) openView(t.dataset.view);
    if (t.dataset.edit) openEdit(t.dataset.edit);
    if (t.dataset.del) deleteUser(t.dataset.del);
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
