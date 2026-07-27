document.addEventListener("DOMContentLoaded", () => {
  const { setToken, getToken, clearSession } = AdminCommon;

  // If already logged in as admin, go to dashboard
  const existing = getToken();
  if (existing) {
    try {
      const payload = JSON.parse(atob(existing.split(".")[1]));
      if (payload.role === "admin" && payload.exp * 1000 > Date.now()) {
        window.location.href = "admin-dashboard.html";
        return;
      }
    } catch { /* fall through */ }
    clearSession();
  }

  const remembered = localStorage.getItem("adminRememberEmail");
  if (remembered) {
    document.getElementById("email").value = remembered;
    document.getElementById("rememberMe").checked = true;
  }

  document.getElementById("togglePassword").addEventListener("click", () => {
    const input = document.getElementById("password");
    const icon = document.getElementById("togglePasswordIcon");
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    icon.className = show ? "fas fa-eye-slash" : "fas fa-eye";
  });

  document.getElementById("adminLoginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const errEl = document.getElementById("loginError");
    const btn = document.getElementById("submitBtn");
    const btnText = document.getElementById("btnText");

    errEl.style.display = "none";
    if (!email || !password) {
      errEl.textContent = "Please enter email and password.";
      errEl.style.display = "flex";
      return;
    }

    btn.disabled = true;
    btnText.textContent = "Signing in…";

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        errEl.textContent = data.message || "Login failed";
        errEl.style.display = "flex";
        return;
      }
      setToken(data.token);
      if (data.admin) {
        localStorage.setItem("adminName", data.admin.name || "");
        localStorage.setItem("adminEmail", data.admin.email || "");
      }
      if (document.getElementById("rememberMe").checked) {
        localStorage.setItem("adminRememberEmail", email);
      } else {
        localStorage.removeItem("adminRememberEmail");
      }
      window.location.href = "admin-dashboard.html";
    } catch {
      errEl.textContent = "Could not connect to the server.";
      errEl.style.display = "flex";
    } finally {
      btn.disabled = false;
      btnText.textContent = "Sign In";
    }
  });
});
