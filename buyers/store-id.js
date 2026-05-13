const API = 'https://marketmix-backend.onrender.com/api';
const authToken = localStorage.getItem('token');

// ─── Get store id from URL ───────────────────────────────────────────────────
// Preferred links: store-id.html?store=<uuid>
// Legacy links using ?seller=<uuid> or ?id=<uuid> are still supported.
const params = new URLSearchParams(window.location.search);
const STORE_ID = params.get('store') || params.get('seller') || params.get('id');

if (!STORE_ID) {
  showToast('No store specified.');
}

function storeScopedUrl(path) {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}store=${encodeURIComponent(STORE_ID)}`;
}

function authHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(STORE_ID ? { 'X-Store-Id': STORE_ID } : {}),
    ...extra,
  };
}

// ─── State ───────────────────────────────────────────────────────────────────
let storeData = null;
let allProducts = [];
let currentPage = 1;
let totalProducts = 0;
const PAGE_LIMIT = 20;

// ─── Init ────────────────────────────────────────────────────────────────────
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
    // Use the new stores endpoint
    const res = await fetch(`${API}/seller/stores/public/${STORE_ID}`, {
      headers: authHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load store');

    storeData = data.data.store;
    renderStoreInfo(storeData);
  } catch (err) {
    console.error(err);
    document.getElementById('storeName').textContent = 'Store not found';
    showToast('Could not load store info');
  }
}

function renderStoreInfo(store) {
  document.title = `${store.businessName} | MarketMix`;

  // Logo
  const logoEl = document.getElementById('storeLogo');
  if (store.storeLogo) {
    logoEl.innerHTML = `<img src="${store.storeLogo}" alt="${store.businessName} logo" />`;
  } else {
    const initials = store.businessName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    logoEl.innerHTML = `<span class="logo-initials">${initials}</span>`;
  }

  if (store.isVerified) {
    document.getElementById('verifiedBadge').style.display = 'inline-flex';
  }

  document.getElementById('storeName').textContent = store.businessName;
  document.getElementById('storeRating').textContent = store.rating > 0 ? store.rating.toFixed(1) : 'No ratings yet';
  document.getElementById('storeReviewCount').textContent =
    store.totalReviews > 0 ? `(${store.totalReviews.toLocaleString()} reviews)` : '';

  if (store.businessAddress) {
    document.getElementById('storeAddress').innerHTML =
      `<i class="fa-solid fa-location-dot"></i> ${store.businessAddress}`;
  }
  if (store.memberSince) {
    const year = new Date(store.memberSince).getFullYear();
    document.getElementById('storeMemberSince').innerHTML =
      `<i class="fa-regular fa-calendar"></i> Member since ${year}`;
  }

  document.getElementById('statProducts').textContent = store.productCount.toLocaleString();
  document.getElementById('statSales').textContent = store.totalSales.toLocaleString();
  document.getElementById('statRating').textContent = store.rating > 0 ? store.rating.toFixed(1) : '—';
  document.getElementById('statReviews').textContent = store.totalReviews.toLocaleString();

  document.getElementById('aboutContent').innerHTML = buildAboutHTML(store);
  document.getElementById('policyEmail').textContent = store.businessEmail || 'Contact via MarketMix';
}

function buildAboutHTML(store) {
  const links = store.socialLinks || {};
  const socialsHTML = [
    links.website   ? `<a href="${links.website}" target="_blank"><i class="fa-solid fa-globe"></i> Website</a>` : '',
    links.instagram ? `<a href="https://instagram.com/${links.instagram}" target="_blank"><i class="fa-brands fa-instagram"></i> Instagram</a>` : '',
    links.facebook  ? `<a href="${links.facebook}" target="_blank"><i class="fa-brands fa-facebook"></i> Facebook</a>` : '',
    links.twitter   ? `<a href="https://twitter.com/${links.twitter}" target="_blank"><i class="fa-brands fa-x-twitter"></i> Twitter/X</a>` : '',
    links.tiktok    ? `<a href="https://tiktok.com/@${links.tiktok}" target="_blank"><i class="fa-brands fa-tiktok"></i> TikTok</a>` : '',
  ].filter(Boolean).join('');

  return `
    <p>${store.businessDescription || 'This seller has not added a store description yet.'}</p>
    ${store.category ? `<p><strong>Category:</strong> ${store.category}</p>` : ''}
    ${store.businessPhone ? `<p><strong>Phone:</strong> ${store.businessPhone}</p>` : ''}
    ${store.businessEmail ? `<p><strong>Email:</strong> ${store.businessEmail}</p>` : ''}
    ${socialsHTML ? `<div class="social-links">${socialsHTML}</div>` : ''}
  `;
}

// ─── Load Products ────────────────────────────────────────────────────────────
async function loadProducts(categoryFilter = 'all', append = false) {
  const grid = document.getElementById('productsGrid');
  if (!append) {
    grid.innerHTML = `<div class="loading-state"><i class="fa-solid fa-spinner fa-spin"></i> Loading products...</div>`;
    currentPage = 1;
  }

  try {
    const catParam = categoryFilter !== 'all' ? `&category=${encodeURIComponent(categoryFilter)}` : '';
    // Use the new stores endpoint for products
    const res = await fetch(
      `${API}/seller/stores/public/${STORE_ID}/products?page=${currentPage}&limit=${PAGE_LIMIT}${catParam}`,
      { headers: authHeaders() }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to load products');

    const { products, categories, total } = data.data;
    totalProducts = total;

    if (!append && categories && categories.length > 0) {
      populateCategoryFilter(categories);
    }

    if (!append) {
      allProducts = products;
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

    document.getElementById('productCountLabel').textContent =
      `${totalProducts} product${totalProducts !== 1 ? 's' : ''}`;

    const loadMoreWrap = document.getElementById('loadMoreWrap');
    loadMoreWrap.style.display = allProducts.length < totalProducts ? 'block' : 'none';

  } catch (err) {
    console.error(err);
    grid.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Could not load products.</p></div>`;
  }
}

function loadMoreProducts() {
  currentPage++;
  const cat = document.getElementById('categoryFilter').value;
  loadProducts(cat, true);
}

function buildProductCard(p) {
  const card = document.createElement('div');
  card.className = 'product-card';

  const isFlashActive = p.flash_start && p.flash_end &&
    new Date() >= new Date(p.flash_start) && new Date() <= new Date(p.flash_end);

  const stars = '★'.repeat(Math.round(p.avgRating)) + '☆'.repeat(5 - Math.round(p.avgRating));
  const imgSrc = p.main_image_url || 'https://via.placeholder.com/300x300?text=No+Image';

  card.innerHTML = `
    ${isFlashActive ? '<span class="flash-badge">🔥 Flash Sale</span>' : ''}
    <div class="card-img-wrap" onclick="viewProduct('${p.id}')">
      <img src="${imgSrc}" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x300?text=No+Image'" />
    </div>
    <div class="product-info">
      <h4 onclick="viewProduct('${p.id}')">${p.name}</h4>
      <p class="product-price">₦${parseFloat(p.price).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
      <div class="product-meta">
        <span class="stars" title="${p.avgRating}/5">${stars}
          <small>${p.reviewCount > 0 ? `(${p.reviewCount})` : ''}</small>
        </span>
        ${p.stock_quantity === 0 ? '<span class="out-of-stock">Out of stock</span>' : ''}
      </div>
      <div class="product-actions">
        <button class="btn-view" onclick="viewProduct('${p.id}')">View</button>
        <button class="btn-cart" onclick="addToCart('${p.id}', '${escapeHtml(p.name)}')"
          ${p.stock_quantity === 0 ? 'disabled' : ''}>
          <i class="fa-solid fa-cart-plus"></i> Add to Cart
        </button>
      </div>
    </div>`;
  return card;
}

function populateCategoryFilter(categories) {
  const select = document.getElementById('categoryFilter');
  select.innerHTML = `<option value="all">All Categories</option>` +
    categories.map(c => `<option value="${c}">${c}</option>`).join('');

  select.addEventListener('change', e => {
    loadProducts(e.target.value);
  });
}

// ─── Load Reviews ─────────────────────────────────────────────────────────────
async function loadReviews() {
  try {
    // Reviews are scoped by seller_id; STORE_ID is the store uuid
    // The reviews endpoint uses seller_id — we get it from storeData once loaded
    // Poll until storeData is available
    let attempts = 0;
    while (!storeData && attempts < 20) {
      await new Promise(r => setTimeout(r, 150));
      attempts++;
    }

    const sellerId = storeData?.sellerId;
    if (!sellerId) return;

    const res = await fetch(`${API}/reviews/seller/${sellerId}?limit=10`, {
      headers: authHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    const { reviews, summary } = data.data;
    renderReviews(reviews, summary);
  } catch (err) {
    document.getElementById('reviewsList').innerHTML =
      `<p class="empty-state">Could not load reviews.</p>`;
  }
}

function renderReviews(reviews, summary) {
  const summaryEl = document.getElementById('reviewsSummary');
  summaryEl.innerHTML = `
    <div class="rating-overview">
      <div class="big-rating">
        <span>${summary.avgRating > 0 ? summary.avgRating.toFixed(1) : '—'}</span>
        <div class="stars-row">${renderStars(summary.avgRating)}</div>
        <small>${summary.total.toLocaleString()} review${summary.total !== 1 ? 's' : ''}</small>
      </div>
      <div class="rating-bars">
        ${[5,4,3,2,1].map(n => {
          const key = ['fiveStar','fourStar','threeStar','twoStar','oneStar'][5-n];
          const pct = summary.total > 0 ? Math.round((summary[key] / summary.total) * 100) : 0;
          return `<div class="bar-row">
            <span>${n}★</span>
            <div class="bar-bg"><div class="bar-fill" style="width:${pct}%"></div></div>
            <span>${pct}%</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;

  const listEl = document.getElementById('reviewsList');
  if (reviews.length === 0) {
    listEl.innerHTML = `<p class="empty-state">No reviews yet for this store.</p>`;
    return;
  }
  listEl.innerHTML = reviews.map(r => `
    <div class="review-card">
      <div class="review-header">
        <div class="reviewer-avatar">${r.first_name[0].toUpperCase()}</div>
        <div>
          <strong>${r.first_name} ${r.last_name[0]}.</strong>
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
  try {
    const res = await fetch(`${API}/cart/add`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        product_id: productId,
        quantity: 1,
        store_id: STORE_ID       // ← store-scoped
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to add to cart');
    showToast(`${productName} added to cart 🛒`);
  } catch (err) {
    showToast(err.message || 'Could not add to cart');
  }
}

// ─── View Product — always carries store context ──────────────────────────────
function viewProduct(productId) {
  window.location.href = storeScopedUrl(`product.html?id=${encodeURIComponent(productId)}`);
}

// ─── Follow Store ─────────────────────────────────────────────────────────────
async function syncFollowState() {
  if (!authToken || !STORE_ID) return;
  try {
    const res = await fetch(`${API}/shops/following/${STORE_ID}/status`, {
      headers: authHeaders()
    });
    const data = await res.json();
    updateFollowBtn(data?.data?.isFollowing);
  } catch (e) {}
}

async function toggleFollow() {
  if (!authToken) { window.location.href = 'login for buyers.html'; return; }
  const btn = document.getElementById('followBtn');
  const isFollowing = btn.classList.contains('following');
  btn.disabled = true;
  try {
    const res = await fetch(`${API}/shops/following/${STORE_ID}`, {
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
  btn.disabled = false;
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
  if (storeData?.businessEmail) {
    window.location.href = `mailto:${storeData.businessEmail}`;
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
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function renderStars(rating) {
  const full = Math.round(rating);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-NG', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

function escapeHtml(str) {
  return String(str).replace(/['"<>&]/g, c => (
    {'\'':'&#39;', '"':'&quot;', '<':'&lt;', '>':'&gt;', '&':'&amp;'}[c]
  ));
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}