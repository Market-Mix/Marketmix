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
function fmtPrice(p) {
  return '₦' + Number(p).toLocaleString('en-NG', {minimumFractionDigits:2, maximumFractionDigits:2});
}
function fmtNum(n) {
  if (n >= 1000000) return (n/1000000).toFixed(1).replace(/\.0$/,'') + 'M+';
  if (n >= 1000)    return (n/1000).toFixed(0) + 'K+';
  return n + '+';
}

function isInStock(product) {
  return parseInt(product?.stock_quantity) > 0;
}

// ===== TOAST =====
function showToast(msg, type='success') {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:80px;right:20px;background:${type==='success'?'#10b981':'#ef4444'};color:#fff;padding:12px 16px;border-radius:8px;box-shadow:0 8px 20px rgba(0,0,0,.2);z-index:10000;font-weight:600;font-size:14px;transition:opacity .3s`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; setTimeout(() => t.remove(), 300); }, 2200);
}

// ===== CART =====
let cart = [];
try { cart = JSON.parse(localStorage.getItem('cart')) || []; } catch(e) { cart = []; }

function cartTotal() { return cart.reduce((s,i) => s + (i.quantity||0), 0); }

function getCartCount() {
  try {
    const raw = localStorage.getItem('cart') || localStorage.getItem('marketmix-cart') || '[]';
    const items = JSON.parse(raw);
    return Array.isArray(items) ? items.reduce((sum, item) => sum + (item.quantity || 1), 0) : 0;
  } catch (e) {
    return 0;
  }
}

function updateCartBadges(count) {
  document.querySelectorAll('.cart-count, #mm-cart-count, [data-cart-badge]').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? (el.id === 'mm-cart-count' ? 'flex' : 'inline-block') : 'none';
  });
}

function dispatchCartUpdated() {
  window.dispatchEvent(new CustomEvent('cartUpdated'));
}

function syncCartCount() {
  const el = document.getElementById('mm-cart-count');
  if (!el) return;
  const token = localStorage.getItem('token');
  if (token) {
    fetch(`${API}/cart`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.data) {
          const count = d.data.totalItems || (d.data.items||[]).reduce((s,i) => s+(i.quantity||0), 0);
          el.textContent = count;
          el.style.display = count > 0 ? 'flex' : 'none';
        }
      }).catch(() => {
        const c = cartTotal();
        updateCartBadges(c);
      });
  } else {
    const c = cartTotal();
    updateCartBadges(c);
  }
}

async function addToCartHandler(productId, name, price, image) {
  const token = localStorage.getItem('token');
  if (token && productId) {
    try {
      await fetch(`${API}/cart/add`, {
        method:'POST',
        headers:{'Content-Type':'application/json', Authorization:`Bearer ${token}`},
        body: JSON.stringify({ product_id: productId, quantity:1 })
      });
    } catch(e) {}
  }
  const ex = cart.find(i => (i.productId||i.name) === (productId||name));
  if (ex) ex.quantity = (ex.quantity||0)+1;
  else cart.push({ productId, name, price, image, quantity:1 });
  localStorage.setItem('cart', JSON.stringify(cart));
  dispatchCartUpdated();
  syncCartCount();
  showToast('Added to cart!');
}

window.addEventListener('storage', function(e) {
  if (e.key === 'cart' || e.key === 'marketmix-cart' || e.key === null) syncCartCount();
});
window.addEventListener('cartUpdated', syncCartCount);

// ===== PRODUCT CARD =====
function renderStars(avg) {
  // avg is 0–5, render 5 stars with partial fill via color
  const full  = Math.floor(avg);
  const half  = avg - full >= 0.4 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) +
    (half ? '<span style="opacity:.5">★</span>' : '') +
    '<span style="color:#e2e8f0">' + '★'.repeat(empty) + '</span>';
}

function renderCard(p) {
  const img = p.main_image_url || p.image || 'https://via.placeholder.com/300x200?text=No+Image';
  const cat = normCat(p.category || p.category_name || '');
  const price = Number(p.effective_price || p.price || 0);
  const orig  = Number(p.price || 0);
  const hasFlash = p.flash_sale_active && price < orig;
  const disc = p.flash_sale_discount_percent ? Math.round(p.flash_sale_discount_percent) : 0;
  const inStock = isInStock(p);

  // The product list endpoint hardcodes rating:4.5 and review_count:0.
  // Trust review_count as the source of truth — if it's 0, there are no reviews.
  const reviewCount = parseInt(p.review_count || 0, 10);
  const avgRating   = reviewCount > 0 ? parseFloat(p.avg_rating || 0) : 0;
  const ratingHtml  = avgRating > 0
    ? `<div class="mm-prod-rating">${renderStars(avgRating)} <span>(${reviewCount})</span></div>`
    : `<div class="mm-prod-rating" style="color:#94a3b8;font-size:.78rem">No reviews yet</div>`;

  return `<div class="mm-prod-card" data-product-id="${p.id}" data-category="${esc(cat)}" data-name="${esc(p.name)}">
    <div class="mm-prod-img-wrap">
      <img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
      ${hasFlash ? `<span class="mm-prod-flash-tag">🔥 ${disc}% OFF</span>` : ''}
      <button class="mm-prod-wish" title="Add to wishlist"><i class="far fa-heart"></i></button>
    </div>
    <div class="mm-prod-body">
      <div class="mm-prod-seller">${esc(cat || 'MarketMix')}</div>
      <div class="mm-prod-name">${esc(p.name)}</div>
      ${ratingHtml}
      <div class="mm-prod-footer">
        <div>
          <span class="mm-prod-price">${fmtPrice(price)}</span>
          ${hasFlash ? `<span class="mm-prod-price-orig">${fmtPrice(orig)}</span>` : ''}
          ${!inStock ? '<span style="color:#ef4444;font-weight:700;margin-left:8px">Out of stock</span>' : ''}
        </div>
        <button class="mm-prod-cart-btn" data-id="${p.id}" data-name="${esc(p.name)}" data-price="${price}" data-img="${esc(img)}" ${inStock ? '' : 'disabled'}>${inStock ? 'Add to Cart' : 'Out of stock'}</button>
      </div>
    </div>
  </div>`;
}

// ===== PRODUCTS CACHE & FETCH =====
let productsCache = null;

async function fetchProducts(limit=16) {
  if (productsCache && productsCache.length >= limit) return productsCache.slice(0, limit);
  try {
    const r = await fetch(`${API}/products?limit=${limit}`);
    if (!r.ok) throw new Error('fetch failed');
    const d = await r.json();
    productsCache = d.data?.data || d.data || [];
    if (!Array.isArray(productsCache)) productsCache = [];
    return productsCache;
  } catch (err) {
    console.warn('fetchProducts failed, falling back to local mock data:', err);
    // Safe lightweight fallback so the UI still shows product cards during backend issues.
    const mock = [
      { id: 'm1', name: 'Sample Headphones', price: 4500, main_image_url: 'https://images.unsplash.com/photo-1518444027065-62d3b1a1b5b0?w=800', category: 'Electronics', stock_quantity: 5 },
      { id: 'm2', name: 'Stylish Sneakers', price: 7600, main_image_url: 'https://images.unsplash.com/photo-1528701800489-476f4a6e10d0?w=800', category: 'Fashion', stock_quantity: 12 },
      { id: 'm3', name: 'Wooden Chair', price: 12000, main_image_url: 'https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=800', category: 'Home & Garden', stock_quantity: 8 },
      { id: 'm4', name: 'Fitness Band', price: 3200, main_image_url: 'https://images.unsplash.com/photo-1519744792095-2f2205e87b6f?w=800', category: 'Sports & Outdoors', stock_quantity: 20 }
    ];
    productsCache = mock;
    return productsCache.slice(0, limit);
  }
}

// Enrich up to `ids` products with real avg_rating & review_count from the single-product endpoint.
// We do this lazily after first render so the page doesn't block.
async function enrichWithRatings(productIds) {
  const results = await Promise.allSettled(
    productIds.map(id => fetch(`${API}/products/${id}`).then(r => r.ok ? r.json() : null))
  );
  results.forEach((res, i) => {
    if (res.status !== 'fulfilled' || !res.value?.data) return;
    const p   = res.value.data;
    const id  = productIds[i];

    // reviews is the actual array from the DB join — use its length as truth.
    // The top-level `rating: 4.5` is hardcoded in the route, so we ignore it.
    const reviews = Array.isArray(p.reviews) ? p.reviews : [];
    const count   = reviews.length;
    // Calculate real average from the review objects if present
    const avg = count > 0
      ? reviews.reduce((s, r) => s + (parseFloat(r.rating) || 0), 0) / count
      : 0;

    // Update cache
    if (productsCache) {
      const cached = productsCache.find(x => x.id === id);
      if (cached) { cached.avg_rating = avg; cached.review_count = count; }
    }

    // Update DOM
    const el = document.querySelector(`.mm-prod-card[data-product-id="${id}"] .mm-prod-rating`);
    if (!el) return;
    el.style.color = '#f59e0b';
    el.innerHTML = count > 0
      ? `${renderStars(avg)} <span>(${count})</span>`
      : `<span style="color:#94a3b8;font-size:.78rem">No reviews yet</span>`;
  });
}

// ===== PRODUCT TABS =====
let allProducts = [];

async function loadFeaturedProducts() {
  const grid = document.getElementById('mmProductsGrid');
  if (!grid) return;
  try {
    allProducts = await fetchProducts(16);
    renderProductTab('trending');
  } catch(e) {
    if (grid) grid.innerHTML = '<p style="color:#94a3b8;padding:20px;grid-column:1/-1">Unable to load products.</p>';
  }
}

function renderProductTab(tab) {
  const grid = document.getElementById('mmProductsGrid');
  if (!grid || !allProducts.length) return;
  let items;
  if (tab === 'trending') {
    items = allProducts.filter(isInStock).slice(0, 8);
  } else if (tab === 'new') {
    items = [...allProducts].filter(isInStock).reverse().slice(0, 8);
  } else if (tab === 'flash') {
    items = allProducts.filter(p => p.flash_sale_active && isInStock(p));
    if (!items.length) items = allProducts.filter(isInStock).slice(4, 12);
  }
  grid.innerHTML = items.length
    ? items.map(renderCard).join('')
    : '<p style="color:#94a3b8;padding:20px;grid-column:1/-1">No products available.</p>';
  // Enrich visible cards with real ratings (non-blocking)
  const ids = items.map(p => p.id);
  setTimeout(() => enrichWithRatings(ids), 0);
}

// ===== TRUST STATS (real backend data) =====
async function loadTrustStats() {
  const statEls = {
    sellers:  document.querySelector('.mm-stat-num[data-target="20000"]'),
    products: document.querySelector('.mm-stat-num[data-target="120000"]'),
    buyers:   document.querySelector('.mm-stat-num[data-target="1200000"]'),
    sat:      document.querySelector('.mm-stat-num[data-target="98"]'),
  };

  try {
    // Fetch sellers list for real seller count + total sales aggregate
    const [sellersRes, productsRes] = await Promise.allSettled([
      fetch(`${API}/seller/public?limit=1`).then(r => r.ok ? r.json() : null),
      fetch(`${API}/products?limit=1`).then(r => r.ok ? r.json() : null),
    ]);

    // Real seller count from pagination total
    if (sellersRes.status === 'fulfilled' && sellersRes.value?.data) {
      const total = sellersRes.value.data.total || 0;
      if (total > 0 && statEls.sellers) {
        statEls.sellers.dataset.target = total;
      }
    }

    // Real product count from pagination total
    if (productsRes.status === 'fulfilled' && productsRes.value?.pagination) {
      const total = productsRes.value.pagination.total || 0;
      if (total > 0 && statEls.products) {
        statEls.products.dataset.target = total;
      }
    }
  } catch(e) {
    // Fall back to placeholder values already in HTML
  }
  // Always animate whatever target values are set
  animateCounters();
}

function initProductTabs() {
  document.querySelectorAll('.mm-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mm-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderProductTab(btn.dataset.tab);
    });
  });
}

// ===== CATEGORIES =====
let categoriesCache = null;
async function fetchCategories() {
  if (categoriesCache) return categoriesCache;
  const r = await fetch(`${API}/categories`);
  if (!r.ok) throw new Error();
  const d = await r.json();
  categoriesCache = d.data || [];
  return categoriesCache;
}

const CAT_ICONS = {
  'Electronics':'📱','Fashion':'👕','Home & Garden':'🏠','Sports & Outdoors':'⚽',
  'Books & Media':'📚','Toys & Games':'🎮','Health & Beauty':'💄','Automotive':'🚗',
  'Jewelry':'💍','Pet Supplies':'🐾'
};

async function loadCategories() {
  const grid = document.getElementById('mmCatGrid');
  if (!grid) return;
  try {
    const cats = await fetchCategories();
    grid.innerHTML = cats.slice(0, 10).map(c => `
      <a href="./buyers/buyers-category.html?id=${c.id}" class="mm-cat-card">
        <div class="mm-cat-icon-wrap">${CAT_ICONS[c.name]||'📦'}</div>
        <div class="mm-cat-name">${esc(c.name)}</div>
        ${c.product_count ? `<div class="mm-cat-count">${c.product_count} items</div>` : ''}
      </a>`).join('');
  } catch(e) {
    grid.innerHTML = '<p style="color:#94a3b8;padding:20px;grid-column:1/-1">Unable to load categories.</p>';
  }
}

// ===== SELLERS SECTION =====
async function loadSellers() {
  const sellersGrid = document.getElementById('mmSellersGrid');
  const brandCarousel = document.getElementById('brandCarousel');

  try {
    const r = await fetch(`${API}/seller/public?limit=8`);
    if (!r.ok) throw new Error();
    const d = await r.json();
    const sellers = d.data?.sellers || [];
    if (!sellers.length) return;

    // Render featured sellers grid
    if (sellersGrid) {
      sellersGrid.innerHTML = sellers.slice(0, 4).map(s => {
        const logo = s.storeLogo || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.businessName||'S')}&background=2B6CB0&color=fff&size=150`;
        const initials = (s.businessName||'S').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
        return `<div class="mm-seller-card">
          <div class="mm-seller-avatar">
            ${s.storeLogo
              ? `<img src="${esc(s.storeLogo)}" alt="${esc(s.businessName)}" onerror="this.parentElement.textContent='${initials}'">`
              : initials}
          </div>
          ${s.isVerified ? `<div class="mm-seller-verified"><i class="fas fa-check-circle"></i> Verified</div>` : ''}
          <div class="mm-seller-name">${esc(s.businessName)}</div>
          <div class="mm-seller-cat">${esc(s.category||'Marketplace')}</div>
          <div class="mm-seller-stats">
            <div class="mm-seller-stat"><strong>${s.productCount||0}</strong><span>Products</span></div>
            <div class="mm-seller-stat"><strong>${s.totalSales||0}</strong><span>Sales</span></div>
            <div class="mm-seller-stat"><strong>${(s.rating||0).toFixed(1)}★</strong><span>Rating</span></div>
          </div>
          <a href="./buyers/store-id.html?seller=${s.sellerId}" class="mm-seller-visit">Visit Store →</a>
        </div>`;
      }).join('');
    }

    // Render brand carousel
    if (brandCarousel) {
      brandCarousel.innerHTML = sellers.map(s => {
        const logo = s.storeLogo || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.businessName||'S')}&background=e6eef8&color=2B6CB0&size=100`;
        const feat = s.featuredProductImage || 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=300';
        return `<a href="./buyers/store-id.html?seller=${s.sellerId}" class="brand-card">
          <img src="${esc(logo)}" alt="${esc(s.businessName)}" class="brand-logo" onerror="this.src='${esc(logo)}'">
          <h3>${esc(s.businessName)}</h3>
          <p class="muted">${esc(s.category||'General')}</p>
          ${s.isVerified ? '<span style="font-size:11px;color:#10b981;font-weight:700">✓ Verified</span>' : ''}
          <img src="${esc(feat)}" alt="" class="featured-product" loading="lazy">
        </a>`;
      }).join('');
    }
  } catch(e) {
    if (sellersGrid) sellersGrid.innerHTML = '<p style="color:#94a3b8;padding:20px;grid-column:1/-1">Unable to load sellers.</p>';
  }
}

// ===== ANIMATED STAT COUNTERS =====
let countersInit = false;
function animateCounters() {
  if (countersInit) return; // only run once
  countersInit = true;
  const els = document.querySelectorAll('.mm-stat-num[data-target]');
  if (!els.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      const el = entry.target;
      const target = parseInt(el.dataset.target, 10);
      const duration = 1800;
      const start = performance.now();
      function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const val = Math.floor(ease * target);
        el.textContent = fmtNum(val);
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = fmtNum(target);
      }
      requestAnimationFrame(step);
    });
  }, { threshold: 0.3 });

  els.forEach(el => observer.observe(el));
}

// ===== HOW IT WORKS TOGGLE =====
const HOW_STEPS = {
  buyer: [
    { icon:'fa-user-plus', cls:'buyer', title:'Create Account', desc:'Sign up free in under a minute. No credit card required to start browsing.' },
    { icon:'fa-search', cls:'buyer', title:'Discover Products', desc:'Browse thousands of products across categories with smart search and filters.' },
    { icon:'fa-shopping-cart', cls:'buyer', title:'Add to Cart & Pay', desc:'Secure checkout with multiple payment options. Your order is protected end-to-end.' },
    { icon:'fa-box', cls:'buyer', title:'Receive & Review', desc:'Track your delivery live. Confirm receipt and leave a review for the seller.' }
  ],
  seller: [
    { icon:'fa-store', cls:'seller', title:'Open Your Store', desc:'Create your seller account and customise your storefront with logo, banner and description.' },
    { icon:'fa-tags', cls:'seller', title:'List Products', desc:'Upload products with images, pricing and stock. Flash sales and bulk listing supported.' },
    { icon:'fa-users', cls:'seller', title:'Reach Buyers', desc:'Get discovered by thousands of daily shoppers browsing MarketMix across Nigeria.' },
    { icon:'fa-naira-sign', cls:'seller', title:'Get Paid Fast', desc:'Earnings credited to your balance on delivery confirmation. Withdraw anytime.' }
  ]
};

function renderHowSteps(role) {
  const container = document.getElementById('mmHowSteps');
  if (!container) return;
  container.innerHTML = HOW_STEPS[role].map((s, i) => `
    <div class="mm-step" data-index="${i+1}" style="animation-delay:${i*0.1}s">
      <div class="mm-step-icon ${s.cls}"><i class="fas ${s.icon}"></i></div>
      <h4>${s.title}</h4>
      <p>${s.desc}</p>
    </div>`).join('');
}

function initHowItWorks() {
  const tabs = document.querySelectorAll('.mm-how-tab');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderHowSteps(btn.dataset.how);
    });
  });
  renderHowSteps('buyer'); // default
}

// ===== FAQ ACCORDION =====
function initFAQ() {
  document.querySelectorAll('.mm-faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      // Close all
      document.querySelectorAll('.mm-faq-q').forEach(b => {
        b.setAttribute('aria-expanded', 'false');
        const a = b.nextElementSibling;
        if (a) a.classList.remove('open');
      });
      // Open clicked if was closed
      if (!isOpen) {
        btn.setAttribute('aria-expanded', 'true');
        const ans = btn.nextElementSibling;
        if (ans) ans.classList.add('open');
      }
    });
  });
}

// ===== SEARCH AUTOCOMPLETE =====
function initSearch() {
  const form  = document.getElementById('mm-search-form');
  const input = document.getElementById('mm-search');
  if (!form || !input) return;

  const dropdown = document.createElement('div');
  dropdown.className = 'autocomplete-dropdown';
  form.style.position = 'relative';
  form.appendChild(dropdown);

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) { dropdown.style.display='none'; return; }
    timer = setTimeout(async () => {
      try {
        const r = await fetch(`${API}/products/search/query?q=${encodeURIComponent(q)}`);
        const d = await r.json();
        const items = (d.data||[]).slice(0,6);
        if (!items.length) { dropdown.style.display='none'; return; }
        dropdown.innerHTML = items.map(p => `
          <div class="autocomplete-item" data-id="${p.id}">
            <div class="autocomplete-icon">🛍️</div>
            <div class="autocomplete-content">
              <div class="autocomplete-title">${esc(p.name)}</div>
              <div class="autocomplete-meta">${fmtPrice(p.price)}</div>
            </div>
          </div>`).join('');
        dropdown.style.display = 'block';
      } catch(e) { dropdown.style.display='none'; }
    }, 300);
  });

  dropdown.addEventListener('click', e => {
    const item = e.target.closest('.autocomplete-item');
    if (item) window.location.href = `./buyers/product.html?id=${item.dataset.id}`;
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const q = input.value.trim();
    if (q) window.location.href = `./buyers/search.html?q=${encodeURIComponent(q)}`;
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('#mm-search-form')) dropdown.style.display='none';
  });
}

// ===== CLICK DELEGATION (cards & cart buttons) =====
function initClickDelegation() {
  document.addEventListener('click', e => {
    // Cart button
    const cartBtn = e.target.closest('.mm-prod-cart-btn');
    if (cartBtn) {
      e.stopPropagation(); e.preventDefault();
      (async () => {
        const id = cartBtn.dataset.id;
        const API = 'https://marketmix-backend.onrender.com/api';
        async function parseOpts(s) {
          if (!s) return [];
          if (Array.isArray(s)) return s;
          if (typeof s === 'string') {
            try { const j = JSON.parse(s); if (Array.isArray(j)) return j; } catch(_) {}
            return s.split(',').map(x=>x.trim()).filter(Boolean);
          }
          return [];
        }
        async function productHasSelectableSpecs(product) {
          if (!product) return false;
          if (Array.isArray(product.variants) && product.variants.length) return true;
          if ((await parseOpts(product.size)).length) return true;
          if ((await parseOpts(product.color)).length) return true;
          if ((await parseOpts(product.storage)).length) return true;
          if ((await parseOpts(product.gender)).length) return true;
          if ((await parseOpts(product.material)).length) return true;
          if ((await parseOpts(product.style)).length) return true;
          const metaKeys = ['category_meta','dynamic_fields','specifications','attributes','options'];
          for (const k of metaKeys) {
            const v = product[k];
            if (!v) continue;
            if (Array.isArray(v) && v.length) return true;
            if (typeof v === 'string') {
              try { const j = JSON.parse(v); if (Array.isArray(j) && j.length) return true; if (typeof j === 'object') {
                for (const val of Object.values(j)) {
                  if (Array.isArray(val) && val.length) return true;
                  if (typeof val === 'string' && val.includes(',')) return true;
                }
              } } catch(_) { if (v.includes(',')) return true; }
            } else if (typeof v === 'object' && Object.keys(v).length) {
              for (const val of Object.values(v)) {
                if (Array.isArray(val) && val.length) return true;
                if (typeof val === 'string' && val.includes(',')) return true;
              }
            }
          }
          return false;
        }

        try {
          const resp = await fetch(`${API}/products/${encodeURIComponent(id)}`);
          if (resp.ok) {
            const pd = await resp.json();
            const prod = pd.data || pd;
            if (await productHasSelectableSpecs(prod)) {
              console.log('Product requires specifications:', prod.id || id, prod);
              // redirect to product page for specification selection
              showToast('Please choose your product specifications.');
              setTimeout(() => { window.location.href = `./buyers/product.html?id=${encodeURIComponent(id)}`; }, 600);
              return;
            }
          }
        } catch (err) {}

        addToCartHandler(cartBtn.dataset.id, cartBtn.dataset.name, cartBtn.dataset.price, cartBtn.dataset.img);
        const orig = cartBtn.textContent;
        cartBtn.textContent = '✓ Added'; cartBtn.style.background = '#10b981';
        setTimeout(() => { cartBtn.textContent = orig; cartBtn.style.background = ''; }, 1500);
      })();
      return;
    }
    // Wishlist button
    const wishBtn = e.target.closest('.mm-prod-wish');
    if (wishBtn) {
      e.stopPropagation(); e.preventDefault();
      wishBtn.classList.toggle('active');
      wishBtn.querySelector('i').className = wishBtn.classList.contains('active') ? 'fas fa-heart' : 'far fa-heart';
      return;
    }
    // Card click → product page
    const card = e.target.closest('.mm-prod-card');
    if (card?.dataset.productId) {
      window.location.href = `./buyers/product.html?id=${card.dataset.productId}`;
    }
  });
}

// ===== HERO SLIDER =====
function initHero() {
  const slides = document.querySelectorAll('.hero-slide');
  if (!slides.length) return;
  let i = 0, paused = false;
  const show = idx => slides.forEach((s,j) => s.classList.toggle('active', j===idx));
  show(0);
  setInterval(() => { if (!paused) { i=(i+1)%slides.length; show(i); } }, 4000);
  const hr = document.querySelector('.hero-right');
  if (hr) {
    hr.addEventListener('mouseenter', () => paused = true);
    hr.addEventListener('mouseleave', () => paused = false);
  }
}

// ===== NAVBAR =====
function initNavbar() {
  const toggle   = document.getElementById('mm-toggle');
  const nav      = document.getElementById('mm-mobile-nav');
  const userWrap = document.querySelector('.mm-user-wrap');
  const userBtn  = document.getElementById('mm-user-btn');

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
      nav?.classList.remove('open');
      toggle?.classList.remove('open');
    }
    if (!e.target.closest('.mm-user-wrap')) userWrap?.classList.remove('open');
  });

  // Show/hide auth-aware nav items
  const token = localStorage.getItem('token');
  const user  = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch(e) { return null; } })();
  if (token && user) {
    const dd = document.getElementById('mm-user-dropdown');
    if (dd) {
      const role = user.role || 'buyer';
      dd.innerHTML = `
        <div class="mm-dropdown-section">
          <div class="mm-dropdown-label">Signed in as ${esc(user.email||'')}</div>
          <a href="${role==='seller' ? './sellers/sellers layout.html' : './buyers/buyers homepage.html'}">
            <i class="fas fa-${role==='seller'?'store':'home'}" style="margin-right:6px"></i>Dashboard
          </a>
          <a href="./buyers/buyers profile.html"><i class="fas fa-user" style="margin-right:6px"></i>Profile</a>
          <a href="./buyers/cart.html"><i class="fas fa-shopping-cart" style="margin-right:6px"></i>Cart</a>
        </div>
        <div class="mm-dropdown-sep"></div>
        <a href="#" id="mm-logout-btn" style="color:#ef4444"><i class="fas fa-sign-out-alt" style="margin-right:6px"></i>Logout</a>`;
      document.getElementById('mm-logout-btn')?.addEventListener('click', e => {
        e.preventDefault();
        localStorage.removeItem('token'); localStorage.removeItem('user');
        window.location.reload();
      });
    }
  }
}

// ===== NEWSLETTER =====
function initNewsletter() {
  document.getElementById('newsletterForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const msg = document.getElementById('newsletterMessage');
    const inp = document.getElementById('newsletterInput');
    if (msg && inp) {
      msg.textContent = '✓ Subscribed! Thank you.';
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
  window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 400), {passive:true});
  btn.addEventListener('click', () => window.scrollTo({top:0, behavior:'smooth'}));
}

// ===== SELLER BENEFITS MOCKUP ANIMATION =====
function initMockupAnimation() {
  const bars = document.querySelectorAll('.mm-mock-bar-item');
  if (!bars.length) return;
  // Animate bars on scroll into view
  const observer = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    observer.disconnect();
    const heights = [40,65,50,80,70,90];
    bars.forEach((b, i) => {
      setTimeout(() => { b.style.transition = 'height .5s ease'; b.style.height = heights[i]+'%'; }, i*80);
    });
  }, { threshold: 0.3 });
  const section = document.querySelector('.mm-benefits-section');
  if (section) observer.observe(section);
}

// ===== INJECT REQUIRED STYLES =====
function injectStyles() {
  if (document.getElementById('lp-extra-styles')) return;
  const s = document.createElement('style');
  s.id = 'lp-extra-styles';
  s.textContent = `
    .mm-prod-wish.active { color:#ef4444!important; background:#fff!important; }
    .mm-prod-price-orig { font-size:.8rem;color:#94a3b8;text-decoration:line-through;margin-left:4px;font-weight:400; }
    .mm-faq-a { max-height:0;overflow:hidden;transition:max-height .35s ease,padding .35s ease; }
    .mm-faq-a.open { max-height:300px; }
    .mm-faq-a p { padding:0 20px 16px;font-size:.875rem;color:#64748b;line-height:1.7;margin:0; }
    .mm-step { animation: mm-fade-up .4s ease both; }
    @keyframes mm-fade-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    .autocomplete-dropdown { background:#fff;border:1px solid #e2e8f0;border-radius:0 0 10px 10px;box-shadow:0 8px 20px rgba(2,6,23,.12);max-height:280px;overflow-y:auto;display:none;position:absolute;top:100%;left:0;right:0;z-index:1200; }
    .autocomplete-item { display:flex;align-items:center;gap:12px;padding:12px;cursor:pointer;border-bottom:1px solid #f1f5f9;transition:background .15s; }
    .autocomplete-item:hover { background:#f8fafc; }
    .autocomplete-title { font-size:.875rem;font-weight:600;color:#0f172a; }
    .autocomplete-meta { font-size:.75rem;color:#94a3b8; }
    .mm-mock-bar-item { height:0; }
    .mm-mobile-nav.open { max-height:700px; }
  `;
  document.head.appendChild(s);
}

// ===== SECTION REVEAL ANIMATION =====
function initRevealOnScroll() {
  const sections = document.querySelectorAll(
    '.mm-trust-section,.mm-categories-section,.mm-products-section,.mm-sellers-section,.mm-how-section,.mm-benefits-section,.mm-features-section,.mm-testimonials-section,.mm-faq-section,.mm-cta-section'
  );
  const style = document.createElement('style');
  style.textContent = `
    .mm-reveal { opacity:0; transform:translateY(24px); transition:opacity .6s ease, transform .6s ease; }
    .mm-reveal.visible { opacity:1; transform:translateY(0); }`;
  document.head.appendChild(style);

  sections.forEach(s => s.classList.add('mm-reveal'));

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.08 });
  sections.forEach(s => obs.observe(s));
}


const FEATURES = [
    { icon: 'fa-search',       color: '#2B6CB0', title: 'Smart Search',             desc: 'Find products by name, category, price range, or seller with instant autocomplete.' },
    { icon: 'fa-lock',         color: '#16a34a', title: 'Secure Checkout',           desc: 'End-to-end encrypted payments with buyer protection on every single order.' },
    { icon: 'fa-bell',         color: '#dc2626', title: 'Real-time Notifications',   desc: 'Instant alerts for orders, messages, offers, and delivery updates.' },
    { icon: 'fa-map-marker-alt', color: '#7c3aed', title: 'Order Tracking',          desc: 'Track orders from seller dispatch to your doorstep with live status updates.' },
    { icon: 'fa-shopping-cart', color: '#ea580c', title: 'Smart Cart System',        desc: 'Save items, merge guest carts on login, and pick up right where you left off.' },
    { icon: 'fa-chart-bar',    color: '#0891b2', title: 'Seller Analytics',          desc: 'Track views, revenue trends, top performers and customer behavior in real time.' },
    { icon: 'fa-user-circle',  color: '#be185d', title: 'Buyer Profiles',            desc: 'Manage orders, wishlist, addresses and payment methods from one dashboard.' },
    { icon: 'fa-star',         color: '#854d0e', title: 'Reviews & Ratings',         desc: 'Verified purchase reviews build trust. Top-rated sellers get featured placement.' },
  ];
 
  const AUTOPLAY_MS = 3200;
  const MOBILE_BP  = 768;
 
  let activeIdx   = 0;
  let total       = FEATURES.length;
  let cards       = [];
  let autoTimer   = null;
  let isDragging  = false;
  let dragStartX  = 0;
  let dragDeltaX  = 0;
  let isMobile    = () => window.innerWidth <= MOBILE_BP;
 
  /* ── Build DOM ────────────────────────────────────────── */
  function build() {
    const stage = document.getElementById('mmDeckStage');
    const dots  = document.getElementById('mmDeckDots');
    if (!stage) return;
 
    stage.innerHTML = '';
    dots && (dots.innerHTML = '');
    cards = [];
 
    FEATURES.forEach((f, i) => {
      /* card */
      const card = document.createElement('div');
      card.className = 'mm-deck-card';
      card.dataset.idx = i;
      card.innerHTML = `
        <div class="mm-feature-icon" style="--ic:${f.color};background:color-mix(in srgb,${f.color} 12%,transparent)">
          <i class="fas ${f.icon}" style="color:${f.color}"></i>
        </div>
        <div class="card-content">
          <h4>${f.title}</h4>
          <p>${f.desc}</p>
        </div>`;
 
      /* touch / mouse drag */
      attachDrag(card, i);
      stage.appendChild(card);
      cards.push(card);
 
      /* dot */
      if (dots) {
        const dot = document.createElement('div');
        dot.className = 'mm-deck-dot';
        dot.dataset.idx = i;
        dot.addEventListener('click', () => goTo(i));
        dots.appendChild(dot);
      }
    });
 
    render();
    startAuto();
  }
 
  /* ── Position all cards ───────────────────────────────── */
  function render() {
    cards.forEach((card, i) => {
      card.classList.remove('is-active','is-behind-1','is-behind-2','is-hidden',
                            'is-exiting-left','is-exiting-right','is-entering');
 
      const rel = (i - activeIdx + total) % total;
      if      (rel === 0) card.classList.add('is-active');
      else if (rel === 1) card.classList.add('is-behind-1');
      else if (rel === 2) card.classList.add('is-behind-2');
      else                card.classList.add('is-hidden');
    });
 
    /* dots */
    document.querySelectorAll('.mm-deck-dot').forEach((d, i) => {
      d.classList.toggle('active', i === activeIdx);
    });
 
    /* counter */
    const counter = document.getElementById('mmDeckCounter');
    if (counter) counter.textContent = `${activeIdx + 1} / ${total}`;
  }
 
  /* ── Navigate ─────────────────────────────────────────── */
  function next() {
    const card = cards[activeIdx];
    card.classList.add('is-exiting-left');
    setTimeout(() => {
      card.classList.remove('is-exiting-left');
      activeIdx = (activeIdx + 1) % total;
      render();
    }, 380);
  }
 
  function prev() {
    const card = cards[activeIdx];
    card.classList.add('is-exiting-right');
    setTimeout(() => {
      card.classList.remove('is-exiting-right');
      activeIdx = (activeIdx - 1 + total) % total;
      render();
    }, 380);
  }
 
  function goTo(idx) {
    if (idx === activeIdx) return;
    const dir = ((idx - activeIdx + total) % total) <= total / 2 ? 'left' : 'right';
    const card = cards[activeIdx];
    card.classList.add(dir === 'left' ? 'is-exiting-left' : 'is-exiting-right');
    setTimeout(() => {
      card.classList.remove('is-exiting-left', 'is-exiting-right');
      activeIdx = idx;
      render();
    }, 380);
  }
 
  /* ── Autoplay ─────────────────────────────────────────── */
  function startAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => { if (!isDragging && isMobile()) next(); }, AUTOPLAY_MS);
  }
  function pauseAuto() { clearInterval(autoTimer); }
  function resumeAuto() { startAuto(); }
 
  /* ── Drag / Swipe ─────────────────────────────────────── */
  function attachDrag(card) {
    /* touch */
    card.addEventListener('touchstart', onStart, { passive: true });
    card.addEventListener('touchmove',  onMove,  { passive: true });
    card.addEventListener('touchend',   onEnd,   { passive: true });
    /* mouse */
    card.addEventListener('mousedown',  onStart);
    card.addEventListener('mousemove',  onMove);
    card.addEventListener('mouseup',    onEnd);
    card.addEventListener('mouseleave', onEnd);
  }
 
  function clientX(e) {
    return e.touches ? e.touches[0].clientX : e.clientX;
  }
 
  function onStart(e) {
    if (!isMobile() || +e.currentTarget.dataset.idx !== activeIdx) return;
    isDragging = true;
    dragStartX = clientX(e);
    dragDeltaX = 0;
    pauseAuto();
  }
 
  function onMove(e) {
    if (!isDragging) return;
    dragDeltaX = clientX(e) - dragStartX;
    const active = cards[activeIdx];
    const rotate = dragDeltaX * 0.06;
    /* live drag feedback – bypass transition temporarily */
    active.style.transition = 'none';
    active.style.transform  = `translateX(${dragDeltaX}px) rotate(${rotate}deg) scale(1)`;
    active.style.opacity    = String(Math.max(0.7, 1 - Math.abs(dragDeltaX) / 260));
  }
 
  function onEnd() {
    if (!isDragging) return;
    isDragging = false;
    const active = cards[activeIdx];
    active.style.transition = '';
    active.style.transform  = '';
    active.style.opacity    = '';
 
    const THRESHOLD = 60;
    if      (dragDeltaX < -THRESHOLD) next();
    else if (dragDeltaX >  THRESHOLD) prev();
    else render(); /* snap back */
 
    resumeAuto();
    dragDeltaX = 0;
  }
 
  /* ── Buttons ──────────────────────────────────────────── */
  document.getElementById('mmDeckPrev')?.addEventListener('click', () => { pauseAuto(); prev(); resumeAuto(); });
  document.getElementById('mmDeckNext')?.addEventListener('click', () => { pauseAuto(); next(); resumeAuto(); });
 
  /* ── Keyboard (accessibility) ─────────────────────────── */
  document.addEventListener('keydown', e => {
    if (!isMobile()) return;
    if (e.key === 'ArrowRight') { pauseAuto(); next(); resumeAuto(); }
    if (e.key === 'ArrowLeft')  { pauseAuto(); prev(); resumeAuto(); }
  });
 
  /* ── Init & resize ────────────────────────────────────── */
  function init() {
    if (isMobile()) build();
  }
 
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(init, 200);
  });
 
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
 
  /* pause when tab hidden */
  document.addEventListener('visibilitychange', () => {
    document.hidden ? pauseAuto() : resumeAuto();
  });

// ===== MAIN INIT =====
document.addEventListener('DOMContentLoaded', () => {
  injectStyles();
  initNavbar();
  initHero();
  initClickDelegation();
  initSearch();
  initNewsletter();
  initBackToTop();
  initProductTabs();
  initHowItWorks();
  initFAQ();
  initRevealOnScroll();
  syncCartCount();

  // Load data in parallel — trust stats updates targets then fires counters
  Promise.allSettled([
    loadTrustStats(),
    loadCategories(),
    loadFeaturedProducts(),
    loadSellers(),
  ]).then(() => {
    initMockupAnimation();
  });
});