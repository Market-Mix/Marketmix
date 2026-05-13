const API = 'https://marketmix-backend.onrender.com/api';
const authToken = localStorage.getItem('token');

// ─── Get store id from URL ────────────────────────────────────────────────────
// Supports ?store=, ?seller=, ?id= for backwards compatibility
const params  = new URLSearchParams(window.location.search);
const STORE_ID = params.get('store') || params.get('seller') || params.get('id');

if (!STORE_ID) {
  document.body.innerHTML = `<div style="padding:60px;text-align:center;font-family:sans-serif">
    <h2>Store not found</h2><p>No store ID was provided in the URL.</p>
  </div>`;
}

function authHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...extra,
  };
}

// ─── State ────────────────────────────────────────────────────────────────────
let storeData    = null;
let allProducts  = [];
let currentPage  = 1;
let totalProducts = 0;
const PAGE_LIMIT  = 20;

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (!STORE_ID) return;
  loadStoreProfile();
  loadProducts();
  loadReviews();
  initTabs();
  syncFollowState();
});

// ─── Load Store Profile ───────────────────────────────────────────────────────
async function loadStoreProfile() {
  try {
    // Try store-scoped endpoint first (new architecture)
    let res = await fetch(`${API}/seller/stores/public/${STORE_ID}`, {
      headers: authHeaders()
    });

    // Fallback: old seller_profiles-based endpoint
    if (!res.ok) {
      res = await fetch(`${API}/seller/public/${STORE_ID}`, {
        headers: authHeaders()
      });
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Store not found');

    // Normalise response — stores endpoint uses data.data.store
    storeData = data.data?.store || data.data;
    renderStoreInfo(storeData);
  } catch (err) {
    console.error(err);
    const nameEl = document.getElementById('storeName');
    if (nameEl) nameEl.textContent = 'Store not found';
    showToast('Could not load store info: ' + err.message);
  }
}

function renderStoreInfo(store) {
  document.title = `${store.businessName || store.business_name} | MarketMix`;

  const name = store.businessName || store.business_name || 'Store';
  const logo = store.storeLogo    || store.store_logo_url || '';

  // Logo
  const logoEl = document.getElementById('storeLogo');
  if (logo) {
    logoEl.innerHTML = `<img src="${logo}" alt="${name} logo" />`;
  } else {
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    logoEl.innerHTML = `<span class="logo-initials">${initials}</span>`;
  }

  const isVerified = store.isVerified || store.is_verified;
  if (isVerified) {
    const badge = document.getElementById('verifiedBadge');
    if (badge) badge.style.display = 'inline-flex';
  }

  const nameEl = document.getElementById('storeName');
  if (nameEl) nameEl.textContent = name;

  const rating  = parseFloat(store.rating) || 0;
  const reviews = parseInt(store.totalReviews || store.total_reviews) || 0;

  const ratingEl = document.getElementById('storeRating');
  if (ratingEl) ratingEl.textContent = rating > 0 ? rating.toFixed(1) : 'No ratings yet';

  const reviewEl = document.getElementById('storeReviewCount');
  if (reviewEl) reviewEl.textContent = reviews > 0 ? `(${reviews.toLocaleString()} reviews)` : '';

  const addr = store.businessAddress || store.business_address;
  if (addr) {
    const addrEl = document.getElementById('storeAddress');
    if (addrEl) addrEl.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${addr}`;
  }

  if (store.memberSince || store.created_at) {
    const year = new Date(store.memberSince || store.created_at).getFullYear();
    const sinceEl = document.getElementById('storeMemberSince');
    if (sinceEl) sinceEl.innerHTML = `<i class="fa-regular fa-calendar"></i> Member since ${year}`;
  }

  const pc = parseInt(store.productCount || store.product_count) || 0;
  const sc = parseInt(store.totalSales   || store.total_sales)   || 0;

  const spEl = document.getElementById('statProducts');
  const ssEl = document.getElementById('statSales');
  const srEl = document.getElementById('statRating');
  const svEl = document.getElementById('statReviews');
  if (spEl) spEl.textContent = pc.toLocaleString();
  if (ssEl) ssEl.textContent = sc.toLocaleString();
  if (srEl) srEl.textContent = rating > 0 ? rating.toFixed(1) : '—';
  if (svEl) svEl.textContent = reviews.toLocaleString();

  const aboutEl = document.getElementById('aboutContent');
  if (aboutEl) aboutEl.innerHTML = buildAboutHTML(store);

  const policyEl = document.getElementById('policyEmail');
  if (policyEl) policyEl.textContent =
    store.businessEmail || store.business_email || 'Contact via MarketMix';
}

function buildAboutHTML(store) {
  const links = store.socialLinks || {};
  // Also support flat fields from stores table
  const fb  = links.facebook  || store.facebook;
  const tw  = links.twitter   || store.twitter;
  const ig  = links.instagram || store.instagram;
  const tt  = links.tiktok    || store.tiktok;
  const tg  = links.telegram  || store.telegram;
  const web = links.website   || store.website;

  const socialsHTML = [
    web ? `<a href="${web}" target="_blank"><i class="fa-solid fa-globe"></i> Website</a>`           : '',
    ig  ? `<a href="${ig}"  target="_blank"><i class="fa-brands fa-instagram"></i> Instagram</a>`   : '',
    fb  ? `<a href="${fb}"  target="_blank"><i class="fa-brands fa-facebook"></i> Facebook</a>`     : '',
    tw  ? `<a href="${tw}"  target="_blank"><i class="fa-brands fa-x-twitter"></i> Twitter/X</a>`   : '',
    tt  ? `<a href="${tt}"  target="_blank"><i class="fa-brands fa-tiktok"></i> TikTok</a>`         : '',
    tg  ? `<a href="${tg}"  target="_blank"><i class="fa-brands fa-telegram"></i> Telegram</a>`     : '',
  ].filter(Boolean).join('');

  const desc    = store.businessDescription || store.business_description || '';
  const cat     = store.category            || '';
  const phone   = store.businessPhone       || store.business_phone       || '';
  const email   = store.businessEmail       || store.business_email       || '';

  return `
    <p>${desc || 'This seller has not added a store description yet.'}</p>
    ${cat   ? `<p><strong>Category:</strong> ${cat}</p>`     : ''}
    ${phone ? `<p><strong>Phone:</strong> ${phone}</p>`      : ''}
    ${email ? `<p><strong>Email:</strong> ${email}</p>`      : ''}
    ${socialsHTML ? `<div class="social-links">${socialsHTML}</div>` : ''}
  `;
}

// ─── Load Products ────────────────────────────────────────────────────────────
async function loadProducts(categoryFilter = 'all', append = false) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  if (!append) {
    grid.innerHTML = `<div class="loading-state"><i class="fa-solid fa-spinner fa-spin"></i> Loading products...</div>`;
    currentPage = 1;
  }

  try {
    const catParam = categoryFilter !== 'all' ? `&category=${encodeURIComponent(categoryFilter)}` : '';

    // Try store-scoped endpoint first
    let res = await fetch(
      `${API}/seller/stores/public/${STORE_ID}/products?page=${currentPage}&limit=${PAGE_LIMIT}${catParam}`,
      { headers: authHeaders() }
    );

    // Fallback to old seller products endpoint
    if (!res.ok) {
      res = await fetch(
        `${API}/products?seller_id=${STORE_ID}&page=${currentPage}&limit=${PAGE_LIMIT}${catParam}`,
        { headers: authHeaders() }
      );
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load products');

    const products   = data.data?.products || data.data || [];
    const categories = data.data?.categories || [];
    const total      = data.data?.total || products.length;

    totalProducts = total;

    if (!append && categories.length > 0) {
      populateCategoryFilter(categories);
    }

    if (!append) {
      allProducts  = products;
      grid.innerHTML = '';
    } else {
      allProducts = [...allProducts, ...products];
    }

    if (allProducts.length === 0) {
      grid.innerHTML = `<div class="empty-state"><i class="fa-solid fa-box-open"></i><p>No products listed yet.</p></div>`;
    } else {
      if (!append) grid.innerHTML = '';
      products.forEach(p => grid.appendChild(buildProductCard(p)));
    }

    const countEl = document.getElementById('productCountLabel');
    if (countEl) countEl.textContent = `${totalProducts} product${totalProducts !== 1 ? 's' : ''}`;

    const loadMoreWrap = document.getElementById('loadMoreWrap');
    if (loadMoreWrap) loadMoreWrap.style.display = allProducts.length < totalProducts ? 'block' : 'none';

  } catch (err) {
    console.error(err);
    grid.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Could not load products.</p></div>`;
  }
}

function loadMoreProducts() {
  currentPage++;
  const cat = document.getElementById('categoryFilter')?.value || 'all';
  loadProducts(cat, true);
}

function buildProductCard(p) {
  const card = document.createElement('div');
  card.className = 'product-card';

  const isFlashActive = p.flash_start && p.flash_end &&
    new Date() >= new Date(p.flash_start) && new Date() <= new Date(p.flash_end);

  const rating  = parseFloat(p.avgRating || p.avg_rating) || 0;
  const reviews = parseInt(p.reviewCount || p.review_count) || 0;
  const stars   = '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
  const imgSrc  = p.main_image_url || 'https://via.placeholder.com/300x300?text=No+Image';
  const price   = parseFloat(p.price).toLocaleString('en-NG', { minimumFractionDigits: 2 });
  const inStock = parseInt(p.stock_quantity) > 0;

  card.innerHTML = `
    ${isFlashActive ? '<span class="flash-badge">🔥 Flash Sale</span>' : ''}
    <div class="card-img-wrap" onclick="viewProduct('${p.id}')">
      <img src="${imgSrc}" alt="${p.name}" loading="lazy"
        onerror="this.src='https://via.placeholder.com/300x300?text=No+Image'" />
    </div>
    <div class="product-info">
      <h4 onclick="viewProduct('${p.id}')">${p.name}</h4>
      <p class="product-price">₦${price}</p>
      <div class="product-meta">
        <span class="stars" title="${rating}/5">${stars}
          <small>${reviews > 0 ? `(${reviews})` : ''}</small>
        </span>
        ${!inStock ? '<span class="out-of-stock">Out of stock</span>' : ''}
      </div>
      <div class="product-actions">
        <button class="btn-view" onclick="viewProduct('${p.id}')">View</button>
        <button class="btn-cart" onclick="addToCart('${p.id}', '${escapeHtml(p.name)}')"
          ${!inStock ? 'disabled' : ''}>
          <i class="fa-solid fa-cart-plus"></i> Add to Cart
        </button>
      </div>
    </div>`;
  return card;
}

function populateCategoryFilter(categories) {
  const select = document.getElementById('categoryFilter');
  if (!select) return;
  select.innerHTML = `<option value="all">All Categories</option>` +
    categories.map(c => `<option value="${c}">${c}</option>`).join('');

  select.addEventListener('change', e => loadProducts(e.target.value));
}

// ─── Load Reviews ─────────────────────────────────────────────────────────────
async function loadReviews() {
  try {
    // Wait for storeData to get sellerId
    let attempts = 0;
    while (!storeData && attempts < 30) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }

    // sellerId can come from different response shapes
    const sellerId = storeData?.sellerId || storeData?.seller_id;
    if (!sellerId) return;

    const res  = await fetch(`${API}/reviews/seller/${sellerId}?limit=10`, {
      headers: authHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    renderReviews(data.data?.reviews || [], data.data?.summary || {});
  } catch (err) {
    const listEl = document.getElementById('reviewsList');
    if (listEl) listEl.innerHTML = `<p class="empty-state">Could not load reviews.</p>`;
  }
}

function renderReviews(reviews, summary) {
  const summaryEl = document.getElementById('reviewsSummary');
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="rating-overview">
        <div class="big-rating">
          <span>${summary.avgRating > 0 ? parseFloat(summary.avgRating).toFixed(1) : '—'}</span>
          <div class="stars-row">${renderStars(summary.avgRating || 0)}</div>
          <small>${(parseInt(summary.total) || 0).toLocaleString()} review${summary.total !== 1 ? 's' : ''}</small>
        </div>
        <div class="rating-bars">
          ${[5,4,3,2,1].map(n => {
            const key = ['fiveStar','fourStar','threeStar','twoStar','oneStar'][5-n];
            const pct = summary.total > 0 ? Math.round(((summary[key] || 0) / summary.total) * 100) : 0;
            return `<div class="bar-row">
              <span>${n}★</span>
              <div class="bar-bg"><div class="bar-fill" style="width:${pct}%"></div></div>
              <span>${pct}%</span>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  const listEl = document.getElementById('reviewsList');
  if (!listEl) return;

  if (!reviews.length) {
    listEl.innerHTML = `<p class="empty-state">No reviews yet for this store.</p>`;
    return;
  }
  listEl.innerHTML = reviews.map(r => `
    <div class="review-card">
      <div class="review-header">
        <div class="reviewer-avatar">${(r.first_name || '?')[0].toUpperCase()}</div>
        <div>
          <strong>${r.first_name} ${(r.last_name || '?')[0]}.</strong>
          <div class="review-stars">${renderStars(r.rating)}</div>
        </div>
        <span class="review-date">${formatDate(r.created_at)}</span>
      </div>
      ${r.product_name ? `<p class="review-product"><i class="fa-solid fa-tag"></i> ${r.product_name}</p>` : ''}
      <p class="review-body">${r.body || ''}</p>
    </div>`).join('');
}

// ─── Add to Cart ──────────────────────────────────────────────────────────────
async function addToCart(productId, productName) {
  if (!authToken) { window.location.href = 'login for buyers.html'; return; }

  try {
    const res  = await fetch(`${API}/cart/add`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ product_id: productId, quantity: 1 })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to add to cart');
    showToast(`${productName} added to cart 🛒`);
  } catch (err) {
    showToast(err.message || 'Could not add to cart');
  }
}

// ─── View Product — keeps store context in URL ────────────────────────────────
function viewProduct(productId) {
  window.location.href = `product.html?id=${encodeURIComponent(productId)}&store=${encodeURIComponent(STORE_ID)}`;
}

// ─── Follow Store ─────────────────────────────────────────────────────────────
async function syncFollowState() {
  if (!authToken || !STORE_ID) return;
  try {
    // Follow is keyed by sellerId, not storeId — wait for storeData
    let attempts = 0;
    while (!storeData && attempts < 30) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }
    const sellerId = storeData?.sellerId || storeData?.seller_id;
    if (!sellerId) return;

    const res  = await fetch(`${API}/shops/following/${sellerId}/status`, {
      headers: authHeaders()
    });
    const data = await res.json();
    updateFollowBtn(data?.data?.isFollowing);
  } catch (e) {}
}

async function toggleFollow() {
  if (!authToken) { window.location.href = 'login for buyers.html'; return; }

  const sellerId = storeData?.sellerId || storeData?.seller_id;
  if (!sellerId) return;

  const btn        = document.getElementById('followBtn');
  const isFollowing = btn?.classList.contains('following');
  if (btn) btn.disabled = true;

  try {
    const res  = await fetch(`${API}/shops/following/${sellerId}`, {
      method: isFollowing ? 'DELETE' : 'POST',
      headers: authHeaders()
    });
    const data = await res.json();
    if (res.ok) {
      updateFollowBtn(!isFollowing);
      showToast(isFollowing ? 'Unfollowed store' : 'You are now following this store');
    } else {
      showToast(data.message || 'Something went wrong');
    }
  } catch (e) {
    showToast('Something went wrong');
  }
  if (btn) btn.disabled = false;
}

function updateFollowBtn(isFollowing) {
  const btn = document.getElementById('followBtn');
  if (!btn) return;
  if (isFollowing) {
    btn.innerHTML = '<i class="fa-solid fa-heart"></i> Following';
    btn.classList.add('following');
  } else {
    btn.innerHTML = '<i class="fa-regular fa-heart"></i> Follow';
    btn.classList.remove('following');
  }
}

// ─── Contact Seller ───────────────────────────────────────────────────────────
function contactSeller() {
  const email = storeData?.businessEmail || storeData?.business_email;
  if (email) {
    window.location.href = `mailto:${email}`;
  } else {
    showToast('No contact email available for this store');
  }
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');
    });
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function renderStars(rating) {
  const full = Math.round(parseFloat(rating) || 0);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-NG', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

function escapeHtml(str) {
  return String(str).replace(/['"<>&]/g, c =>
    ({ "'": '&#39;', '"': '&quot;', '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])
  );
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}