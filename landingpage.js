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
  t.style.cssText = `position:fixed;bottom:80px;right:20px;background:${type==='success'?'#10b981':'#ef4444'};color:#fff;padding:12px 16px;border-radius:8px;box-shadow:0 8px 20px rgba(0,0,0,.2);z-index:10000;font-weight:600;font-size:14px`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
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
      }).catch(() => { el.textContent = cartTotal(); });
  } else {
    el.textContent = cartTotal();
    el.style.display = cartTotal() > 0 ? 'flex' : 'none';
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
  const orig = Number(p.price || 0);
  const hasFlash = p.flash_sale_active && price < orig;
  return `<div class="product-card" data-product-id="${p.id}" data-category="${esc(cat)}" data-name="${esc(p.name)}">
    <img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
    ${hasFlash ? `<span class="flash-badge">🔥 ${p.flash_sale_discount_percent||0}% OFF</span>` : ''}
    <div class="product-info">
      <div class="product-name">${esc(p.name)}</div>
      <div class="product-desc">${esc((p.description||'').slice(0,60))}${(p.description||'').length>60?'…':''}</div>
      <div class="meta"><div>
        <div class="price">${fmtPrice(price)}</div>
        ${hasFlash ? `<div class="orig-price">${fmtPrice(orig)}</div>` : ''}
      </div></div>
    </div>
    <button class="add-to-cart" data-id="${p.id}" data-name="${esc(p.name)}" data-price="${price}" data-img="${esc(img)}">Add to Cart</button>
  </div>`;
}

// ===== PRODUCTS =====
let productsCache = null;
async function fetchProducts(limit=12) {
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
  el.innerHTML = items.length ? items.map(renderCard).join('') : '<p style="color:#94a3b8;padding:20px;grid-column:1/-1">No products found.</p>';
}

async function loadProducts() {
  try {
    const items = await fetchProducts(16);
    const half = Math.ceil(items.length/2);
    renderSection('.best-selling-grid', items.slice(0, half));
    renderSection('.new-arrivals-grid', items.slice(half));
    renderYouMightLike(items.slice(0, 9));
  } catch(e) { console.error('Products load error:', e); }
}

function renderYouMightLike(items) {
  const track = document.getElementById('youLikeTrack');
  if (!track) return;
  track.innerHTML = items.map(p => {
    const img = p.main_image_url || p.image || 'https://via.placeholder.com/240x180?text=Product';
    return `<div class="you-card" data-product-id="${p.id}" style="cursor:pointer">
      <img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy">
      <h3>${esc(p.name)}</h3>
      <p class="price">${fmtPrice(p.effective_price||p.price)}</p>
      <button class="add-to-cart" data-id="${p.id}" data-name="${esc(p.name)}" data-price="${p.effective_price||p.price}" data-img="${esc(img)}">Add to Cart</button>
    </div>`;
  }).join('');
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

async function loadCategories() {
  const container = document.getElementById('categoriesContainer');
  if (!container) return;
  try {
    const cats = await fetchCategories();
    const icons = {'Electronics':'📱','Fashion':'👕','Home & Garden':'🏠','Sports & Outdoors':'⚽','Books & Media':'📚','Toys & Games':'🎮','Health & Beauty':'💄','Automotive':'🚗','Jewelry':'💍','Pet Supplies':'🐾'};
    container.innerHTML = cats.map(c => `
      <a href="./buyers/buyers-category.html?id=${c.id}" class="category-card">
        <div class="category-icon">${icons[c.name]||'📦'}</div>
        <div class="category-name">${esc(c.name)}</div>
        ${c.product_count ? `<div class="category-count">${c.product_count} items</div>` : ''}
      </a>`).join('');
  } catch(e) {
    container.innerHTML = '<p style="color:#94a3b8;padding:20px;grid-column:1/-1">Unable to load categories.</p>';
  }
}

// ===== FLOATING CATEGORY DROPDOWN (fixed position, escapes all stacking contexts) =====
function makeFloatingMenu(btn, html, onSelect) {
  let menu = document.getElementById('lp-floating-cat-menu');
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'lp-floating-cat-menu';
    menu.style.cssText = 'position:fixed;background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 8px 28px rgba(2,6,23,0.14);z-index:99999;min-width:200px;max-height:320px;overflow-y:auto;display:none;padding:6px';
    document.body.appendChild(menu);
  }

  if (menu.style.display !== 'none') { menu.style.display = 'none'; return; }

  menu.innerHTML = html;

  function reposition() {
    const r = btn.getBoundingClientRect();
    menu.style.top = (r.bottom + 6) + 'px';
    menu.style.left = r.left + 'px';
  }
  reposition();
  menu.style.display = 'block';

 function close() {
  menu.style.display = 'none';
  window.removeEventListener('scroll', onScroll, true);
  document.removeEventListener('click', handleOutsideClick);
}

  function handleOutsideClick(e) {
    if (!menu.contains(e.target) && e.target !== btn) close();
  }

  // Close (not reposition) on any scroll anywhere in the page
 function onScroll(e) {
  if (!menu.contains(e.target)) close();
}
window.addEventListener('scroll', onScroll, { passive: true, capture: true });

  menu.addEventListener('click', e => {
    const item = e.target.closest('[data-cat]');
    if (!item) return;
    onSelect(item.dataset.cat, item.textContent.trim());
    close();
  });

  setTimeout(() => {
    document.addEventListener('click', handleOutsideClick);
  }, 0);
}

// ===== BUILD SECTION CATEGORY DROPDOWN =====
function buildCategoryDropdown(sectionId, gridSelector) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  const h2 = section.querySelector('h2');
  if (!h2 || h2.querySelector('.cat-dd-btn')) return;

  const btn = document.createElement('button');
  btn.className = 'cat-dd-btn';
  btn.innerHTML = '<i class="fas fa-filter"></i> All Categories <i class="fas fa-chevron-down" style="font-size:.7rem"></i>';
  h2.appendChild(btn);

  btn.addEventListener('click', async e => {
    e.stopPropagation();
    const cats = await fetchCategories();
    const icons = {'Electronics':'📱','Fashion':'👕','Home & Garden':'🏠','Sports & Outdoors':'⚽','Books & Media':'📚','Toys & Games':'🎮','Health & Beauty':'💄','Automotive':'🚗','Jewelry':'💍','Pet Supplies':'🐾'};
    const html = `
      <div data-cat="all" style="padding:9px 12px;border-radius:8px;font-size:0.875rem;font-weight:600;color:#374151;cursor:pointer;display:flex;align-items:center;gap:8px" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''">🔄 All</div>
      ${cats.map(c => `<div data-cat="${normCat(c.name)}" style="padding:9px 12px;border-radius:8px;font-size:0.875rem;font-weight:600;color:#374151;cursor:pointer;display:flex;align-items:center;gap:8px" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background=''">${icons[c.name]||'📦'} ${esc(c.name)}</div>`).join('')}`;

    makeFloatingMenu(btn, html, async (cat, label) => {
      btn.innerHTML = `<i class="fas fa-filter"></i> ${label} <i class="fas fa-chevron-down" style="font-size:.7rem"></i>`;
      const grid = document.querySelector(gridSelector);
      if (!grid) return;

      if (cat === 'all') {
        grid.querySelectorAll('.product-card').forEach(c => c.style.display = '');
        btn.innerHTML = '<i class="fas fa-filter"></i> All Categories <i class="fas fa-chevron-down" style="font-size:.7rem"></i>';
        return;
      }

      let shown = 0;
      grid.querySelectorAll('.product-card').forEach(c => {
        const match = normCat(c.dataset.category||'') === cat;
        c.style.display = match ? '' : 'none';
        if (match) shown++;
      });

      if (!shown) {
        grid.innerHTML = '<p style="grid-column:1/-1;padding:20px;color:#94a3b8;text-align:center">Loading...</p>';
        try {
          const items = await fetchProducts(200);
          const filtered = items.filter(p => normCat(p.category||p.category_name||'') === cat);
          grid.innerHTML = filtered.length
            ? filtered.map(renderCard).join('')
            : '<p style="grid-column:1/-1;padding:20px;color:#94a3b8;text-align:center">No products in this category.</p>';
        } catch(e) {}
      }
    });
  });
}

// ===== SEARCH =====
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

  document.addEventListener('click', e => { if (!e.target.closest('#mm-search-form')) dropdown.style.display='none'; });
}

// ===== CLICK DELEGATION =====
function initClickDelegation() {
  document.addEventListener('click', e => {
    const cartBtn = e.target.closest('.add-to-cart');
    if (cartBtn) {
      e.stopPropagation(); e.preventDefault();
      addToCartHandler(cartBtn.dataset.id, cartBtn.dataset.name, cartBtn.dataset.price, cartBtn.dataset.img);
      cartBtn.textContent = 'Added!'; cartBtn.classList.add('added');
      setTimeout(() => { cartBtn.textContent='Add to Cart'; cartBtn.classList.remove('added'); }, 1500);
      return;
    }
    const card = e.target.closest('.product-card,.you-card');
    if (card?.dataset.productId) window.location.href = `./buyers/product.html?id=${card.dataset.productId}`;
  });
}

// ===== HERO =====
function initHero() {
  const slides = document.querySelectorAll('.hero-slide');
  if (!slides.length) return;
  let i = 0, paused = false;
  const show = idx => { slides.forEach(s => s.classList.remove('active')); slides[idx].classList.add('active'); };
  setInterval(() => { if (!paused) { i=(i+1)%slides.length; show(i); } }, 4000);
  const hr = document.querySelector('.hero-right');
  if (hr) { hr.addEventListener('mouseenter',()=>paused=true); hr.addEventListener('mouseleave',()=>paused=false); }
}

// ===== NAVBAR =====
function initNavbar() {
  const toggle = document.getElementById('mm-toggle');
  const nav = document.getElementById('mm-mobile-nav');
  const userWrap = document.querySelector('.mm-user-wrap');
  const userBtn = document.getElementById('mm-user-btn');
  if (toggle&&nav) {
    toggle.addEventListener('click', e => { e.stopPropagation(); const o=nav.classList.toggle('open'); toggle.classList.toggle('open',o); toggle.setAttribute('aria-expanded',String(o)); });
  }
  if (userBtn&&userWrap) {
    userBtn.addEventListener('click', e => { e.stopPropagation(); const o=userWrap.classList.toggle('open'); userBtn.setAttribute('aria-expanded',String(o)); });
  }
  document.addEventListener('click', e => {
    if (!e.target.closest('.mm-navbar')&&!e.target.closest('.mm-mobile-nav')) { nav?.classList.remove('open'); toggle?.classList.remove('open'); }
    if (!e.target.closest('.mm-user-wrap')) userWrap?.classList.remove('open');
  });
}

// ===== NEWSLETTER =====
function initNewsletter() {
  document.getElementById('newsletterForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const msg = document.getElementById('newsletterMessage');
    const inp = document.getElementById('newsletterInput');
    if (msg&&inp) { msg.textContent='✓ Subscribed!'; msg.style.color='#34d399'; inp.value=''; setTimeout(()=>msg.textContent='',4000); }
  });
}

// ===== BACK TO TOP =====
function initBackToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;
  window.addEventListener('scroll', ()=>btn.classList.toggle('visible',window.scrollY>400), {passive:true});
  btn.addEventListener('click', ()=>window.scrollTo({top:0,behavior:'smooth'}));
}

// ===== SELLERS =====
async function loadSellers() {
  try {
    const r = await fetch(`${API}/seller/public?limit=8`);
    if (!r.ok) throw new Error();
    const d = await r.json();
    const sellers = d.data?.sellers||[];
    if (!sellers.length) return;
    const carousel = document.getElementById('brandCarousel');
    if (carousel) {
      carousel.innerHTML = sellers.map(s => {
        const logo = s.storeLogo||`https://ui-avatars.com/api/?name=${encodeURIComponent(s.businessName||'S')}&background=e6eef8&color=2B6CB0&size=100`;
        const feat = s.featuredProductImage||'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=300';
        return `<a href="./buyers/store-id.html?seller=${s.sellerId}" class="brand-card">
          <img src="${esc(logo)}" alt="${esc(s.businessName)}" class="brand-logo" onerror="this.src='${esc(logo)}'">
          <h3>${esc(s.businessName)}</h3>
          <p class="muted">${esc(s.category||'General')}</p>
          ${s.isVerified?'<span style="font-size:11px;color:#10b981;font-weight:700">✓ Verified</span>':''}
          <img src="${esc(feat)}" alt="" class="featured-product" loading="lazy"></a>`;
      }).join('');
    }
    const strip = document.getElementById('shopStrip');
    if (strip) {
      strip.innerHTML = sellers.map(s => {
        const logo = s.storeLogo||`https://ui-avatars.com/api/?name=${encodeURIComponent(s.businessName||'S')}&background=e6eef8&color=2B6CB0&size=150`;
        return `<a href="./buyers/store-id.html?seller=${s.sellerId}" title="${esc(s.businessName)}"><img src="${esc(logo)}" alt="${esc(s.businessName)}"></a>`;
      }).join('');
    }
  } catch(e) {}
}

// ===== STYLES =====
function injectStyles() {
  const s = document.createElement('style');
  s.textContent = `
    .flash-badge{position:absolute;top:10px;left:10px;background:#ef4444;color:#fff;font-size:11px;font-weight:700;padding:4px 8px;border-radius:999px;z-index:2;pointer-events:none}
    .product-card{position:relative}
    .orig-price{font-size:0.8rem;color:#94a3b8;text-decoration:line-through;margin-top:2px}
    .cat-dd-btn{background:#fff;border:1.5px solid rgba(43,108,176,0.3);color:#2B6CB0;padding:6px 14px;border-radius:20px;font-size:0.78rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:all .2s;white-space:nowrap;margin-left:12px;vertical-align:middle}
    .cat-dd-btn:hover{background:#2B6CB0;color:#fff;border-color:#2B6CB0}
    #best-selling-section h2,#new-arrivals-section h2{display:flex;align-items:center;flex-wrap:wrap;gap:8px}
    .filter-row{display:none!important}
  `;
  document.head.appendChild(s);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  injectStyles();
  initNavbar();
  initHero();
  initClickDelegation();
  initSearch();
  initNewsletter();
  initBackToTop();
  syncCartCount();

  Promise.all([
    loadCategories(),
    loadSellers(),
    loadProducts().then(() => {
      buildCategoryDropdown('best-selling-section', '.best-selling-grid');
      buildCategoryDropdown('new-arrivals-section', '.new-arrivals-grid');
    })
  ]);
});