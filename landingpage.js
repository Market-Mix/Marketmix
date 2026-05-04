// ===== CONFIG =====
const API = 'https://marketmix-backend.onrender.com/api';

// ===== HELPERS =====
function esc(t) {
  if (!t) return '';
  return String(t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function normCat(s) {
  return (s||'').toLowerCase().replace(/\s*&\s*/g,' & ').replace(/\s+/g,' ').trim();
}
function fmtPrice(p) { return '₦' + Number(p).toLocaleString('en-NG', {minimumFractionDigits:2, maximumFractionDigits:2}); }

// ===== TOAST =====
function showToast(msg, type='success') {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:80px;right:20px;background:${type==='success'?'#10b981':'#ef4444'};color:#fff;padding:12px 16px;border-radius:8px;box-shadow:0 8px 20px rgba(0,0,0,.2);z-index:10000;font-weight:600;font-size:14px;animation:slideIn .3s ease`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.animation = 'slideOut .3s ease'; setTimeout(() => t.remove(), 300); }, 2200);
}

// ===== CART =====
let cart = [];
try { cart = JSON.parse(localStorage.getItem('cart')) || []; } catch(e) { cart = []; }

function cartTotal() { return cart.reduce((s,i) => s + (i.quantity||0), 0); }

function syncCartCount() {
  const el = document.getElementById('mm-cart-count');
  if (!el) return;
  // Try backend count first if logged in
  const token = localStorage.getItem('token');
  if (token) {
    fetch(`${API}/cart`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && d.data) {
          const count = d.data.totalItems || (d.data.items||[]).reduce((s,i) => s+(i.quantity||0), 0);
          el.textContent = count;
          el.style.display = count > 0 ? 'flex' : 'none';
        }
      })
      .catch(() => { el.textContent = cartTotal(); });
  } else {
    el.textContent = cartTotal();
    el.style.display = cartTotal() > 0 ? 'flex' : 'none';
  }
}

async function addToCartHandler(productId, name, price, image) {
  const token = localStorage.getItem('token');
  if (token && productId) {
    try {
      const r = await fetch(`${API}/cart/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ product_id: productId, quantity: 1 })
      });
      if (!r.ok) throw new Error('server');
    } catch(e) { /* fallback to local */ }
  }
  // Local cart fallback
  const ex = cart.find(i => (i.productId||i.name) === (productId||name));
  if (ex) ex.quantity = (ex.quantity||0) + 1;
  else cart.push({ productId, name, price, image, quantity: 1 });
  localStorage.setItem('cart', JSON.stringify(cart));
  syncCartCount();
  showToast('Added to cart!');
}

// ===== PRODUCT CARD RENDERER =====
function renderCard(p) {
  const img = p.main_image_url || p.image || 'https://via.placeholder.com/300x200?text=No+Image';
  const cat = normCat(p.category || p.category_name || '');
  const price = Number(p.effective_price || p.price || 0);
  const orig = Number(p.price || 0);
  const hasFlash = p.flash_sale_active && price < orig;
  return `<div class="product-card" data-product-id="${p.id}" data-category="${esc(cat)}" data-name="${esc(p.name)}">
    <img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
    ${hasFlash ? `<span class="flash-badge">🔥 ${p.flash_sale_discount_percent||0}% OFF</span>` : ''}
    <div class="product-info">
      <div class="product-name">${esc(p.name)}</div>
      <div class="product-desc">${esc((p.description||'').slice(0,60))}${(p.description||'').length>60?'…':''}</div>
      <div class="meta">
        <div>
          <div class="price">${fmtPrice(price)}</div>
          ${hasFlash ? `<div class="orig-price">${fmtPrice(orig)}</div>` : ''}
        </div>
      </div>
    </div>
    <button class="add-to-cart" data-id="${p.id}" data-name="${esc(p.name)}" data-price="${price}" data-img="${esc(img)}">Add to Cart</button>
  </div>`;
}

// ===== LOAD PRODUCTS (with cache) =====
let productsCache = null;
async function fetchProducts(limit = 12) {
  if (productsCache) return productsCache;
  const r = await fetch(`${API}/products?limit=${limit}`);
  if (!r.ok) throw new Error('fetch failed');
  const d = await r.json();
  productsCache = d.data || [];
  return productsCache;
}

function renderSection(selector, items) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.innerHTML = items.length ? items.map(renderCard).join('') : '<p style="color:#94a3b8;padding:20px">No products found.</p>';
}

async function loadProducts() {
  try {
    const items = await fetchProducts(16);
    const half = Math.ceil(items.length / 2);
    renderSection('.best-selling-grid', items.slice(0, half));
    renderSection('.new-arrivals-grid', items.slice(half));
    renderYouMightLike(items.slice(0, 9));
  } catch(e) {
    console.error('Products load error:', e);
  }
}

function renderYouMightLike(items) {
  const track = document.getElementById('youLikeTrack');
  if (!track) return;
  track.innerHTML = items.map(p => {
    const img = p.main_image_url || p.image || 'https://via.placeholder.com/240x180?text=Product';
    return `<div class="you-card" data-product-id="${p.id}" style="cursor:pointer">
      <img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy" onerror="this.src='https://via.placeholder.com/240x180?text=No+Image'">
      <h3>${esc(p.name)}</h3>
      <p class="price">${fmtPrice(p.effective_price || p.price)}</p>
      <button class="add-to-cart" data-id="${p.id}" data-name="${esc(p.name)}" data-price="${p.effective_price || p.price}" data-img="${esc(img)}">Add to Cart</button>
    </div>`;
  }).join('');
}

// ===== CATEGORIES (with dropdown filter) =====
let categoriesCache = null;
async function fetchCategories() {
  if (categoriesCache) return categoriesCache;
  const r = await fetch(`${API}/categories`);
  if (!r.ok) throw new Error('cats failed');
  const d = await r.json();
  categoriesCache = d.data || [];
  return categoriesCache;
}

async function loadCategories() {
  const container = document.getElementById('categoriesContainer');
  if (!container) return;
  try {
    const cats = await fetchCategories();
    const icons = { 'Electronics':'📱','Fashion':'👕','Home & Garden':'🏠','Sports & Outdoors':'⚽','Books & Media':'📚','Toys & Games':'🎮','Health & Beauty':'💄','Automotive':'🚗','Jewelry':'💍','Pet Supplies':'🐾' };
    container.innerHTML = cats.map(c => `
      <a href="./buyers/category.html?id=${c.id}" class="category-card">
        <div class="category-icon">${icons[c.name]||'📦'}</div>
        <div class="category-name">${esc(c.name)}</div>
        ${c.product_count ? `<div class="category-count">${c.product_count} items</div>` : ''}
      </a>`).join('');
  } catch(e) {
    container.innerHTML = '<p style="color:#94a3b8;padding:20px;grid-column:1/-1">Unable to load categories.</p>';
  }
}

// ===== CATEGORY DROPDOWN FOR FILTER SECTIONS =====
function buildCategoryDropdown(sectionId, filterClass) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  const h2 = section.querySelector('h2');
  if (!h2 || h2.querySelector('.cat-dd-wrap')) return;

  const wrap = document.createElement('span');
  wrap.className = 'cat-dd-wrap';
  wrap.innerHTML = `<button class="cat-dd-btn" aria-haspopup="true" aria-expanded="false" title="Filter by category">
    <i class="fas fa-filter"></i> Categories <i class="fas fa-chevron-down" style="font-size:.7rem"></i>
  </button>
  <div class="cat-dd-menu" role="menu" hidden></div>`;
  h2.appendChild(wrap);

  const btn = wrap.querySelector('.cat-dd-btn');
  const menu = wrap.querySelector('.cat-dd-menu');

  // Populate menu from existing filter buttons
  const filterRow = section.querySelector(`.${filterClass}`);
  const filterBtns = filterRow ? filterRow.querySelectorAll('.filter-btn') : [];

  menu.innerHTML = Array.from(filterBtns).map(fb => {
    const cat = fb.dataset.category;
    const label = fb.textContent.trim();
    const isActive = fb.classList.contains('active');
    return `<button class="cat-dd-item${isActive?' active':''}" data-category="${cat}" data-section="${fb.dataset.section||''}" role="menuitem">${label}</button>`;
  }).join('');

  // Toggle dropdown
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const open = !menu.hidden;
    menu.hidden = open;
    btn.setAttribute('aria-expanded', String(!open));
  });

  // Handle item click — mirrors existing filter button logic
  menu.addEventListener('click', e => {
    const item = e.target.closest('.cat-dd-item');
    if (!item) return;
    const cat = item.dataset.category;
    const sec = item.dataset.section;

    // Sync with existing filter buttons
    if (filterRow) {
      filterRow.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.category === cat);
      });
      // Trigger the existing filter btn click logic by dispatching
      const matchBtn = filterRow.querySelector(`.filter-btn[data-category="${cat}"]`);
      if (matchBtn) matchBtn.click();
    }

    // Update dropdown item active state
    menu.querySelectorAll('.cat-dd-item').forEach(i => i.classList.toggle('active', i.dataset.category === cat));
    btn.querySelector('.fa-filter').parentElement.childNodes[0].textContent = '';
    btn.innerHTML = `<i class="fas fa-filter"></i> ${item.textContent} <i class="fas fa-chevron-down" style="font-size:.7rem"></i>`;
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  });

  document.addEventListener('click', () => { menu.hidden = true; btn.setAttribute('aria-expanded','false'); });
}

// ===== FILTER BUTTONS =====
function initFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const category = normCat(this.dataset.category || '');
      const section = this.dataset.section;
      if (!section) return;

      // Update active states
      document.querySelectorAll(`.${section}-filter .filter-btn`).forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      const grid = document.querySelector(`.${section}-grid`);
      if (!grid) return;

      if (category === 'all') {
        grid.querySelectorAll('.product-card').forEach(c => c.style.display = '');
        return;
      }

      // Show/hide existing
      let shown = 0;
      grid.querySelectorAll('.product-card').forEach(c => {
        const match = normCat(c.dataset.category||'') === category;
        c.style.display = match ? '' : 'none';
        if (match) shown++;
      });

      // If none shown, fetch from cache or API
      if (shown === 0) {
        try {
          const items = await fetchProducts(200);
          const filtered = items.filter(p => normCat(p.category||p.category_name||'') === category);
          grid.innerHTML = filtered.length
            ? filtered.map(renderCard).join('')
            : `<p style="grid-column:1/-1;padding:20px;color:#94a3b8">No products in this category.</p>`;
        } catch(e) {}
      }
    });
  });
}

// ===== SEARCH (backend) =====
function initSearch() {
  const form = document.getElementById('mm-search-form');
  const input = document.getElementById('mm-search');
  if (!form || !input) return;

  let dropdown = document.createElement('div');
  dropdown.className = 'autocomplete-dropdown';
  form.style.position = 'relative';
  form.appendChild(dropdown);

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) { dropdown.style.display = 'none'; return; }
    timer = setTimeout(async () => {
      try {
        const r = await fetch(`${API}/products/search/query?q=${encodeURIComponent(q)}`);
        const d = await r.json();
        const items = (d.data || []).slice(0, 6);
        if (!items.length) { dropdown.style.display = 'none'; return; }
        dropdown.innerHTML = items.map(p => `
          <div class="autocomplete-item" data-id="${p.id}">
            <div class="autocomplete-icon">🛍️</div>
            <div class="autocomplete-content">
              <div class="autocomplete-title">${esc(p.name)}</div>
              <div class="autocomplete-meta">${fmtPrice(p.price)}</div>
            </div>
          </div>`).join('');
        dropdown.style.display = 'block';
      } catch(e) { dropdown.style.display = 'none'; }
    }, 300);
  });

  dropdown.addEventListener('click', e => {
    const item = e.target.closest('.autocomplete-item');
    if (!item) return;
    window.location.href = `./buyers/product.html?id=${item.dataset.id}`;
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const q = input.value.trim();
    if (q) window.location.href = `./buyers/search.html?q=${encodeURIComponent(q)}`;
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('#mm-search-form')) dropdown.style.display = 'none';
  });
}

// ===== DELEGATED CLICK HANDLERS =====
function initClickDelegation() {
  document.addEventListener('click', e => {
    // Add to cart
    const cartBtn = e.target.closest('.add-to-cart');
    if (cartBtn) {
      e.stopPropagation();
      e.preventDefault();
      addToCartHandler(
        cartBtn.dataset.id,
        cartBtn.dataset.name,
        cartBtn.dataset.price,
        cartBtn.dataset.img
      );
      cartBtn.textContent = 'Added!';
      cartBtn.classList.add('added');
      setTimeout(() => { cartBtn.textContent = 'Add to Cart'; cartBtn.classList.remove('added'); }, 1500);
      return;
    }
    // Navigate to product
    const card = e.target.closest('.product-card, .you-card');
    if (card) {
      const pid = card.dataset.productId;
      if (pid) window.location.href = `./buyers/product.html?id=${pid}`;
    }
  });
}

// ===== HERO SLIDER =====
function initHero() {
  const slides = document.querySelectorAll('.hero-slide');
  if (!slides.length) return;
  let i = 0, paused = false;
  const show = idx => { slides.forEach(s => s.classList.remove('active')); slides[idx].classList.add('active'); };
  setInterval(() => { if (!paused) { i = (i+1) % slides.length; show(i); } }, 4000);
  const hr = document.querySelector('.hero-right');
  if (hr) { hr.addEventListener('mouseenter', () => paused=true); hr.addEventListener('mouseleave', () => paused=false); }
}

// ===== NAVBAR =====
function initNavbar() {
  const toggle = document.getElementById('mm-toggle');
  const nav = document.getElementById('mm-mobile-nav');
  const userWrap = document.querySelector('.mm-user-wrap');
  const userBtn = document.getElementById('mm-user-btn');

  if (toggle && nav) {
    toggle.addEventListener('click', e => {
      e.stopPropagation();
      const open = nav.classList.toggle('open');
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
  }
  if (userBtn && userWrap) {
    userBtn.addEventListener('click', e => {
      e.stopPropagation();
      const open = userWrap.classList.toggle('open');
      userBtn.setAttribute('aria-expanded', String(open));
    });
  }
  document.addEventListener('click', e => {
    if (!e.target.closest('.mm-navbar') && !e.target.closest('.mm-mobile-nav')) {
      nav && nav.classList.remove('open');
      toggle && toggle.classList.remove('open');
    }
    if (!e.target.closest('.mm-user-wrap')) {
      userWrap && userWrap.classList.remove('open');
    }
  });
}

// ===== NEWSLETTER =====
function initNewsletter() {
  const form = document.getElementById('newsletterForm');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const msg = document.getElementById('newsletterMessage');
    const inp = document.getElementById('newsletterInput');
    if (msg && inp) {
      msg.textContent = '✓ Subscribed!';
      msg.style.color = '#34d399';
      inp.value = '';
      setTimeout(() => msg.textContent = '', 4000);
    }
  });
}

// ===== BACK TO TOP =====
function initBackToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;
  window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 400), { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ===== CSS FOR NEW FEATURES =====
function injectStyles() {
  const s = document.createElement('style');
  s.textContent = `
    @keyframes slideIn { from { transform:translateX(100%);opacity:0 } to { transform:translateX(0);opacity:1 } }
    @keyframes slideOut { from { transform:translateX(0);opacity:1 } to { transform:translateX(100%);opacity:0 } }

    .flash-badge { position:absolute;top:10px;left:10px;background:#ef4444;color:#fff;font-size:11px;font-weight:700;padding:4px 8px;border-radius:999px;z-index:2;pointer-events:none }
    .product-card { position:relative }
    .orig-price { font-size:0.8rem;color:#94a3b8;text-decoration:line-through;margin-top:2px }

    /* Category dropdown */
    .cat-dd-wrap { position:relative;display:inline-flex;align-items:center;margin-left:12px;vertical-align:middle }
    .cat-dd-btn {
      background:#fff;border:1.5px solid rgba(43,108,176,0.3);color:#2B6CB0;
      padding:6px 14px;border-radius:20px;font-size:0.78rem;font-weight:700;
      cursor:pointer;display:inline-flex;align-items:center;gap:6px;
      transition:all .2s;white-space:nowrap;
    }
    .cat-dd-btn:hover { background:#2B6CB0;color:#fff;border-color:#2B6CB0 }
    .cat-dd-menu {
      position:absolute;top:calc(100% + 6px);left:0;
      background:#fff;border:1px solid rgba(15,23,42,0.08);
      border-radius:12px;box-shadow:0 8px 28px rgba(2,6,23,0.12);
      min-width:200px;padding:6px;z-index:500;
      max-height:320px;overflow-y:auto;
    }
    .cat-dd-item {
      display:block;width:100%;text-align:left;background:transparent;
      border:none;padding:9px 12px;border-radius:8px;font-size:0.875rem;
      font-weight:600;color:#374151;cursor:pointer;transition:background .15s,color .15s;
    }
    .cat-dd-item:hover { background:#f1f5f9;color:#2B6CB0 }
    .cat-dd-item.active { background:#2B6CB0;color:#fff }

    /* Section h2 flex */
    #best-selling-section h2, #new-arrivals-section h2 {
      display:flex;align-items:center;flex-wrap:wrap;gap:8px
    }
  `;
  document.head.appendChild(s);
}

// ===== SELLERS (Featured Brands + Popular Shops) =====
async function loadSellers() {
  try {
    const r = await fetch(`${API}/seller/public?limit=8`);
    if (!r.ok) throw new Error();
    const d = await r.json();
    const sellers = d.data?.sellers || [];
    if (!sellers.length) return;

    // Featured Brands carousel
    const carousel = document.getElementById('brandCarousel');
    if (carousel) {
      carousel.innerHTML = sellers.map(s => {
        const logo = s.storeLogo || s.featuredProductImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.businessName||'S')}&background=e6eef8&color=2B6CB0&size=100`;
        const featImg = s.featuredProductImage || 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=300';
        const cat = s.category || 'General';
        return `<a href="./buyers/store-id.html?seller=${s.sellerId}" class="brand-card">
          <img src="${esc(logo)}" alt="${esc(s.businessName)}" class="brand-logo" onerror="this.src='https://ui-avatars.com/api/?name=S&background=e6eef8&color=2B6CB0&size=100'">
          <h3>${esc(s.businessName)}</h3>
          <p class="muted">${esc(cat)}</p>
          ${s.isVerified ? '<span style="font-size:11px;color:#10b981;font-weight:700">✓ Verified</span>' : ''}
          <img src="${esc(featImg)}" alt="${esc(s.businessName)} product" class="featured-product" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=300'">
        </a>`;
      }).join('');
    }

    // Popular Shops strip
    const strip = document.getElementById('shopStrip');
    if (strip) {
      strip.innerHTML = sellers.map(s => {
        const logo = s.storeLogo || s.featuredProductImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.businessName||'S')}&background=e6eef8&color=2B6CB0&size=150`;
        return `<a href="./buyers/store-id.html?seller=${s.sellerId}" title="${esc(s.businessName)}">
          <img src="${esc(logo)}" alt="${esc(s.businessName)}" onerror="this.src='https://ui-avatars.com/api/?name=S&background=e6eef8&color=2B6CB0&size=150'">
        </a>`;
      }).join('');
    }
  } catch(e) {
    console.warn('Could not load sellers:', e);
    // Static fallback already in HTML — do nothing
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  injectStyles();
  initNavbar();
  initHero();
  initFilters();
  initClickDelegation();
  initSearch();
  initNewsletter();
  initBackToTop();
  syncCartCount();

  // Load data in parallel
  Promise.all([
    loadCategories(),
    loadSellers(),
    loadProducts().then(() => {
      buildCategoryDropdown('best-selling-section', 'best-selling-filter');
      buildCategoryDropdown('new-arrivals-section', 'new-arrivals-filter');
    })
  ]);

  // Hide original filter rows (keep in DOM for dropdown to read, but collapse)
  document.querySelectorAll('.filter-row').forEach(r => {
    r.style.display = 'none';
  });
});