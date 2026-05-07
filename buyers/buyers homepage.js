window.addEventListener('DOMContentLoaded', () => {
  const API = 'https://marketmix-backend.onrender.com/api';
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  let cachedCategories = null;
  let flashCountdownInterval = null;
  let flashRefreshInterval = null;

  function escapeHtml(t) {
    if (!t) return '';
    return String(t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
  }

  function normCat(s) {
    return s ? String(s).toLowerCase().replace(/\s+/g,' ').trim() : '';
  }

  function formatMs(ms) {
    if (ms <= 0) return '00:00:00';
    const s = Math.floor(ms/1000), h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sc = s%60;
    const p = n => String(n).padStart(2,'0');
    return `${p(h)}:${p(m)}:${p(sc)}`;
  }

  function updateCartCount() {
    const c = cart.reduce((s,i) => s+(i.quantity||1), 0);
    const el = document.querySelector('.cart-count');
    if (el) { el.textContent = c; el.style.display = c > 0 ? 'inline-block' : 'none'; }
  }

  function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
  }

  function syncCartFromStorage() {
    try {
      const s = JSON.parse(localStorage.getItem('cart')) || [];
      if (JSON.stringify(s) !== JSON.stringify(cart)) { cart = s; updateCartCount(); }
    } catch(e) { cart = []; updateCartCount(); }
  }

  function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 50);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2000);
  }

  async function addToBackendCart(product) {
    const token = localStorage.getItem('token');
    if (!token) { showToast('Please login to add items'); setTimeout(() => window.location.href='login for buyers.html', 1500); return false; }
    try {
      const r = await fetch(`${API}/cart/add`, {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
        body: JSON.stringify({ product_id: product.productId || btoa(product.name).substring(0,36), quantity:1 })
      });
      const d = await r.json();
      if (!r.ok) { showToast(d.message || 'Error'); return false; }
      return true;
    } catch(e) { return false; }
  }

  async function addToCart(product) {
    if (!product?.name) return;
    const token = localStorage.getItem('token');
    if (token) await addToBackendCart(product);
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
        const card = btn.closest('.product-card,.flash-card,.recommended-item');
        if (!card) { btn.disabled = false; return; }
        const name = (card.querySelector('h3,h4')?.textContent||'').trim();
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

  function attachCardClicks(container) {
    if (!container) return;
    container.querySelectorAll('.product-card,.flash-card,.recommended-item').forEach(card => {
      const id = card.dataset.productId;
      if (!id || card.dataset.cc) return;
      card.dataset.cc = '1'; card.style.cursor = 'pointer';
      card.addEventListener('click', e => { if (!e.target.closest('.add-to-cart')) window.location.href = `product.html?id=${id}`; });
    });
  }

  function renderCard(p, cls='product-card') {
    const img = p.main_image_url||p.image||'marketplace.png';
    const price = typeof p.price==='number' ? p.price.toFixed(2) : p.price;
    const cat = normCat(p.category||p.category_name||'');
    return `<div class="${cls}" data-product-id="${p.id}" data-category="${cat}">
      <img src="${img}" alt="${escapeHtml(p.name)}" loading="lazy">
      <div class="product-info"><div class="product-name">${escapeHtml(p.name)}</div>
      <div class="meta"><div class="price">₦${price}</div></div></div>
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

  const catIcons = {
    'Electronics':'📱','Fashion':'👕','Home & Garden':'🏠','Sports & Outdoors':'⚽',
    'Books & Media':'📚','Toys & Games':'🎮','Health & Beauty':'💄','Automotive':'🚗',
    'Jewelry':'💍','Pet Supplies':'🐾'
  };

  function buildCategoryDropdown(containerId, label, linkTemplate) {
    const wrap = document.getElementById(containerId);
    if (!wrap) return;
    wrap.innerHTML = `<div style="position:relative;display:inline-block">
      <button id="${containerId}-btn" style="background:#F97316;color:white;border:none;padding:8px 16px;border-radius:20px;cursor:pointer;font-size:14px;display:flex;align-items:center;gap:6px">
        ${label} <span style="font-size:10px">▼</span></button>
      <div id="${containerId}-list" style="display:none;position:absolute;top:110%;left:0;background:white;border:1px solid #ddd;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.12);z-index:999;min-width:200px;max-height:300px;overflow-y:auto">
      </div></div>`;
    const btn = document.getElementById(`${containerId}-btn`);
    const list = document.getElementById(`${containerId}-list`);
    btn.addEventListener('click', e => { e.stopPropagation(); list.style.display = list.style.display==='none'?'block':'none'; });
    document.addEventListener('click', () => { if(list) list.style.display='none'; });
    getCategories().then(cats => {
      list.innerHTML = cats.map(c => `<a href="${linkTemplate.replace('{id}',c.id)}" style="display:flex;align-items:center;gap:10px;padding:10px 14px;text-decoration:none;color:#333;border-bottom:1px solid #f0f0f0;font-size:14px" onmouseover="this.style.background='#fff7ed'" onmouseout="this.style.background=''">${catIcons[c.name]||'📦'} ${c.name}</a>`).join('');
    });
  }

  function buildFilterDropdown(sectionId, section, loadFn) {
    const wrap = document.getElementById(sectionId);
    if (!wrap) return;
    const allBtn = wrap.querySelector('[data-category="all"]');
    if (!allBtn) return;
    const dropWrap = document.createElement('div');
    dropWrap.style.cssText = 'position:relative;display:inline-block';
    dropWrap.innerHTML = `<button id="${sectionId}-drop-btn" class="filter-btn" style="display:flex;align-items:center;gap:6px">
      Category <span style="font-size:10px">▼</span></button>
      <div id="${sectionId}-drop-list" style="display:none;position:absolute;top:110%;left:0;background:white;border:1px solid #ddd;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.12);z-index:999;min-width:180px;max-height:280px;overflow-y:auto"></div>`;
    wrap.appendChild(dropWrap);
    const btn = document.getElementById(`${sectionId}-drop-btn`);
    const list = document.getElementById(`${sectionId}-drop-list`);
    btn.addEventListener('click', e => { e.stopPropagation(); list.style.display = list.style.display==='none'?'block':'none'; });
    document.addEventListener('click', () => { if(list) list.style.display='none'; });
    allBtn.addEventListener('click', () => { allBtn.classList.add('active'); btn.classList.remove('active'); loadFn(); });
    getCategories().then(cats => {
      list.innerHTML = cats.map(c => `<div data-cat="${normCat(c.name)}" style="padding:10px 14px;cursor:pointer;font-size:14px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:8px" onmouseover="this.style.background='#fff7ed'" onmouseout="this.style.background=''">${catIcons[c.name]||'📦'} ${c.name}</div>`).join('');
      list.querySelectorAll('[data-cat]').forEach(item => {
        item.addEventListener('click', () => {
          list.style.display='none';
          btn.classList.add('active'); allBtn.classList.remove('active');
          const cat = item.dataset.cat;
          const grid = document.querySelector(`.${section}-grid`);
          if (!grid) return;
          const cards = grid.querySelectorAll('.product-card');
          let found = 0;
          cards.forEach(card => {
            const show = normCat(card.dataset.category||'')=== cat;
            card.style.display = show ? '' : 'none';
            if (show) found++;
          });
          if (!found) {
            grid.innerHTML = `<div style="grid-column:1/-1;padding:20px;color:#666;text-align:center">No products in this category</div>`;
            fetch(`${API}/products?limit=200`).then(r=>r.json()).then(d=>{
              const items=(d.data||[]).filter(p=>normCat(p.category||p.category_name||'')=== cat);
              grid.innerHTML = items.length ? items.map(p=>renderCard(p)).join('') : `<div style="grid-column:1/-1;padding:20px;color:#666;text-align:center">No products found</div>`;
              attachCardClicks(grid); attachCartListeners();
            }).catch(()=>{});
          }
        });
      });
    });
  }

  async function loadFlashProducts() {
    const container = document.getElementById('flashProducts');
    if (!container) return;
    try {
      const r = await fetch(`${API}/products?limit=200`);
      const d = await r.json();
      const now = Date.now();
      const items = (d.data||[]).filter(p => {
        if (!p.flash_start||!p.flash_end) return false;
        const s = Date.parse(p.flash_start), e = Date.parse(p.flash_end);
        return !isNaN(s)&&!isNaN(e)&&now>=s&&now<=e;
      });
      const countEl = document.getElementById('countdown');
      if (flashCountdownInterval) clearInterval(flashCountdownInterval);
      const totalMs = items.reduce((s,p) => s+Math.max(0,Date.parse(p.flash_end)-Date.now()), 0);
      if (countEl && totalMs > 0) {
        let rem = totalMs;
        countEl.textContent = formatMs(rem);
        flashCountdownInterval = setInterval(() => {
          rem -= 1000;
          if (rem <= 0) { clearInterval(flashCountdownInterval); countEl.textContent=''; loadFlashProducts(); return; }
          countEl.textContent = formatMs(rem);
        }, 1000);
      }
      if (!items.length) { container.innerHTML='<p style="text-align:center;padding:20px;color:#666">No flash sales active</p>'; return; }
      container.innerHTML = items.map(p => `<div class="flash-card" data-product-id="${p.id}">
        <img src="${p.main_image_url||'marketplace.png'}" alt="${escapeHtml(p.name)}" loading="lazy">
        <h4>${escapeHtml(p.name)}</h4>
        <p class="price">₦${typeof p.price==='number'?p.price.toFixed(2):p.price}</p>
        <button class="add-to-cart">Add to Cart</button></div>`).join('');
      attachCardClicks(container); attachCartListeners();
    } catch(e) { if(container) container.innerHTML='<p style="text-align:center;padding:20px;color:#666">Error loading</p>'; }
  }

  async function loadAllProducts() {
    try {
      const [cats, prodRes] = await Promise.all([getCategories(), fetch(`${API}/products?limit=50`)]);
      const d = await prodRes.json();
      const products = d.data || [];
      const bsGrid = document.querySelector('.best-selling-grid');
      const naGrid = document.querySelector('.new-arrivals-grid');
      const recGrid = document.querySelector('.recommended-grid');
      if (bsGrid) { bsGrid.innerHTML = products.slice(0,12).map(p=>renderCard(p)).join(''); attachCardClicks(bsGrid); }
      if (naGrid) { naGrid.innerHTML = products.slice(0,12).map(p=>renderCard(p)).join(''); attachCardClicks(naGrid); }
      if (recGrid) {
        recGrid.innerHTML = products.slice(0,6).map(p=>`<div class="recommended-item" data-product-id="${p.id}">
          <img src="${p.main_image_url||'marketplace.png'}" alt="${escapeHtml(p.name)}" loading="lazy">
          <h4>${escapeHtml(p.name)}</h4><p class="price">₦${typeof p.price==='number'?p.price.toFixed(2):p.price}</p>
          <button class="add-to-cart">Add to Cart</button></div>`).join('');
        attachCardClicks(recGrid);
      }
      attachCartListeners();
    } catch(e) { console.error('loadAllProducts',e); }
  }

  async function loadCategories() {
    const cats = await getCategories();
    const cc = document.getElementById('categoriesContainer');
    if (cc) cc.innerHTML = cats.map(c=>`<a href="buyers-category.html?id=${c.id}" class="category-card"><div class="category-icon">${catIcons[c.name]||'📦'}</div><div class="category-name">${c.name}</div></a>`).join('');
    const ql = document.getElementById('quickLinksContainer');
    if (ql) ql.innerHTML = cats.map(c=>`<a href="buyers-category.html?id=${c.id}" class="link-card"><img src="marketplace.png" alt="${c.name}"><p>${c.name}</p></a>`).join('');
  }

  async function loadBrands() {
    const container = document.getElementById('brandCarousel');
    if (!container) return;
    try {
      const r = await fetch(`${API}/seller/public?limit=8`);
      const d = await r.json();
      if (!r.ok||!d.data?.sellers?.length) return;
      container.innerHTML = d.data.sellers.map(s => {
        const logo = s.storeLogo||`https://ui-avatars.com/api/?name=${encodeURIComponent(s.businessName)}&background=F97316&color=fff&size=100`;
        const feat = s.featuredProductImage||'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300';
        return `<a href="store-id.html?seller=${s.sellerId}" class="brand-card">
          <img src="${logo}" alt="${escapeHtml(s.businessName)}" class="brand-logo" onerror="this.src='${logo}'">
          <h3>${escapeHtml(s.businessName)}</h3><p class="muted">${escapeHtml(s.category||'Marketplace')}</p>
          <img src="${feat}" class="featured-product" onerror="this.src='marketplace.png'"></a>`;
      }).join('');
    } catch(e) {}
  }

  async function loadShops() {
    const container = document.getElementById('shopStrip');
    if (!container) return;
    try {
      const r = await fetch(`${API}/seller/public?limit=12`);
      const d = await r.json();
      if (!r.ok||!d.data?.sellers?.length) return;
      container.innerHTML = d.data.sellers.map(s => {
        const logo = s.storeLogo||`https://ui-avatars.com/api/?name=${encodeURIComponent(s.businessName)}&background=F97316&color=fff&size=150`;
        return `<a href="store-id.html?seller=${s.sellerId}" title="${escapeHtml(s.businessName)}"><img src="${logo}" alt="${escapeHtml(s.businessName)}"></a>`;
      }).join('');
    } catch(e) {}
  }

  const searchInput = document.getElementById('searchInput');
  const searchAC = document.getElementById('searchAutocomplete');
  if (searchInput && searchAC && typeof setupAutocomplete === 'function') {
    setupAutocomplete(searchInput, searchAC, s => {
      window.location.href = s.type==='product' ? `product.html?id=${s.id}` : `buyers-category.html?id=${s.id}`;
    });
  }
  const searchMob = document.getElementById('searchInputMobile');
  const searchACMob = document.getElementById('searchAutocompleteMobile');
  if (searchMob && searchACMob && typeof setupAutocomplete === 'function') {
    setupAutocomplete(searchMob, searchACMob, s => {
      window.location.href = s.type==='product' ? `product.html?id=${s.id}` : `buyers-category.html?id=${s.id}`;
    });
  }

  (function heroSlider() {
    let i = 0;
    const slides = document.querySelectorAll('.hero-slider .slide');
    if (!slides.length) return;
    function show() { slides.forEach((s,j) => s.classList.toggle('active',j===i)); }
    show(); setInterval(() => { i=(i+1)%slides.length; show(); }, 3000);
  })();

  (function blogSlider() {
    const slider = document.querySelector('.blog-cards');
    const cards = Array.from(document.querySelectorAll('.blog-card'));
    if (!slider||!cards.length) return;
    cards.forEach(c => slider.appendChild(c.cloneNode(true)));
    const w = cards[0].offsetWidth + 20;
    let idx = 0, drag = false, startX = 0, prevT = 0, tid;
    function slide() { slider.style.transition='transform .5s ease-in-out'; slider.style.transform=`translateX(-${idx*w}px)`; if(idx>=cards.length){setTimeout(()=>{slider.style.transition='none';slider.style.transform='translateX(0)';idx=0;},220);} }
    tid = setInterval(()=>{idx++;slide();},4000);
    const px = e => e.type.includes('mouse')?e.pageX:(e.touches?.[0]?.clientX||0);
    slider.addEventListener('mousedown',e=>{clearInterval(tid);startX=px(e);drag=true;slider.style.transition='none';});
    slider.addEventListener('mousemove',e=>{if(!drag)return;slider.style.transform=`translateX(${prevT+(px(e)-startX)}px)`;});
    slider.addEventListener('mouseup',e=>{if(!drag)return;drag=false;const m=parseInt((slider.style.transform||'').match(/-?\d+/)?.[0]||0)-prevT;if(m<-50)idx++;else if(m>50&&idx>0)idx--;slide();prevT=-idx*w;tid=setInterval(()=>{idx++;slide();},4000);});
    slider.addEventListener('mouseleave',()=>drag&&slider.dispatchEvent(new MouseEvent('mouseup')));
  })();

  (function flashScrollBtns() {
    const fc = document.querySelector('.flash-container');
    document.querySelector('.flash-btn.prev')?.addEventListener('click',()=>fc?.scrollBy({left:-200,behavior:'smooth'}));
    document.querySelector('.flash-btn.next')?.addEventListener('click',()=>fc?.scrollBy({left:200,behavior:'smooth'}));
  })();

  (function newsletter() {
    document.getElementById('newsletterForm')?.addEventListener('submit', e => {
      e.preventDefault();
      const msg = document.getElementById('newsletterMessage');
      if(msg) msg.textContent = '✅ Subscribed! Thank you.';
      document.getElementById('newsletterInput').value='';
    });
  })();

  buildCategoryDropdown('quickLinksContainer', 'Browse Categories', 'buyers-category.html?id={id}');
  buildCategoryDropdown('categoriesContainer', 'All Categories', 'buyers-category.html?id={id}');
  buildFilterDropdown('bestSellingFilterContainer', 'best-selling', loadAllProducts);
  buildFilterDropdown('newArrivalsFilterContainer', 'new-arrivals', loadAllProducts);

  Promise.all([loadFlashProducts(), loadAllProducts(), loadCategories(), loadBrands(), loadShops()]);

  if(flashRefreshInterval) clearInterval(flashRefreshInterval);
  flashRefreshInterval = setInterval(loadFlashProducts, 60000);

  window.addEventListener('pageshow', syncCartFromStorage);
  window.addEventListener('focus', syncCartFromStorage);
  document.addEventListener('visibilitychange', ()=>!document.hidden&&syncCartFromStorage());
  window.addEventListener('storage', e => e.key==='cart'&&syncCartFromStorage());
  window.addEventListener('beforeunload', ()=>{ clearInterval(flashCountdownInterval); clearInterval(flashRefreshInterval); });

  updateCartCount();

  (async function syncWishlist() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const r = await fetch(`${API}/wishlist`, {headers:{'Authorization':`Bearer ${token}`}});
      if (!r.ok) return;
      const d = await r.json();
      const items = d?.data?.items||[];
      if (items.length) localStorage.setItem('wishlist', JSON.stringify(items.map(i=>({id:i.product_id||i.id,name:i.name||'',price:i.price||0,image:i.main_image_url||i.image||''}))));
    } catch(e) {}
  })();
});