// ============================================================
// product-page.js  —  MarketMix Product Page Handler
// Store-scoped: all cart/wishlist/seller requests send
//   - X-Store-Id header
//   - store_id in request body where applicable
// ============================================================

const API_BASE = 'https://marketmix-backend.onrender.com/api';

// ── URL helpers ───────────────────────────────────────────────
function getUrlParams() {
  return new URLSearchParams(window.location.search);
}

// Reads store from ?store= OR ?seller= OR ?storeId= query params
function getStoreIdFromParams() {
  const p = getUrlParams();
  return p.get('store') || p.get('seller') || p.get('storeId') || '';
}

// Resolves store id from product object, falling back to URL param
function getProductStoreId(product = {}) {
  return (
    product.store_id    ||
    product.storeId     ||
    product.store?.id   ||
    product.seller?.store_id ||
    product.seller?.storeId  ||
    product.seller?.id      ||
    product.seller?.seller_id ||
    product.seller?.sellerId  ||
    getStoreIdFromParams() ||
    ''
  );
}

// Builds headers with auth token + X-Store-Id
function scopedHeaders(extra = {}, storeId = getStoreIdFromParams()) {
  const token = localStorage.getItem('token');
  return {
    ...extra,
    ...(token   && { Authorization:  `Bearer ${token}` }),
    ...(storeId && { 'X-Store-Id': storeId }),
  };
}

function storeScopedBody(body = {}, storeId = getStoreIdFromParams()) {
  return {
    ...body,
    store_id: storeId || null,
  };
}

function syncStoreParam(storeId) {
  if (!storeId) return;
  const params = getUrlParams();
  if (params.get('store') === storeId) return;
  params.set('store', storeId);
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}?${params.toString()}${window.location.hash}`
  );
}

// ── Toast ─────────────────────────────────────────────────────
(function initToast() {
  const style = document.createElement('style');
  style.textContent = `
    #mm-toast-container {
      position:fixed;top:20px;right:20px;z-index:99999;
      display:flex;flex-direction:column;gap:10px;pointer-events:none;
    }
    .mm-toast {
      display:flex;align-items:center;gap:10px;
      min-width:280px;max-width:380px;
      padding:14px 18px;border-radius:10px;
      font-family:Inter,system-ui,sans-serif;font-size:14px;font-weight:500;
      color:#fff;box-shadow:0 4px 20px rgba(0,0,0,.18);
      pointer-events:all;animation:mmSlideIn .3s ease forwards;
    }
    .mm-toast.hiding{animation:mmSlideOut .3s ease forwards;}
    .mm-toast-success{background:#16a34a;}
    .mm-toast-error  {background:#dc2626;}
    .mm-toast-warning{background:#d97706;}
    .mm-toast-info   {background:#f97316;}
    .mm-toast-icon {font-size:18px;flex-shrink:0;}
    .mm-toast-close{margin-left:auto;background:none;border:none;color:rgba(255,255,255,.8);cursor:pointer;font-size:16px;padding:0 4px;flex-shrink:0;}
    @keyframes mmSlideIn{from{opacity:0;transform:translateX(40px);}to{opacity:1;transform:translateX(0);}}
    @keyframes mmSlideOut{from{opacity:1;transform:translateX(0);}to{opacity:0;transform:translateX(40px);}}
    .mm-skeleton{
      background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);
      background-size:200% 100%;animation:mmShimmer 1.4s infinite;border-radius:6px;
    }
    @keyframes mmShimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}
    .mm-skeleton-text {height:16px;margin-bottom:8px;}
    .mm-fade-in{animation:mmFadeIn .35s ease forwards;}
    @keyframes mmFadeIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
  `;
  document.head.appendChild(style);
  const c = document.createElement('div');
  c.id = 'mm-toast-container';
  document.body.appendChild(c);
})();

function showToast(message, type = 'info', duration = 3500) {
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const c = document.getElementById('mm-toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `mm-toast mm-toast-${type}`;
  t.innerHTML = `<span class="mm-toast-icon">${icons[type]||'ℹ'}</span><span>${message}</span><button class="mm-toast-close">✕</button>`;
  t.querySelector('.mm-toast-close').addEventListener('click', () => dismiss(t));
  c.appendChild(t);
  t._timer = setTimeout(() => dismiss(t), duration);
}
function dismiss(t) {
  clearTimeout(t._timer);
  t.classList.add('hiding');
  setTimeout(() => t.remove(), 300);
}

// ── Skeleton helpers ──────────────────────────────────────────
function skeletonLine(w = '100%') {
  return `<div class="mm-skeleton mm-skeleton-text" style="width:${w}"></div>`;
}

function injectSkeletons() {
  const shopLink = document.getElementById('shop-link');
  if (shopLink) shopLink.innerHTML = skeletonLine('120px');
  const shopRating = document.getElementById('shop-rating');
  if (shopRating) shopRating.innerHTML = skeletonLine('80px');

  const rSec = document.getElementById('reviews-section');
  if (rSec) rSec.innerHTML = `
    <div style="padding:24px 0">
      ${skeletonLine('160px')}${skeletonLine('90%')}${skeletonLine('80%')}${skeletonLine('70%')}
    </div>`;

  ['shop-more-section', 'related-products-section'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.minHeight = '120px';
  });
}

// ── Bootstrap ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const params     = getUrlParams();
  const productId  = params.get('id');
  const urlStoreId = getStoreIdFromParams();

  if (!productId) { showError('Product ID not found'); return; }

  injectSkeletons();

  const headers = scopedHeaders({ 'Content-Type': 'application/json' }, urlStoreId);

  // Kick off product + reviews in parallel
  const [productResult, reviewsResult] = await Promise.allSettled([
    fetchWithTimeout(`${API_BASE}/products/${productId}`, { headers }),
    fetchWithTimeout(`${API_BASE}/reviews/product/${productId}`, { headers }),
  ]);

  // Parse product (critical path)
  let product = null;
  if (productResult.status === 'fulfilled') {
    try { const j = await productResult.value.json(); product = j.data; } catch (_) {}
  }
  if (!product) product = getMockProduct(productId);

  // Resolve and persist store id on the product object
  const productStoreId = getProductStoreId(product);
  if (productStoreId && !product.store_id) product.store_id = productStoreId;
  syncStoreParam(productStoreId);

  // Render product immediately
  renderProduct(product);
  setupEventListeners(product);
  updateCartCount();

  // Fire-and-forget: track view
  trackProductView(productId, productStoreId);

  // Enrich with reviews (already in-flight)
  enrichWithReviews(product, reviewsResult);

  // Fetch seller using the new stores/public/:storeId endpoint
  // Await so we can fall back to Supabase product_listings if needed
  try {
    await fetchAndRenderSeller(product);
  } catch (_) { /* non-critical */ }

  // Fallback: try to resolve seller/store name from Supabase `product_listings` table
  try {
    await tryResolveSellerFromSupabase(product);
  } catch (_) { /* ignore */ }

  // Lazy-load below-the-fold sections
  setupLazyLoad(product);
});

// ── Timeout-wrapped fetch ─────────────────────────────────────
function fetchWithTimeout(url, options = {}, ms = 6000) {
  const ctrl = new AbortController();
  const id   = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(id));
}

// ── Try resolving seller/shop name from Supabase `product_listings` table ──
async function tryResolveSellerFromSupabase(product) {
  if (!product) return;
  // If seller info already looks authoritative, skip
  const currentName = product?.seller?.shop_name || product?.seller?.businessName || product?.seller?.business_name || '';
  if (currentName && currentName !== 'MarketMix Store' && !currentName.endsWith(' Store')) return;

  // Require Supabase client helper from notification-manager.js
  if (typeof getSupabaseClient !== 'function') return;
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    // Try common id columns, log each attempt for diagnosis
    const attempts = [
      { col: 'id', val: product.id },
      { col: 'product_id', val: product.id },
      { col: 'listing_id', val: product.id },
    ];

    let row = null;
    for (const a of attempts) {
      if (!a.val) continue;
      console.debug('Supabase lookup attempt:', a.col, a.val);
      const res = await supabase.from('product_listings').select('*').eq(a.col, a.val).limit(1).maybeSingle();
      // supabase-js may return an object with data/error or throw — normalize
      const data = res?.data ?? null;
      const error = res?.error ?? null;
      if (error) {
        console.warn('Supabase lookup error for', a.col, error);
        continue;
      }
      if (data) { row = data; break; }
    }

    // If not found by id-like fields, try fuzzy match on product name (case-insensitive)
    if (!row && product?.name) {
      try {
        console.debug('Supabase fuzzy name lookup for:', product.name);
        const nameRes = await supabase.from('product_listings').select('*').ilike('name', `%${product.name}%`).limit(1).maybeSingle();
        if (nameRes?.error) console.warn('Supabase name lookup error', nameRes.error);
        else if (nameRes?.data) row = nameRes.data;
      } catch (e) {
        console.warn('Supabase name lookup threw', e);
      }
    }

    if (!row) {
      console.debug('No product_listings row found for product', product.id || product.name);
      return;
    }

    const sellerName = row.seller_name || row.seller || row.business_name || row.store_name || null;
    if (!sellerName) return;

    // Merge into product.seller only when missing or default
    product.seller = product.seller || {};
    product.seller.shop_name = sellerName;
    product.seller.shop_avatar_url = product.seller.shop_avatar_url || row.seller_avatar_url || row.store_logo || '';
    product.seller.store_id = product.seller.store_id || row.store_id || row.seller_id || product.store_id || null;
    if (row.avg_rating) product.seller.rating = Number(row.avg_rating) || product.seller.rating;

    // Render
    renderSellerInfo(product.seller, getProductStoreId(product));
  } catch (e) {
    console.warn('Supabase seller lookup failed', e);
  }
}

// ── Fetch seller/store profile from public endpoints ──────────────
async function fetchAndRenderSeller(product) {
  const storeId = getProductStoreId(product);
  if (!storeId) return;

  const endpoints = [
    `${API_BASE}/seller/stores/public/${storeId}`,
    `${API_BASE}/seller/public/${storeId}`
  ];

  for (const url of endpoints) {
    try {
      const res = await fetchWithTimeout(url, {
        headers: scopedHeaders({}, storeId),
      }, 5000);
      if (!res.ok) continue;

      const data = await res.json();
      const store = data.data?.store;
      if (!store) continue;

      product.seller = {
        id:              store.sellerId || store.seller_id || product.seller_id || product.seller?.id,
        store_id:        store.storeId || store.id || storeId,
        shop_name:       store.businessName || store.business_name || store.name || product.seller?.name,
        rating:          store.rating,
        shop_avatar_url: store.storeLogo || store.avatarUrl || store.store_logo_url || '',
      };
      product.store_id = product.seller.store_id;

      renderSellerInfo(product.seller, storeId);
      return;
    } catch (err) {
      console.warn('Store profile fetch failed for', url, err);
    }
  }
}

function renderSellerInfo(seller, storeId) {
  const avatar = document.getElementById('shop-avatar');
  if (avatar) {
    avatar.src = seller.shop_avatar_url || 'https://via.placeholder.com/32';
    avatar.onerror = () => { avatar.src = 'https://via.placeholder.com/32'; };
    avatar.classList.add('mm-fade-in');
  }

  const shopName = seller && (
    seller.shop_name || seller.businessName || seller.business_name || seller.name ||
    [seller.firstName, seller.lastName].filter(Boolean).join(' ') ||
    'MarketMix Store'
  );

  const link = document.getElementById('shop-link');
  if (link) {
    link.textContent = shopName;
    const resolvedStoreId = seller.store_id || seller.storeId || storeId || seller.sellerId || seller.seller_id || '';
    link.href = resolvedStoreId
      ? `./store-id.html?store=${encodeURIComponent(resolvedStoreId)}`
      : '#';
    link.classList.add('mm-fade-in');
  }

  const shopRating = document.getElementById('shop-rating');
  if (shopRating) {
    shopRating.textContent = seller.rating
      ? `⭐ ${Number(seller.rating).toFixed(1)} rating` : '';
    shopRating.classList.add('mm-fade-in');
  }
}

// ── Enrich with reviews ───────────────────────────────────────
async function enrichWithReviews(product, reviewsResult) {
  let reviewData = null;
  if (reviewsResult?.status === 'fulfilled') {
    try {
      const j = await reviewsResult.value.json();
      if (j.status === 'success' && j.data) reviewData = j.data;
    } catch (_) {}
  }
  if (!reviewData) return;

  product.reviews      = reviewData.reviews || [];
  product.review_count = reviewData.pagination?.totalReviews ?? product.reviews.length;
  product.rating       = parseFloat(reviewData.summary?.averageRating) || 0;

  if (typeof createReviews === 'function') {
    const rSec = document.getElementById('reviews-section');
    if (rSec) { rSec.innerHTML = ''; createReviews(product); rSec.classList.add('mm-fade-in'); }
  }
}

// ── Lazy-load below-the-fold ──────────────────────────────────
function setupLazyLoad(product) {
  if (!('IntersectionObserver' in window)) { renderBelowFold(product); return; }
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      obs.unobserve(entry.target);
      renderLazySection(entry.target.id, product);
    });
  }, { rootMargin: '200px 0px' });

  ['shop-more-section', 'related-products-section'].forEach(id => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });
}

function renderLazySection(id, product) {
  const el = document.getElementById(id);
  if (!el) return;
  if (id === 'shop-more-section'        && typeof createShopMore        === 'function') { createShopMore(product);        el.classList.add('mm-fade-in'); }
  if (id === 'related-products-section' && typeof createRelatedProducts === 'function') { createRelatedProducts(product); el.classList.add('mm-fade-in'); }
}

function renderBelowFold(product) {
  if (typeof createShopMore        === 'function') createShopMore(product);
  if (typeof createRelatedProducts === 'function') createRelatedProducts(product);
}

// ── Render product (critical path) ───────────────────────────
function renderProduct(product) {
  document.title = `${product.name} - MarketMix`;

  const rules = (typeof getCategoryRules === 'function')
    ? getCategoryRules(product.category || product.category_name)
    : { displayName: product.category || 'Products' };

  setEl('breadcrumb-category', rules.displayName);
  setEl('breadcrumb-product',  product.name);
  setEl('product-title',       product.name);
  setEl('product-category',    rules.displayName);

  renderSellerInfo(product.seller || {
    shop_name: product.business_name || product.businessName || 'MarketMix Store',
    rating: product.rating || 0,
    shop_avatar_url: product.main_image_url || '',
    store_id: getProductStoreId(product),
  }, getProductStoreId(product));

  // Price
  const basePrice    = Number(product.price) || 0;
  let   displayPrice = basePrice;

  if (product.flash_sale_active && product.flash_sale_discount) {
    displayPrice = basePrice * (100 - Number(product.flash_sale_discount)) / 100;
    const origEl = document.getElementById('original-price');
    if (origEl) { origEl.textContent = `₦${basePrice.toFixed(2)}`; origEl.style.display = 'inline'; }
  } else if (product.effective_price && Number(product.effective_price) < basePrice) {
    displayPrice = Number(product.effective_price);
    const origEl = document.getElementById('original-price');
    if (origEl) { origEl.textContent = `₦${basePrice.toFixed(2)}`; origEl.style.display = 'inline'; }
  }

  setEl('product-price', `₦${displayPrice.toFixed(2)}`);

  // Stock
  const stockEl = document.getElementById('stock-status');
  if (stockEl) {
    const qty = Number(product.stock_quantity);
    stockEl.innerHTML = qty > 0
      ? `<span style="color:#22c55e">✓ In Stock (${qty} available)</span>`
      : `<span style="color:#ef4444">✗ Out of Stock</span>`;
    if (qty <= 0) { disableBtn('product-add-to-cart'); disableBtn('product-checkout'); }
  }

  if (product.views) setEl('view-count', product.views);
  setEl('product-description', product.description || 'No description available.');

  if (typeof createImageGallery    === 'function') createImageGallery(product);
  if (typeof createFlashSale       === 'function') createFlashSale(product);
  if (typeof createCategoryOptions === 'function') createCategoryOptions(product);

  if (product.reviews?.length && typeof createReviews === 'function') createReviews(product);

  refreshWishlistButton(product.id);
}

// ── Event listeners ───────────────────────────────────────────
function setupEventListeners(product) {
  onBtn('product-add-to-cart',     () => addToCart(product));
  onBtn('product-add-to-wishlist', () => handleWishlist(product));
  onBtn('product-checkout',        () => proceedToCheckout(product));

  onBtn('qty-decrease', () => {
    const el = document.getElementById('product-quantity');
    if (el) { const v = parseInt(el.value) || 1; if (v > 1) el.value = v - 1; }
  });
  onBtn('qty-increase', () => {
    const el = document.getElementById('product-quantity');
    if (el) {
      const v = parseInt(el.value) || 1;
      if (v < (product.stock_quantity || 999)) el.value = v + 1;
    }
  });
}

// ── Add to Cart ───────────────────────────────────────────────
// Sends X-Store-Id header + store_id in body to backend
async function addToCart(product) {
  const qtyEl   = document.getElementById('product-quantity');
  const quantity = qtyEl ? (parseInt(qtyEl.value) || 1) : 1;
  const color    = window.productOptions?.color?.() || null;
  const size     = window.productOptions?.size?.()  || null;
  const storeId  = getProductStoreId(product);

  // 1. Update local cart immediately (no round-trip needed)
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const existing = cart.find(i =>
    i.id === product.id && i.color === color && i.size === size
  );
  if (existing) { existing.quantity += quantity; }
  else {
    cart.push({
      id: product.id, name: product.name,
      price: product.price, image: product.main_image_url,
      quantity, color, size,
      sellerId: product.seller?.id || product.seller_id || null,
      storeId,
      store_id: storeId || null,
    });
  }
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  showToast(`${product.name} added to cart!`, 'success');

  // 2. Sync to backend (fire-and-forget — don't block the UI)
  const token = localStorage.getItem('token');
  if (token) {
    fetch(`${API_BASE}/cart/add`, {
      method: 'POST',
      headers: scopedHeaders({ 'Content-Type': 'application/json' }, storeId),
      body: JSON.stringify(storeScopedBody({
        product_id: product.id,
        quantity,
      }, storeId)),
    }).catch(e => console.warn('Cart sync error:', e));
  }
}

// ── Proceed to Checkout ───────────────────────────────────────
// Same as addToCart but also navigates to checkout
async function proceedToCheckout(product) {
  const qtyEl   = document.getElementById('product-quantity');
  const quantity = qtyEl ? (parseInt(qtyEl.value) || 1) : 1;
  const color    = window.productOptions?.color?.() || null;
  const size     = window.productOptions?.size?.()  || null;
  const storeId  = getProductStoreId(product);

  // Update local cart
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const existing = cart.find(i =>
    i.id === product.id && i.color === color && i.size === size
  );
  if (existing) { existing.quantity += quantity; }
  else {
    cart.push({
      id: product.id, name: product.name,
      price: product.price, image: product.main_image_url,
      quantity, color, size,
      sellerId: product.seller?.id || product.seller_id || null,
      storeId,
      store_id: storeId || null,
    });
  }
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();

  const token = localStorage.getItem('token');
  if (token) {
    // Sync cart then navigate — await so the server cart is up to date at checkout
    try {
      await fetch(`${API_BASE}/cart/add`, {
        method: 'POST',
        headers: scopedHeaders({ 'Content-Type': 'application/json' }, storeId),
        body: JSON.stringify(storeScopedBody({
          product_id: product.id,
          quantity,
        }, storeId)),
      });
    } catch (e) { console.warn('Cart sync error (checkout):', e); }
    window.location.href = './checkout.html';
  } else {
    localStorage.setItem('after_login_redirect', './checkout.html');
    localStorage.setItem('post_login_redirect',  './checkout.html');
    window.location.href = 'login for buyers.html';
  }
}

// ── Wishlist ──────────────────────────────────────────────────
// Sends X-Store-Id header + store_id in body
function isWishlisted(productId) {
  return JSON.parse(localStorage.getItem('wishlist') || '[]').includes(String(productId));
}
function setWishlisted(productId, value) {
  let list = JSON.parse(localStorage.getItem('wishlist') || '[]');
  if (value) { if (!list.includes(String(productId))) list.push(String(productId)); }
  else        { list = list.filter(id => id !== String(productId)); }
  localStorage.setItem('wishlist', JSON.stringify(list));
}
function refreshWishlistButton(productId) {
  const btn = document.getElementById('product-add-to-wishlist');
  if (!btn) return;
  if (isWishlisted(productId)) {
    btn.textContent    = '❤️ Wishlisted';
    btn.style.background = '#fef2ee';
    btn.style.color      = '#f97316';
  } else {
    btn.textContent    = '❤️ Add to Wishlist';
    btn.style.background = '#fafafa';
    btn.style.color      = '#f97316';
  }
}

async function handleWishlist(product) {
  const btn       = document.getElementById('product-add-to-wishlist');
  const token     = localStorage.getItem('token');
  const storeId   = getProductStoreId(product);
  const alreadyWishlisted = isWishlisted(product.id);

  if (btn) { btn.disabled = true; btn.textContent = alreadyWishlisted ? 'Removing…' : 'Adding…'; }

  // No token — update local wishlist only
  if (!token) {
    setWishlisted(product.id, !alreadyWishlisted);
    refreshWishlistButton(product.id);
    showToast(alreadyWishlisted ? 'Removed from wishlist' : 'Added to wishlist',
              alreadyWishlisted ? 'info' : 'success');
    if (btn) btn.disabled = false;
    return;
  }

  try {
    if (alreadyWishlisted) {
      // Find the wishlist item id then delete it
      const wRes = await fetch(`${API_BASE}/wishlist`, {
        headers: scopedHeaders({}, storeId),
      });
      if (wRes.ok) {
        const wData = await wRes.json();
        const item  = (wData.data?.items || []).find(
          i => String(i.product_id) === String(product.id)
        );
        if (item) {
          await fetch(`${API_BASE}/wishlist/remove/${item.id}`, {
            method:  'DELETE',
            headers: scopedHeaders({ 'Content-Type': 'application/json' }, storeId),
            body: JSON.stringify(storeScopedBody({
              product_id: product.id,
            }, storeId)),
          });
        }
      }
      setWishlisted(product.id, false);
      showToast('Removed from wishlist', 'info');

      const buyerId = getBuyerId?.();
      if (buyerId && typeof NotificationManager !== 'undefined' && NotificationManager.createWishlistNotification) {
        try {
          await NotificationManager.createWishlistNotification(buyerId, product.name, 'removed');
        } catch (err) {
          console.warn('Wishlist removal notification failed:', err);
        }
      }
    } else {
      // Add to wishlist — include store_id in body and X-Store-Id in header
      const res = await fetch(`${API_BASE}/wishlist/add`, {
        method:  'POST',
        headers: scopedHeaders({ 'Content-Type': 'application/json' }, storeId),
        body: JSON.stringify(storeScopedBody({
          product_id: product.id,
        }, storeId)),
      });
      if (res.ok || res.status === 200) {
        setWishlisted(product.id, true);
        showToast('Added to wishlist ❤️', 'success');

        const buyerId = getBuyerId?.();
        if (buyerId && typeof NotificationManager !== 'undefined' && NotificationManager.createWishlistNotification) {
          console.log('🔔 handleWishlist: creating direct wishlist notification for', product.name);
          const notification = await NotificationManager.createWishlistNotification(buyerId, product.name);
          if (notification) {
            console.log('✅ handleWishlist: wishlist notification created', notification);
          } else {
            console.warn('⚠️ handleWishlist: wishlist notification creation failed');
          }
        }
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || 'Could not update wishlist', 'error');
      }
    }
  } catch (e) {
    console.warn('Wishlist error:', e);
    showToast('Could not update wishlist', 'error');
  } finally {
    if (btn) btn.disabled = false;
    refreshWishlistButton(product.id);
  }
}

// ── Track view (fire-and-forget) ──────────────────────────────
function trackProductView(productId, storeId = getStoreIdFromParams()) {
  fetch(`${API_BASE}/products/${productId}/view`, {
    method:  'POST',
    headers: scopedHeaders({ 'Content-Type': 'application/json' }, storeId),
  }).catch(() => {});
}

// ── Cart count ────────────────────────────────────────────────
function updateCartCount() {
  const cart  = JSON.parse(localStorage.getItem('cart') || '[]');
  const count = cart.reduce((s, i) => s + (i.quantity || 0), 0);
  document.querySelectorAll('#mm-cart-count, .cart-count').forEach(el => {
    el.textContent = count;
  });
}

// ── DOM helpers ───────────────────────────────────────────────
function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
function disableBtn(id) {
  const btn = document.getElementById(id);
  if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; btn.style.cursor = 'not-allowed'; }
}
function onBtn(id, fn) {
  const btn = document.getElementById(id);
  if (btn) btn.addEventListener('click', fn);
}
function showError(message) {
  document.body.innerHTML = `
    <div style="padding:60px 24px;text-align:center;font-family:Inter,sans-serif">
      <div style="font-size:48px;margin-bottom:16px">😕</div>
      <h2 style="color:#ef4444;margin-bottom:8px">${message}</h2>
      <p style="color:#64748b;margin-bottom:24px">We couldn't load this product.</p>
      <a href="../index.html"
         style="display:inline-block;padding:12px 24px;background:#f97316;color:#fff;
                text-decoration:none;border-radius:8px;font-weight:600">
        ← Back to Home
      </a>
    </div>`;
}

// ── Mock fallback ─────────────────────────────────────────────
function getMockProduct(productId) {
  return {
    id: productId,
    name: 'Sample Product',
    description: 'This is a sample product description.',
    price: 49.99,
    category: 'electronics',
    main_image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
    stock_quantity: 10,
    rating: 4.5,
    review_count: 12,
    seller_id: null,
    store_id: null,
    flash_sale_active: false,
    flash_sale_discount: 0,
    views: 0,
    seller: { id: null, store_id: null, shop_name: 'MarketMix Store', rating: 4.5, shop_avatar_url: '' },
    reviews: [],
    relatedProducts: [],
    sellerProducts: [],
  };
}
