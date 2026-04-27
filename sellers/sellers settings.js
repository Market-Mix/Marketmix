/**
 * Sellers Settings Page — Backend Integration
 * API Base: https://marketmix-backend.onrender.com/api
 *
 * Endpoints used:
 *   GET  /api/seller/profile        → load current seller data
 *   POST /api/seller/kyc/upload     → upload logo via backend proxy (same as KYC docs)
 *   POST /api/seller/update-store   → save shop settings (accepts storeLogoUrl)
 *   PUT  /api/auth/change-password  → change password
 *
 * Logo upload mirrors the KYC pattern exactly:
 *   frontend sends FormData → backend uploads to Supabase using service key → returns URL
 *   No Supabase credentials ever touch the frontend.
 */

const API_BASE = 'https://marketmix-backend.onrender.com/api';

// ─── Utility ──────────────────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

function getUserId() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}').id || 'unknown';
  } catch (_) { return 'unknown'; }
}

function showMessage(msg, type = 'info') {
  const el = document.getElementById('form-message');
  if (!el) return;
  el.textContent = msg;
  el.style.color =
    type === 'success' ? 'green' :
    type === 'error'   ? 'red'   : '#000';
}

function setLoading(isLoading) {
  const saveBtn = document.querySelector('button.save-btn');
  if (!saveBtn) return;
  const spinner = saveBtn.querySelector('.loading-spinner');
  saveBtn.disabled = isLoading;
  saveBtn.setAttribute('aria-busy', String(isLoading));
  if (spinner) spinner.classList.toggle('hidden', !isLoading);
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

// ─── Profile Image ────────────────────────────────────────────────────────────
function renderProfileImage(profile) {
  const img = document.getElementById('sellerProfileImage');
  if (!img) return;
  const logo = profile?.profile?.storeLogo;
  if (logo) {
    img.src = logo;
    img.onerror = () => {
      img.src = '';
    };
  }
}

// ─── Load Seller Profile ───────────────────────────────────────────────────────

async function loadSellerProfile() {
  const token = getToken();
  if (!token) {
    showMessage('You are not logged in. Redirecting…', 'error');
    setTimeout(() => { window.location.href = 'sellers login.html'; }, 1500);
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/seller/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 401) {
      showMessage('Session expired. Please log in again.', 'error');
      setTimeout(() => { window.location.href = 'sellers login.html'; }, 1500);
      return;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showMessage(err.message || 'Failed to load profile.', 'error');
      return;
    }

    const data    = await res.json();
    const seller  = data.data?.seller;
    if (!seller) return;

    const profile = seller.profile || {};
    const kycData = profile.kycDocumentUrls || {};
    const social  = kycData.social_links    || {};

    // Populate all form fields
    setValue('shop-name',      profile.businessName    || '');
    setValue('shop-email',     seller.email            || '');   // readonly
    setValue('shop-phone',     profile.businessPhone   || seller.phone || '');
    setValue('shop-address',   profile.businessAddress || '');
    setValue('business-hours', kycData.businessHours   || '');
    setValue('shop-instagram', social.instagram        || '');
    setValue('shop-facebook',  social.facebook         || '');
    setValue('shop-twitter',   social.twitter          || '');

    // Show existing store logo and update profile image
    const logoUrl = profile.storeLogo || profile.storeLogoUrl;
    if (logoUrl) {
      const preview = document.getElementById('logo-preview');
      if (preview) {
        preview.src           = logoUrl;
        preview.style.display = 'block';
      }
    }

    // Update navbar avatar
    renderProfileImage(seller);

  } catch (err) {
    console.error('loadSellerProfile error:', err);
    showMessage('Network error loading profile.', 'error');
  }
}

// ─── Upload Logo via Backend Proxy (same pattern as KYC) ─────────────────────
// Frontend sends FormData to /api/seller/kyc/upload with pathPrefix=store-logo
// Backend uses its SUPABASE_SERVICE_KEY to upload to Supabase and returns the URL
// No Supabase credentials ever touch the browser.

async function uploadStoreLogo(file, token) {
  const userId   = getUserId();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('pathPrefix', `store-logo/${userId}`);

  const res = await fetch(`${API_BASE}/seller/logo/upload`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}` },
    // Do NOT set Content-Type — browser sets multipart boundary automatically
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Logo upload failed. Please try again.');
  }

  return data.data.url;
}

// ─── Save Shop Settings ────────────────────────────────────────────────────────

async function saveShopSettings(fields, storeLogoUrl) {
  const token = getToken();

  const payload = {
    storeName:        fields.shopName      || '',
    businessEmail:    fields.shopEmail     || '',
    businessPhone:    fields.shopPhone     || '',
    businessAddress:  fields.shopAddress   || '',
    storeDescription: fields.businessHours
      ? `Business Hours: ${fields.businessHours}`
      : '',
    instagram: fields.shopInstagram || '',
    facebook:  fields.shopFacebook  || '',
    twitter:   fields.shopTwitter   || '',
    tiktok:    '',
    telegram:  '',
  };

  if (storeLogoUrl) {
    payload.storeLogoUrl = storeLogoUrl;
  }

  const res = await fetch(`${API_BASE}/seller/update-store`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to save settings.');
  }

  return res.json();
}

// ─── Change Password ───────────────────────────────────────────────────────────

async function changePassword(currentPassword, newPassword) {
  const token = getToken();

  const res = await fetch(`${API_BASE}/auth/change-password`, {
    method:  'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to change password.');
  }

  return res.json();
}

// ─── DOM Ready ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

  // ── Auth guard ──
  const token = getToken();
  if (!token) {
    window.location.href = 'sellers login.html';
    return;
  }

  // ── Navbar Toggler ──
  const toggler        = document.getElementById('navbar-toggler');
  const offcanvasMenu  = document.getElementById('offcanvasMenu');
  const offcanvasClose = document.getElementById('offcanvasClose');

  if (toggler)        toggler.addEventListener('click', () => offcanvasMenu.classList.add('show'));
  if (offcanvasClose) offcanvasClose.addEventListener('click', () => offcanvasMenu.classList.remove('show'));

  document.addEventListener('click', (e) => {
    if (
      offcanvasMenu &&
      !offcanvasMenu.contains(e.target) &&
      toggler && !toggler.contains(e.target)
    ) {
      offcanvasMenu.classList.remove('show');
    }
  });

  if (offcanvasMenu) offcanvasMenu.addEventListener('click', (e) => e.stopPropagation());

  document.querySelectorAll('.offcanvas-body a').forEach(link => {
    link.addEventListener('click', () => offcanvasMenu?.classList.remove('show'));
  });

  // ── Profile Dropdown ──
  window.toggleProfileDropdown = function () {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) {
      dropdown.style.display = dropdown.style.display === 'flex' ? 'none' : 'flex';
    }
  };

  document.addEventListener('click', (e) => {
    const dropdown    = document.getElementById('profileDropdown');
    const profileIcon = document.querySelector('.profile-icon');
    if (
      dropdown && profileIcon &&
      !dropdown.contains(e.target) &&
      !profileIcon.contains(e.target)
    ) {
      dropdown.style.display = 'none';
    }
  });

  // ── Make email read-only ──
  const emailInput = document.getElementById('shop-email');
  if (emailInput) {
    emailInput.setAttribute('readonly', true);
    emailInput.style.backgroundColor = '#f0f0f0';
    emailInput.style.cursor          = 'not-allowed';
    emailInput.title = 'Email address cannot be changed here';
  }

  // ── Logo Preview & Validation ──
  const shopLogoInput = document.getElementById('shop-logo');
  const logoPreview   = document.getElementById('logo-preview');

  if (shopLogoInput) {
    shopLogoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) {
        logoPreview.style.display = 'none';
        logoPreview.src = '';
        return;
      }
      // Validate type
      if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) {
        alert('Invalid file type. Only PNG, JPG, WebP and GIF are allowed.');
        shopLogoInput.value = '';
        logoPreview.style.display = 'none';
        return;
      }
      // Validate size (5MB — matches backend multer limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('File too large. Maximum size is 5MB.');
        shopLogoInput.value = '';
        logoPreview.style.display = 'none';
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        logoPreview.src           = ev.target.result;
        logoPreview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    });
  }

  // ── Load profile on page open ──
  loadSellerProfile();

  // ── Form Submit ──
  const form = document.getElementById('shop-settings');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      showMessage('');

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const currentPassword = form.elements['currentPassword']?.value || '';
      const newPassword     = form.elements['newPassword']?.value     || '';
      const confirmPassword = form.elements['confirmPassword']?.value || '';

      if (newPassword && newPassword !== confirmPassword) {
        showMessage('New password and confirm password do not match.', 'error');
        return;
      }
      if (newPassword && newPassword.length < 8) {
        showMessage('New password must be at least 8 characters.', 'error');
        return;
      }
      if (newPassword && !currentPassword) {
        showMessage('Please enter your current password to set a new one.', 'error');
        return;
      }

      setLoading(true);
      showMessage('Saving…');

      try {
        // 1. Upload new logo if one was selected
        let newLogoUrl = null;
        const logoFile = shopLogoInput?.files?.[0];
        if (logoFile) {
          showMessage('Uploading logo…');
          newLogoUrl = await uploadStoreLogo(logoFile, token);
        }

        // 2. Collect form values
        const fields = {
          shopName:      form.elements['shopName']?.value.trim()      || '',
          shopEmail:     form.elements['shopEmail']?.value.trim()     || '',
          shopPhone:     form.elements['shopPhone']?.value.trim()     || '',
          shopAddress:   form.elements['shopAddress']?.value.trim()   || '',
          businessHours: form.elements['businessHours']?.value.trim() || '',
          shopInstagram: form.elements['shopInstagram']?.value.trim() || '',
          shopFacebook:  form.elements['shopFacebook']?.value.trim()  || '',
          shopTwitter:   form.elements['shopTwitter']?.value.trim()   || '',
        };

        // 3. Save shop settings
        showMessage('Saving settings…');
        await saveShopSettings(fields, newLogoUrl);

        // 4. Change password if supplied
        if (newPassword) {
          showMessage('Updating password…');
          await changePassword(currentPassword, newPassword);
          form.elements['currentPassword'].value = '';
          form.elements['newPassword'].value     = '';
          form.elements['confirmPassword'].value = '';
        }

        showMessage('Settings saved successfully! ✓', 'success');
        await loadSellerProfile(); // re-fetch to confirm saved values

      } catch (err) {
        console.error('Save error:', err);
        showMessage(err.message || 'An error occurred. Please try again.', 'error');
      } finally {
        setLoading(false);
      }
    });
  }

  // ── Reset Button ──
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset all unsaved changes? Your last saved settings will be reloaded.')) {
        showMessage('');
        if (logoPreview)   { logoPreview.style.display = 'none'; logoPreview.src = ''; }
        if (shopLogoInput) shopLogoInput.value = '';
        loadSellerProfile();
      }
    });
  }

  // ── Preview Button ──
  const previewBtn = document.getElementById('preview-btn');
  if (previewBtn) {
    previewBtn.addEventListener('click', () => alert('Shop preview coming soon!'));
  }
});