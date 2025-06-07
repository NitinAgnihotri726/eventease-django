document.addEventListener('DOMContentLoaded', function() {
  console.log('signup.js loaded');

  const form = document.getElementById('signup-form');
  const nameInput = document.getElementById('name');
  const usernameInput = document.getElementById('username');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');
  const passwordInput = document.getElementById('password');
  const toast = document.getElementById('toast');

  // Helper: Show toast notification
  function showToast(message, type) {
    toast.textContent = message;
    toast.className = 'toast ' + type + ' show';
    setTimeout(() => {
      toast.className = 'toast';
    }, 3000);
  }

  // CSRF token helper
  function getCSRFToken() {
    const tokenElement = document.querySelector('[name=csrfmiddlewaretoken]');
    return tokenElement ? tokenElement.value : '';
  }

  // Real-time check function for a given field
  async function checkField(apiUrl, fieldValue, successEl, errorEl) {
    try {
      // Append the proper query parameter based on the API endpoint.
      // The backend expects: /api/check-username/?username=..., /api/check-email/?email=..., /api/check-phone/?phone=...
      const url = new URL(apiUrl, window.location.origin);
      // Determine parameter name from the URL (simple check)
      if (apiUrl.indexOf('check-username') !== -1) {
        url.searchParams.append('username', fieldValue);
      } else if (apiUrl.indexOf('check-email') !== -1) {
        url.searchParams.append('email', fieldValue);
      } else if (apiUrl.indexOf('check-phone') !== -1) {
        url.searchParams.append('phone', fieldValue);
      }
      // Append role parameter
      url.searchParams.append('role', getSelectedRole());

      const response = await fetch(url.toString());
      const data = await response.json();
      if (data.available) {
        successEl.textContent = "Available";
        successEl.style.display = "block";
        errorEl.style.display = "none";
      } else {
        errorEl.textContent = "Already exists";
        errorEl.style.display = "block";
        successEl.style.display = "none";
      }
    } catch (e) {
      console.error(e);
    }
  }

  function getSelectedRole() {
    const roleRadio = document.querySelector('input[name="user_type"]:checked');
    return roleRadio ? roleRadio.value.toLowerCase() : 'client';
  }

  // Validate mobile number on input
  phoneInput.addEventListener('input', function() {
    const errorEl = document.getElementById('phone-error');
    const successEl = document.getElementById('phone-success');
    const value = phoneInput.value.trim();
    if (value.length !== 10 || !/^\d{10}$/.test(value)) {
      errorEl.textContent = "Mobile number must be exactly 10 digits";
      errorEl.style.display = "block";
      successEl.style.display = "none";
    } else {
      errorEl.style.display = "none";
      // Check uniqueness via API
      checkField('/api/check-phone/', value, successEl, errorEl);
    }
  });

  usernameInput.addEventListener('blur', function() {
    const value = usernameInput.value.trim();
    const errorEl = document.getElementById('username-error');
    const successEl = document.getElementById('username-success');
    if (value.length < 3) {
      errorEl.textContent = "Username must be at least 3 characters";
      errorEl.style.display = "block";
      successEl.style.display = "none";
      return;
    }
    checkField('/api/check-username/', value, successEl, errorEl);
  });

  emailInput.addEventListener('blur', function() {
    const value = emailInput.value.trim();
    const errorEl = document.getElementById('email-error');
    const successEl = document.getElementById('email-success');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      errorEl.textContent = "Invalid email format";
      errorEl.style.display = "block";
      successEl.style.display = "none";
      return;
    }
    checkField('/api/check-email/', value, successEl, errorEl);
  });

  // Form submission event
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    // Basic front-end validation
    if (!nameInput.value.trim() || !usernameInput.value.trim() || !emailInput.value.trim() ||
        !phoneInput.value.trim() || !passwordInput.value) {
      showToast("Please fill all fields", "error");
      return;
    }
    if (phoneInput.value.trim().length !== 10 || !/^\d{10}$/.test(phoneInput.value.trim())) {
      showToast("Mobile number must be 10 digits", "error");
      return;
    }
    const role = getSelectedRole();
    const data = {
      role: role,
      name: nameInput.value.trim(),
      username: usernameInput.value.trim(),
      email: emailInput.value.trim(),
      phone: phoneInput.value.trim(),
      password: passwordInput.value
    };

    const csrfToken = getCSRFToken();
    try {
      const response = await fetch('/api/signup/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (response.ok && result.success) {
        showToast("Sign up successful! Redirecting to sign in...", "success");
        setTimeout(() => {
          window.location.href = `/signin/?role=${role}`;
        }, 1500);
      } else {
        showToast(result.error || "Sign up failed", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Network error. Please try again.", "error");
    }
  });
});
