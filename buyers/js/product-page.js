// ============================================================
// product-page.js  —  MarketMix Product Page Handler
// Optimised: parallel fetches · progressive rendering · lazy loading
// ============================================================

const API_BASE = 'https://marketmix-backend.onrender.com/api';

function getUrlParams() {
  return new URLSearchParams(window.location.search);
}

function getStoreIdFromParams() {
  const params = getUrlParams();
  return params.get('store') || params.get('seller') || params.get('storeId') || '';
}

function getProductStoreId(product = {}) {
  return product.store_id
    || product.storeId
    || product.store?.id
    || product.seller?.store_id
    || product.seller?.storeId
    || getStoreIdFromParams()
    || product.seller_id
    || product.seller?.id
    || '';
}

function scopedHeaders(extra = {}, storeId = getStoreIdFromParams()) {
  const token = localStorage.getItem('token');
  return {
    ...extra,
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...(storeId ? { 'X-Store-Id': storeId } : {}),
  };
}

// ─── Toast Notification System ──────────────────────────────
(function initToast() {
  const style = document.createElement('style');
  style.textContent = `
    #mm-toast-container {
      position: fixed; top: 20px; right: 20px; z-index: 99999;
      display: flex; flex-direction: column; gap: 10px; pointer-events: none;
    }
    .mm-toast {
      display: flex; align-items: center; gap: 10px;
      min-width: 280px; max-width: 380px;
      padding: 14px 18px; border-radius: 10px;
      font-family: Inter, system-ui, sans-serif; font-size: 14px; font-weight: 500;
      color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,.18);
      pointer-events: all; animation: mmSlideIn .3s ease forwards;
      transition: opacity .3s ease, transform .3s ease;
    }
    .mm-toast.hiding { animation: mmSlideOut .3s ease forwards; }
    .mm-toast-success { background: #16a34a; }
    .mm-toast-error   { background: #dc2626; }
    .mm-toast-warning { background: #d97706; }
    .mm-toast-info    { background: #f97316; }
    .mm-toast-icon  { font-size: 18px; flex-shrink: 0; }
    .mm-toast-close {
      margin-left: auto; background: none; border: none;
      color: rgba(255,255,255,.8); cursor: pointer; font-size: 16px;
      padding: 0 4px; flex-shrink: 0;
    }
    @keyframes mmSlideIn {
      from { opacity: 0; transform: translateX(40px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes mmSlideOut {
      from { opacity: 1; transform: translateX(0); }
      to   { opacity: 0; transform: translateX(40px); }
    }

    /* Skeleton shimmer */
    .mm-skeleton {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: mmShimmer 1.4s infinite;
      border-radius: 6px;
    }
    @keyframes mmShimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .mm-skeleton-text  { height: 16px; margin-bottom: 8px; }
    .mm-skeleton-block { height: 48px; }
    .mm-fade-in { animation: mmFadeIn .35s ease forwards; }
    @keyframes mmFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  `;
  document.head.appendChild(style);

  const container = document.createElement('div');
  container.id = 'mm-toast-container';
  document.body.appendChild(container);
})();

function showToast(message, type = 'info', duration = 3500) {
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const container = document.getElementById('mm-toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `mm-toast mm-toast-${type}`;
  toast.innerHTML = `
    <span class="mm-toast-icon">${icons[type] || icons.info}</span>
    <span>${message}</span>
    <button class="mm-toast-close">✕</button>
  `;
  toast.querySelector('.mm-toast-close').addEventListener('click', () => dismiss(toast));
  container.appendChild(toast);
  const t = setTimeout(() => dismiss(toast), duration);
  toast._timer = t;
}
function dismiss(toast) {
  clearTimeout(toast._timer);
  toast.classList.add('hiding');
  setTimeout(() => toast.remove(), 300);
}

// ─── Skeleton helpers ────────────────────────────────────────
function skeletonLine(w = '100%') {
  return `<div class="mm-skeleton mm-skeleton-text" style="width:${w}"></div>`;
}
function injectSkeletons() {
  // Shop info area
  const shopLink = document.getElementById('shop-link');
  if (shopLink) shopLink.innerHTML = skeletonLine('120px');
  const shopRating = document.getElementById('shop-rating');
  if (shopRating) shopRating.innerHTML = skeletonLine('80px');

  // Reviews placeholder
  const rSec = document.getElementById('reviews-section');
  if (rSec) rSec.innerHTML = `
    <div style="padding:24px 0">
      ${skeletonLine('160px')}
      ${skeletonLine('90%')}
      ${skeletonLine('80%')}
      ${skeletonLine('70%')}
    </div>`;

  // Lazy sections placeholder — just height-hold them
  ['shop-more-section', 'related-products-section'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.minHeight = '120px';
  });
}

// ─── Bootstrap ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const params    = getUrlParams();
  const productId = params.get('id');
  const urlStoreId = getStoreIdFromParams();

  if (!productId) { showError('Product ID not found'); return; }

  // Inject skeletons immediately so layout doesn't jump
  injectSkeletons();

  // 1. Kick off all three requests in parallel — don't await serially
  const headers = scopedHeaders({ 'Content-Type': 'application/json' }, urlStoreId);

  const [productResult, reviewsResult, sellerResult] = await Promise.allSettled([
    fetchWithTimeout(`${API_BASE}/products/${productId}`, { headers }),
    fetchWithTimeout(`${API_BASE}/reviews/product/${productId}`, { headers }),
    null  // seller fetch depends on product — resolved below
  ]);

  // 2. Parse product first (critical path)
  let product = null;
  if (productResult.status === 'fulfilled') {
    try {
      const json = await productResult.value.json();
      product = json.data;
    } catch (e) { /* fallback below */ }
  }

  if (!product) product = getMockProduct(productId);
  const productStoreId = getProductStoreId(product);
  if (productStoreId && !product.store_id) product.store_id = productStoreId;

  // 3. Render product immediately (no waiting for reviews/seller)
  renderProduct(product);
  setupEventListeners(product);
  updateCartCount();

  // 4. Track view fire-and-forget
  trackProductView(productId, productStoreId);

  // 5. Enrich with reviews (already in-flight, just parse)
  enrichWithReviews(product, reviewsResult);

  // 6. Fetch seller in parallel with the rest, update UI when ready
  fetchAndRenderSeller(product);

  // 7. Lazy-load below-the-fold sections via IntersectionObserver
  setupLazyLoad(product);
});

// ─── Timeout-wrapped fetch ───────────────────────────────────
function fetchWithTimeout(url, options = {}, ms = 6000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(id));
}

// ─── Fetch + render seller when ready ───────────────────────
async function fetchAndRenderSeller(product) {
  const storeId = getProductStoreId(product);
  if (!storeId) return;
  try {
    const res = await fetchWithTimeout(`${API_BASE}/seller/public/${storeId}`, {
      headers: scopedHeaders({}, storeId),
    }, 5000);
    if (!res.ok) return;
    const data = await res.json();
    if (data.status === 'success' && data.data?.store) {
      const store = data.data.store;
      product.seller = {
        id:              store.sellerId || product.seller_id,
        store_id:        store.id || store.storeId || storeId,
        shop_name:       store.businessName,
        rating:          store.rating,
        shop_avatar_url: store.storeLogo || store.avatarUrl || ''
      };
      if (!product.store_id) product.store_id = product.seller.store_id;
      renderSellerInfo(product.seller, storeId);
    }
  } catch (e) { /* non-critical */ }
}

function renderSellerInfo(seller, storeId) {
  const avatar = document.getElementById('shop-avatar');
  if (avatar) {
    avatar.src = seller.shop_avatar_url || 'https://via.placeholder.com/32';
    avatar.onerror = () => { avatar.src = 'https://via.placeholder.com/32'; };
    avatar.classList.add('mm-fade-in');
  }
  const link = document.getElementById('shop-link');
  if (link) {
    link.textContent = seller.shop_name || 'View Store';
    const resolvedStoreId = seller.store_id || seller.storeId || storeId || seller.id || '';
    link.href = `./store-id.html?store=${encodeURIComponent(resolvedStoreId)}`;
    link.classList.add('mm-fade-in');
  }
  const shopRating = document.getElementById('shop-rating');
  if (shopRating) {
    shopRating.textContent = seller.rating
      ? `⭐ ${Number(seller.rating).toFixed(1)} rating`
      : '';
    shopRating.classList.add('mm-fade-in');
  }
}

// ─── Enrich product with reviews data ───────────────────────
async function enrichWithReviews(product, reviewsResult) {
  let reviewData = null;
  if (reviewsResult && reviewsResult.status === 'fulfilled') {
    try {
      const json = await reviewsResult.value.json();
      if (json.status === 'success' && json.data) reviewData = json.data;
    } catch (e) { /* ignore */ }
  }

  if (!reviewData) return;

  product.reviews      = reviewData.reviews || [];
  product.review_count = reviewData.pagination?.totalReviews ?? product.reviews.length;
  product.rating       = parseFloat(reviewData.summary?.averageRating) || 0;

  // Re-render reviews section now that we have data
  if (typeof createReviews === 'function') {
    const rSec = document.getElementById('reviews-section');
    if (rSec) {
      rSec.innerHTML = '';
      createReviews(product);
      rSec.classList.add('mm-fade-in');
    }
  }
}

// ─── Lazy-load below-the-fold sections ──────────────────────
function setupLazyLoad(product) {
  if (!('IntersectionObserver' in window)) {
    // Fallback: render everything immediately
    renderBelowFold(product);
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      obs.unobserve(entry.target);
      const id = entry.target.id;
      renderLazySection(id, product);
    });
  }, { rootMargin: '200px 0px' }); // Start loading 200px before it's visible

  ['shop-more-section', 'related-products-section'].forEach(id => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });
}

function renderLazySection(id, product) {
  const el = document.getElementById(id);
  if (!el) return;

  if (id === 'shop-more-section' && typeof createShopMore === 'function') {
    createShopMore(product);
    el.classList.add('mm-fade-in');
  } else if (id === 'related-products-section' && typeof createRelatedProducts === 'function') {
    createRelatedProducts(product);
    el.classList.add('mm-fade-in');
  }
}

function renderBelowFold(product) {
  if (typeof createShopMore === 'function') createShopMore(product);
  if (typeof createRelatedProducts === 'function') createRelatedProducts(product);
}

// ─── Render Product (critical path — no seller/reviews needed) ─
function renderProduct(product) {
  document.title = `${product.name} - MarketMix`;

  const rules = (typeof getCategoryRules === 'function')
    ? getCategoryRules(product.category || product.category_name)
    : { displayName: product.category || 'Products' };

  setEl('breadcrumb-category', rules.displayName);
  setEl('breadcrumb-product',  product.name);
  setEl('product-title',       product.name);
  setEl('product-category',    rules.displayName);

  // Seller info: show whatever is already embedded on the product object
  // (the full profile fetch happens in parallel and will overwrite later)
  if (product.seller) {
    renderSellerInfo(product.seller, getProductStoreId(product));
  }

  // Price
  const basePrice   = Number(product.price) || 0;
  let   displayPrice = basePrice;

  if (product.flash_sale_active && product.flash_sale_discount) {
    displayPrice = basePrice * (100 - Number(product.flash_sale_discount)) / 100;
    const origEl = document.getElementById('original-price');
    if (origEl) { origEl.textContent = `$${basePrice.toFixed(2)}`; origEl.style.display = 'inline'; }
  } else if (product.effective_price && Number(product.effective_price) < basePrice) {
    displayPrice = Number(product.effective_price);
    const origEl = document.getElementById('original-price');
    if (origEl) { origEl.textContent = `$${basePrice.toFixed(2)}`; origEl.style.display = 'inline'; }
  }

  setEl('product-price', `$${displayPrice.toFixed(2)}`);

  // Stock
  const stockEl = document.getElementById('stock-status');
  if (stockEl) {
    const qty = Number(product.stock_quantity);
    if (qty > 0) {
      stockEl.innerHTML = `<span style="color:#22c55e">✓ In Stock (${qty} available)</span>`;
    } else {
      stockEl.innerHTML = `<span style="color:#ef4444">✗ Out of Stock</span>`;
      disableBtn('product-add-to-cart');
      disableBtn('product-checkout');
    }
  }

  if (product.views) setEl('view-count', product.views);
  setEl('product-description', product.description || 'No description available.');

  // Render components that don't depend on reviews/seller
  if (typeof createImageGallery    === 'function') createImageGallery(product);
  if (typeof createFlashSale       === 'function') createFlashSale(product);
  if (typeof createCategoryOptions === 'function') createCategoryOptions(product);

  // Reviews placeholder shown by injectSkeletons() is still there;
  // enrichWithReviews() will replace it when data arrives.
  // Trigger createReviews now only if we already have review data embedded.
  if (product.reviews?.length && typeof createReviews === 'function') {
    createReviews(product);
  }

  refreshWishlistButton(product.id);
}

// ─── Event Listeners ─────────────────────────────────────────
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

// ─── Add to Cart ─────────────────────────────────────────────
async function addToCart(product) {
  const qtyEl    = document.getElementById('product-quantity');
  const quantity = qtyEl ? (parseInt(qtyEl.value) || 1) : 1;
  const color    = window.productOptions?.color?.() || null;
  const size     = window.productOptions?.size?.()  || null;

  const cartItem = {
    id: product.id, name: product.name,
    price: product.price, image: product.main_image_url,
    quantity, color, size,
    sellerId: product.seller?.id || product.seller_id || null,
    storeId: getProductStoreId(product) || null
  };

  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const existing = cart.find(i => i.id === cartItem.id && i.color === cartItem.color && i.size === cartItem.size);
  if (existing) { existing.quantity += quantity; } else { cart.push(cartItem); }
  localStorage.setItem('cart', JSON.stringify(cart));

  // Backend sync — fire and forget, don't block the UI
  const token = localStorage.getItem('token');
  const storeId = getProductStoreId(product);
  if (token) {
    fetch(`${API_BASE}/cart/add`, {
      method: 'POST',
      headers: scopedHeaders({ 'Content-Type': 'application/json' }, storeId),
      body: JSON.stringify({ product_id: product.id, quantity, store_id: storeId || undefined })
    }).catch(e => console.warn('Cart sync error:', e));
  }

  showToast(`${product.name} added to cart!`, 'success');
  updateCartCount();
}

// ─── Wishlist ────────────────────────────────────────────────
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
    btn.textContent = '❤️ Wishlisted';
    btn.style.background = '#fef2ee'; btn.style.color = '#f97316';
  } else {
    btn.textContent = '❤️ Add to Wishlist';
    btn.style.background = '#fafafa'; btn.style.color = '#f97316';
  }
}

async function handleWishlist(product) {
  const btn   = document.getElementById('product-add-to-wishlist');
  const token = localStorage.getItem('token');
  const storeId = getProductStoreId(product);
  const alreadyWished = isWishlisted(product.id);

  if (btn) { btn.disabled = true; btn.textContent = alreadyWished ? 'Removing…' : 'Adding…'; }

  if (!token) {
    setWishlisted(product.id, !alreadyWished);
    refreshWishlistButton(product.id);
    showToast(alreadyWished ? 'Removed from wishlist' : 'Added to wishlist', alreadyWished ? 'info' : 'success');
    if (btn) btn.disabled = false;
    return;
  }

  try {
    if (alreadyWished) {
      const wRes = await fetch(`${API_BASE}/wishlist`, { headers: scopedHeaders({}, storeId) });
      if (wRes.ok) {
        const wData = await wRes.json();
        const item  = (wData.data?.items || []).find(i => String(i.product_id) === String(product.id));
        if (item) {
          await fetch(`${API_BASE}/wishlist/remove/${item.id}`, {
            method: 'DELETE', headers: scopedHeaders({}, storeId)
          });
        }
      }
      setWishlisted(product.id, false);
      showToast('Removed from wishlist', 'info');
    } else {
      const res = await fetch(`${API_BASE}/wishlist/add`, {
        method: 'POST',
        headers: scopedHeaders({ 'Content-Type': 'application/json' }, storeId),
        body: JSON.stringify({ product_id: product.id, store_id: storeId || undefined })
      });
      if (res.ok || res.status === 200) {
        setWishlisted(product.id, true);
        showToast('Added to wishlist ❤️', 'success');
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

// ─── Checkout ────────────────────────────────────────────────
async function proceedToCheckout(product) {
  const qtyEl    = document.getElementById('product-quantity');
  const quantity = qtyEl ? (parseInt(qtyEl.value) || 1) : 1;
  const color    = window.productOptions?.color?.() || null;
  const size     = window.productOptions?.size?.()  || null;

  const cartItem = {
    id: product.id, name: product.name,
    price: product.price, image: product.main_image_url,
    quantity, color, size,
    sellerId: product.seller?.id || product.seller_id || null,
    storeId: getProductStoreId(product) || null
  };

  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const existing = cart.find(i => i.id === cartItem.id && i.color === cartItem.color && i.size === cartItem.size);
  if (existing) { existing.quantity += quantity; } else { cart.push(cartItem); }
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();

  const token = localStorage.getItem('token');
  const storeId = getProductStoreId(product);
  if (token) {
    // Fire and forget — don't block navigation
    fetch(`${API_BASE}/cart/add`, {
      method: 'POST',
      headers: scopedHeaders({ 'Content-Type': 'application/json' }, storeId),
      body: JSON.stringify({ product_id: product.id, quantity, store_id: storeId || undefined })
    }).catch(() => {});
    window.location.href = './checkout.html';
  } else {
    localStorage.setItem('after_login_redirect', './checkout.html');
    localStorage.setItem('post_login_redirect',  './checkout.html');
    window.location.href = 'login for buyers.html';
  }
}

// ─── Track View (fire and forget) ───────────────────────────
function trackProductView(productId, storeId = getStoreIdFromParams()) {
  fetch(`${API_BASE}/products/${productId}/view`, {
    method: 'POST',
    headers: scopedHeaders({ 'Content-Type': 'application/json' }, storeId)
  }).catch(() => {});
}

// ─── Cart Count ──────────────────────────────────────────────
function updateCartCount() {
  const cart  = JSON.parse(localStorage.getItem('cart') || '[]');
  const count = cart.reduce((s, i) => s + (i.quantity || 0), 0);
  document.querySelectorAll('#mm-cart-count, .cart-count').forEach(el => {
    el.textContent = count;
  });
}

// ─── Helpers ─────────────────────────────────────────────────
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
      <a href="../index.html" style="display:inline-block;padding:12px 24px;background:#f97316;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">← Back to Home</a>
    </div>`;
}

// ─── Mock Data Fallback ───────────────────────────────────────
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
    flash_sale_active: false,
    flash_sale_discount: 0,
    views: 0,
    seller: { id: null, shop_name: 'MarketMix Store', rating: 4.5, shop_avatar_url: '' },
    reviews: [],
    relatedProducts: [],
    sellerProducts: []
  };
}
