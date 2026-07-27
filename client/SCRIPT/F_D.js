// In MultipleFiles/F_D.js

const API_BASE_URL = '/api';

// CAPTCHA generation
let captchaAnswer;
function generateCaptcha() {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    captchaAnswer = num1 + num2;
    document.getElementById("captchaQuestion").textContent = `What is ${num1} + ${num2}?`;
}

// Validate CAPTCHA
document.getElementById("captchaInput").addEventListener("input", function () {
    const userAnswer = parseInt(this.value);
    const searchButton = document.getElementById("searchButton");
    searchButton.disabled = userAnswer !== captchaAnswer;
});

// Generate CAPTCHA on page load
generateCaptcha();

// Fetch countries on page load
async function fetchCountriesForSearch() {
    try {
        const response = await fetch(`${API_BASE_URL}/locations/countries`);
        const countries = await response.json();
        const countrySelect = document.getElementById("country");
        countrySelect.innerHTML = '<option value="">Select Country</option>';
        countries.forEach(country => {
            const option = document.createElement("option");
            option.value = country;
            option.textContent = country;
            countrySelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching countries for search:', error);
        // Fallback or error message
    }
}

// Populate states based on selected country
document.getElementById("country").addEventListener("change", async function () {
    const country = this.value;
    const stateSelect = document.getElementById("state");
    const districtSelect = document.getElementById("district");
    stateSelect.innerHTML = '<option value="">Select State</option>';
    districtSelect.innerHTML = '<option value="">Select District</option>';
    stateSelect.disabled = true;
    districtSelect.disabled = true;

    if (country) {
        try {
            const response = await fetch(`${API_BASE_URL}/locations/countries/${encodeURIComponent(country)}/states`);
            const states = await response.json();
            stateSelect.innerHTML = '<option value="">Select State</option>';
            states.forEach(state => {
                const option = document.createElement("option");
                option.value = state;
                option.textContent = state;
                stateSelect.appendChild(option);
            });
            stateSelect.disabled = false;
        } catch (error) {
            console.error('Error fetching states for search:', error);
            stateSelect.innerHTML = '<option value="">Select State</option>';
            stateSelect.disabled = true;
        }
    }
});

// Populate districts based on selected state
document.getElementById("state").addEventListener("change", async function () {
    const country = document.getElementById("country").value;
    const state = this.value;
    const districtSelect = document.getElementById("district");
    districtSelect.innerHTML = '<option value="">Select District</option>';
    districtSelect.disabled = true;

    if (country && state) {
        try {
            const response = await fetch(`${API_BASE_URL}/locations/countries/${encodeURIComponent(country)}/states/${encodeURIComponent(state)}/districts`);
            const districts = await response.json();
            districtSelect.innerHTML = '<option value="">Select District</option>';
            districts.forEach(district => {
                const option = document.createElement("option");
                option.value = district;
                option.textContent = district;
                districtSelect.appendChild(option);
            });
            districtSelect.disabled = false;
        } catch (error) {
            console.error('Error fetching districts for search:', error);
            districtSelect.innerHTML = '<option value="">Select District</option>';
            districtSelect.disabled = true;
        }
    }
});

// Search function
function escapeHtml(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function showSearchResultsSection() {
    const section = document.getElementById("searchResultsSection");
    if (section) section.hidden = false;
}

function renderSearchMessage(message, isError) {
    showSearchResultsSection();
    const msgEl = document.getElementById("searchResultsMessage");
    const grid = document.getElementById("searchResults");
    const heading = document.getElementById("searchResultsHeading");
    if (grid) grid.innerHTML = "";
    if (heading) heading.textContent = isError ? "Search" : "Search Results";
    if (msgEl) {
        msgEl.textContent = message;
        msgEl.style.color = isError ? "var(--color-crimson)" : "var(--color-ink-soft)";
    }
}

function renderDonorCards(donors, meta) {
    showSearchResultsSection();
    const msgEl = document.getElementById("searchResultsMessage");
    const grid = document.getElementById("searchResults");
    const heading = document.getElementById("searchResultsHeading");
    if (!grid) return;

    if (heading) {
        heading.textContent = `Search Results (${donors.length})`;
    }
    if (msgEl) {
        msgEl.textContent = donors.length === 1
            ? "1 donor matches your criteria."
            : `${donors.length} donors match your criteria.`;
        msgEl.style.color = "var(--color-ink-soft)";
    }

    // Backend returns available donors only; state/country come from the active search filters.
    const state = meta.state || "—";
    const country = meta.country || "—";

    grid.innerHTML = donors.map((d) => {
        const name = `${d.firstName || ""} ${d.lastName || ""}`.trim() || "Donor";
        const blood = d.bloodType || d.bloodGroup || "—";
        const phone = d.phone || "—";
        const whatsapp = d.whatsappNumber || "";
        const district = d.district || "—";
        const donorState = d.state || state || "—";
        const available = d.isAvailable !== false;
        const availability = available ? "Available" : "Unavailable";
        const availBadgeClass = available ? "badge badge-gray" : "badge badge-red";
        const phoneLink = phone !== "—"
            ? `<a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a>`
            : "—";
        const waLink = whatsapp
            ? `<a href="https://wa.me/91${escapeHtml(whatsapp)}" target="_blank" rel="noopener">${escapeHtml(whatsapp)}</a>`
            : "—";

        return `
      <article class="donor-card">
        <div class="donor-card__name">${escapeHtml(name)}</div>
        <div class="donor-card__row">
          <span class="donor-card__label">Blood Group</span>
          <span class="donor-card__value"><span class="badge badge-red">${escapeHtml(blood)}</span></span>
        </div>
        <div class="donor-card__row">
          <span class="donor-card__label">Phone</span>
          <span class="donor-card__value">${phoneLink}</span>
        </div>
        <div class="donor-card__row">
          <span class="donor-card__label">WhatsApp</span>
          <span class="donor-card__value">${waLink}</span>
        </div>
        <div class="donor-card__row">
          <span class="donor-card__label">District</span>
          <span class="donor-card__value">${escapeHtml(district)}</span>
        </div>
        <div class="donor-card__row">
          <span class="donor-card__label">State</span>
          <span class="donor-card__value">${escapeHtml(donorState)}</span>
        </div>
        <div class="donor-card__row">
          <span class="donor-card__label">Availability</span>
          <span class="donor-card__value"><span class="${availBadgeClass}">${escapeHtml(availability)}</span></span>
        </div>
      </article>`;
    }).join("");
}

async function searchDonors() {
    const bloodGroup = document.getElementById("bloodGroup").value;
    const country = document.getElementById("country").value;
    const state = document.getElementById("state").value;
    const district = document.getElementById("district").value;
    const captchaInput = document.getElementById("captchaInput").value;

    if (!bloodGroup || !country || !state || !district) {
        renderSearchMessage("Please select all fields before searching.", true);
        return;
    }

    if (parseInt(captchaInput) !== captchaAnswer) {
        renderSearchMessage("Incorrect CAPTCHA answer. Please try again.", true);
        generateCaptcha();
        document.getElementById("captchaInput").value = "";
        document.getElementById("searchButton").disabled = true;
        return;
    }

    try {
        // URLSearchParams encodes "+" as %2B so blood groups like B+ are not
        // turned into "B " by query-string parsers (application/x-www-form-urlencoded).
        const params = new URLSearchParams({ bloodGroup, country, state, district });
        const response = await fetch(`${API_BASE_URL}/donors/search?${params.toString()}`);
        const data = await response.json();

        if (response.ok) {
            if (Array.isArray(data) && data.length > 0) {
                renderDonorCards(data, { state, country });
            } else {
                renderSearchMessage(
                    (data && data.message) || "No donors found matching your criteria.",
                    false
                );
            }
        } else {
            renderSearchMessage((data && data.message) || "Error searching for donors.", true);
        }
    } catch (error) {
        console.error("Search donors error:", error);
        renderSearchMessage("An error occurred during donor search. Please try again.", true);
    } finally {
        generateCaptcha();
        document.getElementById("captchaInput").value = "";
        document.getElementById("searchButton").disabled = true;
    }
}

// Initial fetch for countries
fetchCountriesForSearch();
