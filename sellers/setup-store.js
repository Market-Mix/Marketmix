// Wait DOM
document.addEventListener('DOMContentLoaded', () => {

  /* -------------------------
     Elements
  ------------------------- */
  const form = document.getElementById('storeSetupForm');

  // ensure we have a Supabase client instance available for any page that needs it
  // if a client already exists globally, reuse it; otherwise load the CDN and create one
  let supabaseClientInstance;
  async function getSupabaseClient() {
    if (supabaseClientInstance) return supabaseClientInstance;

    // ensure global CONFIG is available (load config.js if not yet present)
    if (typeof CONFIG === 'undefined') {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = '../config.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      }).catch(err => {
        console.warn('Failed loading config.js', err);
      });
    }

    // helper to read config from various places
    function retrieveConfig() {
      if (typeof CONFIG !== 'undefined' && CONFIG && CONFIG.SUPABASE && CONFIG.SUPABASE.URL && CONFIG.SUPABASE.KEY) {
        return { url: CONFIG.SUPABASE.URL, key: CONFIG.SUPABASE.KEY };
      }
      if (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.SUPABASE && window.CONFIG.SUPABASE.URL && window.CONFIG.SUPABASE.KEY) {
        return { url: window.CONFIG.SUPABASE.URL, key: window.CONFIG.SUPABASE.KEY };
      }
      // allow overrides via localStorage for quick testing
      const urlLS = localStorage.getItem('SUPABASE_URL');
      const keyLS = localStorage.getItem('SUPABASE_KEY');
      if (urlLS && keyLS) return { url: urlLS, key: keyLS };
      return null;
    }

    const cfg = retrieveConfig();
    if (!cfg) {
      throw new Error('Supabase configuration not found');
    }

    // if a namespace is already present with createClient, use it
    if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
      supabaseClientInstance = window.supabase.createClient(cfg.url, cfg.key);
      // attach a single auth state listener so we can react when a session becomes active
      // (e.g. after redirect from email confirmation).  Note: listener added only once
      // because we only execute this branch when we first create the client.
      supabaseClientInstance.auth.onAuthStateChange((event, session) => {
        console.log('supabase auth state change', event, session);
        // re-run profile initialization when a new session is established
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          initializeSellerProfile().catch(e => console.warn('auth state init failed', e));
        }
      });
      return supabaseClientInstance;
    }

    // otherwise dynamically load the CDN build of supabase-js
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/dist/umd/supabase.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });

    if (!(window.supabase && typeof window.supabase.createClient === 'function')) {
      throw new Error('Failed to load Supabase client library');
    }
    supabaseClientInstance = window.supabase.createClient(cfg.url, cfg.key);
    // also attach the same listener in the code path where we dynamically loaded the
    // library and created the client for the first time.
    supabaseClientInstance.auth.onAuthStateChange((event, session) => {
      console.log('supabase auth state change', event, session);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        initializeSellerProfile().catch(e => console.warn('auth state init failed', e));
      }
    });
    return supabaseClientInstance;
  }

  // seller profile initialization logic will run on load to sync with Supabase
  async function initializeSellerProfile() {
    try {
      const supabase = await getSupabaseClient();
      let user = null;

      // first try to obtain an active session (this is the most reliable way
      // to know whether the user is signed in)
      try {
        const { data: { session }, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) throw sessErr;
        if (session && session.user) {
          user = session.user;
        }
      } catch (sessErr) {
        console.warn('initializeSellerProfile: supabase.auth.getSession failed', sessErr);
      }

      // if we still don't have a user, fall back to getUser (which may throw
      // AuthSessionMissingError) or to whatever may be stored in localStorage.
      if (!user) {
        try {
          const {
            data: { user: u },
            error: userErr
          } = await supabase.auth.getUser();
          if (userErr) throw userErr;
          user = u;
        } catch (authErr) {
          console.warn('initializeSellerProfile: supabase.auth.getUser failed', authErr);
          // try recovering from localStorage
          const userKey = (typeof CONFIG !== 'undefined' && CONFIG && CONFIG.STORAGE_KEYS && CONFIG.STORAGE_KEYS.USER) ? CONFIG.STORAGE_KEYS.USER : 'user';
          try {
            const raw = localStorage.getItem(userKey);
            if (raw) {
              user = JSON.parse(raw);
              console.log('initializeSellerProfile: recovered user from localStorage key', userKey, user);
            }
          } catch (lsErr) {
            console.warn('initializeSellerProfile: failed to parse user from localStorage', lsErr);
          }

          if (!user) {
            console.log('initializeSellerProfile: no authenticated user available; aborting initialization');
            return;
          }
        }
      }

      console.log('initializeSellerProfile: supabase user object', user);
      // NOTE: do *not* update backend here yet; wait until we have the seller
      // profile so we can inspect its current verification state.

      // decide whether we had an active Supabase session
      let hadActiveSession = false;

      // Try to detect an active session
      try {
        const sessionRes = await supabase.auth.getSession();
        if (sessionRes && sessionRes.data && sessionRes.data.session) hadActiveSession = true;
      } catch (e) {
        // no active session
      }

      // Try backend fallback first if no active Supabase session
      let profile = null;
      if (!hadActiveSession) {
        const tokenKey = (typeof CONFIG !== 'undefined' && CONFIG && CONFIG.STORAGE_KEYS && CONFIG.STORAGE_KEYS.TOKEN) ? CONFIG.STORAGE_KEYS.TOKEN : 'token';
        const token = sessionStorage.getItem(tokenKey) || localStorage.getItem(tokenKey);
        const overrideUrl = localStorage.getItem('API_BASE_URL');
        const apiBase = overrideUrl || ((typeof CONFIG !== 'undefined' && CONFIG && CONFIG.API_BASE_URL) ? CONFIG.API_BASE_URL : (window.location.origin + '/api'));
        const url = `${apiBase.replace(/\/+$/, '')}/seller/profile`;

        if (token) {
          try {
            const res = await fetch(url, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            if (res.ok) {
              const json = await res.json();
              profile = json?.data?.seller?.profile || null;
              console.log('initializeSellerProfile: recovered profile from backend', profile);
            } else {
              console.warn('initializeSellerProfile: backend profile fetch failed', res.status, await res.text());
            }
          } catch (e) {
            console.warn('initializeSellerProfile: backend fetch error', e);
          }
        } else {
          console.log('initializeSellerProfile: no token found for backend fetch');
        }
      }

      // If we still don't have a profile and we do have an active session, query Supabase directly
      if (!profile && hadActiveSession) {
        let { data: fetched, error: selErr } = await supabase
          .from('seller_profiles')
          .select('id,user_id,business_email,business_phone,business_name,business_address')
          .eq('user_id', user.id)
          .single();

        if (selErr && selErr.code !== 'PGRST116') {
          throw selErr;
        }
        profile = fetched;
        console.log('initializeSellerProfile: fetched profile via supabase', profile);

        if (!profile) {
          // create only when session active
          const insertObj = {
            user_id: user.id,
            business_email: user.email
          };
          if (user.phone) insertObj.business_phone = user.phone;
          if (user?.user_metadata?.business_name) insertObj.business_name = user.user_metadata.business_name;
          if (user?.user_metadata?.business_address) insertObj.business_address = user.user_metadata.business_address;

          const {
            data: inserted,
            error: insertErr
          } = await supabase
            .from('seller_profiles')
            .insert(insertObj)
            .select('id,user_id,business_email,business_phone,business_name,business_address')
            .single();
          if (insertErr) throw insertErr;
          profile = inserted;
          console.log('initializeSellerProfile: created new profile via supabase', profile);
        }
      }

      // helper to read either snake_case (supabase) or camelCase (backend) property
      function pick(field) {
        return profile?.[field] ?? profile?.[field.replace(/_([a-z])/g, (m,p)=>p.toUpperCase())];
      }

      console.log('initializeSellerProfile: raw profile object', JSON.stringify(profile));

      const emailVal = pick('business_email');
      const phoneVal = pick('business_phone');
      const nameVal = pick('business_name');
      const addressVal = pick('business_address');
      const websiteVal = pick('website');
      const facebookVal = pick('facebook');
      const logoUrlVal = pick('store_logo_url');

      if (emailVal) email.value = emailVal;
      if (phoneVal) phone.value = phoneVal;
      if (nameVal) {
        storeName.value = nameVal;
      } else if (user?.user_metadata?.business_name) {
        storeName.value = user.user_metadata.business_name;
      }
      if (addressVal) {
        address.value = addressVal;
      } else if (user?.user_metadata?.business_address) {
        address.value = user.user_metadata.business_address;
      }
      if (websiteVal) {
        document.getElementById('website').value = websiteVal;
      }
      if (facebookVal) {
        document.getElementById('social-facebook').value = facebookVal;
      }
      // Note: logoUrlVal is the public URL; to re-upload, user needs to select a new file
      if (logoUrlVal) {
        console.log('Store logo found in profile:', logoUrlVal);
      }

      // Manually update preview elements (setting input.value doesn't trigger 'input' event listeners)
      previewEmail.textContent = emailVal || '—';
      previewPhone.textContent = phoneVal || '—';
      previewAddress.textContent = addressVal || '—';
      previewName.textContent = (nameVal || user?.user_metadata?.business_name || 'Your Store Name');
      previewDesc.textContent = storeDesc.value.trim() || 'Store description will appear here.';

      console.log('initializeSellerProfile: after populate form', {
        email: email.value,
        phone: phone.value,
        storeName: storeName.value,
        address: address.value
      });

      // if profile already has email verified, update UI accordingly
      if (profile && profile.isVerified) {
        verifyEmailBtn.textContent = 'Verified';
        verifyEmailBtn.disabled = true;
        emailError.textContent = 'Email already verified.';
        emailError.style.color = 'green';
      }

      // **after loading backend profile, if Supabase session exists and the
      // user record shows email_confirmed_at then we should mark the profile
      // verified if it isn't already.** this covers the case where the magic
      // link was clicked before visiting the setup page.
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user && session.user.email_confirmed_at) {
          console.log('initializeSellerProfile: session user confirmed', session.user.id);
          if (!profile || !profile.isVerified) {
            // send update request to backend
            const tokenKey = (typeof CONFIG !== 'undefined' && CONFIG && CONFIG.STORAGE_KEYS && CONFIG.STORAGE_KEYS.TOKEN) ? CONFIG.STORAGE_KEYS.TOKEN : 'token';
            const token = sessionStorage.getItem(tokenKey) || localStorage.getItem(tokenKey);
            if (token) {
              const overrideUrl = localStorage.getItem('API_BASE_URL');
              const apiBase = overrideUrl || ((typeof CONFIG !== 'undefined' && CONFIG && CONFIG.API_BASE_URL) ? CONFIG.API_BASE_URL : (window.location.origin + '/api'));
              await fetch(apiBase.replace(/\/+$/, '') + '/seller/setup-profile', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  storeName: document.getElementById('storeName').value || '',
                  isVerified: true
                })
              });
            }
            // reflect immediately in UI
            verifyEmailBtn.textContent = 'Verified ✅';
            verifyEmailBtn.disabled = true;
            verifyEmailBtn.classList.add('verified');
          }
        }
      } catch (e) {
        console.error('initializeSellerProfile: error while checking session for confirmed email', e);
      }

      // preselect category: try localStorage first, then parse from businessDescription if available
      try {
        let sc = localStorage.getItem('signupCategory');
        console.log('initializeSellerProfile: signupCategory from localStorage', sc);
        
        // if not in localStorage, try to extract from businessDescription (backend format)
        if (!sc && profile?.businessDescription) {
          console.log('initializeSellerProfile: parsing businessDescription', profile.businessDescription);
          const match = profile.businessDescription.match(/Product Category:\s*([^|]+)/);
          if (match && match[1]) {
            sc = match[1].trim();
            console.log('initializeSellerProfile: extracted category from businessDescription', sc);
          }
        }
        
        if (sc) {
          console.log('initializeSellerProfile: attempting to match category', sc, 'against defaults:', defaultCategories);
          // normalize to find matching category (case-insensitive)
          const normalized = sc.toLowerCase();
          const matchedCat = defaultCategories.find(cat => cat.toLowerCase() === normalized);
          
          if (matchedCat) {
            selectedCategory = matchedCat;
            renderChips();
            updatePreviewCategories();
            console.log('initializeSellerProfile: preselected category', matchedCat);
          } else {
            console.log('initializeSellerProfile: no matching category found for', sc, '(normalized:', normalized + ')');
          }
          // clear localStorage so we don't reuse it later
          localStorage.removeItem('signupCategory');
        } else {
          console.log('initializeSellerProfile: no category found to preselect');
        }
      } catch (e) {
        console.warn('Failed to process signupCategory', e);
      }
    } catch (err) {
      console.error('initializeSellerProfile error:', err);
    }
  }

  // Logo drop & preview
  const logoInput = document.getElementById('storeLogo');
  const logoDrop = document.getElementById('logoDrop');
  const logoPreview = document.getElementById('logoPreview');
  const logoPreviewWrap = document.getElementById('logoPreviewWrap');
  const removeLogoBtn = document.getElementById('removeLogo');
  const errorLogo = document.getElementById('error-logo');

  // Fields
  const storeName = document.getElementById('storeName');
  const storeDesc = document.getElementById('storeDesc');
  const wordCount = document.getElementById('wordCount');
  const email = document.getElementById('email');
  const phone = document.getElementById('phone');
  const address = document.getElementById('address');
  const website = document.getElementById('website');

  // Category chips & modal
  const categoryChips = document.getElementById('categoryChips');
  const openAddCategory = document.getElementById('openAddCategory');
  const categoryModal = document.getElementById('categoryModal');
  const closeCategoryModal = document.getElementById('closeCategoryModal');
  const cancelCategoryBtn = document.getElementById('cancelCategoryBtn');
  const saveCategoryBtn = document.getElementById('saveCategoryBtn');
  const newCategoryInput = document.getElementById('newCategoryInput');
  const errorCategory = document.getElementById('error-category');

  // Gallery (multiple images)
  const galleryInput = document.getElementById('galleryInput');
  const galleryGrid = document.getElementById('galleryGrid');
  let galleryFiles = []; // store dataurl objects

  // Socials
  const toggleSocials = document.getElementById('toggleSocials');
  const socialsSection = document.getElementById('socialsSection');

  // Preview elements
  const previewLogo = document.getElementById('previewLogo');
  const previewNoImg = document.getElementById('previewNoImg');
  const previewName = document.getElementById('previewName');
  const previewDesc = document.getElementById('previewDesc');
  const previewAddress = document.getElementById('previewAddress');
  const previewEmail = document.getElementById('previewEmail');
  const previewPhone = document.getElementById('previewPhone');
  const previewCats = document.getElementById('previewCats');
  const previewGallery = document.getElementById('previewGallery');
  const previewSocials = document.getElementById('previewSocials');
  const mapFrame = document.getElementById('mapFrame');


  /* -------------------------
     Utilities
  ------------------------- */
  function showError(el, msg){
    if(!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    el.previousElementSibling && el.previousElementSibling.classList && el.previousElementSibling.classList.add('invalid');
  }
  function clearError(el){
    if(!el) return;
    el.textContent = '';
    el.style.display = 'none';
    el.previousElementSibling && el.previousElementSibling.classList && el.previousElementSibling.classList.remove('invalid');
  }
  function wordCountValue(text){
    if(!text) return 0;
    // count words
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  /* -------------------------
     Default categories (chips)
  ------------------------- */
  const defaultCategories = ['Fashion','Electronics','Beauty & Personal Care','Home & Living','Sports & Outdoors'];
  let selectedCategory = ''; // single selection for now

  function renderChips(){
    categoryChips.innerHTML = '';
    [...defaultCategories].forEach(cat => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.textContent = cat;
      if(cat === selectedCategory) chip.classList.add('selected');
      chip.addEventListener('click', () => {
        selectedCategory = cat;
        renderChips();
        updatePreviewCategories();
        clearError(errorCategory);
      });
      categoryChips.appendChild(chip);
    });
  }
  renderChips();

  // after rendering categories ensure seller profile exists and fields are prefilling
  initializeSellerProfile();

  /* -------------------------
     Category modal logic
  ------------------------- */
  openAddCategory.addEventListener('click', () => {
    categoryModal.style.display = 'flex';
    newCategoryInput.value = '';
    newCategoryInput.focus();
  });
  closeCategoryModal.addEventListener('click', () => categoryModal.style.display = 'none');
  cancelCategoryBtn.addEventListener('click', () => categoryModal.style.display = 'none');
  saveCategoryBtn.addEventListener('click', () => {
    const v = newCategoryInput.value.trim();
    if(!v) return alert('Please enter a category name.');
    // add to defaults and select
    defaultCategories.push(v);
    selectedCategory = v;
    renderChips();
    categoryModal.style.display = 'none';
    updatePreviewCategories();
    clearError(errorCategory);
  });
  window.addEventListener('click', (e) => {
    if(e.target === categoryModal) categoryModal.style.display = 'none';
  });

  /* -------------------------
     Logo drag & drop + preview + remove
  ------------------------- */
  logoDrop.addEventListener('dragover', (e) => { e.preventDefault(); logoDrop.classList.add('dragover'); });
  logoDrop.addEventListener('dragleave', () => logoDrop.classList.remove('dragover'));
  logoDrop.addEventListener('drop', (e) => {
    e.preventDefault();
    logoDrop.classList.remove('dragover');
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if(f) logoInputFileHandler(f);
  });

  logoInput.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if(f) logoInputFileHandler(f);
  });

  function logoInputFileHandler(file){
    if(!file.type.startsWith('image/')) return alert('Please upload an image file.');
    const reader = new FileReader();
    reader.onload = (ev) => {
      logoPreview.src = ev.target.result;
      logoPreview.style.display = 'block';
      previewLogo.src = ev.target.result;
      previewLogo.style.display = 'block';
      previewNoImg.style.display = 'none';
      removeLogoBtn.style.display = 'inline-block';
      clearError(errorLogo);
    };
    reader.readAsDataURL(file);
  }

  removeLogoBtn.addEventListener('click', () => {
    logoInput.value = '';
    logoPreview.src = '';
    logoPreview.style.display = 'none';
    removeLogoBtn.style.display = 'none';
    previewLogo.src = '';
    previewLogo.style.display = 'none';
    previewNoImg.style.display = 'block';
  });

  /* -------------------------
     Gallery multiple images (max 3)
  ------------------------- */
  galleryInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files).slice(0,3 - galleryFiles.length);
    files.forEach(file => {
      if(!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        galleryFiles.push(ev.target.result);
        renderGallery();
      };
      reader.readAsDataURL(file);
    });
    // clear file input so same file can be reselected later if removed
    galleryInput.value = '';
  });

  function renderGallery(){
    galleryGrid.innerHTML = '';
    previewGallery.innerHTML = '';
    galleryFiles.forEach((src, idx) => {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      // NOTE: Validate or sanitize user-supplied image URLs before inserting them into the DOM
      item.innerHTML = `<img src="${src}" alt="showcase ${idx+1}"><button type="button" class="remove-gallery" data-i="${idx}">✕</button>`;
      galleryGrid.appendChild(item);

      const pImg = document.createElement('img');
      pImg.src = src;
      previewGallery.appendChild(pImg);
    });

    // attach remove handlers
    galleryGrid.querySelectorAll('.remove-gallery').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.i);
        galleryFiles.splice(i,1);
        renderGallery();
      });
    });
  }

  /* -------------------------
     Socials toggling and preview
  ------------------------- */
  if(toggleSocials) {
    toggleSocials.addEventListener('click', () => {
      socialsSection.classList.toggle('active');
      toggleSocials.textContent = socialsSection.classList.contains('active') ? '− Hide Social Links' : '+ Add Social Links';
    });
  }

  // update preview socials when inputs change
  ['social-facebook','social-x','social-tiktok','social-ig','social-telegram'].forEach(id => {
    const el = document.getElementById(id);
    if(el){
      el.addEventListener('input', updatePreviewSocials);
    }
  });

  function updatePreviewSocials(){
    previewSocials.innerHTML = '';
    const map = [
      {id:'social-facebook', icon:'fab fa-facebook', label:'Facebook'},
      {id:'social-x', icon:'fab fa-x-twitter', label:'X'},
      {id:'social-tiktok', icon:'fab fa-tiktok', label:'TikTok'},
      {id:'social-ig', icon:'fab fa-instagram', label:'Instagram'},
      {id:'social-telegram', icon:'fab fa-telegram', label:'Telegram'}
    ];
    map.forEach(s => {
      const v = document.getElementById(s.id)?.value.trim();
      if(v){
        const a = document.createElement('a');
        a.href = v;
        a.target = '_blank';
        a.rel = 'noopener';
        // NOTE: Ensure s.icon and s.label originate from trusted sources or are sanitized
        a.innerHTML = `<i class="${s.icon}"></i> ${s.label}`;
        previewSocials.appendChild(a);
      }
    });
  }

  /* -------------------------
     Live validation & preview updates
  ------------------------- */

  // live preview for name & description & contact & address
  storeName.addEventListener('input', () => {
    previewName.textContent = storeName.value.trim() || 'Your Store Name';
    if(storeName.value.trim()) clearError(document.getElementById('error-storeName'));
    validateField(storeName);
  });

  storeDesc.addEventListener('input', () => {
    const wc = wordCountValue(storeDesc.value);
    wordCount.textContent = `${wc} / 250 words`;
    previewDesc.textContent = storeDesc.value.trim() || 'Store description will appear here.';
    if(wc > 250) wordCount.style.color = 'var(--danger)';
    else wordCount.style.color = '';
  });

  email.addEventListener('input', () => {
    previewEmail.textContent = email.value.trim() || '—';
    validateField(email);
  });

  phone.addEventListener('input', () => {
    previewPhone.textContent = phone.value.trim() || '—';
    validateField(phone);
  });

  address.addEventListener('input', () => {
    previewAddress.textContent = address.value.trim() || '—';
    validateField(address);
    updateMap(address.value.trim());
  });

  website.addEventListener('input', () => {
    // no validation for optional website in live mode
  });

  // generic validator for required simple fields
  function validateField(input){
    const id = input.id;
    const err = document.getElementById('error-' + id);
    if(!input.value || !input.value.trim()){
      showError(err, `${labelOf(input)} is required.`);
      input.style.borderColor = 'rgba(255,77,77,0.6)';
      return false;
    } else {
      // additional checks
      if(input.type === 'email'){
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!re.test(input.value.trim())){
          showError(err, 'Enter a valid email.');
          input.style.borderColor = 'rgba(255,77,77,0.6)';
          return false;
        }
      }
      // phone min length check (basic)
      if(input.id === 'phone' && input.value.trim().length < 6){
        showError(err, 'Enter a valid phone number.');
        input.style.borderColor = 'rgba(255,77,77,0.6)';
        return false;
      }

      input.style.borderColor = 'rgba(77,163,255,0.6)';
      clearError(err);
      return true;
    }
  }

  function labelOf(el){
    const lbl = el.closest('.form-group')?.querySelector('label')?.textContent || el.id;
    return lbl.replace('*','').trim();
  }

  /* -------------------------
     Preview categories
  ------------------------- */
  function updatePreviewCategories(){
    previewCats.innerHTML = '';
    if(selectedCategory){
      const c = document.createElement('div');
      c.className = 'preview-cat';
      c.textContent = selectedCategory;
      previewCats.appendChild(c);
      clearError(errorCategory);
    }
  }

  /* -------------------------
     Map update (frontend only)
     Uses google maps query embed - no API key required
  ------------------------- */
  function updateMap(addr){
    if(!addr){
      mapFrame.src = '';
      return;
    }
    const q = encodeURIComponent(addr);
    mapFrame.src = `https://www.google.com/maps?q=${q}&output=embed`;
  }

  /* -------------------------
     Word-limit enforcement on submit (250 words)
  ------------------------- */
  function checkDescriptionLimit(){
    const wc = wordCountValue(storeDesc.value);
    if(wc > 250){
      wordCount.style.color = 'var(--danger)';
      return false;
    }
    return true;
  }

  /* -------------------------
     Form submission validation (final)
  ------------------------- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // clear errors
    ['logo','storeName','email','phone','address','category'].forEach(id => {
      const el = document.getElementById('error-'+id);
      if(el) clearError(el);
    });

    let valid = true;

    // Logo required
    if(!logoInput.value){
      showError(errorLogo,'Store logo is required.');
      valid = false;
    }

    // name
    if(!validateField(storeName)) valid = false;

    // email
    if(!validateField(email)) valid = false;

    // phone
    if(!validateField(phone)) valid = false;

    // address
    if(!validateField(address)) valid = false;

    // category selected?
    if(!selectedCategory){
      showError(errorCategory, 'Please select or add a category.');
      valid = false;
    }

    // description limit
    if(!checkDescriptionLimit()){
      valid = false;
      alert('Description exceeds 250 words. Please shorten it.');
    }

    if(!valid){
      // scroll top of form to show errors
      form.scrollIntoView({behavior:'smooth', block:'center'});
      return;
    }

    // Save to Supabase
    try {
      const supabase = await getSupabaseClient();
      let user = null;

      // Try to get user from Supabase auth
      try {
        const { data: { user: u }, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        user = u;
      } catch (authErr) {
        console.warn('Submit: supabase.auth.getUser failed', authErr);
        // Fallback to localStorage
        const userKey = (typeof CONFIG !== 'undefined' && CONFIG && CONFIG.STORAGE_KEYS && CONFIG.STORAGE_KEYS.USER) ? CONFIG.STORAGE_KEYS.USER : 'user';
        try {
          const raw = localStorage.getItem(userKey);
          if (raw) {
            user = JSON.parse(raw);
            console.log('Submit: recovered user from localStorage', user);
          }
        } catch (lsErr) {
          console.warn('Submit: failed to parse user from localStorage', lsErr);
        }
      }

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Collect form data
      const store_name = document.getElementById('storeName').value.trim();
      const store_description = document.getElementById('storeDesc').value.trim();
      const business_email = document.getElementById('email').value.trim();
      const business_phone = document.getElementById('phone').value.trim();
      const business_address = document.getElementById('address').value.trim();
      const website = document.getElementById('website').value.trim();
      const category = selectedCategory;
      const facebook = document.getElementById('social-facebook').value.trim();
      const twitter = document.getElementById('social-x').value.trim();
      const tiktok = document.getElementById('social-tiktok').value.trim();
      const instagram = document.getElementById('social-ig').value.trim();
      const telegram = document.getElementById('social-telegram').value.trim();

      let store_logo_url = null;

      // Upload logo if present
      if (logoInput.files && logoInput.files[0]) {
        try {
          const file = logoInput.files[0];
          const filePath = `${user.id}/logo.png`;
          const { error: uploadError } = await supabase.storage
            .from('store-logos')
            .upload(filePath, file, { upsert: true });

          if (uploadError) {
            console.warn('Logo upload warning:', uploadError);
            // Log detailed info for debugging but don't break the form submission
            if (uploadError.message && uploadError.message.includes('Bucket not found')) {
              console.warn('⚠️  Store-logos bucket is not yet available. Please run setup_storage_bucket.js in the backend directory.');
            }
            // Continue without logo - other data will still be saved
            console.log('✓ Continuing with form submission without logo');
          } else {
            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('store-logos')
              .getPublicUrl(filePath);
            store_logo_url = publicUrl;
            console.log('✓ Logo uploaded successfully:', store_logo_url);
          }
        } catch (uploadErr) {
          console.warn('Logo upload error:', uploadErr);
          // Continue without logo - this is not a critical error
          console.log('✓ Continuing with form submission without logo (error caught gracefully)');
        }
      }

      // Update seller_profiles with all available fields
      const { error: updateError } = await supabase
        .from('seller_profiles')
        .update({
          store_description,
          business_email,
          business_phone,
          business_address,
          website,
          category,
          facebook,
          twitter,
          tiktok,
          instagram,
          telegram,
          store_logo_url,
          updated_at: new Date()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Supabase update error details:', updateError);
        throw updateError;
      }

      console.log('Store setup saved successfully');
    } catch (error) {
      console.error('Error saving store setup:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      });
      showNotification('Failed to save store setup. Please try again.', 'error');
      return;
    }

    // All good: show success notifications and redirect
    showNotification('Store setup completed successfully! 🎉', 'success');
    
    setTimeout(() => {
      showNotification('Redirecting to sellers dashboard...', 'success');
    }, 1500);

    setTimeout(() => {
      window.location.href = 'sellers layout.html';
    }, 3000);
  });

  /* -------------------------
     Utility: live validation on blur and input
  ------------------------- */
  [storeName, email, phone, address].forEach(el => {
    el.addEventListener('blur', () => validateField(el));
    el.addEventListener('input', () => {
      if(el.value.trim()) validateField(el);
    });
  });

  /* -------------------------
     Update preview categories once
  ------------------------- */
  updatePreviewCategories();

  /* -------------------------
     Update preview on startup
  ------------------------- */
  previewNoImg.style.display = 'block';
  previewLogo.style.display = 'none';

  // helper for preview name & contact
  previewName.textContent = storeName.value.trim() || 'Your Store Name';
  previewDesc.textContent = storeDesc.value.trim() || 'Store description will appear here.';

  // CSS spinner keyframes reinforcement
  const styleTag = document.createElement('style');
  styleTag.innerHTML = '@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }';
  document.head.appendChild(styleTag);

  // ✅ Email Verify Flow - SUPABASE
  const verifyEmailBtn = document.getElementById("verifyEmail");
  const emailError = document.getElementById("error-email");

  console.log('✅ Email verify elements loaded (supabase mode)', { verifyEmailBtn, emailError });

  verifyEmailBtn.addEventListener("click", async () => {
    const emailInput = document.getElementById("email").value.trim();
    console.log('verifyEmailBtn clicked, email=', emailInput);
    if (!emailInput) {
      emailError.textContent = "Please enter your email before verifying.";
      emailError.style.color = 'red';
      return;
    }

    try {
      const supabase = await getSupabaseClient();
      const result = await supabase.auth.signInWithOtp({ email: emailInput });
      console.log('signInWithOtp result', result);
      const { data, error } = result;
      if (error) {
        // Supabase may return a descriptive message such as "SMTP settings not configured"
        console.error('OTP send error from supabase', error);
        emailError.textContent = `Error sending verification: ${error.message || error}`;
        emailError.style.color = 'red';
        return;
      }
      emailError.textContent = 'Verification email sent. Please check your inbox.';
      emailError.style.color = 'green';
    } catch (err) {
      console.error('supabase signInWithOtp exception', err);
      emailError.textContent = 'Unable to send verification email. Please try again.';
      emailError.style.color = 'red';
    }
  });

  // no OTP submission listener anymore


  // Auto year in footer
  document.querySelector(".footer-copy").innerHTML =
    "&copy; " + new Date().getFullYear() + " MarketMix. All rights reserved.";

});
