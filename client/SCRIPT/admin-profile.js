document.addEventListener("DOMContentLoaded", async () => {
  if (!AdminCommon.requireAdmin()) return;
  AdminCommon.initShell("profile");

  const { adminFetch, toast } = AdminCommon;

  const res = await adminFetch("/me");
  if (!res) return;
  if (!res.ok) {
    toast(res.data.message || "Failed to load profile", true);
    return;
  }
  document.getElementById("name").value = res.data.name || "";
  document.getElementById("email").value = res.data.email || "";
  document.getElementById("mobileNumber").value = res.data.mobileNumber || "";

  document.getElementById("profileForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !EMAIL_RE.test(email)) {
      toast("Please enter a valid email address", true);
      return;
    }

    const btn = document.getElementById("saveProfileBtn");
    btn.disabled = true;
    const up = await adminFetch("/me", {
      method: "PATCH",
      body: JSON.stringify({
        name: document.getElementById("name").value.trim(),
        email,
        mobileNumber: document.getElementById("mobileNumber").value.trim(),
      }),
    });
    btn.disabled = false;
    if (!up) return;
    if (!up.ok) {
      toast(up.data.message || "Update failed", true);
      return;
    }

    if (up.data.admin?.name) localStorage.setItem("adminName", up.data.admin.name);

    if (up.data.emailChanged) {
      if (up.data.token) {
        // Refresh the session token so the admin stays logged in with the new email.
        AdminCommon.setToken(up.data.token);
        localStorage.setItem("adminEmail", up.data.admin.email);
        toast("Email updated — your session has been refreshed");
      } else {
        // Fallback: no token returned, require the admin to log in again.
        toast("Email updated. Please log in again.");
        setTimeout(() => AdminCommon.logout(), 1200);
        return;
      }
    } else {
      toast("Profile updated");
    }
  });

  document.getElementById("passwordForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    if (newPassword !== confirmPassword) {
      toast("New passwords do not match", true);
      return;
    }
    if (newPassword.length < 8) {
      toast("Password must be at least 8 characters", true);
      return;
    }
    const btn = document.getElementById("savePasswordBtn");
    btn.disabled = true;
    const up = await adminFetch("/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    btn.disabled = false;
    if (!up) return;
    if (!up.ok) {
      toast(up.data.message || "Password change failed", true);
      return;
    }
    document.getElementById("passwordForm").reset();
    toast("Password changed successfully");
  });
});
