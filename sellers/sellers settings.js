/**
 * sellers settings.js — MarketMix Shop Settings
 * Settings are scoped to the ACTIVE STORE via StoreManager.
 * Saves to: PUT /api/seller/stores/:storeId
 * Logo upload: POST /api/seller/logo/upload
 * Password change: PUT /api/auth/change-password  (account-level, not store-level)
 */

const API_BASE = 'https://marketmix-backend.onrender.com/api';

function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

function showMessage(msg, type = 'info') {
  const el = document.getElementById('form-message');
  if (!el) return;
  el.textContent = msg;
  el.style.color = type === 'success' ? 'green' : type === 'error' ? 'red' : '#000';
}

function setLoading(isLoading) {
  const saveBtn = document.querySelector('button.save-btn');
  if (!saveBtn) return;
  saveBtn.disabled = isLoading;
  saveBtn.setAttribute('aria-busy', String(isLoading));
  const spinner = saveBtn.querySelector('.loading-spinner');
  if (spinner) spinner.classList.toggle('hidden', !isLoading);
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || '';
}

function renderProfileImage(storeLogoUrl) {
  const img = document.getElementById('sellerProfileImage');
  if (!img) return;
  if (storeLogoUrl) {
    img.src = storeLogoUrl;
    img.onerror = () => { img.src = ''; };
  }
}

// ── Load active store settings ─────────────────────────────────────────────────
async function loadStoreSettings() {
  const token = getToken();
  if (!token) {
    showMessage('Not logged in. Redirecting…', 'error');
    setTimeout(() => { window.location.href = 'sellers login.html'; }, 1500);
    return;
  }

  // Require active store; redirect to view-store.html if none
  const store = await window.StoreManager.requireActiveStore();
  if (!store) return;

  // Show which store we're editing
  const storeLabel = document.getElementById('activeStoreName');
  if (storeLabel) storeLabel.textContent = store.business_name || 'Your Store';

  // Populate fields from store object
  setValue('shop-name',      store.business_name);
  setValue('shop-email',     store.business_email);
  setValue('shop-phone',     store.business_phone);
  setValue('shop-address',   store.business_address);
  setValue('shop-instagram', store.instagram);
  setValue('shop-facebook',  store.facebook);
  setValue('shop-twitter',   store.twitter);

  // Show existing logo
  const logoUrl = store.store_logo_url;
  if (logoUrl) {
    const preview = document.getElementById('logo-preview');
    if (preview) { preview.src = logoUrl; preview.style.display = 'block'; }
    renderProfileImage(logoUrl);
  }

  // Business hours stored in description as "Business Hours: ..."
  if (store.business_description) {
    const match = store.business_description.match(/Business Hours:\s*([^|]+)/);
    if (match) setValue('business-hours', match[1].trim());
  }
}

// ── Upload logo via backend proxy ──────────────────────────────────────────────
async function uploadStoreLogo(file, token) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/seller/logo/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Logo upload failed');
  return data.data.url;
}

// ── Save store settings ────────────────────────────────────────────────────────
async function saveStoreSettings(fields, storeLogoUrl, storeId) {
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
  if (storeLogoUrl) payload.storeLogoUrl = storeLogoUrl;

  const res = await fetch(`${API_BASE}/seller/stores/${storeId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to save settings');
  return data;
}

// ── Change password (account-level) ───────────────────────────────────────────
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
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Failed to change password');
  return data;
}

// ── DOM Ready ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const token = getToken();
  if (!token) { window.location.href = 'sellers login.html'; return; }

  // ── Navbar toggler ──
  const toggler        = document.getElementById('navbar-toggler');
  const offcanvasMenu  = document.getElementById('offcanvasMenu');
  const offcanvasClose = document.getElementById('offcanvasClose');

  toggler?.addEventListener('click',        () => offcanvasMenu?.classList.add('show'));
  offcanvasClose?.addEventListener('click', () => offcanvasMenu?.classList.remove('show'));
  document.addEventListener('click', (e) => {
    if (offcanvasMenu && toggler &&
        !offcanvasMenu.contains(e.target) && !toggler.contains(e.target)) {
      offcanvasMenu.classList.remove('show');
    }
  });
  offcanvasMenu?.addEventListener('click', (e) => e.stopPropagation());
  document.querySelectorAll('.offcanvas-body a').forEach(l =>
    l.addEventListener('click', () => offcanvasMenu?.classList.remove('show'))
  );

  // ── Profile dropdown ──
  window.toggleProfileDropdown = function () {
    const dd = document.getElementById('profileDropdown');
    if (dd) dd.style.display = dd.style.display === 'flex' ? 'none' : 'flex';
  };
  document.addEventListener('click', (e) => {
    const dd   = document.getElementById('profileDropdown');
    const icon = document.querySelector('.profile-icon');
    if (dd && icon && !dd.contains(e.target) && !icon.contains(e.target))
      dd.style.display = 'none';
  });

  // ── Make email read-only ──
  const emailInput = document.getElementById('shop-email');
  if (emailInput) {
    emailInput.setAttribute('readonly', true);
    emailInput.style.backgroundColor = '#f0f0f0';
    emailInput.style.cursor = 'not-allowed';
    emailInput.title = 'Store email can only be changed from account settings';
  }

  // ── Logo preview ──
  const shopLogoInput = document.getElementById('shop-logo');
  const logoPreview   = document.getElementById('logo-preview');

  shopLogoInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) { if (logoPreview) logoPreview.style.display = 'none'; return; }
    if (!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)) {
      alert('Invalid file type. PNG, JPG, WebP or GIF only.');
      shopLogoInput.value = ''; return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Max 5MB.'); shopLogoInput.value = ''; return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (logoPreview) { logoPreview.src = ev.target.result; logoPreview.style.display = 'block'; }
    };
    reader.readAsDataURL(file);
  });

  // ── Load store settings ──
  loadStoreSettings();

  // ── Store change listener — reload if seller switches stores on this page ──
  window.addEventListener('storeChanged', () => loadStoreSettings());

  // ── Form submit ──
  const form = document.getElementById('shop-settings');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showMessage('');

    const currentPassword = form.elements['currentPassword']?.value || '';
    const newPassword     = form.elements['newPassword']?.value     || '';
    const confirmPassword = form.elements['confirmPassword']?.value || '';

    if (newPassword && newPassword !== confirmPassword) {
      showMessage('New password and confirm password do not match.', 'error'); return;
    }
    if (newPassword && newPassword.length < 8) {
      showMessage('New password must be at least 8 characters.', 'error'); return;
    }
    if (newPassword && !currentPassword) {
      showMessage('Enter your current password to set a new one.', 'error'); return;
    }

    const store = window.StoreManager.getActiveStore();
    if (!store) {
      showMessage('No active store selected. Please go to View Store first.', 'error'); return;
    }

    setLoading(true);
    showMessage('Saving…');

    try {
      // 1. Upload logo if selected
      let newLogoUrl = null;
      const logoFile = shopLogoInput?.files?.[0];
      if (logoFile) {
        showMessage('Uploading logo…');
        newLogoUrl = await uploadStoreLogo(logoFile, token);
        // Update navbar image immediately
        renderProfileImage(newLogoUrl);
      }

      // 2. Collect fields
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

      // 3. Save to the active store endpoint
      showMessage('Saving store settings…');
      const result = await saveStoreSettings(fields, newLogoUrl, store.id);

      // 4. Update cached store in StoreManager
      const updatedStore = result?.data?.store;
      if (updatedStore) {
        window.StoreManager.setActiveStore({ ...store, ...updatedStore });
      }

      // 5. Change password if provided
      if (newPassword) {
        showMessage('Updating password…');
        await changePassword(currentPassword, newPassword);
        form.elements['currentPassword'].value = '';
        form.elements['newPassword'].value     = '';
        form.elements['confirmPassword'].value = '';
      }

      showMessage('Settings saved successfully! ✓', 'success');

      // Re-load to confirm saved values
      await loadStoreSettings();

    } catch (err) {
      console.error('Save error:', err);
      showMessage(err.message || 'An error occurred. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  });

  // ── Reset button ──
  document.getElementById('reset-btn')?.addEventListener('click', () => {
    if (confirm('Reset unsaved changes? Last saved settings will reload.')) {
      showMessage('');
      if (logoPreview)   { logoPreview.style.display = 'none'; logoPreview.src = ''; }
      if (shopLogoInput) shopLogoInput.value = '';
      loadStoreSettings();
    }
  });

  // ── Preview button ──
  document.getElementById('preview-btn')?.addEventListener('click', () => {
    const store = window.StoreManager.getActiveStore();
    if (store?.id) {
      window.open(`../buyers/store-id.html?store=${store.id}`, '_blank');
    } else {
      alert('No active store selected.');
    }
  });
});