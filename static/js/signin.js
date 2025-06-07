document.addEventListener('DOMContentLoaded', function() {
  console.log('signin.js loaded');

  // Get the form and its elements
  const form = document.getElementById('signin-form');
  const loginInput = document.getElementById('login');
  const passwordInput = document.getElementById('password');
  const passwordToggle = document.getElementById('password-toggle');
  const toast = document.getElementById('toast');

  // Toggle password visibility
  passwordToggle.addEventListener('click', function() {
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      passwordToggle.textContent = 'Hide';
    } else {
      passwordInput.type = 'password';
      passwordToggle.textContent = 'Show';
    }
  });

  // Show toast notification
  function showToast(message, type) {
    console.log('Toast:', message);
    toast.textContent = message;
    toast.className = 'toast ' + type + ' show';
    setTimeout(function() {
      toast.className = 'toast';
    }, 3000);
  }

  // CSRF token helper function
  function getCSRFToken() {
    const tokenElement = document.querySelector('[name=csrfmiddlewaretoken]');
    if (tokenElement) {
      console.log('CSRF token found:', tokenElement.value);
      return tokenElement.value;
    }
    const name = 'csrftoken';
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.startsWith(name + '=')) return cookie.substring(name.length + 1);
    }
    return '';
  }

  // Form submission event handler
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    console.log('Form submitted');

    // Read the selected role from the radio buttons
    const roleRadio = document.querySelector('input[name="user_type"]:checked');
    const role = roleRadio ? roleRadio.value.toLowerCase() : 'client';
    console.log('Role:', role);

    // Prepare form data
    const formData = {
      login: loginInput.value.trim(),
      password: passwordInput.value,
      role: role
    };

    console.log('Form Data:', formData);

    // Get CSRF token
    const csrfToken = getCSRFToken();
    if (!csrfToken) {
      console.error('CSRF token not found!');
      showToast('CSRF token error. Please reload the page.', 'error');
      return;
    }

    try {
      const response = await fetch('/api/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify(formData)
      });

      console.log('Response status:', response.status);

      const data = await response.json();
      console.log('API Response:', data);

      if (response.ok && data.success && data.redirect_url) {
        showToast('Successfully signed in! Redirecting...', 'success');
        setTimeout(() => {
          window.location.href = data.redirect_url;
        }, 1000);
      } else {
        showToast(data.error || 'Sign in failed', 'error');
      }
    } catch (error) {
      console.error('Error during sign in:', error);
      showToast('Network error. Please try again.', 'error');
    }
  });
});
