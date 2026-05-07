const API = 'https://marketmix-backend.onrender.com/api';
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let cachedCategories = null;
const catIcons = {
  'Electronics':'📱','Fashion':'👕','Home & Garden':'🏠','Sports & Outdoors':'⚽',
  'Books & Media':'📚','Toys & Games':'🎮','Health & Beauty':'💄','Automotive':'🚗',
  'Jewelry':'💍','Pet Supplies':'🐾'
};

function escapeHtml(t) {
  if (!t) return '';
  return String(t).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 50);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2000);
}

function updateCartCount() {
  const c = cart.reduce((s,i) => s+(i.quantity||1), 0);
  const el = document.querySelector('.cart-count');
  if (el) { el.textContent = c; el.style.display = c > 0 ? 'inline-block' : 'none'; }
}

function saveCart() { localStorage.setItem('cart', JSON.stringify(cart)); updateCartCount(); }

function syncCartFromStorage() {
  try {
    const s = JSON.parse(localStorage.getItem('cart')) || [];
    if (JSON.stringify(s) !== JSON.stringify(cart)) { cart = s; updateCartCount(); }
  } catch(e) { cart = []; updateCartCount(); }
}

async function addToCart(product) {
  if (!product?.name) return;
  const token = localStorage.getItem('token');
  if (token) {
    try {
      await fetch(`${API}/cart/add`, {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
        body: JSON.stringify({ product_id: product.productId || btoa(product.name).substring(0,36), quantity:1 })
      });
    } catch(e) {}
  }
  const ex = cart.find(i => i.name === product.name);
  ex ? ex.quantity = (ex.quantity||1)+1 : cart.push({...product, quantity:1});
  saveCart();
  showToast(`${product.name} added to cart`);
}

function attachCartListeners() {
  document.querySelectorAll('.add-to-cart:not([data-cl])').forEach(btn => {
    btn.dataset.cl = '1';
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      if (btn.disabled) return;
      btn.disabled = true;
      const card = btn.closest('.product-card');
      if (!card) { btn.disabled = false; return; }
      const name = (card.querySelector('.product-name')?.textContent||'').trim();
      const price = parseFloat((card.querySelector('.price')?.textContent||'').replace(/[^\d.]/g,''))||0;
      const image = card.querySelector('img')?.src||'';
      const productId = card.dataset.productId||null;
      const orig = btn.textContent;
      await addToCart({name, price, image, productId});
      btn.textContent = 'Added'; btn.classList.add('added');
      setTimeout(() => { btn.textContent = orig; btn.classList.remove('added'); btn.disabled = false; }, 2000);
    });
  });
}

function attachCardClicks() {
  document.querySelectorAll('.product-card:not([data-cc])').forEach(card => {
    card.dataset.cc = '1'; card.style.cursor = 'pointer';
    card.addEventListener('click', e => {
      if (e.target.closest('.add-to-cart')) return;
      const id = card.dataset.productId;
      if (id) window.location.href = `product.html?id=${id}`;
    });
  });
}

function renderCard(p) {
  return `<div class="product-card" data-product-id="${p.id}" data-category="${escapeHtml((p.category||p.category_name||'').toLowerCase())}">
    <img src="${p.main_image_url||p.image||'marketplace.png'}" alt="${escapeHtml(p.name)}" loading="lazy">
    <div class="product-info">
      <div class="product-name">${escapeHtml(p.name)}</div>
      <div class="meta"><div class="price">₦${parseFloat(p.price).toFixed(2)}</div></div>
    </div>
    <button class="add-to-cart">Add to Cart</button></div>`;
}

async function getCategories() {
  if (cachedCategories) return cachedCategories;
  try {
    const r = await fetch(`${API}/categories`);
    const d = await r.json();
    cachedCategories = d.data || [];
  } catch(e) { cachedCategories = []; }
  return cachedCategories;
}

function makeFloatingList(btn, items) {
  let list = document.getElementById('floating-cat-list');
  if (!list) {
    list = document.createElement('div');
    list.id = 'floating-cat-list';
    list.style.cssText = 'position:fixed;background:white;border:1px solid #ddd;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.18);z-index:99999;min-width:200px;max-height:300px;overflow-y:auto;display:none';
    document.body.appendChild(list);
  }
  list.innerHTML = items;

  if (list.style.display === 'none') {
    function reposition() {
      const r = btn.getBoundingClientRect();
      list.style.top = (r.bottom + 6) + 'px';
      list.style.left = r.left + 'px';
    }
    reposition();
    list.style.display = 'block';
    window.addEventListener('scroll', reposition);
    setTimeout(() => {
      document.addEventListener('click', function hide(e) {
        if (!list.contains(e.target) && e.target !== btn) {
          list.style.display = 'none';
          window.removeEventListener('scroll', reposition);
          document.removeEventListener('click', hide);
        }
      });
    }, 0);
  } else {
    list.style.display = 'none';
  }
}
function buildFilterDropdown(sectionId, section, loadFn) {
  const wrap = document.getElementById(sectionId);
  if (!wrap) return;
  const allBtn = wrap.querySelector('[data-category="all"]');
  if (!allBtn) return;
  const dropBtn = document.createElement('button');
  dropBtn.className = 'filter-btn';
  dropBtn.innerHTML = 'Category <span style="font-size:10px">▼</span>';
  wrap.appendChild(dropBtn);
  allBtn.addEventListener('click', () => { allBtn.classList.add('active'); dropBtn.classList.remove('active'); loadFn(); });
  dropBtn.addEventListener('click', e => {
    e.stopPropagation();
    getCategories().then(cats => {
      const html = cats.map(c => `<div data-cat="${c.name.toLowerCase()}" style="padding:10px 14px;cursor:pointer;font-size:14px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:8px" onmouseover="this.style.background='#fff7ed'" onmouseout="this.style.background=''">${catIcons[c.name]||'📦'} ${c.name}</div>`).join('');
      makeFloatingList(dropBtn, html);
      document.getElementById('floating-cat-list').querySelectorAll('[data-cat]').forEach(item => {
        item.addEventListener('click', () => {
          document.getElementById('floating-cat-list').style.display='none';
          dropBtn.classList.add('active'); allBtn.classList.remove('active');
          const cat = item.dataset.cat;
          const grid = document.querySelector(`.${section}-grid`);
          if (!grid) return;
          let found = 0;
          grid.querySelectorAll('.product-card').forEach(card => {
            const show = (card.dataset.category||'') === cat;
            card.style.display = show ? '' : 'none';
            if (show) found++;
          });
          if (!found) {
            grid.innerHTML = '<div style="grid-column:1/-1;padding:20px;color:#666;text-align:center">Loading...</div>';
            fetch(`${API}/products?limit=200`).then(r=>r.json()).then(d=>{
              const items = (d.data||[]).filter(p=>(p.category||p.category_name||'').toLowerCase()===cat);
              grid.innerHTML = items.length ? items.map(renderCard).join('') : '<div style="grid-column:1/-1;padding:20px;color:#666;text-align:center">No products found</div>';
              attachCardClicks(); attachCartListeners();
            }).catch(()=>{});
          }
        });
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  updateCartCount();
  window.addEventListener('pageshow', syncCartFromStorage);
  window.addEventListener('focus', syncCartFromStorage);
  window.addEventListener('storage', e => e.key==='cart'&&syncCartFromStorage());

  if (typeof setupAutocomplete === 'function') {
    const nav = s => window.location.href = s.type==='product' ? `product.html?id=${s.id}` : `buyers-category.html?id=${s.id}`;
    const si = document.getElementById('searchInput'), sa = document.getElementById('searchAutocomplete');
    const sm = document.getElementById('searchInputMobile'), sma = document.getElementById('searchAutocompleteMobile');
    if (si&&sa) setupAutocomplete(si, sa, nav);
    if (sm&&sma) setupAutocomplete(sm, sma, nav);
  }

  const urlParams = new URLSearchParams(window.location.search);
  const categoryId = urlParams.get('id');
  const grid = document.getElementById('categoryProductsGrid');
  const noResults = document.getElementById('noResults');

  if (!categoryId) {
    document.getElementById('categoryTitle').textContent = 'Category Not Found';
    if (noResults) noResults.style.display = 'block';
    return;
  }

  try {
    const [catRes, prodRes] = await Promise.all([
      fetch(`${API}/categories/${categoryId}`),
      fetch(`${API}/categories/${categoryId}/products?limit=100`)
    ]);

    if (!catRes.ok) throw new Error('Category not found');
    const catData = await catRes.json();
    const name = catData.data.name;
    document.title = `${name} — MarketMix`;
    document.getElementById('categoryTitle').textContent = name;

    const prodData = await prodRes.json();
    const products = prodData.data || [];

    const info = document.getElementById('resultsInfo');
    if (!products.length) {
      if (noResults) noResults.style.display = 'block';
      if (info) info.textContent = '';
    } else {
      if (noResults) noResults.style.display = 'none';
      if (info) info.textContent = `Showing ${products.length} product(s)`;
      grid.innerHTML = products.map(renderCard).join('');
      attachCardClicks();
      attachCartListeners();
    }
  } catch(e) {
    console.error(e);
    document.getElementById('categoryTitle').textContent = 'Error Loading Category';
    if (noResults) { noResults.style.display='block'; noResults.textContent='Failed to load. Please try again.'; }
  }

  // Best selling section
  try {
    const r = await fetch(`${API}/products?limit=20`);
    const d = await r.json();
    const bsGrid = document.getElementById('bestSellingGrid');
    if (bsGrid && d.data?.length) {
      bsGrid.innerHTML = d.data.map(renderCard).join('');
      attachCardClicks(); attachCartListeners();
    }
  } catch(e) {}

  buildFilterDropdown('bestSellingFilterContainer', 'best-selling', async () => {
    const r = await fetch(`${API}/products?limit=20`);
    const d = await r.json();
    const g = document.getElementById('bestSellingGrid');
    if (g && d.data) { g.innerHTML = d.data.map(renderCard).join(''); attachCardClicks(); attachCartListeners(); }
  });
});