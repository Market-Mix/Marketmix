/**
 * MarketMix Shop Settings
 * This page is store-scoped. Account settings live in sellers-account.html.
 */

const SOCIAL_KEYS = ['instagram', 'facebook', 'twitter', 'tiktok', 'whatsapp'];
const SUPABASE_URL = window.MARKETMIX_SUPABASE_URL || 'https://zfyoxmwwuwgvaevwlgzn.supabase.co';
const SUPABASE_ANON_KEY = window.MARKETMIX_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeW94bXd3dXdndmFldndsZ3puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NzIxNzIsImV4cCI6MjA3OTI0ODE3Mn0.k35O8K2mQyoI8T2PCI5RhInlaSTDMpwJ8xRw5zITL_0';
const STORE_LOGOS_BUCKET = 'store-logos';

let currentStoreLogoUrl = '';
let supabaseClient = null;
let isLogoUploading = false;

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
  currentStoreLogoUrl = storeLogoUrl || '';

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
    store_logo_url: currentStoreLogoUrl,
    social_links: socialLinks,
  };
}

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  if (!window.supabase?.createClient) {
    throw new Error('Logo upload is unavailable. Supabase could not be loaded.');
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabaseClient;
}

function getLogoExtension(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension && ['png', 'jpg', 'jpeg', 'webp'].includes(extension)) return extension;
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

function validateLogoFile(file) {
  if (!file) return 'Choose a logo image first.';
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    return 'Use a PNG, JPG, or WebP image for the shop logo.';
  }
  if (file.size > 5 * 1024 * 1024) {
    return 'Logo image is too large. Maximum size is 5MB.';
  }
  return '';
}

async function uploadStoreLogo(file, storeId) {
  const extension = getLogoExtension(file);
  const filePath = `${storeId}/logo-${Date.now()}.${extension}`;
  const client = getSupabaseClient();
  const { error } = await client.storage
    .from(STORE_LOGOS_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: true,
    });

  if (error) throw new Error(error.message || 'Failed to upload shop logo.');

  const { data } = client.storage.from(STORE_LOGOS_BUCKET).getPublicUrl(filePath);
  if (!data?.publicUrl) throw new Error('Uploaded logo URL could not be created.');
  return data.publicUrl;
}

async function saveStoreLogo(storeLogoUrl, storeId) {
  return window.StoreManager.apiFetch(`/seller/stores/${storeId}`, {
    method: 'PUT',
    body: JSON.stringify({ store_logo_url: storeLogoUrl }),
  });
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

function setupLogoUpload() {
  const logoButton = document.getElementById('change-logo-btn');
  const logoInput = document.getElementById('shop-logo-file');
  if (!logoButton || !logoInput) return;

  logoButton.addEventListener('click', () => logoInput.click());

  logoInput.addEventListener('change', async () => {
    const file = logoInput.files?.[0];
    const validationError = validateLogoFile(file);
    if (validationError) {
      showMessage(validationError, 'error');
      logoInput.value = '';
      return;
    }

    const store = window.StoreManager.getActiveStore();
    if (!store?.id) {
      showMessage('No active store selected. Please select a store first.', 'error');
      logoInput.value = '';
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    renderStoreLogo(localPreviewUrl);
    isLogoUploading = true;
    logoButton.disabled = true;
    setLoading(true);
    showMessage('Uploading shop logo...');

    try {
      const publicUrl = await uploadStoreLogo(file, store.id);
      const response = await saveStoreLogo(publicUrl, store.id);
      throwIfApiFailed(response, 'Failed to save shop logo.');

      const savedStore = getResponseStore(response);
      const updatedStore = {
        ...store,
        store_logo_url: publicUrl,
        ...(savedStore && typeof savedStore === 'object' ? savedStore : {}),
      };

      cacheActiveStore(updatedStore);
      renderStoreLogo(updatedStore.store_logo_url || publicUrl);
      showMessage('Shop logo updated successfully!', 'success');
    } catch (err) {
      console.error('Logo upload error:', err);
      renderStoreLogo(store.store_logo_url || '');
      showMessage(err.message || 'Failed to update shop logo.', 'error');
    } finally {
      URL.revokeObjectURL(localPreviewUrl);
      isLogoUploading = false;
      logoInput.value = '';
      logoButton.disabled = false;
      setLoading(false);
    }
  });
}

function setupForm() {
  const form = document.getElementById('shop-settings');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showMessage('');

    if (isLogoUploading) {
      showMessage('Logo upload is still finishing. Please wait a moment.', 'error');
      return;
    }

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
  setupLogoUpload();
  setupForm();
  loadStoreSettings();
  window.addEventListener('storeChanged', () => loadStoreSettings());
});
