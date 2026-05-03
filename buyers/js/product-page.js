// ============================================================
// product-page.js  —  MarketMix Product Page Handler
// ============================================================

const API_BASE = 'https://marketmix-backend.onrender.com/api';

// ─── Toast Notification System ──────────────────────────────
(function initToast() {
  const style = document.createElement('style');
  style.textContent = `
    #mm-toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }
    .mm-toast {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 280px;
      max-width: 380px;
      padding: 14px 18px;
      border-radius: 10px;
      font-family: Inter, system-ui, sans-serif;
      font-size: 14px;
      font-weight: 500;
      color: #fff;
      box-shadow: 0 4px 20px rgba(0,0,0,.18);
      pointer-events: all;
      animation: mmSlideIn .3s ease forwards;
      transition: opacity .3s ease, transform .3s ease;
    }
    .mm-toast.hiding {
      animation: mmSlideOut .3s ease forwards;
    }
    .mm-toast-success { background: #16a34a; }
    .mm-toast-error   { background: #dc2626; }
    .mm-toast-warning { background: #d97706; }
    .mm-toast-info    { background: #f97316; }
    .mm-toast-icon    { font-size: 18px; flex-shrink: 0; }
    .mm-toast-close {
      margin-left: auto;
      background: none;
      border: none;
      color: rgba(255,255,255,.8);
      cursor: pointer;
      font-size: 16px;
      padding: 0 4px;
      flex-shrink: 0;
    }
    @keyframes mmSlideIn {
      from { opacity: 0; transform: translateX(40px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes mmSlideOut {
      from { opacity: 1; transform: translateX(0); }
      to   { opacity: 0; transform: translateX(40px); }
    }
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

  const close = toast.querySelector('.mm-toast-close');
  const dismiss = () => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  };
  close.addEventListener('click', dismiss);
  container.appendChild(toast);
  setTimeout(dismiss, duration);
}

// ─── Bootstrap ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) { showError('Product ID not found'); return; }

    const product = await fetchProduct(productId);
    if (!product) { showError('Product not found'); return; }

    trackProductView(productId);
    renderProduct(product);
    setupEventListeners(product);
    updateCartCount();
  } catch (err) {
    console.error('Error loading product:', err);
    showError('Error loading product details');
  }
});

// ─── Fetch Product ───────────────────────────────────────────
async function fetchProduct(productId) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/products/${productId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const result = await res.json();
    const product = result.data;

    // Fetch reviews
    try {
      const rRes = await fetch(`${API_BASE}/reviews/product/${productId}`, {
        headers: { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) }
      });
      if (rRes.ok) {
        const rData = await rRes.json();
        if (rData.status === 'success' && rData.data) {
          product.reviews     = rData.data.reviews || [];
          product.review_count = rData.data.pagination?.totalReviews ?? product.reviews.length;
          product.rating      = parseFloat(rData.data.summary?.averageRating) || 0;
        }
      }
    } catch (e) { console.warn('Reviews fetch failed:', e); }

    // Fetch seller / store profile if we have a seller_id
    if (product.seller_id && (!product.seller || !product.seller.shop_name)) {
      try {
        const sRes = await fetch(`${API_BASE}/seller/public/${product.seller_id}`);
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData.status === 'success' && sData.data?.store) {
            const store = sData.data.store;
            product.seller = {
              id:              store.sellerId,
              shop_name:       store.businessName,
              rating:          store.rating,
              shop_avatar_url: store.storeLogo || store.avatarUrl || ''
            };
          }
        }
      } catch (e) { console.warn('Seller fetch failed:', e); }
    }

    return product;
  } catch (err) {
    console.warn('API fetch failed, using mock data:', err);
  }

  return getMockProduct(productId);
}

// ─── Render ──────────────────────────────────────────────────
function renderProduct(product) {
  document.title = `${product.name} - MarketMix`;

  // Breadcrumb
  const rules = (typeof getCategoryRules === 'function')
    ? getCategoryRules(product.category || product.category_name)
    : { displayName: product.category || 'Products' };

  setEl('breadcrumb-category', rules.displayName);
  setEl('breadcrumb-product',  product.name);
  setEl('product-title',       product.name);
  setEl('product-category',    rules.displayName);

  // Shop info
  if (product.seller) {
    const avatar = document.getElementById('shop-avatar');
    if (avatar) {
      avatar.src = product.seller.shop_avatar_url || 'https://via.placeholder.com/32';
      avatar.onerror = () => { avatar.src = 'https://via.placeholder.com/32'; };
    }
    const link = document.getElementById('shop-link');
    if (link) {
      link.textContent = product.seller.shop_name || 'View Store';
      link.href = `./store-id.html?id=${product.seller.id || product.seller_id || ''}`;
    }
    const shopRating = document.getElementById('shop-rating');
    if (shopRating) {
      shopRating.textContent = product.seller.rating
        ? `⭐ ${Number(product.seller.rating).toFixed(1)} rating`
        : '';
    }
  } else {
    // Hide the shop row gracefully when no seller data
    const shopRow = document.getElementById('shop-link');
    if (shopRow) shopRow.textContent = 'Visit Store';
  }

  // Price
  const basePrice = Number(product.price) || 0;
  let displayPrice = basePrice;

  if (product.flash_sale_active && product.flash_sale_discount) {
    displayPrice = basePrice * (100 - Number(product.flash_sale_discount)) / 100;
    const origEl = document.getElementById('original-price');
    if (origEl) { origEl.textContent = `$${basePrice.toFixed(2)}`; origEl.style.display = 'inline'; }
  } else if (product.effective_price) {
    displayPrice = Number(product.effective_price);
    if (displayPrice < basePrice) {
      const origEl = document.getElementById('original-price');
      if (origEl) { origEl.textContent = `$${basePrice.toFixed(2)}`; origEl.style.display = 'inline'; }
    }
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

  // Views
  if (product.views) setEl('view-count', product.views);

  // Description
  setEl('product-description', product.description || 'No description available.');

  // Components (defined in separate files)
  if (typeof createImageGallery   === 'function') createImageGallery(product);
  if (typeof createFlashSale      === 'function') createFlashSale(product);
  if (typeof createCategoryOptions === 'function') createCategoryOptions(product);
  if (typeof createReviews        === 'function') createReviews(product);
  if (typeof createShopMore       === 'function') createShopMore(product);
  if (typeof createRelatedProducts === 'function') createRelatedProducts(product);

  // Update wishlist button if already wishlisted
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
    id:       product.id,
    name:     product.name,
    price:    product.price,
    image:    product.main_image_url,
    quantity, color, size,
    sellerId: product.seller?.id || product.seller_id || null
  };

  // LocalStorage
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const existing = cart.find(i => i.id === cartItem.id && i.color === cartItem.color && i.size === cartItem.size);
  if (existing) { existing.quantity += quantity; } else { cart.push(cartItem); }
  localStorage.setItem('cart', JSON.stringify(cart));

  // Backend cart (authenticated users)
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const res = await fetch(`${API_BASE}/cart/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ product_id: product.id, quantity })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn('Backend cart sync failed:', err.message || res.status);
      }
    } catch (e) { console.warn('Cart sync error:', e); }
  }

  showToast(`${product.name} added to cart!`, 'success');
  updateCartCount();
}

// ─── Wishlist ────────────────────────────────────────────────
function isWishlisted(productId) {
  const list = JSON.parse(localStorage.getItem('wishlist') || '[]');
  return list.includes(String(productId));
}

function setWishlisted(productId, value) {
  let list = JSON.parse(localStorage.getItem('wishlist') || '[]');
  if (value) {
    if (!list.includes(String(productId))) list.push(String(productId));
  } else {
    list = list.filter(id => id !== String(productId));
  }
  localStorage.setItem('wishlist', JSON.stringify(list));
}

function refreshWishlistButton(productId) {
  const btn = document.getElementById('product-add-to-wishlist');
  if (!btn) return;
  if (isWishlisted(productId)) {
    btn.textContent = '❤️ Wishlisted';
    btn.style.background = '#fef2ee';
    btn.style.color = '#f97316';
  } else {
    btn.textContent = '❤️ Add to Wishlist';
    btn.style.background = '#fafafa';
    btn.style.color = '#f97316';
  }
}

async function handleWishlist(product) {
  const btn = document.getElementById('product-add-to-wishlist');
  const token = localStorage.getItem('token');

  // Optimistic toggle for localStorage
  const alreadyWished = isWishlisted(product.id);

  if (btn) { btn.disabled = true; btn.textContent = alreadyWished ? 'Removing…' : 'Adding…'; }

  if (!token) {
    // Guest — localStorage only
    setWishlisted(product.id, !alreadyWished);
    refreshWishlistButton(product.id);
    showToast(alreadyWished ? 'Removed from wishlist' : 'Added to wishlist', alreadyWished ? 'info' : 'success');
    if (btn) btn.disabled = false;
    return;
  }

  try {
    if (alreadyWished) {
      // Remove: find wishlist item id from server then delete
      const wRes = await fetch(`${API_BASE}/wishlist`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (wRes.ok) {
        const wData = await wRes.json();
        const item = (wData.data?.items || []).find(i => String(i.product_id) === String(product.id));
        if (item) {
          await fetch(`${API_BASE}/wishlist/remove/${item.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
        }
      }
      setWishlisted(product.id, false);
      showToast('Removed from wishlist', 'info');
    } else {
      // Add
      const res = await fetch(`${API_BASE}/wishlist/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ product_id: product.id })
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
    id:       product.id,
    name:     product.name,
    price:    product.price,
    image:    product.main_image_url,
    quantity, color, size,
    sellerId: product.seller?.id || product.seller_id || null
  };

  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const existing = cart.find(i => i.id === cartItem.id && i.color === cartItem.color && i.size === cartItem.size);
  if (existing) { existing.quantity += quantity; } else { cart.push(cartItem); }
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();

  const token = localStorage.getItem('token');
  if (token) {
    // Sync to backend then go to checkout
    try {
      await fetch(`${API_BASE}/cart/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ product_id: product.id, quantity })
      });
    } catch (e) { /* non-critical */ }
    window.location.href = './checkout.html';
  } else {
    localStorage.setItem('after_login_redirect', './checkout.html');
    localStorage.setItem('post_login_redirect',  './checkout.html');
    window.location.href = 'login for buyers.html';
  }
}

// ─── Track View ──────────────────────────────────────────────
async function trackProductView(productId) {
  try {
    const token = localStorage.getItem('token');
    await fetch(`${API_BASE}/products/${productId}/view`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });
  } catch (e) { /* non-critical */ }
}

// ─── Cart Count ──────────────────────────────────────────────
function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
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
  const mock = {
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
  return mock;
}