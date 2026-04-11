/**
 * kyc-verification.js — MarketMix
 *
 * Flow:
 *  1. User fills form and selects files
 *  2. On submit: each file is uploaded via POST /api/seller/kyc/upload
 *     (your backend proxies to Supabase Storage using the service key)
 *  3. Backend returns a URL for each uploaded file
 *  4. POST /api/seller/kyc with form fields + the two file URLs
 */

const API_BASE = 'https://marketmix-backend.onrender.com/api';

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = 'sellers login.html'; return; }

  // Pre-fill email from stored user
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const emailField = document.getElementById('email');
    if (emailField && user.email) emailField.value = user.email;
  } catch (_) {}

  // Check existing KYC status — disable form if already submitted or approved
  fetch(`${API_BASE}/seller/kyc/status`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then(r => r.json())
    .then(data => {
      const { kycStatus, isVerified } = data.data || {};
      if (isVerified || kycStatus === 'approved') {
        showBanner('Your identity is already verified ✅', 'success');
        disableForm();
      } else if (kycStatus === 'pending') {
        showBanner("Your KYC is under review. We'll notify you once it's approved.", 'info');
        disableForm();
      }
    })
    .catch(() => {}); // non-fatal

  // File list display
  const idDocument      = document.getElementById('idDocument');
  const selfiePhoto     = document.getElementById('selfiePhoto');
  const idDocumentList  = document.getElementById('idDocumentList');
  const selfiePhotoList = document.getElementById('selfiePhotoList');

  idDocument.addEventListener('change', () => {
    updateFileList(idDocument, idDocumentList);
    clearFieldError('idDocument');
  });
  selfiePhoto.addEventListener('change', () => {
    updateFileList(selfiePhoto, selfiePhotoList);
    clearFieldError('selfiePhoto');
  });

  // Form submit
  const form         = document.getElementById('kycForm');
  const submitButton = form.querySelector('.save-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    submitButton.disabled    = true;
    submitButton.textContent = 'Uploading documents…';

    try {
      // Get user ID for storage path namespacing
      const userId = getUserId();

      // Upload both files to your backend (which stores them in Supabase Storage)
      const [idDocumentUrl, selfiePhotoUrl] = await Promise.all([
        uploadFile(idDocument.files[0],  `${userId}/id-doc`,  token),
        uploadFile(selfiePhoto.files[0], `${userId}/selfie`,  token),
      ]);

      submitButton.textContent = 'Submitting…';

      // POST metadata + file URLs to backend
      const res = await fetch(`${API_BASE}/seller/kyc`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName:        document.getElementById('fullName').value.trim(),
          dob:             document.getElementById('dob').value || null,
          businessName:    document.getElementById('businessName').value.trim() || null,
          businessAddress: document.getElementById('businessAddress').value.trim() || null,
          email:           document.getElementById('email').value.trim(),
          phone:           document.getElementById('phone').value.trim() || null,
          idType:          document.getElementById('idType').value,
          idDocumentUrl,
          selfiePhotoUrl,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || `Server error: ${res.status}`);
      }

      showToast("KYC submitted! We'll review your documents and notify you.", 'success');
      setTimeout(() => { window.location.href = 'sellers layout.html'; }, 2200);

    } catch (err) {
      console.error('KYC submit error:', err);
      showToast(err.message || 'Submission failed. Please try again.', 'error');
      submitButton.disabled    = false;
      submitButton.textContent = 'Submit KYC for Verification';
    }
  });

  // Footer year
  const footerCopy = document.querySelector('.footer-copy');
  if (footerCopy) {
    footerCopy.innerHTML = `&copy; ${new Date().getFullYear()} MarketMix. All rights reserved.`;
  }
});

// ─── Upload a file through your backend proxy ─────────────────────────────────
async function uploadFile(file, pathPrefix, token) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('pathPrefix', pathPrefix);

  const res = await fetch(`${API_BASE}/seller/kyc/upload`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}` },
    // NOTE: Do NOT set Content-Type here — browser sets it automatically
    // with the correct multipart boundary when using FormData
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'File upload failed');
  return data.data.url;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getUserId() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}').id || 'unknown';
  } catch (_) { return 'unknown'; }
}

function validateForm() {
  ['fullName', 'email', 'idType', 'idDocument', 'selfiePhoto'].forEach(clearFieldError);
  let valid = true;

  if (!document.getElementById('fullName').value.trim()) {
    showFieldError('fullName', 'Please enter your full name as shown on your ID.');
    valid = false;
  }
  const email = document.getElementById('email').value.trim();
  if (!email) {
    showFieldError('email', 'Email is required.');
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFieldError('email', 'Enter a valid email address.');
    valid = false;
  }
  if (!document.getElementById('idType').value) {
    showFieldError('idType', 'Please select an ID type.');
    valid = false;
  }
  if (!document.getElementById('idDocument').files.length) {
    showFieldError('idDocument', 'Please upload your ID document.');
    valid = false;
  }
  if (!document.getElementById('selfiePhoto').files.length) {
    showFieldError('selfiePhoto', 'Please upload a selfie for verification.');
    valid = false;
  }
  if (!valid) document.getElementById('kycForm').scrollIntoView({ behavior: 'smooth' });
  return valid;
}

function updateFileList(input, listContainer) {
  listContainer.innerHTML = '';
  Array.from(input.files || []).forEach(file => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `<span>${file.name}</span><button type="button">Remove</button>`;
    item.querySelector('button').addEventListener('click', () => {
      input.value = '';
      listContainer.innerHTML = '';
    });
    listContainer.appendChild(item);
  });
}

function showFieldError(id, message) {
  const el = document.getElementById(`error-${id}`);
  if (el) { el.textContent = message; el.style.display = 'block'; }
  const field = document.getElementById(id);
  if (field) field.style.borderColor = 'rgba(255,77,77,0.7)';
}

function clearFieldError(id) {
  const el = document.getElementById(`error-${id}`);
  if (el) { el.textContent = ''; el.style.display = 'none'; }
  const field = document.getElementById(id);
  if (field) field.style.borderColor = '';
}

function showToast(msg, type = 'info') {
  if (typeof showNotification === 'function') { showNotification(msg, type); return; }
  const existing = document.querySelector('.toast-msg');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className   = 'toast-msg';
  toast.textContent = msg;
  Object.assign(toast.style, {
    position:   'fixed',
    top:        '20px',
    right:      '20px',
    padding:    '1rem 1.4rem',
    borderRadius: '10px',
    color:      '#fff',
    fontWeight: '600',
    zIndex:     '9999',
    background: type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3',
    maxWidth:   '360px',
  });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3800);
}

function showBanner(msg, type = 'info') {
  const banner = document.createElement('div');
  banner.style.cssText = `
    background: ${type === 'success' ? '#e8f5e9' : '#e3f2fd'};
    border-left: 4px solid ${type === 'success' ? '#4CAF50' : '#2196F3'};
    color: #333; padding: 1rem 1.4rem; margin: 1rem 0;
    border-radius: 6px; font-weight: 500;
  `;
  banner.textContent = msg;
  const card = document.querySelector('.card');
  if (card) card.insertBefore(banner, card.querySelector('form'));
}

function disableForm() {
  document.getElementById('kycForm')
    ?.querySelectorAll('input, select, button[type="submit"]')
    .forEach(el => { el.disabled = true; });
  const btn = document.querySelector('.save-btn');
  if (btn) btn.textContent = 'KYC Submitted';
}