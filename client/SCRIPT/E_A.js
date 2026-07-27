// In MultipleFiles/E_A.js

const API_BASE_URL = '/api';

// Generate CAPTCHA
function generateCaptcha() {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const captchaQuestion = document.getElementById('captchaQuestion');
    captchaQuestion.textContent = `What is ${num1} + ${num2}?`;
    return num1 + num2;
}

let captchaCorrectAnswer = generateCaptcha();

// Fetch countries on page load
async function fetchCountriesForAlert() {
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
        console.error('Error fetching countries for alert:', error);
        // Fallback or error message
    }
}

// Populate states based on selected country
document.getElementById('country').addEventListener('change', async function() {
    const country = this.value;
    const stateSelect = document.getElementById('state');
    const districtSelect = document.getElementById('district');

    stateSelect.innerHTML = '<option value="">Select State</option>';
    districtSelect.innerHTML = '<option value="">Select District</option>';

    if (country) {
        try {
            const response = await fetch(`${API_BASE_URL}/locations/countries/${country}/states`);
            const states = await response.json();
            states.forEach(state => {
                const option = document.createElement('option');
                option.value = state;
                option.textContent = state;
                stateSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error fetching states for alert:', error);
        }
    }
});

// Populate districts based on selected state
document.getElementById('state').addEventListener('change', async function() {
    const country = document.getElementById('country').value;
    const state = this.value;
    const districtSelect = document.getElementById('district');

    districtSelect.innerHTML = '<option value="">Select District</option>';

    if (country && state) {
        try {
            const response = await fetch(`${API_BASE_URL}/locations/countries/${country}/states/${state}/districts`);
            const districts = await response.json();
            districts.forEach(district => {
                const option = document.createElement('option');
                option.value = district;
                option.textContent = district;
                districtSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error fetching districts for alert:', error);
        }
    }
});

// Handle "Same as WhatsApp Number" checkbox
document.getElementById('sameAsMobile').addEventListener('change', function() {
    const mobileNumber = document.getElementById('mobileNumber');
    const whatsappNumber = document.getElementById('whatsappNumber');
    if (this.checked && mobileNumber.value.match(/^[0-9]{10}$/)) {
        whatsappNumber.value = mobileNumber.value;
        whatsappNumber.disabled = true;
    } else {
        whatsappNumber.value = '';
        whatsappNumber.disabled = false;
    }
});

// Update WhatsApp number if mobile number changes while checkbox is checked
document.getElementById('mobileNumber').addEventListener('input', function() {
    const sameAsMobile = document.getElementById('sameAsMobile');
    const whatsappNumber = document.getElementById('whatsappNumber');
    if (sameAsMobile.checked && this.value.match(/^[0-9]{10}$/)) {
        whatsappNumber.value = this.value;
    } else if (sameAsMobile.checked) {
        whatsappNumber.value = '';
    }
});

// Handle form submission
document.getElementById('bloodDonorForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const captchaAnswerInput = parseInt(document.getElementById('captchaAnswer').value);
    const captchaError = document.getElementById('captchaError');
    const alertMessage = document.getElementById('alertMessage');

    if (captchaAnswerInput === captchaCorrectAnswer) {
        captchaError.classList.add('hidden');

        const formData = {
            bloodGroup: document.getElementById('bloodGroup').value,
            country: document.getElementById('country').value,
            state: document.getElementById('state').value,
            district: document.getElementById('district').value,
            hospitalName: document.getElementById('hospitalName').value,
            hospitalAddress: document.getElementById('hospitalAddress').value,
            patientName: document.getElementById('patientName').value,
            mobileNumber: document.getElementById('mobileNumber').value,
            whatsappNumber: document.getElementById('whatsappNumber').value
        };

        try {
            const response = await fetch(`${API_BASE_URL}/donors/emergency-alert`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                alertMessage.classList.remove('hidden');
                alertMessage.classList.add('alert-message');
                alertMessage.textContent = data.message;
                this.reset();
                document.getElementById('whatsappNumber').disabled = false; // Re-enable WhatsApp field after reset
                captchaCorrectAnswer = generateCaptcha(); // Generate new CAPTCHA
                setTimeout(() => {
                    alertMessage.classList.add('hidden');
                }, 5000); // Increased timeout for message visibility
            } else {
                alertMessage.classList.remove('hidden');
                alertMessage.classList.remove('alert-message'); // Remove success styling
                alertMessage.style.color = '#dc2626'; // Set error color
                alertMessage.textContent = data.message || 'Failed to send alert.';
                setTimeout(() => {
                    alertMessage.classList.add('hidden');
                    alertMessage.style.color = ''; // Reset color
                }, 5000);
            }
        } catch (error) {
            console.error('Emergency alert submission error:', error);
            alertMessage.classList.remove('hidden');
            alertMessage.classList.remove('alert-message');
            alertMessage.style.color = '#dc2626';
            alertMessage.textContent = 'An error occurred. Please try again.';
            setTimeout(() => {
                alertMessage.classList.add('hidden');
                alertMessage.style.color = '';
            }, 5000);
        }

    } else {
        captchaError.classList.remove('hidden');
        document.getElementById('captchaAnswer').value = '';
    }
});

// Initial fetch for countries
fetchCountriesForAlert();
