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
  window._currentProduct = product;

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

  // 1) Try seller_id endpoint
  const sellerId = product.seller_id || product.sellerId || product.seller?.id || null;
  if (sellerId) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/seller/public/${sellerId}`, { headers: scopedHeaders({}, getProductStoreId(product)) }, 5000);
      if (res && res.ok) {
        const j = await res.json();
        const store = j.data?.store;
        if (store) {
          product.seller = product.seller || {};
          product.seller.shop_name = formatSellerName(store.businessName || store.business_name || store.name || '');
          product.seller.shop_avatar_url = store.storeLogo || store.store_logo_url || '';
          product.seller.rating = store.rating || product.seller.rating;
          product.seller.store_id = store.storeId || store.store_id || product.store_id || null;
          renderSellerInfo(product.seller, product.seller.store_id || getProductStoreId(product));
          return;
        }
      }
    } catch (e) { /* ignore */ }
  }

  // 2) Try store_id endpoint
  const storeId = getProductStoreId(product) || product.store_id || product.storeId || null;
  if (storeId) {
    try {
      const res2 = await fetchWithTimeout(`${API_BASE}/seller/stores/public/${storeId}`, { headers: scopedHeaders({}, storeId) }, 5000);
      if (res2 && res2.ok) {
        const j2 = await res2.json();
        const store2 = j2.data?.store;
        if (store2) {
          product.seller = product.seller || {};
          product.seller.shop_name = formatSellerName(store2.businessName || store2.business_name || store2.name || '');
          product.seller.shop_avatar_url = store2.storeLogo || store2.store_logo_url || '';
          product.seller.rating = store2.rating || product.seller.rating;
          product.seller.store_id = store2.storeId || store2.store_id || storeId;
          renderSellerInfo(product.seller, product.seller.store_id || storeId);
          return;
        }
      }
    } catch (e) { /* ignore */ }
  }

  // Nothing found — leave default
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
      const resolvedStoreId = seller?.store_id || seller?.storeId || storeId || seller?.sellerId || seller?.seller_id || '';
      link.href = resolvedStoreId
        ? `./store-id.html?store=${encodeURIComponent(resolvedStoreId)}`
        : '#';
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

  if (product.views) setEl('view-count', product.views);
  setEl('product-description', product.description || 'No description available.');

  if (product.vendor_location) {
    const locEl = document.getElementById('stock-status');
    if (locEl) locEl.innerHTML += ` &bull; <span style="font-weight:600;color:#1f2937">${esc(product.vendor_location)}</span>`;
  }
  if (product.return_accepted === false) {
    const descEl = document.getElementById('product-description');
    if (descEl) descEl.insertAdjacentHTML('afterend', '<p style="margin:10px 0 0;color:#dc2626;font-weight:600;font-size:13px">No returns accepted.</p>');
  }
  if (product.delivery_available === false) {
    const descEl = document.getElementById('product-description');
    if (descEl) descEl.insertAdjacentHTML('afterend', '<p style="margin:10px 0 0;color:#dc2626;font-weight:600;font-size:13px">No delivery — pickup only.</p>');
  }

  if (typeof renderMediaGallery === 'function') renderMediaGallery(product);
  else if (typeof createImageGallery === 'function') createImageGallery(product);

  if (typeof createFlashSale       === 'function') createFlashSale(product);
  if (typeof renderProductDetails  === 'function') renderProductDetails(product);
  else if (typeof createCategoryOptions === 'function') createCategoryOptions(product);
  if (typeof renderVariants === 'function') renderVariants(product);

  if (product.reviews?.length && typeof createReviews === 'function') createReviews(product);

  refreshWishlistButton(product.id);
}

// ── Dynamic product details / variants / media helpers ─────────────────
function parseJsonField(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch (_) { return fallback; }
  }
  return value;
}

function renderProductDetails(product) {
  const container = document.getElementById('category-options');
  if (!container) return;

  const dynFields = parseJsonField(product.dynamic_fields, {});
  const catMeta = parseJsonField(product.category_meta, {});
  const allFields = { ...catMeta, ...dynFields };

  let html = '';

  if (Object.keys(allFields).length) {
    html += `<div style="margin-bottom:18px;padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#fafafa">`;
    html += `<div style="font-size:14px;font-weight:700;color:#1e293b;margin-bottom:12px">Product Details</div>`;
    Object.entries(allFields).forEach(([key, value]) => {
      if (value == null || value === '') return;
      const label = key.replace(/_/g,' ').replace(/\b\w/g, l => l.toUpperCase());
      const displayVal = Array.isArray(value) ? value.join(', ') : value;
      html += `<div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-top:1px solid #e2e8f0;">`;
      html += `<div style="color:#475569;font-size:13px;font-weight:600">${esc(label)}</div>`;
      html += `<div style="color:#1f2937;font-size:13px;text-align:right;max-width:60%">${esc(displayVal)}</div>`;
      html += `</div>`;
    });
    html += `</div>`;
  }

  const color = allFields.color || allFields.cat_color || product.color;
  const colors = Array.isArray(color) ? color : color ? String(color).split(',').map(c => c.trim()).filter(Boolean) : [];
  if (colors.length > 1) {
    html += `<div style="margin-bottom:18px;padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#fff">`;
    html += `<div style="font-size:14px;font-weight:700;color:#1e293b;margin-bottom:10px">Color</div>`;
    html += `<div style="display:flex;flex-wrap:wrap;gap:8px" id="colorSelector">`;
    colors.forEach((c, i) => {
      html += `<button type="button" data-type="color" data-idx="${i}" data-val="${esc(c)}" style="padding:8px 12px;border:1px solid #e2e8f0;border-radius:999px;background:#fff;color:#1f2937;cursor:pointer">${esc(c)}</button>`;
    });
    html += `</div></div>`;
  }

  const size = allFields.size || allFields.cat_size || product.size;
  const sizes = Array.isArray(size) ? size : size ? String(size).split(',').map(s => s.trim()).filter(Boolean) : [];
  if (sizes.length > 1) {
    html += `<div style="margin-bottom:18px;padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#fff">`;
    html += `<div style="font-size:14px;font-weight:700;color:#1e293b;margin-bottom:10px">Size</div>`;
    html += `<div style="display:flex;flex-wrap:wrap;gap:8px" id="sizeSelector">`;
    sizes.forEach((s, i) => {
      html += `<button type="button" data-type="size" data-idx="${i}" data-val="${esc(s)}" style="padding:8px 12px;border:1px solid #e2e8f0;border-radius:999px;background:#fff;color:#1f2937;cursor:pointer">${esc(s)}</button>`;
    });
    html += `</div></div>`;
  }

  container.innerHTML = html;
  window._selectedOptions = window._selectedOptions || {};
  window.productOptions = window.productOptions || {};
  window.productOptions.color = () => window._selectedOptions.color || null;
  window.productOptions.size = () => window._selectedOptions.size || null;
  window.productOptions.variant = () => window._selectedOptions.variant || null;

  if (colors.length > 1) {
    document.querySelectorAll('#colorSelector button').forEach(btn => {
      btn.addEventListener('click', () => selectOption('color', parseInt(btn.dataset.idx, 10), btn));
    });
  } else if (colors.length === 1) {
    window._selectedOptions.color = colors[0];
  }

  if (sizes.length > 1) {
    document.querySelectorAll('#sizeSelector button').forEach(btn => {
      btn.addEventListener('click', () => selectOption('size', parseInt(btn.dataset.idx, 10), btn));
    });
  } else if (sizes.length === 1) {
    window._selectedOptions.size = sizes[0];
  }
}

function selectOption(type, idx, btn) {
  if (!btn) return;
  const parent = btn.parentElement;
  if (!parent) return;
  parent.querySelectorAll('button').forEach(b => {
    b.style.borderColor = '#e2e8f0';
    b.style.background = '#fff';
    b.style.color = '#1f2937';
  });
  btn.style.borderColor = '#f97316';
  btn.style.background = '#fff7ed';
  btn.style.color = '#c2410c';
  window._selectedOptions = window._selectedOptions || {};
  window._selectedOptions[type] = btn.dataset.val;
}

function renderVariants(product) {
  const variants = parseJsonField(product.variants, []);
  if (!Array.isArray(variants) || !variants.length) return;

  const container = document.getElementById('category-options');
  if (!container) return;

  let html = `<div style="margin-bottom:18px;padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#fff">`;
  html += `<div style="font-size:14px;font-weight:700;color:#1e293b;margin-bottom:10px">Variants</div>`;
  html += `<div id="variantSelector" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px">`;

  variants.forEach((v, i) => {
    if (!v || !v.name) return;
    const priceHtml = v.price ? `<div style="color:#f97316;font-weight:700;margin-top:6px">₦${parseFloat(v.price).toLocaleString()}</div>` : '';
    const stockHtml = v.stock ? `<div style="color:#64748b;font-size:12px;margin-top:4px">${esc(String(v.stock))} in stock</div>` : '';
    html += `<button type="button" data-idx="${i}" style="text-align:left;padding:12px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;cursor:pointer;transition:all .15s;">`;
    html += `<div style="font-size:13px;font-weight:600;color:#1f2937">${esc(v.name)}</div>${priceHtml}${stockHtml}`;
    html += `</button>`;
  });

  html += `</div></div>`;
  container.insertAdjacentHTML('beforeend', html);

  document.querySelectorAll('#variantSelector button').forEach(btn => {
    btn.addEventListener('click', () => selectVariant(parseInt(btn.dataset.idx, 10), btn));
  });

  selectVariant(0, document.querySelector('#variantSelector button'));
}

function selectVariant(idx, el) {
  const product = window._currentProduct;
  const variants = parseJsonField(product?.variants, []);
  if (!Array.isArray(variants)) return;
  const v = variants[idx];
  if (!v) return;

  window._selectedOptions = window._selectedOptions || {};
  window._selectedOptions.variant = v;

  if (v.price) {
    const priceEl = document.getElementById('product-price');
    if (priceEl) priceEl.textContent = `₦${parseFloat(v.price).toLocaleString()}`;
  }

  if (el) {
    document.querySelectorAll('#variantSelector button').forEach(b => {
      b.style.borderColor = '#e2e8f0';
      b.style.background = '#fff';
      b.style.color = '#1f2937';
    });
    el.style.borderColor = '#f97316';
    el.style.background = '#fff7ed';
    el.style.color = '#c2410c';
  }
}

function renderMediaGallery(product) {
  const gallery = document.getElementById('image-gallery');
  if (!gallery) return;

  const images = Array.isArray(product.images)
    ? product.images.filter(Boolean)
    : (product.images ? [product.images] : []);

  if (product.main_image_url && !images.includes(product.main_image_url)) {
    images.unshift(product.main_image_url);
  }

  if (!images.length && product.main_image_url) {
    images.push(product.main_image_url);
  }

  const hasVideo = !!product.product_video_url;

  let thumbsHtml = images.map((img, i) => `
      <button type="button" data-type="image" data-src="${esc(img)}" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;background:#fff;cursor:pointer;padding:0;width:68px;height:68px;">
        <img src="${esc(img)}" alt="Thumbnail ${i+1}" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.src='https://via.placeholder.com/68'">
      </button>`).join('');

  if (hasVideo) {
    thumbsHtml += `
      <button type="button" data-type="video" data-src="${esc(product.product_video_url)}" style="border:1px solid #e2e8f0;border-radius:10px;background:#111;color:#fff;cursor:pointer;padding:0 8px;min-width:68px;height:68px;display:flex;align-items:center;justify-content:center;font-size:12px;">
        ▶ Video
      </button>`;
  }

  const mainSrc = images[0] || '';
  gallery.innerHTML = `
    <div id="gallery-main" style="margin-bottom:12px;border-radius:16px;overflow:hidden;position:relative;background:#f8fafc;min-height:320px;display:flex;align-items:center;justify-content:center;">
      <img id="gallery-main-img" src="${esc(mainSrc)}" alt="${esc(product.name)}" style="width:100%;height:100%;object-fit:contain;cursor:zoom-in;" onerror="this.src='https://via.placeholder.com/500'">
    </div>
    <div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;">${thumbsHtml}</div>
  `;

  gallery.querySelectorAll('[data-type]').forEach(btn => {
    btn.addEventListener('click', () => setMainMedia(btn.dataset.type, btn.dataset.src));
  });

  const mainImage = document.getElementById('gallery-main-img');
  if (mainImage) {
    mainImage.addEventListener('click', () => {
      const lbImg = document.getElementById('mm-lightbox-img');
      if (lbImg) {
        lbImg.src = mainImage.src;
        document.getElementById('mm-lightbox').style.display = 'flex';
      }
    });
  }
}

function setMainMedia(type, src) {
  const container = document.getElementById('gallery-main');
  if (!container) return;
  if (type === 'video') {
    container.innerHTML = `<video controls style="width:100%;height:100%;object-fit:contain;background:#000"><source src="${esc(src)}"></video>`;
  } else {
    container.innerHTML = `<img id="gallery-main-img" src="${esc(src)}" alt="Product media" style="width:100%;height:100%;object-fit:contain;cursor:zoom-in;" onerror="this.src='https://via.placeholder.com/500'">`;
    const mainImage = document.getElementById('gallery-main-img');
    if (mainImage) {
      mainImage.addEventListener('click', () => {
        const lbImg = document.getElementById('mm-lightbox-img');
        if (lbImg) {
          lbImg.src = mainImage.src;
          document.getElementById('mm-lightbox').style.display = 'flex';
        }
      });
    }
  }
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
  const color    = opts.color || window.productOptions?.color?.() || null;
  const size     = opts.size || window.productOptions?.size?.()  || null;
  const storeId  = getProductStoreId(product);

  // 1. Update local cart immediately (no round-trip needed)
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const existing = cart.find(i =>
    i.id === product.id && i.color === color && i.size === size && i.variant?.name === opts.variant?.name
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
      selectedOptions: opts,
      variant: opts.variant || null,
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
  const stockQty = Number(product.stock_quantity) || 0;
  if (stockQty <= 0) {
    showToast('Product is out of stock', 'error');
    return;
  }

  const qtyEl   = document.getElementById('product-quantity');
  const quantity = qtyEl ? (parseInt(qtyEl.value) || 1) : 1;
  const opts     = window._selectedOptions || {};
  const color    = opts.color || window.productOptions?.color?.() || null;
  const size     = opts.size || window.productOptions?.size?.()  || null;
  const storeId  = getProductStoreId(product);

  // Update local cart
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const existing = cart.find(i =>
    i.id === product.id && i.color === color && i.size === size && i.variant?.name === opts.variant?.name
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
      selectedOptions: opts,
      variant: opts.variant || null,
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
