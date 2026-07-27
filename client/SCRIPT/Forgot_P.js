// In MultipleFiles/Forgot_P.js

(function() {
  const API_BASE_URL = '/api'; // Base URL for your backend API

  // State
  let timer;
  let countdown = 30;
  let emailPhone = '';
  let currentStep = 1;
  let lastOtpRequest = 0;
  let authToken = ''; // Store token from OTP verification

  // DOM Elements
  const elements = {
    step1: document.getElementById('step1'),
    step2: document.getElementById('step2'),
    step3: document.getElementById('step3'),
    successMessage: document.getElementById('successMessage'),
    emailPhoneInput: document.getElementById('emailPhone'),
    emailPhoneError: document.getElementById('emailPhoneError'),
    emailPhoneDisplay: document.getElementById('emailPhoneDisplay'),
    countdownElement: document.getElementById('countdown'),
    resendBtn: document.getElementById('resendBtn'),
    resendTimeElement: document.getElementById('resendTime'),
    resendText: document.getElementById('resendText'),
    resendSpinner: document.getElementById('resendSpinner'),
    otpInputs: document.querySelectorAll('.otp-input'),
    otpError: document.getElementById('otpError'),
    passwordError: document.getElementById('passwordError'),
    confirmPasswordError: document.getElementById('confirmPasswordError'),
    newPasswordInput: document.getElementById('newPassword'),
    confirmPasswordInput: document.getElementById('confirmPassword'),
    toggleNewPasswordBtn: document.getElementById('toggleNewPassword'),
    toggleConfirmPasswordBtn: document.getElementById('toggleConfirmPassword'),
    stepperLineFill: document.getElementById('stepper-line-fill'),
    stepCircles: document.querySelectorAll('.step-circle'),
    stepLabels: document.querySelectorAll('.step-label'),
    progressPercentage: document.getElementById('progressPercentage'),
    backToStep1: document.getElementById('backToStep1'),
    backToStep2: document.getElementById('backToStep2'),
  };

  // Password Visibility Toggle
  function togglePasswordVisibility(input, button) {
    const isPasswordVisible = input.type === 'text';
    input.type = isPasswordVisible ? 'password' : 'text';
    const svgPath = button.querySelector('svg path');
    button.setAttribute('aria-label', isPasswordVisible ? 'Show password' : 'Hide password');
    if (isPasswordVisible) {
      svgPath.setAttribute('d', 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z');
    } else {
      svgPath.setAttribute('d', 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m9.512 7.794a3.75 3.75 0 11-5.304-5.304m0 0A31.36 31.36 0 0120.714 2.286a3.75 3.75 0 11-5.304 5.304');
    }
  }

  elements.toggleNewPasswordBtn.addEventListener('click', () => togglePasswordVisibility(elements.newPasswordInput, elements.toggleNewPasswordBtn));
  elements.toggleConfirmPasswordBtn.addEventListener('click', () => togglePasswordVisibility(elements.confirmPasswordInput, elements.toggleConfirmPasswordBtn));

  // API Calls
  async function sendOtp(contact) {
    const now = Date.now();
    if (now - lastOtpRequest < 60000) { // 1 minute cooldown
      return Promise.reject(new Error('Please wait before requesting another OTP'));
    }
    lastOtpRequest = now;
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailPhone: contact })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP');
      }
      return { ok: true, expiresIn: data.expiresIn || 60 }; // Default to 60 seconds if not provided
    } catch (error) {
      throw error;
    }
  }

  async function verifyOtp(contact, otp) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailPhone: contact, otp })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Invalid OTP');
      }
      return { ok: true, token: data.token };
    } catch (error) {
      throw error;
    }
  }

  async function resetPassword(password, token) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword: password })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }
      return { ok: true };
    } catch (error) {
      throw error;
    }
  }

  // Form Submissions
  document.getElementById('emailPhoneForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const submitButton = this.querySelector('button[type="submit"]');
    if (!submitButton || submitButton.disabled) return;
    submitButton.disabled = true;
    const spinner = submitButton.querySelector('#submitSpinner1');
    if (spinner) spinner.classList.remove('hidden');
    emailPhone = elements.emailPhoneInput.value.trim();
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    const phoneRegex = /^\+\d{1,3}\d{9,12}$/; // Example: +919876543210
    if (!emailRegex.test(emailPhone) && !/^\d{10}$/.test(emailPhone)) { // Simplified phone regex for demo
      elements.emailPhoneError.textContent = 'Please enter a valid email or 10-digit phone number';
      elements.emailPhoneError.classList.add('active');
      elements.emailPhoneInput.classList.add('border-red-500', 'shake');
      elements.emailPhoneError.focus();
      setTimeout(() => elements.emailPhoneInput.classList.remove('shake'), 500);
      submitButton.disabled = false;
      if (spinner) spinner.classList.add('hidden');
      return;
    }
    try {
      const response = await sendOtp(emailPhone);
      if (response.ok) {
        elements.emailPhoneError.classList.remove('active');
        elements.emailPhoneInput.classList.remove('border-red-500');
        elements.emailPhoneDisplay.textContent = emailPhone;
        countdown = response.expiresIn || 30;
        showStep(2);
        startCountdown();
      }
    } catch (error) {
      elements.emailPhoneError.textContent = error.message || 'An error occurred. Please try again later.';
      elements.emailPhoneError.classList.add('active');
      elements.emailPhoneInput.classList.add('border-red-500', 'shake');
      elements.emailPhoneError.focus();
      setTimeout(() => elements.emailPhoneInput.classList.remove('shake'), 500);
    } finally {
      submitButton.disabled = false;
      if (spinner) spinner.classList.add('hidden');
    }
  });

  document.getElementById('otpForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const submitButton = this.querySelector('button[type="submit"]');
    if (!submitButton || submitButton.disabled) return;
    submitButton.disabled = true;
    const spinner = submitButton.querySelector('#submitSpinner2');
    if (spinner) spinner.classList.remove('hidden');
    const otp = Array.from(elements.otpInputs).map(input => input.value).join('').trim();
    if (otp.length !== 6 || !/^\d{6}$/.test(otp) || Array.from(elements.otpInputs).some(input => !input.value)) {
      elements.otpError.textContent = 'Please enter a complete 6-digit OTP';
      elements.otpError.classList.add('active');
      elements.otpInputs.forEach(input => input.classList.add('border-red-500', 'shake'));
      elements.otpError.focus();
      setTimeout(() => elements.otpInputs.forEach(input => input.classList.remove('shake')), 500);
      submitButton.disabled = false;
      if (spinner) spinner.classList.add('hidden');
      return;
    }
    try {
      const response = await verifyOtp(emailPhone, otp);
      if (response.ok) {
        elements.otpError.classList.remove('active');
        elements.otpInputs.forEach(input => input.classList.remove('border-red-500'));
        authToken = response.token; // Store the token
        showStep(3);
        resetCountdown();
      }
    } catch (error) {
      elements.otpError.textContent = error.message || 'An error occurred. Please try again later.';
      elements.otpError.classList.add('active');
      elements.otpInputs.forEach(input => input.classList.add('border-red-500', 'shake'));
      elements.otpError.focus();
      setTimeout(() => elements.otpInputs.forEach(input => input.classList.remove('shake')), 500);
    } finally {
      submitButton.disabled = false;
      if (spinner) spinner.classList.add('hidden');
    }
  });

  document.getElementById('passwordForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    // Must target type="submit" — this form also contains eye-toggle <button type="button">
    // elements; querySelector('button') would pick the first toggle and leave spinner null.
    const submitButton = this.querySelector('button[type="submit"]');
    if (!submitButton || submitButton.disabled) return;
    submitButton.disabled = true;
    const spinner = submitButton.querySelector('#submitSpinner3');
    if (spinner) spinner.classList.remove('hidden');
    const newPassword = elements.newPasswordInput.value;
    const confirmPassword = elements.confirmPasswordInput.value;
    let hasError = false;

    // Client-side validation
    if (newPassword.length < 8) {
      elements.passwordError.textContent = 'Password must be at least 8 characters long';
      elements.passwordError.classList.add('active');
      elements.newPasswordInput.classList.add('border-red-500', 'shake');
      elements.passwordError.focus();
      setTimeout(() => elements.newPasswordInput.classList.remove('shake'), 500);
      hasError = true;
    } else {
      elements.passwordError.classList.remove('active');
      elements.newPasswordInput.classList.remove('border-red-500');
    }
    if (newPassword !== confirmPassword) {
      elements.confirmPasswordError.textContent = 'Passwords do not match';
      elements.confirmPasswordError.classList.add('active');
      elements.confirmPasswordInput.classList.add('border-red-500', 'shake');
      elements.confirmPasswordError.focus();
      setTimeout(() => elements.confirmPasswordInput.classList.remove('shake'), 500);
      hasError = true;
    } else {
      elements.confirmPasswordError.classList.remove('active');
      elements.confirmPasswordInput.classList.remove('border-red-500');
    }
    if (hasError) {
      submitButton.disabled = false;
      if (spinner) spinner.classList.add('hidden');
      return;
    }

    try {
      const response = await resetPassword(newPassword, authToken);
      if (response.ok) {
        hideAllSteps();
        elements.successMessage.classList.remove('hidden');
        elements.successMessage.setAttribute('aria-live', 'assertive');
        const successLink = elements.successMessage.querySelector('a');
        if (successLink) successLink.focus();
      }
    } catch (error) {
      elements.passwordError.textContent = error.message || 'Failed to reset password. Please try again later.';
      elements.passwordError.classList.add('active');
      elements.newPasswordInput.classList.add('border-red-500', 'shake');
      elements.passwordError.focus();
      setTimeout(() => elements.newPasswordInput.classList.remove('shake'), 500);
    } finally {
      submitButton.disabled = false;
      if (spinner) spinner.classList.add('hidden');
    }
  });

  // Password Strength Indicator
  elements.newPasswordInput.addEventListener('input', function() {
    const password = this.value;
    const strengthIndicator = document.getElementById('passwordStrength');
    let strength = { text: '', class: '' };
    if (password.length < 8) {
      strength.text = 'Weak: At least 8 characters';
      strength.class = 'text-red-500';
    } else if (!/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      strength.text = 'Medium: Include uppercase, numbers, and special characters';
      strength.class = 'text-yellow-500';
    } else if (password.length >= 12) {
      strength.text = 'Very Strong: Excellent password!';
      strength.class = 'text-green-600';
    } else {
      strength.text = 'Strong: Great password!';
      strength.class = 'text-green-500';
    }
    strengthIndicator.textContent = strength.text;
    strengthIndicator.className = `text-sm mt-1 ${strength.class}`;
  });

  // OTP Input Handling
  document.querySelector('#otpForm .otp-input-row').addEventListener('input', (e) => {
    if (!e.target.classList.contains('otp-input')) return;
    const value = e.target.value;
    if (!/^\d$/.test(value)) {
      e.target.value = '';
      return;
    }
    const index = Array.from(elements.otpInputs).indexOf(e.target);
    if (value.length === 1 && index < elements.otpInputs.length - 1) {
      elements.otpInputs[index + 1].focus();
    }
  });

  document.querySelector('#otpForm .otp-input-row').addEventListener('keydown', (e) => {
    if (!e.target.classList.contains('otp-input')) return;
    const index = Array.from(elements.otpInputs).indexOf(e.target);
    if (e.key === 'Backspace' && e.target.value.length === 0 && index > 0) {
      elements.otpInputs[index - 1].focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      elements.otpInputs[index - 1].focus();
    } else if (e.key === 'ArrowRight' && index < elements.otpInputs.length - 1) {
      elements.otpInputs[index + 1].focus();
    }
  });

  // OTP Paste Handling
  elements.otpInputs[0].addEventListener('paste', (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
    if (pastedData.length !== 6) {
      elements.otpError.textContent = 'Pasted OTP must be 6 digits';
      elements.otpError.classList.add('active');
      elements.otpInputs.forEach(input => {
        input.value = '';
        input.classList.add('border-red-500', 'shake');
      });
      elements.otpError.focus();
      setTimeout(() => elements.otpInputs.forEach(input => input.classList.remove('shake')), 500);
      return;
    }
    elements.otpInputs.forEach((input, index) => {
      input.value = pastedData[index] || '';
    });
    setTimeout(() => {
      document.getElementById('otpForm').dispatchEvent(new Event('submit'));
    }, 500);
  });

  // Resend OTP
  elements.resendBtn.addEventListener('click', async function() {
    elements.resendText.classList.add('hidden');
    elements.resendSpinner.classList.remove('hidden');
    try {
      await sendOtp(emailPhone);
      countdown = 30;
      elements.resendTimeElement.textContent = countdown;
      elements.countdownElement.textContent = countdown;
      elements.resendText.classList.remove('hidden');
      elements.resendSpinner.classList.add('hidden');
      startCountdown();
      const alertDiv = document.createElement('div');
      alertDiv.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center justify-between';
      alertDiv.setAttribute('role', 'alert');
      alertDiv.setAttribute('aria-live', 'assertive');
      alertDiv.innerHTML = `
        A new OTP has been sent to your registered contact.
        <button class="ml-2 text-white focus:outline-none" aria-label="Close notification">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      `;
      document.body.appendChild(alertDiv);
      alertDiv.querySelector('button').addEventListener('click', () => alertDiv.remove());
      alertDiv.focus();
      setTimeout(() => alertDiv.remove(), 5000);
    } catch (error) {
      elements.otpError.textContent = error.message || 'Failed to resend OTP. Please try again.';
      elements.otpError.classList.add('active');
      elements.otpError.focus();
      elements.resendText.classList.remove('hidden');
      elements.resendSpinner.classList.add('hidden');
    }
  });

  // Back Buttons
  elements.backToStep1.addEventListener('click', () => showStep(1));
  elements.backToStep2.addEventListener('click', () => showStep(2));

  // Helper Functions
  function showStep(stepNumber) {
    if (stepNumber < 1 || stepNumber > 3) return;
    if (stepNumber < currentStep) {
      if (currentStep === 2 && Array.from(elements.otpInputs).some(input => input.value)) {
        if (!confirm('You have unsaved OTP input. Go back?')) return;
      } else if (currentStep === 3 && (elements.newPasswordInput.value || elements.confirmPasswordInput.value)) {
        if (!confirm('You have unsaved password input. Go back?')) return;
      }
    }
    hideAllSteps();
    elements[`step${stepNumber}`].classList.add('active');
    updateProgressSteps(stepNumber);
    currentStep = stepNumber;
    if (stepNumber === 1) {
      elements.emailPhoneInput.value = '';
      elements.emailPhoneError.classList.remove('active');
      elements.emailPhoneInput.classList.remove('border-red-500');
      elements.emailPhoneInput.focus();
    } else if (stepNumber === 2) {
      elements.otpInputs.forEach(input => {
        input.value = '';
        input.classList.remove('border-red-500');
      });
      elements.otpError.classList.remove('active');
      elements.otpInputs[0].focus();
    } else if (stepNumber === 3) {
      elements.newPasswordInput.value = '';
      elements.confirmPasswordInput.value = '';
      elements.passwordError.classList.remove('active');
      elements.confirmPasswordError.classList.remove('active');
      elements.newPasswordInput.classList.remove('border-red-500');
      elements.confirmPasswordInput.classList.remove('border-red-500');
      elements.newPasswordInput.focus();
    }
  }

  function hideAllSteps() {
    document.querySelectorAll('.step').forEach(step => {
      step.classList.remove('active');
    });
    elements.successMessage.classList.add('hidden');
  }

  function updateProgressSteps(currentStep) {
    const percentages = [0, 33, 66, 100];
    elements.stepCircles.forEach((circle, index) => {
      const stepNumber = index + 1;
      const labelText = circle.querySelector('.step-tooltip').textContent;
      circle.setAttribute('aria-label', stepNumber < currentStep ? `Completed: ${labelText}` : `Step ${stepNumber}: ${labelText}`);
      circle.setAttribute('aria-current', stepNumber === currentStep ? 'step' : 'false');
      if (index < currentStep - 1) {
        circle.classList.remove('bg-gray-200', 'text-gray-600', 'active');
        circle.classList.add('bg-red-600', 'text-white', 'completed');
        circle.querySelector('span:first-child').style.display = 'none';
      } else if (index === currentStep - 1) {
        circle.classList.remove('bg-gray-200', 'text-gray-600', 'completed');
        circle.classList.add('bg-red-600', 'text-white', 'active');
        circle.querySelector('span:first-child').style.display = 'block';
        setTimeout(() => circle.classList.remove('active'), 600);
      } else {
        circle.classList.remove('bg-red-600', 'text-white', 'active', 'completed');
        circle.classList.add('bg-gray-200', 'text-gray-600');
        circle.querySelector('span:first-child').style.display = 'block';
      }
    });
    elements.stepLabels.forEach((label, index) => {
      if (index === currentStep - 1) {
        label.classList.add('active');
      } else {
        label.classList.remove('active');
      }
    });
    const progress = percentages[currentStep];
    elements.stepperLineFill.style.width = `${progress}%`;
    if (currentStep > 1) {
      elements.stepperLineFill.classList.add('pulse');
      setTimeout(() => elements.stepperLineFill.classList.remove('pulse'), 500);
    }
    elements.progressPercentage.textContent = `${progress}% Complete`;
  }

  function startCountdown() {
    clearInterval(timer);
    elements.resendBtn.disabled = true;
    elements.countdownElement.classList.remove('text-red-600');
    let lastAnnounced = countdown;
    timer = setInterval(() => {
      countdown--;
      elements.countdownElement.textContent = countdown;
      elements.resendTimeElement.textContent = countdown;
      if (countdown % 5 === 0 && countdown !== lastAnnounced) {
        elements.countdownElement.setAttribute('aria-live', 'polite');
        lastAnnounced = countdown;
      }
      if (countdown <= 0) {
        clearInterval(timer);
        elements.resendBtn.disabled = false;
        elements.resendTimeElement.textContent = '0';
        elements.countdownElement.textContent = 'Code expired';
        elements.countdownElement.classList.add('text-red-600');
      }
    }, 1000);
  }

  function resetCountdown() {
    clearInterval(timer);
    countdown = 30;
    elements.resendBtn.disabled = true;
    elements.countdownElement.classList.remove('text-red-600');
    elements.countdownElement.textContent = countdown;
    elements.resendTimeElement.textContent = countdown;
    startCountdown();
  }

  // Step Circle Keyboard Navigation
  elements.stepCircles.forEach(circle => {
    circle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const stepNumber = parseInt(circle.getAttribute('data-step'));
        if (stepNumber <= currentStep) {
          showStep(stepNumber);
        }
      }
    });
  });
})();
