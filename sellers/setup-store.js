document.addEventListener('DOMContentLoaded', () => {

  /* ─── Config ────────────────────────────────────────────────────────────── */
  const API_BASE = 'https://marketmix-backend.onrender.com/api';
  const token    = localStorage.getItem('token');

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
  const categoryChips   = document.getElementById('categoryChips');
  const openAddCategory = document.getElementById('openAddCategory');
  const categoryModal   = document.getElementById('categoryModal');
  const closeCatModal   = document.getElementById('closeCategoryModal');
  const cancelCatBtn    = document.getElementById('cancelCategoryBtn');
  const saveCatBtn      = document.getElementById('saveCategoryBtn');
  const newCatInput     = document.getElementById('newCategoryInput');
  const errorCategory   = document.getElementById('error-category');

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

  // OTP UI — injected below the email field
  let otpVerified    = false;
  let otpSentEmail   = null;

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
    if (typeof showNotification === 'function') {
      showNotification(msg, type);
      return;
    }
    const existing = document.querySelector('.toast-msg');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.className = 'toast-msg';
    t.textContent = msg;
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

  /* ─── Load existing seller profile ─────────────────────────────────────── */
  async function loadProfile() {
    try {
      const res  = await fetch(`${API_BASE}/seller/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      const p    = data.data?.seller?.profile;
      if (!p) return;

      if (p.businessName)    storeName.value    = p.businessName;
      if (p.businessAddress) addressInput.value = p.businessAddress;
      if (p.businessPhone)   phoneInput.value   = p.businessPhone;
      if (p.businessEmail) {
        emailInput.value = p.businessEmail;
        previewEmail.textContent = p.businessEmail;
      }

      // Check verified status
      if (p.isVerified) {
        markEmailVerified();
      }

      // Update previews
      previewName.textContent    = p.businessName    || 'Your Store Name';
      previewAddress.textContent = p.businessAddress || '—';
      previewPhone.textContent   = p.businessPhone   || '—';

      // Extract category from businessDescription if present
      if (p.businessDescription) {
        const match = p.businessDescription.match(/Product Category:\s*([^|]+)/);
        if (match && match[1]) {
          const cat = match[1].trim();
          const found = defaultCategories.find(c => c.toLowerCase() === cat.toLowerCase());
          if (found) {
            selectedCategory = found;
            renderChips();
            updatePreviewCategories();
          }
        }
      }
    } catch (e) {
      console.warn('Could not load profile:', e.message);
    }
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
    if (otpVerified) return showToast('Email already verified ✅', 'success');

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

      // Start 60s cooldown on Verify button
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
      console.error('Send OTP error:', err);
      showFieldError('email', 'Network error. Please try again.');
      verifyEmailBtn.disabled = false;
      verifyEmailBtn.textContent = 'Verify';
    }
  });

  /* ─── OTP: Confirm ──────────────────────────────────────────────────────── */
  document.addEventListener('click', async (e) => {
    if (e.target.id !== 'verifyOtpBtn') return;

    const otp      = document.getElementById('otpInput').value.trim();
    const otpMsg   = document.getElementById('otpMsg');
    const otpBtn   = document.getElementById('verifyOtpBtn');

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
      showToast('Email verified successfully! ✅', 'success');

    } catch (err) {
      console.error('Verify OTP error:', err);
      otpMsg.textContent = 'Network error. Please try again.';
      otpMsg.style.color = '#f44336';
      otpBtn.disabled = false;
      otpBtn.textContent = 'Confirm';
    }
  });

  function markEmailVerified() {
    otpVerified = true;
    otpSection.style.display = 'none';
    verifyEmailBtn.textContent = 'Verified ✅';
    verifyEmailBtn.disabled = true;
    verifyEmailBtn.style.background = '#4CAF50';
    clearFieldError('email');
  }

  /* ─── Categories ────────────────────────────────────────────────────────── */
  const defaultCategories = ['Fashion','Electronics','Beauty & Personal Care','Home & Living','Sports & Outdoors'];
  let selectedCategory    = '';

  function renderChips() {
    categoryChips.innerHTML = '';
    defaultCategories.forEach(cat => {
      const chip = document.createElement('button');
      chip.type      = 'button';
      chip.className = 'chip' + (cat === selectedCategory ? ' selected' : '');
      chip.textContent = cat;
      chip.addEventListener('click', () => {
        selectedCategory = cat;
        renderChips();
        updatePreviewCategories();
        clearFieldError('category');
      });
      categoryChips.appendChild(chip);
    });
  }
  renderChips();

  function updatePreviewCategories() {
    previewCats.innerHTML = '';
    if (selectedCategory) {
      const c = document.createElement('div');
      c.className   = 'preview-cat';
      c.textContent = selectedCategory;
      previewCats.appendChild(c);
    }
  }

  /* ─── Category modal ────────────────────────────────────────────────────── */
  openAddCategory.addEventListener('click', () => {
    categoryModal.style.display = 'flex';
    newCatInput.value = '';
    newCatInput.focus();
  });
  closeCatModal.addEventListener('click',  () => categoryModal.style.display = 'none');
  cancelCatBtn.addEventListener('click',   () => categoryModal.style.display = 'none');
  window.addEventListener('click', e => { if (e.target === categoryModal) categoryModal.style.display = 'none'; });

  saveCatBtn.addEventListener('click', () => {
    const v = newCatInput.value.trim();
    if (!v) return alert('Please enter a category name.');
    defaultCategories.push(v);
    selectedCategory = v;
    renderChips();
    updatePreviewCategories();
    categoryModal.style.display = 'none';
    clearFieldError('category');
  });

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
      logoPreview.src          = ev.target.result;
      logoPreview.style.display = 'block';
      previewLogo.src           = ev.target.result;
      previewLogo.style.display = 'block';
      previewNoImg.style.display = 'none';
      removeLogoBtn.style.display = 'inline-block';
      errorLogo.textContent = '';
    };
    reader.readAsDataURL(file);
  }

  removeLogoBtn.addEventListener('click', () => {
    logoInput.value            = '';
    logoPreview.src            = '';
    logoPreview.style.display  = 'none';
    removeLogoBtn.style.display = 'none';
    previewLogo.src            = '';
    previewLogo.style.display  = 'none';
    previewNoImg.style.display = 'block';
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
      item.innerHTML = `<img src="${src}" alt="showcase ${idx+1}"><button type="button" class="remove-gallery" data-i="${idx}">✕</button>`;
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

    // Clear all errors
    ['logo','storeName','email','phone','address','category'].forEach(clearFieldError);

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
    if (!selectedCategory)          { showFieldError('category', 'Please select a category.');   valid = false; }

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
          category:         selectedCategory,
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
        saveBtn.textContent = 'Save & Continue to Dashboard';
        return;
      }

      showToast('Store setup completed! 🎉', 'success');
      setTimeout(() => { window.location.href = 'sellers layout.html'; }, 2000);

    } catch (err) {
      console.error('Save store error:', err);
      showToast('Network error. Please check your connection.', 'error');
      saveBtn.disabled    = false;
      saveBtn.textContent = 'Save & Continue to Dashboard';
    }
  });

  /* ─── Init ──────────────────────────────────────────────────────────────── */
  previewNoImg.style.display = 'block';
  previewLogo.style.display  = 'none';
  updatePreviewCategories();
  loadProfile();

  // Auto year in footer
  const footerCopy = document.querySelector('.footer-copy');
  if (footerCopy) {
    footerCopy.innerHTML = `&copy; ${new Date().getFullYear()} MarketMix. All rights reserved.`;
  }

});