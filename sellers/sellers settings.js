/**
 * MarketMix Shop Settings
 * This page is store-scoped. Account settings live in sellers-account.html.
 */

const SOCIAL_KEYS = ['instagram', 'facebook', 'twitter', 'tiktok', 'whatsapp'];

function showMessage(message, type = 'info') {
  const el = document.getElementById('form-message');
  if (!el) return;
  el.textContent = message;
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

function getValue(form, name) {
  return form.elements[name]?.value.trim() || '';
}

function getResponseStore(response) {
  return response?.data?.store || response?.data || response?.store || response;
}

function throwIfApiFailed(response, fallbackMessage) {
  if (response?.success === false || response?.error) {
    throw new Error(response.message || response.error || fallbackMessage);
  }
}

function cacheActiveStore(store) {
  localStorage.setItem('mm_active_store', JSON.stringify(store));
}

function getSocialLinks(store) {
  const socialLinks = store?.social_links || {};
  return {
    instagram: socialLinks.instagram || '',
    facebook: socialLinks.facebook || '',
    twitter: socialLinks.twitter || '',
    tiktok: socialLinks.tiktok || '',
    whatsapp: socialLinks.whatsapp || '',
  };
}

function renderStoreLogo(storeLogoUrl) {
  const preview = document.getElementById('logo-preview');
  if (preview) {
    preview.src = storeLogoUrl || '';
    preview.style.display = storeLogoUrl ? 'block' : 'none';
    preview.onerror = () => {
      preview.removeAttribute('src');
      preview.style.display = 'none';
    };
  }

  document.querySelectorAll('#sellerProfileImage, #sellerProfileImageMobile').forEach((img) => {
    img.src = storeLogoUrl || '';
    img.onerror = () => { img.removeAttribute('src'); };
  });
}

function buildPayload(form) {
  const socialLinks = {};
  SOCIAL_KEYS.forEach((key) => {
    socialLinks[key] = getValue(form, key);
  });

  return {
    business_name: getValue(form, 'business_name'),
    business_address: getValue(form, 'business_address'),
    store_logo_url: getValue(form, 'store_logo_url'),
    social_links: socialLinks,
  };
}

async function getActiveStoreOrRedirect() {
  const token = window.StoreManager?.getToken?.();
  if (!token) {
    showMessage('Not logged in. Redirecting...', 'error');
    setTimeout(() => { window.location.href = 'sellers login.html'; }, 1000);
    return null;
  }

  const store = await window.StoreManager.requireActiveStore();
  if (!store?.id) {
    showMessage('No active store selected.', 'error');
    return null;
  }

  return store;
}

async function loadStoreSettings() {
  const activeStore = await getActiveStoreOrRedirect();
  if (!activeStore) return;

  showMessage('Loading shop settings...');

  try {
    const response = await window.StoreManager.apiFetch(`/seller/stores/${activeStore.id}`);
    throwIfApiFailed(response, 'Failed to load shop settings.');
    const store = getResponseStore(response) || activeStore;
    const socialLinks = getSocialLinks(store);

    setValue('shop-name', store.business_name);
    setValue('shop-address', store.business_address);
    setValue('shop-logo-url', store.store_logo_url);
    SOCIAL_KEYS.forEach((key) => setValue(`shop-${key}`, socialLinks[key]));

    renderStoreLogo(store.store_logo_url || '');
    cacheActiveStore({ ...activeStore, ...store, social_links: socialLinks });
    showMessage('');
  } catch (err) {
    console.error('Load store settings error:', err);
    showMessage(err.message || 'Failed to load shop settings.', 'error');
  }
}

async function saveStoreSettings(payload, storeId) {
  return window.StoreManager.apiFetch(`/seller/stores/${storeId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

function setupNavbar() {
  const toggler = document.getElementById('navbar-toggler');
  const offcanvasMenu = document.getElementById('offcanvasMenu');
  const offcanvasClose = document.getElementById('offcanvasClose');

  toggler?.addEventListener('click', () => offcanvasMenu?.classList.add('show'));
  offcanvasClose?.addEventListener('click', () => offcanvasMenu?.classList.remove('show'));
  document.addEventListener('click', (e) => {
    if (offcanvasMenu && toggler && !offcanvasMenu.contains(e.target) && !toggler.contains(e.target)) {
      offcanvasMenu.classList.remove('show');
    }
  });
  offcanvasMenu?.addEventListener('click', (e) => e.stopPropagation());
  document.querySelectorAll('.offcanvas-body a').forEach((link) => {
    link.addEventListener('click', () => offcanvasMenu?.classList.remove('show'));
  });

  window.toggleProfileDropdown = function () {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) dropdown.style.display = dropdown.style.display === 'flex' ? 'none' : 'flex';
  };

  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('profileDropdown');
    const icon = document.querySelector('.profile-icon');
    if (dropdown && icon && !dropdown.contains(e.target) && !icon.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
}

function setupLogoPreview() {
  const logoInput = document.getElementById('shop-logo-url');
  logoInput?.addEventListener('input', () => renderStoreLogo(logoInput.value.trim()));
}

function setupForm() {
  const form = document.getElementById('shop-settings');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showMessage('');

    const store = window.StoreManager.getActiveStore();
    if (!store?.id) {
      showMessage('No active store selected. Please select a store first.', 'error');
      return;
    }

    const payload = buildPayload(form);

    setLoading(true);
    showMessage('Saving shop settings...');

    try {
      const response = await saveStoreSettings(payload, store.id);
      throwIfApiFailed(response, 'Failed to save shop settings.');
      const savedStore = getResponseStore(response);
      const updatedStore = {
        ...store,
        ...payload,
        ...(savedStore && typeof savedStore === 'object' ? savedStore : {}),
      };

      cacheActiveStore(updatedStore);
      renderStoreLogo(updatedStore.store_logo_url || '');
      showMessage('Shop settings saved successfully!', 'success');
    } catch (err) {
      console.error('Save store settings error:', err);
      showMessage(err.message || 'Failed to save shop settings.', 'error');
    } finally {
      setLoading(false);
    }
  });

  document.getElementById('reset-btn')?.addEventListener('click', () => {
    if (confirm('Reset unsaved changes? Last saved shop settings will reload.')) {
      loadStoreSettings();
    }
  });

  document.getElementById('preview-btn')?.addEventListener('click', () => {
    const store = window.StoreManager.getActiveStore();
    if (store?.id) {
      window.open(`../buyers/store-id.html?store=${store.id}`, '_blank');
    } else {
      alert('No active store selected.');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupNavbar();
  setupLogoPreview();
  setupForm();
  loadStoreSettings();
  window.addEventListener('storeChanged', () => loadStoreSettings());
});
