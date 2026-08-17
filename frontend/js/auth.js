// Password Visibility Toggle
function togglePassword(inputId, iconId, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  
  if (input.type === 'password') {
    input.type = 'text';
    // SVG for eye-off
    icon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;
  } else {
    input.type = 'password';
    // SVG for eye
    icon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
  }
}

// Utility: Password Validation
function isValidPassword(pwd) {
  return pwd.length >= 8 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[0-9]/.test(pwd);
}

// Utility: Show Alert
function showAlert(msg, type = 'error') {
  const errDiv = document.getElementById('error-msg');
  const succDiv = document.getElementById('success-msg');
  if (errDiv) errDiv.classList.add('hidden');
  if (succDiv) succDiv.classList.add('hidden');

  if (type === 'error' && errDiv) {
    errDiv.textContent = msg;
    errDiv.classList.remove('hidden');
  } else if (type === 'success' && succDiv) {
    succDiv.textContent = msg;
    succDiv.classList.remove('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const forgotForm = document.getElementById('forgot-password-form');
  const verifyForm = document.getElementById('verify-otp-form');
  const resetForm = document.getElementById('reset-password-form');

  // --- LOGIN ---
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const btn = document.getElementById('login-btn');

      btn.disabled = true;
      btn.textContent = 'Logging in...';
      try {
        const data = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = 'dashboard.html';
      } catch (error) {
        showAlert(error.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Log In';
      }
    });
  }

  // --- REGISTER ---
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirm = document.getElementById('confirm-password').value;
      const btn = document.getElementById('register-btn');

      if (password !== confirm) {
        return showAlert('Passwords do not match');
      }
      if (!isValidPassword(password)) {
        return showAlert('Password must be at least 8 characters, with uppercase, lowercase, and a number.');
      }

      btn.disabled = true;
      btn.textContent = 'Creating account...';
      try {
        const data = await api.post('/auth/register', { name, email, password });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify({ id: data.user.id, name: data.user.name, email: data.user.email }));
        window.location.href = 'dashboard.html';
      } catch (error) {
        showAlert(error.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Create Account';
      }
    });
  }

  // --- FORGOT PASSWORD ---
  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const btn = document.getElementById('send-otp-btn');

      btn.disabled = true;
      btn.textContent = 'Sending...';
      try {
        await api.post('/auth/forgot-password', { email });
        localStorage.setItem('reset_email', email);
        window.location.href = 'verify-otp.html';
      } catch (error) {
        showAlert(error.message);
        btn.disabled = false;
        btn.textContent = 'Send Verification Code';
      }
    });
  }

  // --- VERIFY OTP ---
  if (verifyForm) {
    const emailStr = localStorage.getItem('reset_email');
    if (!emailStr) {
      window.location.href = 'forgot-password.html';
      return;
    }
    document.getElementById('otp-email-display').textContent = emailStr;

    // OTP Inputs logic
    const inputs = document.querySelectorAll('.otp-input');
    inputs.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        if (e.target.value.length === 1 && index < inputs.length - 1) {
          inputs[index + 1].focus();
        }
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && e.target.value.length === 0 && index > 0) {
          inputs[index - 1].focus();
        }
      });
      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').slice(0, 6);
        [...pasted].forEach((char, i) => {
          if (inputs[i]) {
            inputs[i].value = char;
            inputs[i].focus();
          }
        });
      });
    });

    // Timer logic
    let timeLeft = 120; // 2 minutes
    const timerDisplay = document.getElementById('otp-timer');
    const resendBtn = document.getElementById('resend-otp-btn');
    let resendCooldown = 30;

    const interval = setInterval(() => {
      // OTP Expiry
      if (timeLeft > 0) {
        timeLeft--;
        const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const s = (timeLeft % 60).toString().padStart(2, '0');
        timerDisplay.textContent = `OTP expires in ${m}:${s}`;
      } else {
        timerDisplay.textContent = 'OTP has expired. Please resend.';
      }

      // Resend Cooldown
      if (resendCooldown > 0) {
        resendCooldown--;
        resendBtn.textContent = `Resend OTP in ${resendCooldown}s`;
      } else {
        resendBtn.disabled = false;
        resendBtn.textContent = 'Resend OTP';
      }
    }, 1000);

    resendBtn.addEventListener('click', async () => {
      resendBtn.disabled = true;
      resendCooldown = 30;
      timeLeft = 120;
      try {
        await api.post('/auth/forgot-password', { email: emailStr });
        showAlert('OTP resent successfully!', 'success');
      } catch (error) {
        showAlert(error.message);
      }
    });

    verifyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const otp = Array.from(inputs).map(i => i.value).join('');
      if (otp.length < 6) return showAlert('Please enter the full 6-digit code.');

      const btn = document.getElementById('verify-btn');
      btn.disabled = true;
      btn.textContent = 'Verifying...';
      try {
        const data = await api.post('/auth/verify-otp', { email: emailStr, otp });
        localStorage.setItem('reset_token', data.resetToken);
        window.location.href = 'reset-password.html';
      } catch (error) {
        showAlert(error.message);
        btn.disabled = false;
        btn.textContent = 'Verify OTP';
      }
    });
  }

  // --- RESET PASSWORD ---
  if (resetForm) {
    const resetToken = localStorage.getItem('reset_token');
    if (!resetToken) {
      window.location.href = 'login.html';
      return;
    }

    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPassword = document.getElementById('new-password').value;
      const confirmNew = document.getElementById('confirm-new-password').value;
      const btn = document.getElementById('reset-btn');

      if (newPassword !== confirmNew) {
        return showAlert('Passwords do not match');
      }
      if (!isValidPassword(newPassword)) {
        return showAlert('Password must be at least 8 characters, with uppercase, lowercase, and a number.');
      }

      btn.disabled = true;
      btn.textContent = 'Resetting...';
      try {
        await api.post('/auth/reset-password', { resetToken, newPassword });
        localStorage.removeItem('reset_token');
        localStorage.removeItem('reset_email');
        showToast('Password successfully reset! You can now log in.', 'success');
        window.location.href = 'login.html';
      } catch (error) {
        showAlert(error.message);
        btn.disabled = false;
        btn.textContent = 'Reset Password';
      }
    });
  }
});

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}
