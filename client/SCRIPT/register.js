// Location data comes from locations-data.js (load that script before this one).
// Fallback keeps Register usable if the shared file fails to load.
// NOTE: do not redeclare with `const`/`let` here — locations-data.js already
// declares a top-level `const locationData`, and since both files are loaded
// as classic <script> tags on the same page, they share one global lexical
// scope. A second top-level const/let with the same name throws:
// "Uncaught SyntaxError: Identifier 'locationData' has already been declared."
window.locationData = window.locationData || {
  India: {
    states: {
      "Tamil Nadu": window.TAMIL_NADU_DISTRICTS || []
    }
  }
};
// ✅ Populate Dropdowns
function populateSelect(selectId, options, defaultOption) {
  const select = document.getElementById(selectId);
  select.innerHTML = `<option value="">${defaultOption}</option>`;
  options.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option;
    opt.textContent = option;
    select.appendChild(opt);
  });
  select.disabled = options.length === 0;
}

// ✅ Toggle Password Visibility
function togglePassword(id) {
  const input = document.getElementById(id);
  const eye = document.getElementById(`${id}-eye`);
  if (input.type === 'password') {
    input.type = 'text';
    eye.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.487-3.342m2.406 2.406L12 12m0 0l3.144-3.144m-3.144 3.144L9.543 15.342m6.406-6.406A9.97 9.97 0 0121.542 12c-1.274 4.057-5.064 7-9.542 7a10.05 10.05 0 01-1.875-.175M3 3l18 18"/>';
  } else {
    input.type = 'password';
    eye.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>';
  }
}

// ✅ Modal Controls
function showModal() {
  const modal = document.getElementById('successModal');
  modal.classList.remove('hidden');
  modal.querySelector('button').focus();
}

function closeModal() {
  document.getElementById('successModal').classList.add('hidden');
}

// ✅ Element References
const countrySelect = document.getElementById('country');
const stateSelect = document.getElementById('state');
const districtSelect = document.getElementById('district');
const phoneInput = document.getElementById('phone');
const whatsappInput = document.getElementById('whatsapp');
const sameAsWhatsappCheckbox = document.getElementById('sameAsWhatsapp');

// ✅ Country Change
countrySelect.addEventListener('change', () => {
  const country = countrySelect.value;
  if (country && window.locationData[country]) {
    const states = Object.keys(window.locationData[country].states);
    populateSelect('state', states, 'Select your state/province');
    stateSelect.disabled = false;
  } else {
    populateSelect('state', [], 'Select your state/province');
    populateSelect('district', [], 'Select your district');
    stateSelect.disabled = true;
    districtSelect.disabled = true;
  }
});

// ✅ State Change
stateSelect.addEventListener('change', () => {
  const country = countrySelect.value;
  const state = stateSelect.value;
  if (country && state && window.locationData[country].states[state]) {
    populateSelect('district', window.locationData[country].states[state], 'Select your district');
    districtSelect.disabled = false;
  } else {
    populateSelect('district', [], 'Select your district');
    districtSelect.disabled = true;
  }
});

// ✅ WhatsApp Sync
sameAsWhatsappCheckbox.addEventListener('change', () => {
  if (sameAsWhatsappCheckbox.checked) {
    whatsappInput.value = phoneInput.value;
    whatsappInput.readOnly = true;
  } else {
    whatsappInput.readOnly = false;
    whatsappInput.value = '';
  }
});

phoneInput.addEventListener('input', () => {
  if (sameAsWhatsappCheckbox.checked) {
    whatsappInput.value = phoneInput.value;
  }
});
// ✅ Enable Submit Button Only When Terms Checked
function updateSubmitButtonState() {
  const terms = document.getElementById('terms').checked;
  const dataConsent = document.getElementById('dataConsent').checked;

  const submitBtn = document.getElementById('submitBtn');

  submitBtn.disabled = !(terms && dataConsent);

  if (submitBtn.disabled) {
    submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
  } else {
    submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  }
}

// Enable/Disable Register button when checkboxes change
document.getElementById('terms').addEventListener('change', updateSubmitButtonState);
document.getElementById('dataConsent').addEventListener('change', updateSubmitButtonState);

// ✅ Field Validation
function validateField(input) {
  const id = input.id;
  const value = input.value.trim();
  const error = document.getElementById(`${id}-error`);
  error.classList.add('hidden');
  input.classList.remove('border-red-500');

  if (!value && input.required) {
    error.textContent = `${input.name} is required`;
    error.classList.remove('hidden');
    input.classList.add('border-red-500');
    return false;
  }

  if (id === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    error.textContent = 'Enter a valid email address';
    error.classList.remove('hidden');
    input.classList.add('border-red-500');
    return false;
  }

  if ((id === 'phone' || id === 'whatsapp') && value && !/^\d{10}$/.test(value)) {
    error.textContent = 'Enter a valid 10-digit number';
    error.classList.remove('hidden');
    input.classList.add('border-red-500');
    return false;
  }
  if (id === 'confirmPassword') {
  const password = document.getElementById('password').value;

  if (value !== password) {
    error.textContent = 'Passwords do not match';
    error.classList.remove('hidden');
    input.classList.add('border-red-500');
    return false;
  }
}
  return true;
}

document.querySelectorAll('.form-input').forEach(input => {
  input.addEventListener('input', () => validateField(input));
  input.addEventListener('blur', () => validateField(input));
});

// ✅ Form Submit with reCAPTCHA v2
document.getElementById("registrationForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);
  const password = formData.get('password');
const confirmPassword = formData.get('confirmPassword');

if (password !== confirmPassword) {
  document.getElementById('confirmPassword-error').textContent = 'Passwords do not match';
  document.getElementById('confirmPassword-error').classList.remove('hidden');
  document.getElementById('confirmPassword').classList.add('border-red-500');
  return;
}
  let hasError = false;

  // Validate all inputs
  document.querySelectorAll('.form-input').forEach(input => {
    if (!validateField(input)) hasError = true;
  });

  // Check reCAPTCHA

  if (hasError) return;

  // Map frontend fields to backend fields
  const data = {
    name: `${formData.get('firstName') || ''} ${formData.get('lastName') || ''}`.trim(),
    email: formData.get('email') || '',
    mobileNumber: formData.get('phone') || '',
    whatsappNumber: formData.get('sameAsWhatsapp') === 'on' ? formData.get('phone') : formData.get('whatsapp') || '',
    bloodGroup: formData.get('bloodType') || '',
    country: formData.get('country') || '',
    state: formData.get('state') || '',
    district: formData.get('district') || '',
    streetAddress: formData.get('streetAddress') || '',
    pincode: formData.get('pincode') || '',
    password: formData.get('password') || '',
    terms: formData.get('terms') === 'on',
    dataConsent: formData.get('dataConsent') === 'on',
    donationOpportunities: formData.get('donationOpportunities') === 'on',
    emergencyContact: formData.get('emergencyContact') === 'on',
  };

  const submitBtn = document.getElementById('submitBtn');
  const buttonText = document.getElementById('buttonText');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const formMessage = document.getElementById('formMessage');

  submitBtn.disabled = true;
  buttonText.classList.add('hidden');
  loadingSpinner.classList.remove('hidden');
  formMessage.classList.add('hidden');

  try {
    const response = await fetch('/api/donors/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (response.ok && result.message === 'Donor registered successfully!') {
      showModal();
      form.reset();
      updateSubmitButtonState();
    } else {
      formMessage.className = 'text-center mt-4 text-sm text-red-600';
      formMessage.textContent = result.message || 'Registration failed.';
      formMessage.classList.remove('hidden');
    }
  } catch (err) {
    formMessage.className = 'text-center mt-4 text-sm text-red-600';
    formMessage.textContent = 'Error connecting to server.';
    formMessage.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    buttonText.classList.remove('hidden');
    loadingSpinner.classList.add('hidden');
  }
});

// ✅ Initialie
// ✅ Initialize
countrySelect.value = "India";
countrySelect.dispatchEvent(new Event("change"));

updateSubmitButtonState();