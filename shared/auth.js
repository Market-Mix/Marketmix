// Utility function to show notifications
function showNotification(message, type = 'success') {
    // Remove any existing notifications
    const existing = document.querySelector('.site-notification');
    if (existing) {
        existing.remove();
    }

        // Create new notification
        const notification = document.createElement('div');
        notification.className = `site-notification ${type === 'error' ? 'error' : ''}`;
    
    // Add icon based on type
    const icon = document.createElement('i');
    icon.className = `fas ${type === 'error' ? 'fa-times-circle' : 'fa-check-circle'}`;
    notification.appendChild(icon);
    
    // Add message
    const text = document.createElement('span');
    text.textContent = message;
    notification.appendChild(text);
    
    // Add to document
    document.body.appendChild(notification);
    
    // Remove after delay
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Handle form submission with notification and redirect
// Get API base
function apiBase() {
  return window.API_BASE_URL || window.CONFIG?.API_BASE_URL || 'https://marketmix-backend.onrender.com/api';
}

// Merge localStorage cart with server cart after login
async function mergeCartOnLogin(token) {
  try {
    const cartData = localStorage.getItem('cart');
    if (!cartData) {
      console.log('Auth: no local cart to merge');
      return;
    }

    let items = [];
    try {
      items = JSON.parse(cartData);
    } catch (e) {
      console.warn('Auth: invalid cart data in localStorage', e);
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      console.log('Auth: local cart is empty');
      return;
    }

    console.log('Auth: merging local cart with server...', items.length, 'items');

    const res = await fetch(`${apiBase()}/cart/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ items })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      console.warn('Auth: cart merge failed', res.status, errData);
      return;
    }

    const data = await res.json();
    console.log('Auth: cart merge successful', data.data);

    // Clear localStorage cart after successful merge
    localStorage.removeItem('cart');
    console.log('Auth: cleared local cart after merge');
  } catch (err) {
    console.error('Auth: error during cart merge', err);
    // Don't fail login if merge fails — user can still proceed
  }
}

// Handle form submission - performs real login against backend
async function handleFormSubmit(event, formType, redirectUrl) {
    event.preventDefault();

    // Get form inputs
    const form = event.target;
    const email = form.querySelector('input[type="email"]').value.trim();
    const password = form.querySelector('input[type="password"]').value;

    // Basic validation
    if (!email || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    try {
        const res = await fetch(`${apiBase()}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const json = await res.json();

        if (!res.ok) {
            const msg = (json && json.message) ? json.message : 'Login failed';
            showNotification(msg, 'error');
            return;
        }

        // Backend returns { status, message, data: { user, token } }
        const token = json?.data?.token;
        const user = json?.data?.user;

        if (!token) {
            showNotification('Login succeeded but no token received', 'error');
            return;
        }

        // Save token and user
        const tokenKey = 'token';
        const userKey = 'user';
        const roleKey = 'userRole';

        localStorage.setItem(tokenKey, token);
        localStorage.setItem(userKey, JSON.stringify(user || {}));
        if (user && user.role) localStorage.setItem(roleKey, user.role);

        // Merge cart: if localStorage has cart items, sync them to server
        await mergeCartOnLogin(token);

        showNotification('Login successful');
        
                // Check if there's a redirect URL saved (support legacy key as well)
                let finalRedirectUrl = redirectUrl;
                const savedRedirect = localStorage.getItem('after_login_redirect') || localStorage.getItem('post_login_redirect');
                if (savedRedirect) {
                    // Normalize to absolute path so redirects don't resolve relative to current folder
                    finalRedirectUrl = savedRedirect.startsWith('/') ? savedRedirect : ('/' + savedRedirect);
                    try { localStorage.removeItem('after_login_redirect'); } catch (e) {}
                    try { localStorage.removeItem('post_login_redirect'); } catch (e) {}
                    console.log('Login: redirecting to saved URL:', finalRedirectUrl);
                } else {
                    // If no saved redirect, check URL query param `next` (e.g. ?next=checkout.html)
                    try {
                        const params = new URLSearchParams(window.location.search || '');
                        const next = params.get('next');
                        if (next) {
                            // If the login page lives under /buyers/, keep next under that folder
                            const base = window.location.pathname.includes('/buyers/') ? '/buyers/' : '/';
                            finalRedirectUrl = next.startsWith('/') ? next : (base + next);
                            console.log('Login: using next query param redirect ->', finalRedirectUrl);
                        }
                    } catch (e) {
                        console.warn('Login: failed to parse next query param', e);
                    }
                }

                setTimeout(() => { window.location.href = finalRedirectUrl; }, 800);
    } catch (err) {
        console.error('Login error:', err);
        showNotification('Network or server error during login', 'error');
    }
}

// Handle Google sign-in with notification and redirect
function handleGoogleSignIn(formType, redirectUrl) {
    showNotification(`${formType} with Google successful!`);
    
    // Check if there's a redirect URL saved (support legacy key as well)
    let finalRedirectUrl = redirectUrl;
    const savedRedirect = localStorage.getItem('after_login_redirect') || localStorage.getItem('post_login_redirect');
    if (savedRedirect) {
      finalRedirectUrl = savedRedirect;
      try { localStorage.removeItem('after_login_redirect'); } catch (e) {}
      try { localStorage.removeItem('post_login_redirect'); } catch (e) {}
      console.log('Google login: redirecting to saved URL:', finalRedirectUrl);
    }
    
    setTimeout(() => {
        window.location.href = finalRedirectUrl;
    }, 1000);
}