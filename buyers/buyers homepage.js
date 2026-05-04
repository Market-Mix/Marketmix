// buyers homepage.js — optimised: 1 category fetch, dropdown filters

window.addEventListener('DOMContentLoaded', () => {

  // ─── SHARED CATEGORY CACHE (fetched once, reused everywhere) ───────────────
  let cachedCategories = null;
  async function getCategories() {
    if (cachedCategories) return cachedCategories;
    try {
      const res = await fetch('https://marketmix-backend.onrender.com/api/categories');
      const json = await res.json();
      cachedCategories = json.data || [];
    } catch (e) {
      console.error('Failed to load categories', e);
      cachedCategories = [];
    }
    return cachedCategories;
  }

  // ─── COUNTDOWN / FLASH REFRESH HANDLES ─────────────────────────────────────
  let flashCountdownInterval = null;
  let demoCountdownInterval  = null;
  let flashRefreshInterval   = null;
  const FLASH_REFRESH_MINUTES = 1;

  function formatMsAsCountdown(ms) {
    if (ms <= 0) return '00:00:00';
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sc = s % 60;
    const p = n => String(n).padStart(2, '0');
    return d > 0 ? `${d}d ${p(h)}:${p(m)}:${p(sc)}` : `${p(h)}:${p(m)}:${p(sc)}`;
  }

  function escapeHtml(t) {
    if (!t) return '';
    return String(t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
  }

  function normalizeCat(v) {
    return String(v || '').toLowerCase().replace(/&nbsp;/g,' ').replace(/\s*&\s*/g,' & ').replace(/\s+/g,' ').trim();
  }

  // ─── 1. POPULAR CATEGORIES ──────────────────────────────────────────────────
  (async () => {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;
    const icons = {
      Electronics:'📱', Fashion:'👕', 'Home & Garden':'🏠',
      'Sports & Outdoors':'⚽', 'Books & Media':'📚', 'Toys & Games':'🎮',
      'Health & Beauty':'💄', Automotive:'🚗', Jewelry:'💍', 'Pet Supplies':'🐾'
    };
    const cats = await getCategories();
    if (!cats.length) { container.innerHTML = '<div class="category-skeleton">No categories</div>'; return; }
    container.innerHTML = cats.map(c => `
      <a href="buyers-category.html?id=${c.id}" class="category-card">
        <div class="category-icon">${icons[c.name] || '📦'}</div>
        <div class="category-name">${escapeHtml(c.name)}</div>
      </a>`).join('');
  })();

  // ─── 2. QUICK LINKS ─────────────────────────────────────────────────────────
  (async () => {
    const container = document.getElementById('quickLinksContainer');
    if (!container) return;
    const cats = await getCategories();
    if (!cats.length) { container.innerHTML = '<div class="category-skeleton">No categories</div>'; return; }
    container.innerHTML = cats.map(c => `
      <a href="buyers-category.html?id=${c.id}" class="link-card">
        <img src="marketplace.png" alt="${escapeHtml(c.name)}">
        <p>${escapeHtml(c.name)}</p>
      </a>`).join('');
  })();

  // ─── 3. CATEGORY DROPDOWNS FOR BEST-SELLING + NEW ARRIVALS ─────────────────
  (async () => {
    const cats = await getCategories();
    const items = [{ id: 'all', name: 'All' }, ...cats];

    const configs = [
      { btnId: 'bsFilterBtn', ddId: 'bsFilterDropdown', section: 'best-selling', loadFn: () => loadBestSellingProducts() },
      { btnId: 'naFilterBtn', ddId: 'naFilterDropdown', section: 'new-arrivals',  loadFn: () => loadNewArrivalsProducts() }
    ];

    configs.forEach(({ btnId, ddId, section, loadFn }) => {
      const btn      = document.getElementById(btnId);
      const dropdown = document.getElementById(ddId);
      if (!btn || !dropdown) return;

      dropdown.innerHTML = items.map(c => `
        <div class="filter-dd-item" data-category="${normalizeCat(c.name)}" data-section="${section}">
          ${escapeHtml(c.name)}
        </div>`).join('');

      btn.addEventListener('click', e => {
        e.stopPropagation();
        const open = dropdown.classList.toggle('dd-open');
        // close the other dropdown
        configs.forEach(other => {
          if (other.ddId !== ddId) {
            const otherDd = document.getElementById(other.ddId);
            if (otherDd) otherDd.classList.remove('dd-open');
          }
        });
      });

      document.addEventListener('click', () => dropdown.classList.remove('dd-open'));

      dropdown.addEventListener('click', e => {
        const item = e.target.closest('.filter-dd-item');
        if (!item) return;
        dropdown.classList.remove('dd-open');
        const label = item.textContent.trim();
        btn.innerHTML = `${label === 'All' ? '⊞' : '▾'} <span>${escapeHtml(label)}</span>`;
        const cat = item.dataset.category;
        if (cat === 'all') { loadFn(); return; }
        const grid = document.querySelector(`.${section}-grid`);
        if (!grid) return;
        const cards = grid.querySelectorAll('.product-card');
        const matched = [...cards].filter(c => normalizeCat(c.dataset.category) === cat);
        if (matched.length) {
          cards.forEach(c => { c.style.display = normalizeCat(c.dataset.category) === cat ? '' : 'none'; });
        } else {
          // fetch from API if no matching cards in DOM
          fetchProductsByCategory(cat, grid);
        }
      });
    });
  })();

  async function fetchProductsByCategory(cat, grid) {
    try {
      const res  = await fetch('https://marketmix-backend.onrender.com/api/products?limit=200');
      const json = await res.json();
      const filtered = (json.data || []).filter(p => normalizeCat(p.category || p.category_name) === cat);
      grid.innerHTML = filtered.length
        ? filtered.map(renderProductCard).join('')
        : '<div class="no-results" style="grid-column:1/-1;padding:20px;color:#334155;">No products in this category</div>';
      attachProductCardListeners(grid);
      attachCartListeners();
    } catch (err) { console.error('fetchProductsByCategory', err); }
  }

  // ─── PRODUCT CARD RENDERER ──────────────────────────────────────────────────
  function renderProductCard(p) {
    const img   = p.main_image_url || p.image || 'marketplace.png';
    const price = typeof p.price === 'number' ? p.price.toFixed(2) : p.price;
    const cat   = normalizeCat(p.category || p.category_name || '');
    return `
      <div class="product-card" data-product-id="${p.id}" data-name="${escapeHtml(p.name)}" data-price="${price}" data-category="${cat}">
        <img src="${img}" alt="${escapeHtml(p.name)}" loading="lazy">
        <div class="product-info">
          <div class="product-name">${escapeHtml(p.name)}</div>
          <div class="meta"><div class="price">$${price}</div></div>
        </div>
        <button class="add-to-cart">Add to Cart</button>
      </div>`;
  }

  function attachProductCardListeners(container) {
    if (!container) return;
    container.querySelectorAll('.product-card, .flash-card, .recommended-item').forEach(card => {
      const id = card.getAttribute('data-product-id');
      card.style.cursor = 'pointer';
      card.addEventListener('click', e => {
        if (e.target.closest('.add-to-cart')) return;
        if (id) window.location.href = `product.html?id=${id}`;
      });
    });
  }

  // ─── SEARCH AUTOCOMPLETE ─────────────────────────────────────────────────────
  const searchInput = document.getElementById('searchInput');
  const searchAC    = document.getElementById('searchAutocomplete');
  if (searchInput && searchAC) setupAutocomplete(searchInput, searchAC, s => {
    window.location.href = s.type === 'product' ? `product.html?id=${s.id}` : `buyers-category.html?id=${s.id}`;
  });
  const searchInputM = document.getElementById('searchInputMobile');
  const searchACM    = document.getElementById('searchAutocompleteMobile');
  if (searchInputM && searchACM) setupAutocomplete(searchInputM, searchACM, s => {
    window.location.href = s.type === 'product' ? `product.html?id=${s.id}` : `buyers-category.html?id=${s.id}`;
  });

  // ─── FLASH PRODUCTS ─────────────────────────────────────────────────────────
  async function loadFlashProducts() {
    const container = document.getElementById('flashProducts');
    if (!container) return;
    try {
      const res  = await fetch('https://marketmix-backend.onrender.com/api/products?limit=200');
      const data = await res.json();
      if (!res.ok || !data.data) { container.innerHTML = '<p style="text-align:center;padding:20px;color:#666;">No flash products</p>'; return; }

      const now   = Date.now();
      const flash = (data.data).filter(p => {
        if (!p.flash_start || !p.flash_end) return false;
        const s = Date.parse(p.flash_start), e = Date.parse(p.flash_end);
        return !isNaN(s) && !isNaN(e) && now >= s && now <= e;
      }).sort((a, b) => Date.parse(a.flash_start) - Date.parse(b.flash_start));

      // Countdown timer
      const countdownEl = document.getElementById('countdown');
      if (flashCountdownInterval) { clearInterval(flashCountdownInterval); flashCountdownInterval = null; }
      if (countdownEl) {
        if (demoCountdownInterval) { clearInterval(demoCountdownInterval); demoCountdownInterval = null; }
        let remaining = flash.reduce((s, p) => s + Math.max(0, Date.parse(p.flash_end) - Date.now()), 0);
        if (remaining <= 0) { countdownEl.textContent = ''; }
        else {
          countdownEl.textContent = formatMsAsCountdown(remaining);
          flashCountdownInterval = setInterval(() => {
            remaining -= 1000;
            if (remaining <= 0) { clearInterval(flashCountdownInterval); flashCountdownInterval = null; countdownEl.textContent = ''; loadFlashProducts(); return; }
            countdownEl.textContent = formatMsAsCountdown(remaining);
          }, 1000);
        }
      }

      if (!flash.length) { container.innerHTML = '<p style="text-align:center;padding:20px;color:#666;">No flash sales running</p>'; return; }

      container.innerHTML = flash.map(p => `
        <div class="flash-card" data-product-id="${p.id}">
          <img src="${p.main_image_url || p.image || 'marketplace.png'}" alt="${escapeHtml(p.name)}" loading="lazy">
          <h4>${escapeHtml(p.name)}</h4>
          <p class="price">$${typeof p.price === 'number' ? p.price.toFixed(2) : p.price}</p>
          <button class="add-to-cart">Add to Cart</button>
        </div>`).join('');

      attachCartListeners();
      attachProductCardListeners(container);
    } catch (err) {
      console.error('loadFlashProducts', err);
      const c = document.getElementById('flashProducts');
      if (c) c.innerHTML = '<p style="text-align:center;padding:20px;color:#666;">Error loading flash products</p>';
    }
  }

  // ─── BEST SELLING ────────────────────────────────────────────────────────────
  async function loadBestSellingProducts() {
    const container = document.querySelector('.best-selling-grid');
    if (!container) return;
    try {
      const res  = await fetch('https://marketmix-backend.onrender.com/api/products?limit=8');
      const data = await res.json();
      if (!res.ok || !data.data?.length) { container.innerHTML = '<p style="text-align:center;padding:20px;color:#666;">No products</p>'; return; }
      container.innerHTML = data.data.map(renderProductCard).join('');
      attachProductCardListeners(container);
      attachCartListeners();
    } catch (err) { console.error('loadBestSellingProducts', err); }
  }

  // ─── NEW ARRIVALS ────────────────────────────────────────────────────────────
  async function loadNewArrivalsProducts() {
    const container = document.querySelector('.new-arrivals-grid');
    if (!container) return;
    try {
      const res  = await fetch('https://marketmix-backend.onrender.com/api/products?limit=8');
      const data = await res.json();
      if (!res.ok || !data.data?.length) { container.innerHTML = '<p style="text-align:center;padding:20px;color:#666;">No products</p>'; return; }
      container.innerHTML = data.data.map(renderProductCard).join('');
      attachProductCardListeners(container);
      attachCartListeners();
    } catch (err) { console.error('loadNewArrivalsProducts', err); }
  }

  // ─── RECOMMENDED ─────────────────────────────────────────────────────────────
  async function loadRecommendedProducts() {
    const container = document.querySelector('.recommended-grid');
    if (!container) return;
    try {
      const res  = await fetch('https://marketmix-backend.onrender.com/api/products?limit=6');
      const data = await res.json();
      if (!res.ok || !data.data?.length) { container.innerHTML = '<p style="padding:20px;color:#666;">No products</p>'; return; }
      container.innerHTML = data.data.map(p => `
        <div class="recommended-item" data-product-id="${p.id}">
          <img src="${p.main_image_url||p.image||'marketplace.png'}" alt="${escapeHtml(p.name)}" loading="lazy">
          <h4>${escapeHtml(p.name)}</h4>
          <p class="price">$${p.price}</p>
          <button class="add-to-cart">Add to Cart</button>
        </div>`).join('');
      attachCartListeners();
      attachProductCardListeners(container);
    } catch (err) { console.error('loadRecommendedProducts', err); }
  }

  // ─── FEATURED BRANDS ─────────────────────────────────────────────────────────
  async function loadFeaturedBrands() {
    const container = document.getElementById('brandCarousel');
    if (!container) return;
    try {
      const res  = await fetch('https://marketmix-backend.onrender.com/api/seller/public?limit=8');
      const data = await res.json();
      if (!res.ok || !data.data?.sellers?.length) return;
      container.innerHTML = data.data.sellers.map(s => {
        const logo = s.storeLogo || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.businessName)}&background=F97316&color=fff&size=100`;
        const img  = s.featuredProductImage || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300';
        return `
          <a href="store-id.html?seller=${s.sellerId}" class="brand-card">
            <img src="${logo}" alt="${escapeHtml(s.businessName)}" class="brand-logo"
                 onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(s.businessName)}&background=F97316&color=fff&size=100'">
            <h3>${escapeHtml(s.businessName)}${s.isVerified ? ' <span class="brand-verified">✓</span>':''}</h3>
            <p class="muted">${escapeHtml(s.category||'Marketplace')}</p>
            ${s.rating > 0 ? `<span class="brand-rating">⭐ ${s.rating.toFixed(1)}</span>` : ''}
            <img src="${img}" alt="Featured product" class="featured-product" onerror="this.src='marketplace.png'">
          </a>`;
      }).join('');
    } catch (err) { console.error('loadFeaturedBrands', err); }
  }

  // ─── POPULAR SHOPS ───────────────────────────────────────────────────────────
  async function loadPopularShops() {
    const container = document.getElementById('shopStrip');
    if (!container) return;
    try {
      const res  = await fetch('https://marketmix-backend.onrender.com/api/seller/public?limit=12');
      const data = await res.json();
      if (!res.ok || !data.data?.sellers?.length) return;
      container.innerHTML = data.data.sellers.map(s => {
        const logo = s.storeLogo || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.businessName)}&background=F97316&color=fff&size=150`;
        return `<a href="store-id.html?seller=${s.sellerId}" title="${escapeHtml(s.businessName)}">
          <img src="${logo}" alt="${escapeHtml(s.businessName)}"
               onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(s.businessName)}&background=F97316&color=fff&size=150'">
        </a>`;
      }).join('');
    } catch (err) { console.error('loadPopularShops', err); }
  }

  // ─── WISHLIST SYNC ───────────────────────────────────────────────────────────
  (async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res  = await fetch('https://marketmix-backend.onrender.com/api/wishlist', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const payload = await res.json().catch(() => ({}));
      const items   = payload?.data?.items || [];
      if (!items.length) return;
      localStorage.setItem('wishlist', JSON.stringify(items.map(i => ({
        id: i.product_id || i.id, name: i.name || '', price: i.price || 0, image: i.main_image_url || ''
      }))));
    } catch (e) { console.error('syncWishlistFromServer', e); }
  })();

  // ─── KICK OFF ALL LOADS ──────────────────────────────────────────────────────
  loadFlashProducts();
  if (flashRefreshInterval) clearInterval(flashRefreshInterval);
  flashRefreshInterval = setInterval(loadFlashProducts, FLASH_REFRESH_MINUTES * 60 * 1000);

  loadBestSellingProducts();
  loadNewArrivalsProducts();
  loadRecommendedProducts();
  loadFeaturedBrands();
  loadPopularShops();

  // ─── DEMO COUNTDOWN FALLBACK ─────────────────────────────────────────────────
  const countdownDisplay = document.querySelector('#countdown');
  if (countdownDisplay && !flashCountdownInterval) {
    let timer = 24 * 3600;
    demoCountdownInterval = setInterval(() => {
      const h = Math.floor(timer / 3600), m = Math.floor((timer % 3600) / 60), s = timer % 60;
      countdownDisplay.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      if (--timer < 0) timer = 24 * 3600;
    }, 1000);
  }

  // ─── HERO SLIDER ─────────────────────────────────────────────────────────────
  let slideIndex = 0;
  function showSlides() {
    const slides = document.querySelectorAll('.hero-slider .slide');
    if (!slides.length) return;
    slides.forEach(s => s.classList.remove('active'));
    slideIndex = (slideIndex % slides.length);
    slides[slideIndex].classList.add('active');
    slideIndex++;
    setTimeout(showSlides, 3000);
  }
  showSlides();

  // ─── SCROLL BUTTONS ──────────────────────────────────────────────────────────
  const wrapper = document.querySelector('.links-wrapper');
  document.querySelector('.left-btn')?.addEventListener('click', () => wrapper?.scrollBy({ left: -200, behavior: 'smooth' }));
  document.querySelector('.right-btn')?.addEventListener('click', () => wrapper?.scrollBy({ left:  200, behavior: 'smooth' }));

  const flashCont = document.querySelector('.flash-container');
  document.querySelector('.flash-btn.prev')?.addEventListener('click', () => flashCont?.scrollBy({ left: -200, behavior: 'smooth' }));
  document.querySelector('.flash-btn.next')?.addEventListener('click', () => flashCont?.scrollBy({ left:  200, behavior: 'smooth' }));

  // ─── BLOG SLIDER ─────────────────────────────────────────────────────────────
  (function initBlogSlider() {
    const blogSlider = document.querySelector('.blog-cards');
    const blogCards  = [...document.querySelectorAll('.blog-card')];
    if (!blogSlider || !blogCards.length) return;
    const gap = 20;
    blogCards.forEach(c => blogSlider.appendChild(c.cloneNode(true)));
    const cardW = blogCards[0].offsetWidth + gap;
    let idx = 0, transitioning = false;
    let autoId = setInterval(next, 4000);

    function next() {
      if (transitioning) return;
      transitioning = true;
      idx++;
      blogSlider.style.transition = 'transform 0.5s ease-in-out';
      blogSlider.style.transform  = `translateX(-${idx * cardW}px)`;
      if (idx >= blogCards.length) {
        setTimeout(() => { blogSlider.style.transition = 'none'; blogSlider.style.transform = 'translateX(0)'; idx = 0; transitioning = false; }, 200);
      } else { setTimeout(() => transitioning = false, 200); }
    }

    let startX = 0, dragging = false, prevT = 0;
    const getX = e => e.type.includes('mouse') ? e.pageX : e.touches?.[0]?.clientX || 0;

    blogSlider.addEventListener('mousedown',  e => { clearInterval(autoId); startX = getX(e); dragging = true; blogSlider.style.transition = 'none'; });
    blogSlider.addEventListener('touchstart', e => { clearInterval(autoId); startX = getX(e); dragging = true; blogSlider.style.transition = 'none'; }, { passive: true });
    blogSlider.addEventListener('mousemove',  e => { if (!dragging) return; blogSlider.style.transform = `translateX(${prevT + getX(e) - startX}px)`; });
    blogSlider.addEventListener('touchmove',  e => { if (!dragging) return; blogSlider.style.transform = `translateX(${prevT + getX(e) - startX}px)`; }, { passive: true });
    const endDrag = () => {
      if (!dragging) return; dragging = false;
      const cur = parseInt((blogSlider.style.transform||'').match(/-?\d+/)?.[0] || prevT);
      const moved = cur - prevT;
      if (moved < -50 && idx < blogCards.length) idx++;
      else if (moved > 50 && idx > 0) idx--;
      blogSlider.style.transition = 'transform 0.5s ease-in-out';
      blogSlider.style.transform  = `translateX(-${idx * cardW}px)`;
      prevT = -idx * cardW;
      setTimeout(() => { if (idx >= blogCards.length) { blogSlider.style.transition = 'none'; blogSlider.style.transform = 'translateX(0)'; idx = 0; prevT = 0; } }, 200);
      autoId = setInterval(next, 4000);
    };
    blogSlider.addEventListener('mouseup',    endDrag);
    blogSlider.addEventListener('mouseleave', () => dragging && endDrag());
    blogSlider.addEventListener('touchend',   endDrag);
  })();

  // ─── CART SYSTEM ─────────────────────────────────────────────────────────────
  let cart = JSON.parse(localStorage.getItem('cart')) || [];

  function updateCartCount() {
    const count = cart.reduce((s, i) => s + (i.quantity || 1), 0);
    const el    = document.querySelector('.cart-count');
    if (el) { el.textContent = count; el.style.display = count > 0 ? 'inline-block' : 'none'; }
  }

  function saveCart() { localStorage.setItem('cart', JSON.stringify(cart)); updateCartCount(); }

  function syncCartFromStorage() {
    try {
      const stored = JSON.parse(localStorage.getItem('cart')) || [];
      if (JSON.stringify(stored) !== JSON.stringify(cart)) { cart = stored; updateCartCount(); }
    } catch { cart = []; updateCartCount(); }
  }

  async function addToBackendCart(product) {
    const token = localStorage.getItem('token');
    if (!token) { showToast('Please login to add items to cart'); setTimeout(() => window.location.href = 'login for buyers.html', 1500); return false; }
    try {
      const res = await fetch('https://marketmix-backend.onrender.com/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ product_id: product.productId || btoa(product.name).substring(0, 36), quantity: 1 })
      });
      const data = await res.json();
      if (!res.ok) { showToast(`Error: ${data.message}`); return false; }
      return true;
    } catch { showToast('Error adding to cart'); return false; }
  }

  async function addToCart(product) {
    if (!product?.name) return;
    const token = localStorage.getItem('token');
    if (token) {
      const ok = await addToBackendCart(product);
      if (!ok) showToast('Saved locally (backend sync failed)');
    }
    const existing = cart.find(i => i.name === product.name);
    if (existing) existing.quantity = (existing.quantity || 1) + 1;
    else { product.quantity = 1; cart.push(product); }
    saveCart();
    showToast(token ? `${product.name} added to cart` : `${product.name} added (login to save)`);
    return new Promise(r => setTimeout(r, 100));
  }

  function attachCartListeners() {
    document.querySelectorAll('.add-to-cart, .flash-card button, .recommended-section button').forEach(btn => {
      if (btn.dataset.listenerAttached === 'true') return;
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        if (btn.disabled) return;
        btn.disabled = true;
        const card = btn.closest('.product-card, .flash-card, .recommended-item');
        if (!card) { btn.disabled = false; return; }
        const name  = card.querySelector('h3, h4')?.textContent.trim() || 'Product';
        const price = parseFloat((card.querySelector('.price')?.textContent || '0').replace(/[^0-9.]/g, '')) || 0;
        const image = card.querySelector('img')?.src || '';
        const productId = card.dataset.productId || null;
        const orig = btn.textContent;
        await addToCart({ name, price, image, quantity: 1, productId });
        btn.textContent = 'Added ✓';
        btn.classList.add('added');
        setTimeout(() => { btn.textContent = orig; btn.classList.remove('added'); btn.disabled = false; }, 2000);
      });
      btn.dataset.listenerAttached = 'true';
    });
  }

  attachCartListeners();
  updateCartCount();

  // Sync cart on tab focus / visibility
  window.addEventListener('pageshow', syncCartFromStorage);
  window.addEventListener('focus',    syncCartFromStorage);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) syncCartFromStorage(); });
  window.addEventListener('storage',  e => { if (e.key === 'cart') syncCartFromStorage(); });

  // Clean up intervals when leaving page
  window.addEventListener('beforeunload', () => {
    [flashCountdownInterval, demoCountdownInterval, flashRefreshInterval].forEach(id => id && clearInterval(id));
  });

  // ─── NEWSLETTER ──────────────────────────────────────────────────────────────
  document.getElementById('newsletterForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const val = document.getElementById('newsletterInput')?.value.trim();
    const msg = document.getElementById('newsletterMessage');
    if (msg) msg.textContent = val ? `Thanks for subscribing, ${val}!` : 'Please enter a valid email.';
  });

  // ─── TOAST ───────────────────────────────────────────────────────────────────
  function showToast(message) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = message;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 100);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2200);
  }

  // Mobile search bar show/hide
  const mobileBar = document.querySelector('.navbar-mobile-search');
  if (mobileBar) mobileBar.style.display = window.innerWidth <= 768 ? 'block' : 'none';
  window.addEventListener('resize', () => {
    if (mobileBar) mobileBar.style.display = window.innerWidth <= 768 ? 'block' : 'none';
  });

}); // end DOMContentLoaded