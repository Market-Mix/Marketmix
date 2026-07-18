document.addEventListener('DOMContentLoaded', async () => {

  /* ─── Config ────────────────────────────────────────────────────────────── */
  const API_BASE = 'https://marketmix-backend.onrender.com/api';
  const token    = localStorage.getItem('seller_token') || localStorage.getItem('token');

  // Redirect to login if not authenticated
  if (!token) {
    window.location.href = 'sellers login.html';
    return;
  }

  /* ─── Element refs ──────────────────────────────────────────────────────── */
  const form         = document.getElementById('storeSetupForm');
  const storeName    = document.getElementById('storeName');
  const storeDesc    = document.getElementById('storeDesc');
  const wordCount    = document.getElementById('wordCount');
  const emailInput   = document.getElementById('email');
  const phoneInput   = document.getElementById('phone');
  const addressInput = document.getElementById('address');
  const websiteInput = document.getElementById('website');

  // Logo
  const logoInput       = document.getElementById('storeLogo');
  const logoDrop        = document.getElementById('logoDrop');
  const logoPreview     = document.getElementById('logoPreview');
  const logoPreviewWrap = document.getElementById('logoPreviewWrap');
  const removeLogoBtn   = document.getElementById('removeLogo');
  const errorLogo       = document.getElementById('error-logo');

  // Gallery
  const galleryInput = document.getElementById('galleryInput');
  const galleryGrid  = document.getElementById('galleryGrid');
  let galleryFiles   = [];

  // Category
  const storeCategory   = document.getElementById('storeCategory');
  const errorStoreCategory = document.getElementById('error-storeCategory');
  let categories        = [];
  let selectedCategoryId = '';

  // Socials
  const toggleSocials  = document.getElementById('toggleSocials');
  const socialsSection = document.getElementById('socialsSection');

  // Preview
  const previewLogo    = document.getElementById('previewLogo');
  const previewNoImg   = document.getElementById('previewNoImg');
  const previewName    = document.getElementById('previewName');
  const previewDesc    = document.getElementById('previewDesc');
  const previewAddress = document.getElementById('previewAddress');
  const previewEmail   = document.getElementById('previewEmail');
  const previewPhone   = document.getElementById('previewPhone');
  const previewCats    = document.getElementById('previewCats');
  const previewGallery = document.getElementById('previewGallery');
  const previewSocials = document.getElementById('previewSocials');
  const mapFrame       = document.getElementById('mapFrame');

  // OTP UI
  let otpVerified  = false;
  let otpSentEmail = null;

  // Inject OTP input row below email field
  const emailFormGroup = document.getElementById('email').closest('.form-group');
  const otpSection = document.createElement('div');
  otpSection.id = 'otpSection';
  otpSection.style.display = 'none';
  otpSection.innerHTML = `
    <div class="input-row" style="margin-top:8px;">
      <input id="otpInput" type="text" maxlength="6" placeholder="Enter 6-digit code"
             style="letter-spacing:6px; font-weight:bold; font-size:1.1rem;">
      <button type="button" id="verifyOtpBtn" class="verify-btn">Confirm</button>
    </div>
    <small id="otpMsg" style="display:block; margin-top:4px;"></small>
    <button type="button" id="resendOtpBtn"
            style="background:none; border:none; color:#667eea; cursor:pointer; font-size:0.85rem; margin-top:4px; padding:0; display:none;">
      Resend code
    </button>
  `;
  emailFormGroup.appendChild(otpSection);

  /* ─── Toast ─────────────────────────────────────────────────────────────── */
  function showToast(msg, type = 'info') {
    if (typeof showNotification === 'function') { showNotification(msg, type); return; }
    const existing = document.querySelector('.toast-msg');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.className = 'toast-msg';
    t.innerHTML = msg;
    Object.assign(t.style, {
      position:'fixed', top:'20px', right:'20px', padding:'1rem 1.5rem',
      borderRadius:'8px', color:'#fff', fontWeight:'600', zIndex:'9999',
      background: type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3',
      maxWidth:'360px'
    });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  }

  /* ─── Error helpers ─────────────────────────────────────────────────────── */
  function showFieldError(id, msg) {
    const el = document.getElementById('error-' + id);
    if (el) { el.textContent = msg; el.style.display = 'block'; }
    const input = document.getElementById(id);
    if (input) input.style.borderColor = 'rgba(255,77,77,0.6)';
  }

  function clearFieldError(id) {
    const el = document.getElementById('error-' + id);
    if (el) { el.textContent = ''; el.style.display = 'none'; }
    const input = document.getElementById(id);
    if (input) input.style.borderColor = '';
  }

  async function fetchCategories() {
    try {
      const res = await fetch(`${API_BASE}/categories`);
      const data = await res.json();
      categories = data?.data || [];
      renderCategoryOptions();
    } catch (err) {
      console.warn('Could not load categories:', err);
    }
  }

  function renderCategoryOptions() {
    if (!storeCategory) return;
    storeCategory.innerHTML = '<option value="">Select a category</option>';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      if (cat.id === selectedCategoryId) opt.selected = true;
      storeCategory.appendChild(opt);
    });
  }

  /* ─── Load existing store #1 if it exists ───────────────────────────────── */
  async function loadProfile() {
    // Prefill from signup details
  const signupDetails = JSON.parse(localStorage.getItem('signupDetails') || '{}');
  if (signupDetails.email) {
    storeName.value    = signupDetails.storeName    || '';
    emailInput.value   = signupDetails.email        || '';
    phoneInput.value   = signupDetails.phone        || '';
    addressInput.value = signupDetails.address      || '';

    // Update previews
    previewName.textContent    = signupDetails.storeName || 'Your Store Name';
    previewEmail.textContent   = signupDetails.email     || '—';
    previewPhone.textContent   = signupDetails.phone     || '—';
    previewAddress.textContent = signupDetails.address   || '—';

    // Match category from signup to dropdown by id, with name fallback
    if (signupDetails.productCategory && storeCategory) {
      selectedCategoryId = signupDetails.productCategory;
      storeCategory.value = selectedCategoryId;
      if (!storeCategory.value && signupDetails.productCategoryName) {
        const match = Array.from(storeCategory.options)
          .find(o => o.text.toLowerCase() === signupDetails.productCategoryName.toLowerCase());
        if (match) {
          storeCategory.value = match.value;
          selectedCategoryId = match.value;
        }
      }
      updatePreviewCategories();
    }
  }
    try {
      // First try the stores endpoint (new)
      const storesRes = await fetch(`${API_BASE}/seller/stores`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (storesRes.ok) {
        const data   = await storesRes.json();
        const stores = data.data?.stores || [];
        const store1 = stores.find(s => s.store_number === 1);
        if (store1) {
          populateFormFromStore(store1);
          return;
        }
      }
    } catch (e) {
      console.warn('Could not load store:', e.message);
    }
  }

  function populateFormFromStore(store) {
    if (store.business_name)    storeName.value    = store.business_name;
    if (store.business_address) addressInput.value = store.business_address;
    if (store.business_phone)   phoneInput.value   = store.business_phone;
    if (store.business_email) {
      emailInput.value           = store.business_email;
      previewEmail.textContent   = store.business_email;
    }
    if (store.website) websiteInput.value = store.website;

    // Social links
    if (store.facebook)  document.getElementById('social-facebook').value = store.facebook;
    if (store.twitter)   document.getElementById('social-x').value        = store.twitter;
    if (store.tiktok)    document.getElementById('social-tiktok').value    = store.tiktok;
    if (store.instagram) document.getElementById('social-ig').value        = store.instagram;
    if (store.telegram)  document.getElementById('social-telegram').value  = store.telegram;

    if (store.is_verified) markEmailVerified();

    // Logo
    if (store.store_logo_url) {
      logoPreview.src            = store.store_logo_url;
      logoPreview.style.display  = 'block';
      previewLogo.src            = store.store_logo_url;
      previewLogo.style.display  = 'block';
      previewNoImg.style.display = 'none';
      removeLogoBtn.style.display = 'inline-block';
    }

    // Category
    if (store.category_id) {
      selectedCategoryId = store.category_id;
    } else if (store.category) {
      const found = categories.find(c => c.name.toLowerCase() === store.category.toLowerCase());
      if (found) selectedCategoryId = found.id;
    }
    if (storeCategory) {
      storeCategory.value = selectedCategoryId || '';
      updatePreviewCategories();
    }

    // Update previews
    previewName.textContent    = store.business_name    || 'Your Store Name';
    previewAddress.textContent = store.business_address || '—';
    previewPhone.textContent   = store.business_phone   || '—';
  }

  /* ─── OTP: Send ─────────────────────────────────────────────────────────── */
  const verifyEmailBtn = document.getElementById('verifyEmail');

  verifyEmailBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    clearFieldError('email');

    if (!email) return showFieldError('email', 'Please enter your email first.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return showFieldError('email', 'Enter a valid email address.');
    }
    if (otpVerified) return showToast('Email already verified <i class="fas fa-check-circle"></i>', 'success');

    verifyEmailBtn.disabled = true;
    verifyEmailBtn.textContent = 'Sending...';

    try {
      const res  = await fetch(`${API_BASE}/seller/send-otp`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body:    JSON.stringify({ email })
      });
      const data = await res.json();

      if (!res.ok) {
        showFieldError('email', data.message || 'Failed to send code.');
        verifyEmailBtn.disabled = false;
        verifyEmailBtn.textContent = 'Verify';
        return;
      }

      otpSentEmail = email;
      otpSection.style.display = 'block';
      document.getElementById('otpMsg').textContent = `Code sent to ${email}. Expires in 10 minutes.`;
      document.getElementById('otpMsg').style.color = '#4CAF50';
      document.getElementById('resendOtpBtn').style.display = 'inline';

      let countdown = 60;
      verifyEmailBtn.textContent = `Resend (${countdown}s)`;
      const timer = setInterval(() => {
        countdown--;
        verifyEmailBtn.textContent = `Resend (${countdown}s)`;
        if (countdown <= 0) {
          clearInterval(timer);
          verifyEmailBtn.disabled = false;
          verifyEmailBtn.textContent = 'Resend';
        }
      }, 1000);

    } catch (err) {
      showFieldError('email', 'Network error. Please try again.');
      verifyEmailBtn.disabled = false;
      verifyEmailBtn.textContent = 'Verify';
    }
  });

  /* ─── OTP: Confirm ──────────────────────────────────────────────────────── */
  document.addEventListener('click', async (e) => {
    if (e.target.id !== 'verifyOtpBtn') return;

    const otp    = document.getElementById('otpInput').value.trim();
    const otpMsg = document.getElementById('otpMsg');
    const otpBtn = document.getElementById('verifyOtpBtn');

    if (!otp || otp.length !== 6) {
      otpMsg.textContent = 'Please enter the 6-digit code.';
      otpMsg.style.color = '#f44336';
      return;
    }

    otpBtn.disabled = true;
    otpBtn.textContent = 'Verifying...';

    try {
      const res  = await fetch(`${API_BASE}/seller/verify-otp`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body:    JSON.stringify({ email: otpSentEmail, otp })
      });
      const data = await res.json();

      if (!res.ok) {
        otpMsg.textContent = data.message || 'Invalid code. Please try again.';
        otpMsg.style.color = '#f44336';
        otpBtn.disabled = false;
        otpBtn.textContent = 'Confirm';
        return;
      }

      markEmailVerified();
      showToast('Email verified successfully! <i class="fas fa-check-circle"></i>', 'success');

    } catch (err) {
      otpMsg.textContent = 'Network error. Please try again.';
      otpMsg.style.color = '#f44336';
      otpBtn.disabled = false;
      otpBtn.textContent = 'Confirm';
    }
  });

  function markEmailVerified() {
    otpVerified = true;
    otpSection.style.display = 'none';
    verifyEmailBtn.innerHTML = '<i class="fas fa-check-circle"></i> Verified';
    verifyEmailBtn.disabled = true;
    verifyEmailBtn.style.background = '#4CAF50';
    clearFieldError('email');
  }

  /* ─── Category preview ─────────────────────────────────────────────────── */
  function updatePreviewCategories() {
    previewCats.innerHTML = '';
    const categoryName = storeCategory?.selectedOptions?.[0]?.text || '';
    if (categoryName) {
      const c = document.createElement('div');
      c.className   = 'preview-cat';
      c.textContent = categoryName;
      previewCats.appendChild(c);
    }
  }

  if (storeCategory) {
    storeCategory.addEventListener('change', () => {
      updatePreviewCategories();
      clearFieldError('storeCategory');
    });
  }

  /* ─── Logo drag & drop ──────────────────────────────────────────────────── */
  logoDrop.addEventListener('dragover',  e => { e.preventDefault(); logoDrop.classList.add('dragover'); });
  logoDrop.addEventListener('dragleave', () => logoDrop.classList.remove('dragover'));
  logoDrop.addEventListener('drop', e => {
    e.preventDefault();
    logoDrop.classList.remove('dragover');
    const f = e.dataTransfer.files?.[0];
    if (f) handleLogoFile(f);
  });
  logoInput.addEventListener('change', e => { if (e.target.files[0]) handleLogoFile(e.target.files[0]); });

  function handleLogoFile(file) {
    if (!file.type.startsWith('image/')) return alert('Please upload an image file.');
    const reader = new FileReader();
    reader.onload = ev => {
      logoPreview.src            = ev.target.result;
      logoPreview.style.display  = 'block';
      previewLogo.src            = ev.target.result;
      previewLogo.style.display  = 'block';
      previewNoImg.style.display = 'none';
      removeLogoBtn.style.display = 'inline-block';
      errorLogo.textContent = '';
    };
    reader.readAsDataURL(file);
  }

  removeLogoBtn.addEventListener('click', () => {
    logoInput.value             = '';
    logoPreview.src             = '';
    logoPreview.style.display   = 'none';
    removeLogoBtn.style.display = 'none';
    previewLogo.src             = '';
    previewLogo.style.display   = 'none';
    previewNoImg.style.display  = 'block';
  });

  /* ─── Gallery ───────────────────────────────────────────────────────────── */
  galleryInput.addEventListener('change', e => {
    const files = Array.from(e.target.files).slice(0, 3 - galleryFiles.length);
    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = ev => { galleryFiles.push(ev.target.result); renderGallery(); };
      reader.readAsDataURL(file);
    });
    galleryInput.value = '';
  });

  function renderGallery() {
    galleryGrid.innerHTML    = '';
    previewGallery.innerHTML = '';
    galleryFiles.forEach((src, idx) => {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      item.innerHTML = `<img src="${src}" alt="showcase ${idx+1}"><button type="button" class="remove-gallery" data-i="${idx}"><i class="fas fa-times"></i></button>`;
      galleryGrid.appendChild(item);
      const pImg = document.createElement('img');
      pImg.src = src;
      previewGallery.appendChild(pImg);
    });
    galleryGrid.querySelectorAll('.remove-gallery').forEach(btn => {
      btn.addEventListener('click', () => {
        galleryFiles.splice(Number(btn.dataset.i), 1);
        renderGallery();
      });
    });
  }

  /* ─── Socials ───────────────────────────────────────────────────────────── */
  toggleSocials?.addEventListener('click', () => {
    socialsSection.classList.toggle('active');
    toggleSocials.textContent = socialsSection.classList.contains('active')
      ? '− Hide Social Links' : '+ Add Social Links';
  });

  ['social-facebook','social-x','social-tiktok','social-ig','social-telegram'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updatePreviewSocials);
  });

  function updatePreviewSocials() {
    previewSocials.innerHTML = '';
    [
      { id:'social-facebook', icon:'fab fa-facebook',  label:'Facebook' },
      { id:'social-x',        icon:'fab fa-x-twitter', label:'X' },
      { id:'social-tiktok',   icon:'fab fa-tiktok',    label:'TikTok' },
      { id:'social-ig',       icon:'fab fa-instagram', label:'Instagram' },
      { id:'social-telegram', icon:'fab fa-telegram',  label:'Telegram' }
    ].forEach(s => {
      const v = document.getElementById(s.id)?.value.trim();
      if (v) {
        const a = document.createElement('a');
        a.href = v; a.target = '_blank'; a.rel = 'noopener';
        a.innerHTML = `<i class="${s.icon}"></i> ${s.label}`;
        previewSocials.appendChild(a);
      }
    });
  }

  /* ─── Live preview updates ──────────────────────────────────────────────── */
  storeName.addEventListener('input',    () => { previewName.textContent    = storeName.value.trim()    || 'Your Store Name'; });
  storeDesc.addEventListener('input',    () => {
    const wc = storeDesc.value.trim().split(/\s+/).filter(Boolean).length;
    wordCount.textContent = `${wc} / 250 words`;
    wordCount.style.color = wc > 250 ? 'var(--danger)' : '';
    previewDesc.textContent = storeDesc.value.trim() || 'Store description will appear here.';
  });
  emailInput.addEventListener('input',   () => { previewEmail.textContent   = emailInput.value.trim()   || '—'; });
  phoneInput.addEventListener('input',   () => { previewPhone.textContent   = phoneInput.value.trim()   || '—'; });
  addressInput.addEventListener('input', () => {
    previewAddress.textContent = addressInput.value.trim() || '—';
    updateMap(addressInput.value.trim());
  });

  function updateMap(addr) {
    mapFrame.src = addr ? `https://www.google.com/maps?q=${encodeURIComponent(addr)}&output=embed` : '';
  }

  /* ─── Form submission ───────────────────────────────────────────────────── */
  form.addEventListener('submit', async e => {
    e.preventDefault();

    ['logo','storeName','email','phone','address','storeCategory'].forEach(clearFieldError);

    let valid = true;

    if (!logoInput.files?.[0] && !logoPreview.src) {
      errorLogo.textContent = 'Store logo is required.';
      errorLogo.style.display = 'block';
      valid = false;
    }
    if (!storeName.value.trim())    { showFieldError('storeName', 'Store name is required.');    valid = false; }
    if (!emailInput.value.trim())   { showFieldError('email', 'Email is required.');             valid = false; }
    if (!phoneInput.value.trim())   { showFieldError('phone', 'Phone number is required.');      valid = false; }
    if (!addressInput.value.trim()) { showFieldError('address', 'Store address is required.');   valid = false; }
    if (!storeCategory?.value)      { showFieldError('storeCategory', 'Please select a category.'); valid = false; }
    if (!addressInput.value.trim()) { showFieldError('address', 'Store address is required.'); valid = false; }
    else if (addressInput.value.trim().split(',').length < 2) {
    showFieldError('address', 'Please include street, city/state — e.g. "12 Market Rd, Owerri, Imo"');
    valid = false;
    }

    if (!otpVerified) {
      showFieldError('email', 'Please verify your email before saving.');
      valid = false;
    }

    const wordTotal = storeDesc.value.trim().split(/\s+/).filter(Boolean).length;
    if (wordTotal > 250) {
      showToast('Description exceeds 250 words. Please shorten it.', 'error');
      valid = false;
    }

    if (!valid) {
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const saveBtn = form.querySelector('.save-btn');
    saveBtn.disabled    = true;
    saveBtn.textContent = 'Saving...';

    try {
      const res = await fetch(`${API_BASE}/seller/update-store`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          storeName:        storeName.value.trim(),
          storeDescription: storeDesc.value.trim(),
          businessEmail:    emailInput.value.trim(),
          businessPhone:    phoneInput.value.trim(),
          businessAddress:  addressInput.value.trim(),
          website:          websiteInput.value.trim(),
          category_id:      storeCategory?.value || null,
          category:         storeCategory?.selectedOptions?.[0]?.text || null,
          storeLogoUrl:     logoPreview.src || null,
          facebook:  document.getElementById('social-facebook').value.trim(),
          twitter:   document.getElementById('social-x').value.trim(),
          tiktok:    document.getElementById('social-tiktok').value.trim(),
          instagram: document.getElementById('social-ig').value.trim(),
          telegram:  document.getElementById('social-telegram').value.trim()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.message || 'Failed to save. Please try again.', 'error');
        saveBtn.disabled    = false;
        saveBtn.textContent = 'Save & Continue to verify KYC';
        return;
      }

      // ── KEY CHANGE: persist the store in localStorage so dashboard loads correctly ──
      if (data.data?.store) {
        localStorage.setItem('mm_active_store', JSON.stringify(data.data.store));
        localStorage.removeItem('mm_stores_cache'); // force refresh on next load
      }

      // Create a notification for the seller informing them the store setup completed
      (async () => {
        try {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          const userId = user?.id;
          const notifPayload = {
            user_id: userId,
            title: 'Store setup completed',
            message: 'Your store has been successfully set up. Please complete KYC verification to get verified.',
            type: 'account',
            link: '/sellers/kyc-verification.html'
          };

          if (userId && typeof NotificationManager !== 'undefined' && NotificationManager.createNotification) {
            // Prefer internal NotificationManager when available
            try { await NotificationManager.createNotification(userId, {
              title: notifPayload.title,
              message: notifPayload.message,
              type: notifPayload.type,
              link: notifPayload.link
            }); } catch (e) { console.warn('NotificationManager.createNotification failed', e); }
          } else if (userId) {
            // Fallback direct API call
            try {
              await fetch(`${API_BASE}/notifications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(notifPayload)
              });
            } catch (e) { console.warn('Failed to create notification via API', e); }
          }

          // Immediately refresh navbar badges if updater exists
          if (typeof updateNavbarNotificationBadge === 'function') {
            try { updateNavbarNotificationBadge(); } catch (e) {}
          }
        } catch (e) {
          console.warn('Could not create store setup notification:', e);
        }
      })();

      showToast('Store setup completed! <i class="fas fa-party-horn"></i> Redirecting to KYC verification...', 'success');
      localStorage.removeItem('signupDetails'); // clean up
      setTimeout(() => { window.location.href = 'kyc-verification.html'; }, 2000);

    } catch (err) {
      showToast('Network error. Please check your connection.', 'error');
      saveBtn.disabled    = false;
      saveBtn.textContent = 'Save & Continue to verify KYC';
    }
  });

  /* ─── Init ──────────────────────────────────────────────────────────────── */
  previewNoImg.style.display = 'block';
  previewLogo.style.display  = 'none';
  updatePreviewCategories();
  await fetchCategories();
  loadProfile();

  const footerCopy = document.querySelector('.footer-copy');
  if (footerCopy) {
    footerCopy.innerHTML = `&copy; ${new Date().getFullYear()} MarketMix. All rights reserved.`;
  }

});