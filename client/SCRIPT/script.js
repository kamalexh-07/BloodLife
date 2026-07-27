/* =========================================================================
   BLOODLIFE — script.js (v2)
   Modular vanilla JS. Sections:
     1. Sidebar (all navigation lives here now)
     2. Hero slider — autoplay, prev/next, dots, pause-on-hover, swipe
     3. Auth state + profile dropdown + sidebar auth sections
     4. Action-row button routing
   Existing localStorage contract (unchanged):
     localStorage.setItem("userToken", data.token);   // JWT
     localStorage.setItem("userName",  data.firstName);
   Optional keys read defensively if your login flow sets them:
     userEmail, userImage
   ========================================================================= */

document.addEventListener("DOMContentLoaded", () => {
  initSidebar();
  initSlider();
  initAuthUI();
  initActionRow();
});

/* =========================================================================
   1. SIDEBAR
   ========================================================================= */
function initSidebar() {
  const menuBtn = document.getElementById("menuBtn");
  const closeBtn = document.getElementById("closeSidebarBtn");
  const sidebar = document.getElementById("mySidebar");

  if (!menuBtn || !sidebar) return;

  const overlay = document.createElement("div");
  overlay.className = "sidebar-overlay";
  document.body.appendChild(overlay);

  const openSidebar = () => {
    sidebar.classList.add("active");
    overlay.classList.add("active");
    sidebar.setAttribute("aria-hidden", "false");
    menuBtn.setAttribute("aria-expanded", "true");
  };

  const closeSidebar = () => {
    sidebar.classList.remove("active");
    overlay.classList.remove("active");
    sidebar.setAttribute("aria-hidden", "true");
    menuBtn.setAttribute("aria-expanded", "false");
  };

  menuBtn.addEventListener("click", openSidebar);
  closeBtn?.addEventListener("click", closeSidebar);
  overlay.addEventListener("click", closeSidebar);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSidebar();
  });
}

/* =========================================================================
   2. HERO SLIDER — autoplay / prev-next / dots / pause-on-hover / swipe
   ========================================================================= */
function initSlider() {
  const sliderEl = document.getElementById("heroSlider");
  const slidesTrack = document.getElementById("slides");
  const dotsContainer = document.getElementById("dots");
  const prevBtn = document.getElementById("prev");
  const nextBtn = document.getElementById("next");

  if (!sliderEl || !slidesTrack || !dotsContainer) return;

  const slides = Array.from(slidesTrack.children);
  let currentIndex = 0;
  let autoplayTimer = null;
  const AUTOPLAY_MS = 5000;

  slides.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.className = "dot" + (i === 0 ? " active" : "");
    dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
    dot.addEventListener("click", () => goToSlide(i));
    dotsContainer.appendChild(dot);
  });

  const dots = Array.from(dotsContainer.children);

  function updateSlide() {
    slidesTrack.style.transform = `translateX(-${currentIndex * 100}%)`;
    dots.forEach((dot, i) => dot.classList.toggle("active", i === currentIndex));
  }

  function goToSlide(index) {
    currentIndex = (index + slides.length) % slides.length;
    updateSlide();
    restartAutoplay();
  }

  function nextSlide() {
    goToSlide(currentIndex + 1);
  }

  function prevSlide() {
    goToSlide(currentIndex - 1);
  }

  function startAutoplay() {
    clearInterval(autoplayTimer);
    autoplayTimer = setInterval(nextSlide, AUTOPLAY_MS);
  }

  function restartAutoplay() {
    startAutoplay();
  }

  function pauseAutoplay() {
    clearInterval(autoplayTimer);
  }

  nextBtn?.addEventListener("click", nextSlide);
  prevBtn?.addEventListener("click", prevSlide);

  // Pause on hover (desktop)
  sliderEl.addEventListener("mouseenter", pauseAutoplay);
  sliderEl.addEventListener("mouseleave", startAutoplay);

  // Swipe support (touch devices)
  let touchStartX = 0;
  let touchEndX = 0;
  const SWIPE_THRESHOLD = 40;

  sliderEl.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.touches[0].clientX;
      pauseAutoplay();
    },
    { passive: true }
  );

  sliderEl.addEventListener(
    "touchend",
    (e) => {
      touchEndX = e.changedTouches[0].clientX;
      const delta = touchEndX - touchStartX;
      if (Math.abs(delta) > SWIPE_THRESHOLD) {
        delta < 0 ? nextSlide() : prevSlide();
      } else {
        startAutoplay();
      }
    },
    { passive: true }
  );

  updateSlide();
  startAutoplay();
}

/* =========================================================================
   3. AUTH STATE + PROFILE DROPDOWN + SIDEBAR AUTH SECTIONS
   ========================================================================= */
function initAuthUI() {
  const authButtons = document.getElementById("authButtons");
  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");

  const profileMenu = document.getElementById("profileMenu");
  const profileAvatar = document.getElementById("profileAvatar");
  const dropdownMenu = document.getElementById("dropdownMenu");
  const dropdownName = document.getElementById("dropdownName");
  const dropdownEmail = document.getElementById("dropdownEmail");
  const dropdownDashboard = document.getElementById("dropdownDashboard");
  const logoutItem = document.getElementById("logoutItem");

  const sidebarLoggedOut = document.getElementById("sidebarLoggedOut");
  const sidebarLoggedIn = document.getElementById("sidebarLoggedIn");
  const sidebarLogoutLink = document.getElementById("sidebarLogoutLink");

  function getSession() {
    return {
      token: localStorage.getItem("userToken"),
      name: localStorage.getItem("userName"),
      email: localStorage.getItem("userEmail"),
      image: localStorage.getItem("userImage"),
    };
  }

  function renderLoggedOut() {
    if (authButtons) authButtons.style.display = "flex";
    if (profileMenu) profileMenu.style.display = "none";
    dropdownMenu?.classList.remove("open");

    if (sidebarLoggedOut) sidebarLoggedOut.style.display = "flex";
    if (sidebarLoggedIn) sidebarLoggedIn.style.display = "none";
  }

  function renderLoggedIn(session) {
    if (authButtons) authButtons.style.display = "none";
    if (profileMenu) profileMenu.style.display = "flex";

    if (sidebarLoggedOut) sidebarLoggedOut.style.display = "none";
    if (sidebarLoggedIn) sidebarLoggedIn.style.display = "flex";

    if (profileAvatar) {
      profileAvatar.innerHTML = "";
      if (session.image) {
        const img = document.createElement("img");
        img.src = session.image;
        img.alt = `${session.name || "User"}'s profile photo`;
        profileAvatar.appendChild(img);
      } else {
        const initial = (session.name || "U").trim().charAt(0).toUpperCase();
        profileAvatar.textContent = initial;
      }
    }

    if (dropdownName) dropdownName.textContent = session.name || "User";
    if (dropdownEmail) {
      dropdownEmail.textContent = session.email || "";
      dropdownEmail.style.display = session.email ? "block" : "none";
    }
  }

  function refreshAuthUI() {
    const session = getSession();
    session.token ? renderLoggedIn(session) : renderLoggedOut();
  }

  function logout() {
    localStorage.removeItem("userToken");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userImage");
    window.location.href = "index.html";
  }

  loginBtn?.addEventListener("click", () => (window.location.href = "login.html"));
  signupBtn?.addEventListener("click", () => (window.location.href = "register.html"));

  profileAvatar?.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = dropdownMenu?.classList.toggle("open");
    profileAvatar.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  document.addEventListener("click", (e) => {
    if (dropdownMenu && !dropdownMenu.contains(e.target) && e.target !== profileAvatar) {
      dropdownMenu.classList.remove("open");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") dropdownMenu?.classList.remove("open");
  });

  dropdownDashboard?.addEventListener("click", () => (window.location.href = "dashboard.html"));
  logoutItem?.addEventListener("click", logout);
  sidebarLogoutLink?.addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });

  refreshAuthUI();
  window.addEventListener("storage", refreshAuthUI);
}

/* =========================================================================
   4. ACTION ROW (Search / Register / Request)
   ========================================================================= */
function initActionRow() {
  const searchBtn = document.getElementById("search-btn");
  const registerBtn = document.getElementById("register-btn");
  const requestBtn = document.getElementById("request-btn");

  searchBtn?.addEventListener("click", () => (window.location.href = "f_d.html"));
  registerBtn?.addEventListener("click", () => (window.location.href = "register.html"));
  requestBtn?.addEventListener("click", () => (window.location.href = "e_a.html"));
}