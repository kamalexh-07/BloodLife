/* =========================================================================
   BLOODLIFE — Edit_Profile.js
   Load current donor, allow edits, PATCH /api/auth/me
   ========================================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("userToken");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  const form = document.getElementById("editProfileForm");
  const statusEl = document.getElementById("editStatus");
  const saveBtn = document.getElementById("saveProfileBtn");
  const saveBtnText = document.getElementById("saveBtnText");

  function showStatus(message, isError) {
    if (!statusEl) return;
    statusEl.style.display = "flex";
    statusEl.className = "alert " + (isError ? "alert-error" : "alert-success");
    statusEl.textContent = message;
  }

  function fillForm(user) {
    document.getElementById("email").value = user.email || "";
    document.getElementById("name").value = user.name || "";
    document.getElementById("mobileNumber").value = user.mobileNumber || user.phone || "";
    document.getElementById("whatsappNumber").value = user.whatsappNumber || "";
    document.getElementById("streetAddress").value = user.streetAddress || "";
    document.getElementById("pincode").value = user.pincode || "";
    document.getElementById("district").value = user.district || "";
    document.getElementById("isAvailable").value = user.isAvailable === false ? "false" : "true";
  }

  try {
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      showStatus(data.message || "Could not load profile.", true);
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("userToken");
        window.location.href = "login.html";
      }
      return;
    }
    fillForm(data);
  } catch (err) {
    console.error(err);
    showStatus("Could not connect to the server.", true);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const mobileNumber = document.getElementById("mobileNumber").value.trim();
    const whatsappNumber = document.getElementById("whatsappNumber").value.trim();

    if (!/^\d{10}$/.test(mobileNumber)) {
      showStatus("Mobile number must be a 10-digit number.", true);
      return;
    }
    if (whatsappNumber && !/^\d{10}$/.test(whatsappNumber)) {
      showStatus("WhatsApp number must be a 10-digit number.", true);
      return;
    }

    const payload = {
      name: document.getElementById("name").value.trim(),
      mobileNumber,
      whatsappNumber,
      streetAddress: document.getElementById("streetAddress").value.trim(),
      pincode: document.getElementById("pincode").value.trim(),
      district: document.getElementById("district").value.trim(),
      isAvailable: document.getElementById("isAvailable").value === "true",
    };

    saveBtn.disabled = true;
    saveBtnText.textContent = "Saving...";

    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showStatus(data.message || "Failed to update profile.", true);
        return;
      }
      if (data.user && data.user.name) {
        localStorage.setItem("userName", String(data.user.name).split(/\s+/)[0]);
      }
      showStatus(data.message || "Profile updated successfully.", false);
      fillForm(data.user || payload);
      // Brief pause then return to profile view
      setTimeout(() => {
        window.location.href = "profile.html";
      }, 900);
    } catch (err) {
      console.error(err);
      showStatus("Could not connect to the server.", true);
    } finally {
      saveBtn.disabled = false;
      saveBtnText.textContent = "Save Changes";
    }
  });
});
