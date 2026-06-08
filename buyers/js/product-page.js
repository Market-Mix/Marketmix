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

  let headers = scopedHeaders({ 'Content-Type': 'application/json' }, urlStoreId);

  // Kick off product + reviews in parallel
  const [productResult, reviewsResult] = await Promise.allSettled([
    fetchWithTimeout(`${API_BASE}/products/${productId}`, { headers }),
    fetchWithTimeout(`${API_BASE}/reviews/product/${productId}?${urlStoreId ? `store_id=${urlStoreId}` : ''}`, { headers }),
  ]);

  // Parse product (critical path)
  let product = null;
  if (productResult.status === 'fulfilled') {
    try {
      const j = await productResult.value.json();
      const data = j.data;
      if (Array.isArray(data)) {
        product = data.find(p => String(p.id) === String(productId)) || data[0] || null;
      } else {
        product = data || null;
      }
    } catch (_) {}
  }
  if (!product) product = getMockProduct(productId);

  // Normalize product metadata for the UI
  if (!product.dynamic_fields || typeof product.dynamic_fields !== 'object') {
    product.dynamic_fields = {};
  }
  if (product.weight_kg && !product.dynamic_fields.weight) {
    product.dynamic_fields.weight = `${product.weight_kg} kg`;
  }
  if (product.size && !product.dynamic_fields.size) {
    product.dynamic_fields.size = product.size;
  }
  if (product.views == null) {
    product.views = product.view_count ?? product.total_views ?? product.totalViews ?? 0;
  }
  if (product.review_count == null) {
    product.review_count = Array.isArray(product.reviews) ? product.reviews.length : 0;
  }
  if (product.rating == null) {
    product.rating = 0;
  }

  // Resolve and persist store id on the product object
  const productStoreId = getProductStoreId(product);
  if (productStoreId && !product.store_id) product.store_id = productStoreId;

  // Render product immediately
  renderProduct(product);
  window._currentProduct = product;

  if (product.vendor_location) {
    const locEl = document.getElementById('stock-status');
    if (locEl) locEl.innerHTML += ` &bull; ${product.vendor_location}`;
  }
  const descEl = document.getElementById('product-description');
  if (product.return_accepted === false && descEl) {
    descEl.insertAdjacentHTML('afterend', '<div style="margin-top:8px;color:#dc2626;font-size:13px;font-weight:600">No returns accepted</div>');
  }
  if (product.delivery_available === false && descEl) {
    descEl.insertAdjacentHTML('afterend', '<div style="margin-top:8px;color:#f97316;font-size:13px;font-weight:600">No delivery — pickup only</div>');
  }

  if (productStoreId && !urlStoreId) {
    syncStoreParam(productStoreId);
    Object.assign(headers, scopedHeaders({ 'Content-Type': 'application/json' }, productStoreId));
  }

  setupEventListeners(product);
  updateCartCount();

  // Fire-and-forget: track view
  trackProductView(productId, productStoreId);

  // Enrich with reviews (already in-flight)
  enrichWithReviews(product, reviewsResult);

  // Fetch seller using the new stores/public/:storeId endpoint
  // Await so we can fall back to Supabase product_listings if needed
  try {
    await fetchSellerFromBackend(product);
  } catch (_) { /* non-critical */ }

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
// Try resolving seller/store info from backend endpoints (same source as product data)
function isPlaceholderSellerName(name) {
  if (!name) return true;
  const normalized = String(name).trim();
  if (!normalized) return true;
  return /market\s?mix/i.test(normalized) && /store/i.test(normalized);
}

async function fetchSellerFromBackend(product) {
  if (!product) return;

  const rawSellerName = product.seller?.shop_name || product.seller?.businessName || product.seller?.business_name || product.seller?.name || '';
  const hasRating = product.seller?.rating != null && product.seller?.rating !== '';
  const showImmediateSeller = rawSellerName && !isPlaceholderSellerName(rawSellerName);

  // Render existing seller info immediately, but keep fetching if rating is missing.
  if (product.seller && showImmediateSeller) {
    product.seller.shop_name = formatSellerName(rawSellerName);
    renderSellerInfo(product.seller, getProductStoreId(product));
    if (hasRating) return;
  }

  const storeId = getProductStoreId(product) || product.store_id || product.storeId || null;
  const sellerId = product.seller_id || product.sellerId || product.seller?.id || null;

  // Priority 1: store_id endpoint (most accurate)
  if (storeId) {
    try {
      const res = await fetchWithTimeout(
        `${API_BASE}/seller/stores/public/${storeId}`,
        { headers: scopedHeaders({}, storeId) },
        5000
      );
      if (res && res.ok) {
        const j = await res.json();
        const store = j.data?.store;
        if (store) {
          product.seller = product.seller || {};
          product.seller.id = store.sellerId || store.seller_id || sellerId;
          product.seller.store_id = storeId;
          product.seller.shop_name = formatSellerName(store.businessName || store.business_name || store.name || '');
          product.seller.rating = store.rating || product.seller.rating;
          product.seller.shop_avatar_url = store.storeLogo || store.store_logo_url || '';
          renderSellerInfo(product.seller, storeId);
          return;
        }
      }
    } catch (_) {}
  }

  // Priority 2: seller_id endpoint
  if (sellerId) {
    try {
      const res = await fetchWithTimeout(
        `${API_BASE}/seller/public/${sellerId}`,
        { headers: scopedHeaders({}, storeId) },
        5000
      );
      if (res && res.ok) {
        const j = await res.json();
        const store = j.data?.store;
        if (store) {
          const returnedStoreId = store.storeId || store.store_id;
          if (!storeId || !returnedStoreId || returnedStoreId === storeId) {
            product.seller = product.seller || {};
            product.seller.id = sellerId;
            product.seller.store_id = returnedStoreId || storeId;
            product.seller.shop_name = formatSellerName(store.businessName || store.business_name || store.name || '');
            product.seller.rating = store.rating || product.seller.rating;
            product.seller.shop_avatar_url = store.storeLogo || store.store_logo_url || '';
            renderSellerInfo(product.seller, product.seller.store_id || storeId);
          }
        }
      }
    } catch (_) {}
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

function formatSellerName(rawName) {
  if (!rawName) return '';
  const normalized = rawName.trim();
  if (!normalized) return '';
  if (/store$/i.test(normalized)) return normalized;
  return `${normalized} Store`;
}

function renderSellerInfo(seller, storeId) {
  const avatar = document.getElementById('shop-avatar');
  if (avatar) {
    avatar.src = seller?.shop_avatar_url || 'marketplace.png';
    avatar.onerror = () => { avatar.src = 'marketplace.png'; };
    avatar.classList.add('mm-fade-in');
  }

  const shopName = seller ?
    formatSellerName(
      seller.shop_name || seller.businessName || seller.business_name || seller.name ||
      [seller.firstName, seller.lastName].filter(Boolean).join(' ')
    ) : '';

  const link = document.getElementById('shop-link');
  if (link) {
    if (shopName) {
      link.textContent = shopName;
      const resolvedStoreId = storeId || seller?.store_id || seller?.storeId || '';
      const resolvedSellerId = seller?.id || seller?.sellerId || seller?.seller_id || '';

      if (resolvedStoreId) {
        link.href = `./store-id.html?store=${encodeURIComponent(resolvedStoreId)}`;
      } else if (resolvedSellerId) {
        link.href = `./store-id.html?seller=${encodeURIComponent(resolvedSellerId)}`;
      } else {
        link.href = '#';
      }
    } else {
      link.textContent = '';
      link.href = '#';
    }
    link.classList.add('mm-fade-in');
  }

  const shopRating = document.getElementById('shop-rating');
  if (shopRating) {
    shopRating.textContent = seller?.rating
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

  // If no reviews yet, try fetching with store context
  if (!reviewData) {
    const storeId = getProductStoreId(product);
    try {
      const res = await fetchWithTimeout(
        `${API_BASE}/reviews/product/${product.id}${storeId ? `?store_id=${storeId}` : ''}`,
        { headers: scopedHeaders({}, storeId) },
        5000
      );
      if (res && res.ok) {
        const j = await res.json();
        if (j.data) reviewData = j.data;
      }
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

function renderProductDetails(product) {
  const container = document.getElementById('category-options');
  if (!container) return;

  function escapeHtml(text) {
    if (text == null) return '';
    return String(text).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
  }

  let html = '';

  const dynFields = typeof product.dynamic_fields === 'string'
    ? JSON.parse(product.dynamic_fields || '{}')
    : (product.dynamic_fields || {});

  const catMeta = typeof product.category_meta === 'string'
    ? JSON.parse(product.category_meta || '{}')
    : (product.category_meta || {});

  const allFields = { ...catMeta, ...dynFields };

  if (Object.keys(allFields).length) {
    html += `<div class="mm-detail-section" style="margin-bottom:16px;">`;
    html += `<div class="mm-detail-title" style="font-weight:700;color:#334155;margin-bottom:10px">Product Details</div>`;
    html += `<div class="mm-detail-grid" style="display:grid;gap:10px">`;

    for (const [key, value] of Object.entries(allFields)) {
      if (value == null || value === '') continue;
      const label = key.replace(/_/g,' ').replace(/\b\w/g, l => l.toUpperCase());
      const displayVal = Array.isArray(value) ? value.join(', ') : value;
      html += `
        <div class="mm-detail-row" style="padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#fff">
          <div style="font-size:12px;color:#64748b;margin-bottom:6px">${escapeHtml(label)}</div>
          <div style="font-size:14px;color:#1e293b;font-weight:500">${escapeHtml(displayVal)}</div>
        </div>`;
    }

    html += '</div></div>';
  }

  const color = allFields.color || allFields.cat_color || product.color;
  if (color) {
    const colors = Array.isArray(color) ? color : String(color).split(',').map(c => c.trim()).filter(Boolean);
    if (colors.length > 1) {
      html += `<div class="mm-detail-section" style="margin-bottom:16px;">
        <div class="mm-detail-title" style="font-weight:700;color:#334155;margin-bottom:10px">Color</div>
        <div class="mm-detail-chips" style="display:flex;flex-wrap:wrap;gap:8px">`;
      colors.forEach((c, i) => {
        html += `<button type="button" data-val="${escapeHtml(c)}" onclick="selectOption('color', ${i}, this)" style="padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;color:#475569;cursor:pointer">${escapeHtml(c)}</button>`;
      });
      html += '</div></div>';
    }
  }

  const size = allFields.size || allFields.cat_size || product.size;
  if (size) {
    const sizes = Array.isArray(size) ? size : String(size).split(',').map(s => s.trim()).filter(Boolean);
    if (sizes.length > 1) {
      html += `<div class="mm-detail-section" style="margin-bottom:16px;">
        <div class="mm-detail-title" style="font-weight:700;color:#334155;margin-bottom:10px">Size</div>
        <div class="mm-detail-chips" style="display:flex;flex-wrap:wrap;gap:8px">`;
      sizes.forEach((s, i) => {
        html += `<button type="button" data-val="${escapeHtml(s)}" onclick="selectOption('size', ${i}, this)" style="padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;color:#475569;cursor:pointer">${escapeHtml(s)}</button>`;
      });
      html += '</div></div>';
    }
  }

  container.insertAdjacentHTML('beforeend', html);
}

function renderVariants(product) {
  const variants = typeof product.variants === 'string'
    ? JSON.parse(product.variants || '[]')
    : (product.variants || []);
  if (!variants.length) return;

  const container = document.getElementById('category-options');
  if (!container) return;

  let html = `<div id="variantSelector" class="mm-variant-section" style="margin-bottom:16px;">
    <div class="mm-detail-title" style="font-weight:700;color:#334155;margin-bottom:10px">Variants</div>
    <div style="display:grid;gap:10px">`;

  variants.forEach((v, i) => {
    if (!v.name) return;
    html += `<button type="button" data-idx="${i}" onclick="selectVariant(${i}, this)" style="text-align:left;padding:12px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;color:#1e293b;cursor:pointer">
      <div style="font-weight:700;margin-bottom:6px">${escapeHtml(v.name)}</div>
      ${v.price ? `<div style="font-size:13px;color:#f97316;font-weight:600">₦${parseFloat(v.price).toLocaleString()}</div>` : ''}
      ${v.stock != null ? `<div style="font-size:12px;color:#64748b;margin-top:6px">${escapeHtml(String(v.stock))} in stock</div>` : ''}
    </button>`;
  });

  html += '</div></div>';
  container.insertAdjacentHTML('beforeend', html);
  const firstBtn = document.querySelector('#variantSelector [data-idx="0"]');
  if (firstBtn) selectVariant(0, firstBtn);
}

function selectOption(type, idx, btn) {
  const parent = btn.parentElement;
  if (!parent) return;
  parent.querySelectorAll('button').forEach(b => {
    b.style.borderColor = '#e2e8f0';
    b.style.background = '#fff';
  });
  btn.style.borderColor = '#f97316';
  btn.style.background = '#fff7ed';
  window._selectedOptions = window._selectedOptions || {};
  window._selectedOptions[type] = btn.dataset.val;
}

function selectVariant(idx, el) {
  const product = window._currentProduct;
  const variants = typeof product?.variants === 'string'
    ? JSON.parse(product.variants || '[]')
    : (product?.variants || []);
  const v = variants[idx];
  if (!v) return;

  window._selectedOptions = window._selectedOptions || {};
  window._selectedOptions.variant = v;

  if (v.price) {
    const priceEl = document.getElementById('product-price');
    if (priceEl) priceEl.textContent = `₦${parseFloat(v.price).toLocaleString('en-NG', {minimumFractionDigits:2})}`;
  }

  const stockEl = document.getElementById('stock-status');
  if (stockEl && v.stock != null) {
    const qty = Number(v.stock);
    stockEl.innerHTML = qty > 0
      ? `<span style="color:#22c55e">✓ In Stock (${qty} available)</span>`
      : `<span style="color:#ef4444">✗ Out of Stock</span>`;
    if (qty <= 0) {
      disableBtn('product-add-to-cart', 'Out of stock');
      disableBtn('product-checkout', 'Out of stock');
    }
  }

  if (el) {
    document.querySelectorAll('#variantSelector button').forEach(l => {
      l.style.borderColor = '#e2e8f0';
      l.style.background = '#fff';
    });
    el.style.borderColor = '#f97316';
    el.style.background = '#fff7ed';
  }
}

function renderMediaGallery(product) {
  const gallery = document.getElementById('image-gallery');
  if (!gallery) return;

  const images = Array.isArray(product.images) ? product.images
    : (product.images ? [product.images] : []);
  if (product.main_image_url && !images.includes(product.main_image_url)) {
    images.unshift(product.main_image_url);
  }

  const hasVideo = !!product.product_video_url;

  const thumbsHtml = images.map((img, i) => `
      <button type="button" class="mm-gallery-thumb" data-type="image" data-src="${img}" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;background:#fff;cursor:pointer">
        <img src="${img}" alt="Thumbnail ${i+1}" style="width:80px;height:80px;object-fit:cover;display:block">
      </button>`).join('');

  const videoThumb = hasVideo ? `
      <button type="button" class="mm-gallery-thumb" data-type="video" data-src="${product.product_video_url}" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;background:#000;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;width:80px;height:80px">
        ▶ Video
      </button>` : '';

  gallery.innerHTML = `
    <div id="gallery-main" class="mm-gallery-main" style="border-radius:16px;overflow:hidden;background:#f8fafc;margin-bottom:14px;min-height:320px;display:flex;align-items:center;justify-content:center">
      <div id="gallery-main-content"></div>
    </div>
    <div class="mm-gallery-thumbs" style="display:flex;flex-wrap:wrap;gap:10px">${thumbsHtml}${videoThumb}</div>
  `;

  const setFirst = hasVideo ? 'video' : 'image';
  const firstSrc = hasVideo ? product.product_video_url : (images[0] || '');
  setMainMedia(setFirst, firstSrc);

  gallery.querySelectorAll('.mm-gallery-thumb').forEach(btn => {
    btn.addEventListener('click', () => setMainMedia(btn.dataset.type, btn.dataset.src, btn));
  });
}

function setMainMedia(type, src, btn) {
  const container = document.getElementById('gallery-main-content');
  if (!container) return;
  if (type === 'video') {
    container.innerHTML = `
      <video controls style="width:100%;height:100%;max-height:560px;object-fit:contain;background:#000" poster="${src}">
        <source src="${src}" type="video/mp4">
        <source src="${src}" type="video/webm">
        Your browser does not support video.
      </video>`;
  } else {
    container.innerHTML = `
      <img id="gallery-main-img" src="${src}" alt="Product media" style="width:100%;height:auto;object-fit:contain;cursor:pointer">`;
    const mainImg = document.getElementById('gallery-main-img');
    if (mainImg) {
      mainImg.addEventListener('click', () => {
        const lbImg = document.getElementById('mm-lightbox-img');
        if (lbImg) lbImg.src = src;
        const lb = document.getElementById('mm-lightbox');
        if (lb) lb.style.display = 'flex';
      });
    }
  }

  if (btn) {
    document.querySelectorAll('.mm-gallery-thumb').forEach(b => {
      b.style.borderColor = '#e2e8f0';
      b.style.background = '#fff';
      b.style.color = '#000';
    });
    btn.style.borderColor = '#f97316';
    btn.style.background = '#fff7ed';
  }
}

// ── Render product (critical path) ───────────────────────────
function renderProduct(product) {
  window._currentProduct = product;
  document.title = `${product.name} - MarketMix`;

  const rules = (typeof getCategoryRules === 'function')
    ? getCategoryRules(product.category || product.category_name)
    : { displayName: product.category || 'Products' };

  setEl('breadcrumb-category', rules.displayName);
  setEl('breadcrumb-product',  product.name);
  setEl('product-title',       product.name);
  setEl('product-category',    rules.displayName);

  renderSellerInfo(product.seller || (product.business_name || product.businessName ? {
    shop_name: product.business_name || product.businessName,
    rating: product.rating || 0,
    shop_avatar_url: product.main_image_url || '',
    store_id: getProductStoreId(product),
  } : null), getProductStoreId(product));

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
    const inStock = qty > 0;
    stockEl.innerHTML = inStock
      ? `<span style="color:#22c55e">✓ In Stock (${qty} available)</span>`
      : `<span style="color:#ef4444">✗ Out of Stock</span>`;
    if (!inStock) {
      disableBtn('product-add-to-cart', 'Out of stock');
      disableBtn('product-checkout', 'Out of stock');
      disableBtn('product-add-to-wishlist', 'Out of stock');
    }
  }

  const viewCount = product.views ?? product.view_count ?? product.total_views ?? product.totalViews ?? 0;
  setEl('view-count', Number(viewCount) || 0);
  setEl('product-description', product.description || product.short_description || 'No description available.');

  renderMediaGallery(product);
  if (typeof createCategoryOptions === 'function') createCategoryOptions(product);
  renderProductDetails(product);
  renderVariants(product);
  if (typeof createFlashSale       === 'function') createFlashSale(product);

  if (typeof createReviews === 'function') createReviews(product);

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
  const stockQty = Number(product.stock_quantity) || 0;
  if (stockQty <= 0) {
    showToast('Product is out of stock', 'error');
    return;
  }

  const qtyEl   = document.getElementById('product-quantity');
  const quantity = qtyEl ? (parseInt(qtyEl.value) || 1) : 1;
  const opts     = window._selectedOptions || {};
  const variant  = opts.variant || window.productOptions?.variant?.() || null;
  const color    = opts.color || window.productOptions?.color?.() || variant?.color || null;
  const size     = opts.size || window.productOptions?.size?.() || variant?.size || null;
  const storeId  = getProductStoreId(product);

  // 1. Update local cart immediately (no round-trip needed)
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const existing = cart.find(i =>
    i.id === product.id && i.color === color && i.size === size && i.variant?.sku === variant?.sku
  );
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.main_image_url,
      quantity,
      color,
      size,
      variant: variant ? { ...variant } : null,
      sku: variant?.sku || null,
      sellerId: product.seller?.id || product.seller_id || null,
      storeId,
      store_id: storeId || null,
    });
  }
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  const variantInfo = variant?.name ? ` (${variant.name})` : '';
  showToast(`${product.name}${variantInfo} added to cart!`, 'success');

  // 2. Sync to backend (fire-and-forget — don't block the UI)
  const token = localStorage.getItem('token');
  if (token) {
    fetch(`${API_BASE}/cart/add`, {
      method: 'POST',
      headers: scopedHeaders({ 'Content-Type': 'application/json' }, storeId),
      body: JSON.stringify({
        product_id: product.id,
        quantity,
        store_id: storeId || null,
        seller_id: product.seller_id || product.seller?.id || null,
        ...(color    && { color }),
        ...(size     && { size }),
        ...(variant?.sku && { sku: variant.sku }),
      }),
    }).catch(e => console.warn('Cart sync error:', e));
  }
}

// ── Proceed to Checkout ───────────────────────────────────────
// Same as addToCart but also navigates to checkout
async function proceedToCheckout(product) {
  const stockQty = Number(product.stock_quantity) || 0;
  if (stockQty <= 0) {
    showToast('Product is out of stock', 'error');
    return;
  }

  const qtyEl   = document.getElementById('product-quantity');
  const quantity = qtyEl ? (parseInt(qtyEl.value) || 1) : 1;
  const opts     = window._selectedOptions || {};
  const variant  = opts.variant || window.productOptions?.variant?.() || null;
  const color    = opts.color || window.productOptions?.color?.() || variant?.color || null;
  const size     = opts.size || window.productOptions?.size?.() || variant?.size || null;
  const storeId  = getProductStoreId(product);

  // Update local cart
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const existing = cart.find(i =>
    i.id === product.id && i.color === color && i.size === size && i.variant?.sku === variant?.sku
  );
  if (existing) { existing.quantity += quantity; }
  else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.main_image_url,
      quantity,
      color,
      size,
      variant: variant ? { ...variant } : null,
      sku: variant?.sku || null,
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
        body: JSON.stringify({
          ...storeScopedBody({
            product_id: product.id,
            quantity,
          }, storeId),
          ...(color    && { color }),
          ...(size     && { size }),
          ...(variant?.sku && { sku: variant.sku }),
        }),
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
function getAuthRole() {
  return localStorage.getItem('userRole') || null;
}

function getTokenPayload() {
  const token = localStorage.getItem('token');
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.warn('Could not decode token payload:', e);
    return null;
  }
}

function getTokenRole() {
  const payload = getTokenPayload();
  if (payload?.role) {
    const role = String(payload.role).toLowerCase();
    const current = String(getAuthRole() || '').toLowerCase();
    if (role && role !== current) {
      localStorage.setItem('userRole', role);
    }
    return role;
  }
  return String(getAuthRole() || '').toLowerCase();
}

function isBuyerAccount() {
  return Boolean(localStorage.getItem('token')) && getTokenRole() === 'buyer';
}

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
  const stockQty = Number(product.stock_quantity) || 0;
  if (stockQty <= 0) {
    showToast('Product is out of stock', 'error');
    return;
  }

  const btn = document.getElementById('product-add-to-wishlist');
  const token = localStorage.getItem('token');
  const alreadyWishlisted = isWishlisted(product.id);

  if (btn) { btn.disabled = true; btn.textContent = alreadyWishlisted ? 'Removing…' : 'Adding…'; }

  if (!token || !isBuyerAccount()) {
    const tokenRole = getTokenRole();
    if (token && tokenRole !== 'buyer') {
      showToast('Logged in with a seller token. Wishlist stays local until you sign in as a buyer.', 'warning');
    }
    setWishlisted(product.id, !alreadyWishlisted);
    refreshWishlistButton(product.id);
    showToast(alreadyWishlisted ? 'Removed from wishlist' : 'Added to wishlist', alreadyWishlisted ? 'info' : 'success');
    if (btn) btn.disabled = false;
    return;
  }

  try {
    if (alreadyWishlisted) {
      const wRes = await fetch(`${API_BASE}/wishlist`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (wRes.ok) {
        const wData = await wRes.json();
        const item = (wData.data?.items || []).find(i => String(i.product_id) === String(product.id));
        if (item) {
          await fetch(`${API_BASE}/wishlist/remove/${item.id}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
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
      const res = await fetch(`${API_BASE}/wishlist/add`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ product_id: product.id })
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
        const msg = err.message || '';
        if (res.status === 403 && /seller/i.test(msg)) {
          console.warn('Wishlist endpoint rejected request (seller role). Falling back to local wishlist.');
          setWishlisted(product.id, true);
          showToast('Your auth token appears seller-scoped, so wishlist was saved locally only. Please sign in as a buyer to sync.', 'warning');
        } else {
          showToast(msg || 'Could not update wishlist', 'error');
        }
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
async function trackProductView(productId, storeId = getStoreIdFromParams()) {
  if (!productId) return;
  try {
    const res = await fetch(`${API_BASE}/products/${productId}/view`, {
      method: 'POST',
      headers: scopedHeaders({ 'Content-Type': 'application/json' }, storeId)
    });
    if (!res.ok) return;
    const j = await res.json();
    const newViews = j.data?.views ?? null;
    if (newViews != null) {
      setEl('view-count', Number(newViews) || 0);
      console.log(`✅ View tracked: ${newViews} views`);
    }
  } catch (err) {
    console.warn('View tracking error:', err.message);
  }
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
function disableBtn(id, text) {
  const btn = document.getElementById(id);
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
    btn.style.pointerEvents = 'none';
    btn.setAttribute('aria-disabled', 'true');
    if (typeof text === 'string') btn.textContent = text;
  }
}
function onBtn(id, fn) {
  const btn = document.getElementById(id);
  if (btn) {
    btn.addEventListener('click', e => {
      if (btn.disabled || btn.getAttribute('aria-disabled') === 'true') return;
      fn(e);
    });
  }
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
    images: [],
    relatedProducts: [],
    sellerProducts: [],
  };
}
