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
        el.textContent = c;
        el.style.display = c > 0 ? 'flex' : 'none';
      });
  } else {
    const c = cartTotal();
    el.textContent = c;
    el.style.display = c > 0 ? 'flex' : 'none';
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
  syncCartCount();
  showToast('Added to cart!');
}

// ===== PRODUCT CARD =====
function renderCard(p) {
  const img = p.main_image_url || p.image || 'https://via.placeholder.com/300x200?text=No+Image';
  const cat = normCat(p.category || p.category_name || '');
  const price = Number(p.effective_price || p.price || 0);
  const orig  = Number(p.price || 0);
  const hasFlash = p.flash_sale_active && price < orig;
  const disc = p.flash_sale_discount_percent ? Math.round(p.flash_sale_discount_percent) : 0;
  return `<div class="mm-prod-card" data-product-id="${p.id}" data-category="${esc(cat)}" data-name="${esc(p.name)}">
    <div class="mm-prod-img-wrap">
      <img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
      ${hasFlash ? `<span class="mm-prod-flash-tag">🔥 ${disc}% OFF</span>` : ''}
      <button class="mm-prod-wish" title="Add to wishlist"><i class="far fa-heart"></i></button>
    </div>
    <div class="mm-prod-body">
      <div class="mm-prod-seller">${esc(cat || 'MarketMix')}</div>
      <div class="mm-prod-name">${esc(p.name)}</div>
      <div class="mm-prod-rating">★★★★<span style="color:#e2e8f0">★</span> <span>(${Math.floor(Math.random()*200)+10})</span></div>
      <div class="mm-prod-footer">
        <div>
          <span class="mm-prod-price">${fmtPrice(price)}</span>
          ${hasFlash ? `<span class="mm-prod-price-orig">${fmtPrice(orig)}</span>` : ''}
        </div>
        <button class="mm-prod-cart-btn" data-id="${p.id}" data-name="${esc(p.name)}" data-price="${price}" data-img="${esc(img)}">Add to Cart</button>
      </div>
    </div>
  </div>`;
}

// ===== PRODUCTS CACHE & FETCH =====
let productsCache = null;
async function fetchProducts(limit=16) {
  if (productsCache && productsCache.length >= limit) return productsCache.slice(0, limit);
  const r = await fetch(`${API}/products?limit=${limit}`);
  if (!r.ok) throw new Error('fetch failed');
  const d = await r.json();
  productsCache = d.data || [];
  return productsCache;
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
    items = allProducts.slice(0, 8);
  } else if (tab === 'new') {
    items = [...allProducts].reverse().slice(0, 8);
  } else if (tab === 'flash') {
    items = allProducts.filter(p => p.flash_sale_active);
    if (!items.length) items = allProducts.slice(4, 12);
  }
  grid.innerHTML = items.length
    ? items.map(renderCard).join('')
    : '<p style="color:#94a3b8;padding:20px;grid-column:1/-1">No products available.</p>';
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
function animateCounters() {
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
      addToCartHandler(cartBtn.dataset.id, cartBtn.dataset.name, cartBtn.dataset.price, cartBtn.dataset.img);
      const orig = cartBtn.textContent;
      cartBtn.textContent = '✓ Added'; cartBtn.style.background = '#10b981';
      setTimeout(() => { cartBtn.textContent = orig; cartBtn.style.background = ''; }, 1500);
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
  animateCounters();
  initRevealOnScroll();
  syncCartCount();

  // Load data in parallel
  Promise.allSettled([
    loadCategories(),
    loadFeaturedProducts(),
    loadSellers(),
  ]).then(() => {
    initMockupAnimation();
  });
});