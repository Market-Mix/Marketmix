window.addEventListener('DOMContentLoaded', async () => {
  const API = 'https://marketmix-backend.onrender.com/api';
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  let cachedCategories = null;
  let flashCountdownInterval = null;

  // =====================================================
  // INITIALIZE NOTIFICATION MANAGER
  // =====================================================
  const buyerId = getBuyerId();
  if (buyerId && typeof NotificationManager !== 'undefined') {
    await NotificationManager.init(buyerId);

    window.addEventListener('pageshow', async () => {
      if (!buyerId || typeof NotificationManager === 'undefined') return;
      await NotificationManager.syncUnreadCounts(buyerId);
    });

    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible' && buyerId && typeof NotificationManager !== 'undefined') {
        await NotificationManager.syncUnreadCounts(buyerId);
      }
    });
  }

  // =====================================================
  // NOTIFICATION INTEGRATION
  // =====================================================
  window.updateAccountNotification = function(count) {
    const badge = document.getElementById('accountNotificationBadge');
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  };
  let flashRefreshInterval = null;

  function escapeHtml(t) {
    if (!t) return '';
    return String(t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
  }

  function normCat(s) {
    return s ? String(s).toLowerCase().replace(/\s+/g,' ').trim() : '';
  }

  function isInStock(product) {
    return parseInt(product?.stock_quantity) > 0;
  }

  function formatMs(ms) {
    if (ms <= 0) return '00:00:00';
    const s = Math.floor(ms/1000), h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sc = s%60;
    const p = n => String(n).padStart(2,'0');
    return `${p(h)}:${p(m)}:${p(sc)}`;
  }

  function updateCartCount() {
    const c = cart.reduce((s,i) => s+(i.quantity||1), 0);
    document.querySelectorAll('.cart-count, #mm-cart-count, [data-cart-badge]').forEach(el => {
      el.textContent = c;
      el.style.display = c > 0 ? 'inline-block' : 'none';
    });
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

    // Create notification
    const buyerId = getBuyerId();
    if (buyerId && typeof NotificationManager !== 'undefined') {
      await NotificationManager.createNotification(buyerId, {
        title: 'Item Added to Cart',
        message: `${product.name} has been added to your cart`,
        type: 'cart',
        link: '/buyers/cart.html'
      });
    }
  }

  function attachCartListeners() {
    // Keep call sites intact. Add-to-cart button clicks are handled via delegation.
  }

  async function handleAddToCartButtonClick(e) {
    const btn = e.target.closest && e.target.closest('.add-to-cart');
    if (!btn) return;
    e.stopPropagation();
    if (btn.disabled) return;
    const card = btn.closest('.product-card,.flash-card,.recommended-item');
    if (!card) return;

    btn.disabled = true;
    const name = (card.querySelector('.product-name,h3,h4')?.textContent || '').trim();
    const price = parseFloat((card.querySelector('.price')?.textContent || '').replace(/[^\d.]/g,'')) || 0;
    const image = card.querySelector('img')?.src || '';
    const productId = card.dataset.productId || null;
    const orig = btn.textContent;

    await addToCart({name, price, image, productId});
    btn.textContent = 'Added';
    btn.classList.add('added');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('added'); btn.disabled = false; }, 2000);
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

  document.body.addEventListener('click', handleAddToCartButtonClick);

  function renderCard(p, cls='product-card') {
    const img = p.main_image_url||p.image||'marketplace.png';
    const price = typeof p.price==='number' ? p.price.toFixed(2) : p.price;
    const cat = normCat(p.category||p.category_name||'');
    const inStock = isInStock(p);
    return `<div class="${cls}" data-product-id="${p.id}" data-category="${cat}">
      <img src="${img}" alt="${escapeHtml(p.name)}" loading="lazy">
      <div class="product-info"><div class="product-name">${escapeHtml(p.name)}</div>
      <div class="meta"><div class="price">₦${price}</div></div></div>
      <button class="add-to-cart" ${inStock ? '' : 'disabled'}>${inStock ? 'Add to Cart' : 'Out of stock'}</button></div>`;
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
  function buildCategoryDropdown(containerId, label, linkTemplate) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  wrap.innerHTML = `<button id="${containerId}-btn" style="background:#F97316;color:white;border:none;padding:8px 16px;border-radius:20px;cursor:pointer;font-size:14px;display:flex;align-items:center;gap:6px">${label} <span style="font-size:10px">▼</span></button>`;
  const btn = document.getElementById(`${containerId}-btn`);
  btn.addEventListener('click', e => {
    e.stopPropagation();
    getCategories().then(cats => {
      const html = cats.map(c => `<a href="${linkTemplate.replace('{id}',c.id)}" style="display:flex;align-items:center;gap:10px;padding:10px 14px;text-decoration:none;color:#333;border-bottom:1px solid #f0f0f0;font-size:14px" onmouseover="this.style.background='#fff7ed'" onmouseout="this.style.background=''">${catIcons[c.name]||'📦'} ${c.name}</a>`).join('');
      makeFloatingList(btn, html);
    });
  });
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
      const html = cats.map(c => `<div data-cat="${normCat(c.name)}" style="padding:10px 14px;cursor:pointer;font-size:14px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:8px" onmouseover="this.style.background='#fff7ed'" onmouseout="this.style.background=''">${catIcons[c.name]||'📦'} ${c.name}</div>`).join('');
      makeFloatingList(dropBtn, html);
      document.getElementById('floating-cat-list').querySelectorAll('[data-cat]').forEach(item => {
        item.addEventListener('click', () => {
          document.getElementById('floating-cat-list').style.display = 'none';
          dropBtn.classList.add('active'); allBtn.classList.remove('active');
          const cat = item.dataset.cat;
          const grid = document.querySelector(`.${section}-grid`);
          if (!grid) return;
          const cards = grid.querySelectorAll('.product-card');
          let found = 0;
          cards.forEach(card => { const show = normCat(card.dataset.category||'')=== cat; card.style.display=show?'':'none'; if(show)found++; });
          if (!found) {
            grid.innerHTML = `<div style="grid-column:1/-1;padding:20px;color:#666;text-align:center">Loading...</div>`;
            fetch(`${API}/products?limit=200`).then(r=>r.json()).then(d=>{
              const items=(d.data||[]).filter(p=>normCat(p.category||p.category_name||'')=== cat);
              grid.innerHTML = items.length ? items.map(p=>renderCard(p)).join('') : `<div style="grid-column:1/-1;padding:20px;color:#666;text-align:center">No products found</div>`;
              attachCardClicks(grid); attachCartListeners();
            });
          }
        });
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
        return !isNaN(s)&&!isNaN(e)&&now>=s&&now<=e && isInStock(p);
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
      let products = d.data?.data || [];
      if (!Array.isArray(products)) products = [];
      const bsGrid = document.querySelector('.best-selling-grid');
      const naGrid = document.querySelector('.new-arrivals-grid');
      const recGrid = document.querySelector('.recommended-grid');
      const loadingHtml = `<div style="grid-column:1/-1;padding:20px;color:#666;text-align:center">Loading products...</div>`;
      if (bsGrid) bsGrid.innerHTML = loadingHtml;
      if (naGrid) naGrid.innerHTML = loadingHtml;
      if (recGrid) recGrid.innerHTML = loadingHtml;
      const inStockProducts = products.filter(isInStock);
      const bestSellers = inStockProducts.slice(0,12);
      const newArrivals = inStockProducts.slice(0,12);
      const recommended = inStockProducts.slice(0,6);
      if (bsGrid) {
        bsGrid.innerHTML = bestSellers.length
          ? bestSellers.map(p=>renderCard(p)).join('')
          : '<div style="grid-column:1/-1;padding:20px;color:#666;text-align:center">No products available</div>';
        attachCardClicks(bsGrid);
      }
      if (naGrid) {
        naGrid.innerHTML = newArrivals.length
          ? newArrivals.map(p=>renderCard(p)).join('')
          : '<div style="grid-column:1/-1;padding:20px;color:#666;text-align:center">No products available</div>';
        attachCardClicks(naGrid);
      }
      if (recGrid) {
        recGrid.innerHTML = recommended.length
          ? recommended.map(p=>`<div class="recommended-item" data-product-id="${p.id}">
            <img src="${p.main_image_url||'marketplace.png'}" alt="${escapeHtml(p.name)}" loading="lazy">
            <h4>${escapeHtml(p.name)}</h4><p class="price">₦${typeof p.price==='number'?p.price.toFixed(2):p.price}</p>
            <button class="add-to-cart">Add to Cart</button></div>`).join('')
          : '<div style="grid-column:1/-1;padding:20px;color:#666;text-align:center">No recommended products available</div>';
        attachCardClicks(recGrid);
      }
      attachCartListeners();
    } catch(e) { console.error('loadAllProducts',e); }
  }

  async function loadCategories() {
    const cats = await getCategories();
    const cc = document.getElementById('categoriesContainer');
    if (cc) cc.innerHTML = cats.map(c=>`<a href="buyers-category.html?id=${c.id}" class="category-card"><div class="category-icon">${catIcons[c.name]||'📦'}</div><div class="category-name">${c.name}</div></a>`).join('');
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
        const storeHref = s.storeId || s.store_id
          ? `store-id.html?store=${encodeURIComponent(s.storeId || s.store_id)}`
          : `store-id.html?seller=${encodeURIComponent(s.sellerId || s.seller_id)}`;
        return `<a href="${storeHref}" class="brand-card">
          <img src="${logo}" alt="${escapeHtml(s.businessName)}" class="brand-logo" onerror="this.src='${logo}'">
          <h3>${escapeHtml(s.businessName)}</h3><p class="muted">${escapeHtml(s.category||'Marketplace')}</p>
          <img src="${feat}" class="featured-product" onerror="this.src='marketplace.png'"></a>`;
      }).join('');
    } catch(e) {}
  }

 async function loadFollowedShops() {
  const container = document.getElementById('shopStrip');
  const emptyMsg = document.getElementById('followingEmpty');
  if (!container) return;

  const token = localStorage.getItem('token');
  if (!token) {
    container.innerHTML = '';
    if (emptyMsg) emptyMsg.style.display = 'flex';
    return;
  }

  try {
    const r = await fetch(`${API}/shops/following?limit=6`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const d = await r.json();
    const shops = d?.data?.shops || [];

    if (!shops.length) {
      container.innerHTML = '';
      if (emptyMsg) emptyMsg.style.display = 'flex';
      return;
    }

    if (emptyMsg) emptyMsg.style.display = 'none';
    container.innerHTML = shops.map(s => {
      const logo = s.store_logo ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(s.business_name)}&background=F97316&color=fff&size=150`;
      const storeHref = s.store_id || s.storeId
        ? `store-id.html?store=${encodeURIComponent(s.store_id || s.storeId)}`
        : `store-id.html?seller=${encodeURIComponent(s.seller_id || s.sellerId)}`;
      return `<a href="${storeHref}" title="${escapeHtml(s.business_name)}" class="following-shop-item">
        <img src="${escapeHtml(logo)}" alt="${escapeHtml(s.business_name)}"
          onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(s.business_name)}&background=F97316&color=fff&size=150'">
        <span class="shop-name">${escapeHtml(s.business_name)}</span>
        ${s.is_verified ? '<span class="verified-badge" title="Verified">✓</span>' : ''}
      </a>`;
    }).join('');
  } catch (e) {
    console.error('loadFollowedShops', e);
  }
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

  buildCategoryDropdown('categoriesContainer', 'All Categories', 'buyers-category.html?id={id}');
  buildFilterDropdown('bestSellingFilterContainer', 'best-selling', loadAllProducts);
  buildFilterDropdown('newArrivalsFilterContainer', 'new-arrivals', loadAllProducts);

  Promise.all([loadFlashProducts(), loadAllProducts(), loadCategories(), loadBrands(), loadFollowedShops()]);

  if(flashRefreshInterval) clearInterval(flashRefreshInterval);
  flashRefreshInterval = setInterval(loadFlashProducts, 60000);

  window.addEventListener('pageshow', () => {
    syncCartFromStorage();
    loadFollowedShops();
  });
  window.addEventListener('focus', () => {
    syncCartFromStorage();
    loadFollowedShops();
  });
  window.addEventListener('popstate', syncCartFromStorage);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      syncCartFromStorage();
      loadFollowedShops();
    }
  });
  window.addEventListener('storage', e => {
    if (e.key === 'cart') syncCartFromStorage();
    if (e.key === 'followedShopsChanged') loadFollowedShops();
  });
  window.addEventListener('beforeunload', ()=>{ clearInterval(flashCountdownInterval); clearInterval(flashRefreshInterval); });

  syncCartFromStorage();
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
