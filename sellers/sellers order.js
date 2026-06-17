/* =============================================================
   sellers order.js  —  MarketMix Seller Orders (API-integrated)
   ============================================================= */

const API_BASE = 'https://marketmix-backend.onrender.com/api';

/* ── helpers ─────────────────────────────────────────────── */

function getToken() {
  // Prefer seller-scoped token to avoid buyer session overwrite
  return localStorage.getItem('seller_token') || localStorage.getItem('token') || '';
}

function getActiveStoreId() {
  return window.StoreManager?.getActiveStoreId?.()
    || window.StoreManager?.getActiveStore?.()?.id
    || '';
}

async function requireActiveStore() {
  if (window.StoreManager?.requireActiveStore) {
    return window.StoreManager.requireActiveStore();
  }
  return window.StoreManager?.getActiveStore?.() || null;
}

function authHeaders() {
  const storeId = getActiveStoreId();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
    ...(storeId ? { 'X-Store-Id': storeId } : {}),
  };
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(amount) {
  const value = Number(amount || 0);
  if (Number.isNaN(value)) return '₦0.00';
  return `₦${value.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function normalizeImageUrl(url) {
  if (!url && url !== 0) return null;
  const str = String(url).trim();
  if (!str) return null;
  const lower = str.toLowerCase();
  if (lower === 'null' || lower === 'undefined') return null;
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('data:') ||
    lower.startsWith('blob:') ||
    lower.startsWith('/')
  ) {
    return str;
  }
  if (str.includes('.') || str.includes('/')) {
    return str;
  }
  return null;
}

function getOrderItemImage(item) {
  let ps = item.product_snapshot || item.productSnapshot || {};
  if (typeof ps === 'string') {
    try { ps = JSON.parse(ps); } catch (e) { ps = {}; }
  }

  const candidates = [
    ps.image,
    ps.image_url,
    ps.thumbnail,
    ps?.images?.[0],
    item.image,
    item.image_url,
    item.imageUrl,
    item.product_image,
    item.product_image_url,
    item.productImage,
    item.product?.image,
    item.product?.image_url,
    item.product?.imageUrl,
    item.product?.thumbnail,
    item.product?.images?.[0],
  ];

  return candidates.reduce((found, candidate) => found || normalizeImageUrl(candidate), null);
}

/* ── API Fetch ────────────────────────────────────────────── */
async function apiFetch(path, opts = {}) {
  opts.headers = { ...authHeaders(), ...(opts.headers || {}) };
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (res.status === 401) {
    handleLogout();
    throw new Error('Unauthorized');
  }
  return res.json();
}

/* ── Profile Image ────────────────────────────────────────── */
function renderProfileImage(profile) {
  const images = document.querySelectorAll('#sellerProfileImage, #sellerProfileImageMobile, .navbar-toggler-icon');
  if (!images.length) return;
  const store = window.StoreManager?.getActiveStore?.();
  const logo = store?.store_logo_url || profile?.profile?.storeLogo || profile?.avatarUrl || '';
  if (logo) {
    images.forEach((img) => {
      img.src = logo;
      img.onerror = () => { img.src = ''; };
    });
  }
}

/* ── Logout ───────────────────────────────────────────────── */
async function handleLogout() {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: authHeaders(),
    });
  } catch (_) {
    /* ignore network errors on logout */
  }
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

/* ── state ───────────────────────────────────────────────── */

let currentPage = 1;
const PAGE_SIZE = 10;
let totalOrders = 0;
let allLoaded = false;

// Keep previous orders count to detect first-order arrival
let prevTotalOrders = Number(localStorage.getItem('seller_prev_total_orders') || '0');

// Accumulated rows across "load more" calls
let loadedOrders = [];

// Pending confirmation
let pendingOrderId = null;
let pendingNewStatus = null;

/* ── DOM refs ────────────────────────────────────────────── */

const orderTable     = document.getElementById('orderTable');
const searchInput    = document.getElementById('searchInput');
const statusFilter   = document.getElementById('statusFilter');
const loadMoreBtn    = document.getElementById('loadMoreBtn');
const toast          = document.getElementById('toast');
const confirmModal   = document.getElementById('confirmationModal');
const newStatusText  = document.getElementById('newStatusText');
const confirmYes     = document.getElementById('confirmYes');
const confirmNo      = document.getElementById('confirmNo');

/* ── toast ───────────────────────────────────────────────── */

function showToast(msg, isError = false) {
  toast.textContent = msg;
  toast.style.background = isError ? '#c0392b' : '#2d3436';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

/* ── fetch orders from API ───────────────────────────────── */

async function fetchOrders(reset = false) {
  if (reset) {
    currentPage  = 1;
    loadedOrders = [];
    allLoaded    = false;
  }

  const search = searchInput.value.trim();
  const status = statusFilter.value;

  const params = new URLSearchParams({
    page:  currentPage,
    limit: PAGE_SIZE,
  });
  if (search) params.set('search', search);
  if (status && status !== 'all') params.set('status', status);

  try {
    setTableLoading(reset);

    const res = await fetch(`${API_BASE}/seller/orders?${params.toString()}`, {
      headers: authHeaders(),
    });

    if (res.status === 401) {
      showToast('Session expired. Please log in again.', true);
      setTimeout(() => (window.location.href = 'login.html'), 2000);
      return;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const { orders = [], pagination = {} } = data.data || {};

    totalOrders = pagination.total || 0;
    // Detect first order arrival (previously zero, now >0) and notify dashboard
    try {
      if ((Number(prevTotalOrders) === 0) && Number(totalOrders) > 0) {
        console.log('First order detected — dispatching dashboard update');
        window.dispatchEvent(new CustomEvent('seller-dashboard-updated'));
        window.dispatchEvent(new CustomEvent('sellerNotificationsUpdated'));
      }
      prevTotalOrders = Number(totalOrders || 0);
      try { localStorage.setItem('seller_prev_total_orders', String(prevTotalOrders)); } catch (e) {}
    } catch (e) { console.warn('Failed to dispatch first-order dashboard update', e); }

    if (reset) {
      loadedOrders = orders;
    } else {
      loadedOrders = [...loadedOrders, ...orders];
    }

    allLoaded = loadedOrders.length >= totalOrders;
    loadMoreBtn.style.display = allLoaded ? 'none' : 'block';

    renderOrders(reset);
  } catch (err) {
    console.error('fetchOrders error:', err);
    showToast('Failed to load orders: ' + err.message, true);
    setTableEmpty('Could not load orders. Please try again.');
  }
}

/* ── render ──────────────────────────────────────────────── */

function setTableLoading(clear) {
  if (!clear) return;
  // Remove all existing data rows
  document.querySelectorAll('.order-row:not(.header)').forEach(r => r.remove());

  const loadingRow = document.createElement('div');
  loadingRow.className = 'order-row loading-row';
  loadingRow.style.cssText = 'grid-column:1/-1;text-align:center;color:#718096;padding:24px;';
  loadingRow.textContent = 'Loading orders…';
  orderTable.appendChild(loadingRow);
}

function setTableEmpty(msg) {
  document.querySelectorAll('.order-row:not(.header), .loading-row').forEach(r => r.remove());

  const emptyRow = document.createElement('div');
  emptyRow.className = 'order-row empty-row';
  emptyRow.style.cssText =
    'grid-column:1/-1;text-align:center;color:#a0aec0;padding:40px;font-size:1rem;';
  emptyRow.textContent = msg || 'No orders found.';
  orderTable.appendChild(emptyRow);
}

function renderOrders(reset) {
  // On reset, clear existing rows; on "load more", keep existing and append
  if (reset) {
    document.querySelectorAll('.order-row:not(.header), .loading-row, .empty-row').forEach(r =>
      r.remove()
    );
  }

  if (loadedOrders.length === 0) {
    setTableEmpty('No orders found.');
    return;
  }

  // Determine which slice to render (new rows only on load-more)
  const startIdx = reset ? 0 : loadedOrders.length - (loadedOrders.length % PAGE_SIZE || PAGE_SIZE);
  const slice    = reset ? loadedOrders : loadedOrders.slice(startIdx);

  slice.forEach(order => {
    // One row per order (may contain multiple items; show first product + count)
    const firstItem  = order.items[0] || {};
    const extraCount = order.items.length > 1 ? ` (+${order.items.length - 1} more)` : '';
    // Fallback to productSnapshot/product_snapshot for specs
    let ps = firstItem.product_snapshot || firstItem.productSnapshot || {};
    if (typeof ps === 'string') {
      try { ps = JSON.parse(ps); } catch(e) { ps = {}; }
    }
    const fColor = firstItem.color || ps.color || null;
    const fSize = firstItem.size || ps.size || null;
    const specHtml = (fColor || fSize) ? `<div class="product-specs" style="font-size:0.9rem;color:#4a5568;margin-top:4px">${fColor ? `Color: ${fColor}` : ''}${fColor && fSize ? ' · ' : ''}${fSize ? `Size: ${fSize}` : ''}</div>` : '';
    const productLabel = (firstItem.productName || '—') + extraCount + specHtml;
    const totalQty   = order.items.reduce((s, i) => s + i.quantity, 0);

    const row = document.createElement('div');
    row.className = 'order-row';
    row.dataset.orderId = order.orderId;

    row.innerHTML = `
      <div data-label="Order ID">#${order.orderId.slice(0, 8).toUpperCase()}</div>
      <div data-label="Customer">${order.buyer.name || '—'}</div>
      <div data-label="Product">${productLabel}</div>
      <div data-label="Qty">${totalQty}</div>
      <div data-label="Date">${formatDate(order.createdAt)}</div>
      <div data-label="Status">
        <span class="status ${capitalize(order.status)}">${capitalize(order.status)}</span>
      </div>
      <div data-label="Action">
        ${buildActionButton(order)}
      </div>
    `;

    orderTable.appendChild(row);
    // Make entire row clickable (but ignore clicks on interactive elements and excluded cells)
    row.classList.add('clickable-row');
    if (!row._clickableAttached) {
      row._clickableAttached = true;
      row.addEventListener('click', function (e) {
        // Ignore clicks from inputs, links, selects, or explicit buttons
        if (e.target.closest('button, a, input, select, textarea')) return;
        // Ignore clicks on Order ID, Status, or Action cells
        if (e.target.closest('[data-label="Order ID"]') || e.target.closest('[data-label="Action"]')) return;
        if (e.target.closest('.status')) return;

        openSellerProductDetailsModal(order.orderId);
      });
    }
  });

  // Attach event listeners to action buttons
  document.querySelectorAll('.mark-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      pendingOrderId   = btn.dataset.id;
pendingNewStatus = btn.dataset.status;
document.getElementById('trackingFields').style.display = 
  pendingNewStatus === 'shipped' ? 'block' : 'none';
      newStatusText.textContent = capitalize(pendingNewStatus);
      
      // Populate order items with specs in confirmation modal
      const order = loadedOrders.find(o => String(o.orderId) === String(pendingOrderId));
      if (order && order.items) {
        const itemsDiv = document.getElementById('confirmationOrderItems');
        itemsDiv.innerHTML = order.items.map(item => {
          const color = getItemColor(item);
          const size = getItemSize(item);
          const specs = (color || size) ? `<div style="color:#64748b;font-size:0.85em;margin-top:4px">` + (color ? `Color: ${escapeHtmlSpec(color)}` : '') + (color && size ? ' · ' : '') + (size ? `Size: ${escapeHtmlSpec(size)}` : '') + `</div>` : '';
          return `<div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #e5e7eb;"><div style="font-weight:600;color:#1e293b">${escapeHtmlSpec(item.product_name || 'Item')}</div><div style="font-size:0.9em;color:#475569">Qty: ${item.quantity}</div>${specs}</div>`;
        }).join('');
        document.getElementById('confirmationWarning').style.display = 'block';
      }
      confirmModal.classList.add('show');
    });
  });
}

function openSellerProductDetailsModal(orderId) {
  const order = loadedOrders.find(o => String(o.orderId) === String(orderId));
  if (!order) return;

  const item = order.items?.[0] || {};
  let ps = item.product_snapshot || item.productSnapshot || {};
  if (typeof ps === 'string') {
    try { ps = JSON.parse(ps); } catch (e) { ps = {}; }
  }

  document.getElementById('sellerPdName').textContent = item.productName || item.product_name || item.name || 'Product Details';
  document.getElementById('sellerPdOrderId').textContent = `#${order.orderId.slice(0, 8).toUpperCase()}`;
  document.getElementById('sellerPdDate').textContent = formatDate(order.createdAt);
  document.getElementById('sellerPdBuyer').textContent = order.buyer?.name || '—';
  document.getElementById('sellerPdStatus').textContent = capitalize(order.status || '—');
  document.getElementById('sellerPdProduct').textContent = item.productName || item.product_name || item.name || '—';
  document.getElementById('sellerPdQty').textContent = item.quantity || item.qty || 1;
  document.getElementById('sellerPdColor').textContent = item.color || ps.color || '—';
  document.getElementById('sellerPdSize').textContent = item.size || ps.size || '—';
  document.getElementById('sellerPdTotal').textContent = formatCurrency(order.totalAmount || order.total_amount || order.total_price || 0);

  const imageUrl = getOrderItemImage(item) || 'https://via.placeholder.com/300x300?text=Product';
  document.getElementById('sellerPdImage').src = imageUrl;

  document.getElementById('sellerProductDetailsModal').classList.add('show');
}

function closeSellerProductDetailsModal() {
  document.getElementById('sellerProductDetailsModal').classList.remove('show');
}

function buildActionButton(order) {
  const status = (order.status || '').toLowerCase();

  if (status === 'pending') {
    return `<button class="mark-btn" data-id="${order.orderId}" data-status="confirmed">Confirm</button>`;
  }
  if (status === 'confirmed') {
    return `<button class="mark-btn" data-id="${order.orderId}" data-status="processing">Processing</button>`;
  }
  if (status === 'processing') {
    return `<button class="mark-btn" data-id="${order.orderId}" data-status="shipped">Ship</button>`;
  }
  if (status === 'shipped') {
    return `<button class="mark-btn" data-id="${order.orderId}" data-status="delivered" style="background:#27ae60">Delivered</button>`;
  }
  if (status === 'delivered') {
    return `<button class="mark-btn" disabled>Completed</button>`;
  }
  if (status === 'cancelled') {
    return `<button class="mark-btn" disabled style="background:#e74c3c">Cancelled</button>`;
  }
  return `<button class="mark-btn" disabled>—</button>`;
}

/* ── status update ───────────────────────────────────────── */

// Helper to create order status change notifications
async function createOrderNotification(orderId, newStatus) {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user?.id;
    if (!userId) return;

    const store = (typeof StoreManager !== 'undefined' && StoreManager.getActiveStore) ? StoreManager.getActiveStore() : null;
    const storeName = store?.business_name || 'your store';

    // Map status to user-friendly message
    const statusMessages = {
      'confirmed': `Your order #${orderId.slice(0, 8).toUpperCase()} has been confirmed and is being prepared.`,
      'processing': `Your order #${orderId.slice(0, 8).toUpperCase()} is now being processed.`,
      'shipped': `Your order #${orderId.slice(0, 8).toUpperCase()} has been shipped! You can track it soon.`,
      'delivered': `Your order #${orderId.slice(0, 8).toUpperCase()} has been delivered successfully.`,
    };

    const notifPayload = {
      user_id: userId,
      title: `Order ${capitalize(newStatus)}`,
      message: statusMessages[newStatus] || `Your order status has been updated to ${capitalize(newStatus)}.`,
      type: 'account',
      link: '/sellers/sellers order.html'
    };

    // Try NotificationManager first
    if (userId && typeof NotificationManager !== 'undefined' && NotificationManager.createNotification) {
      try {
        await NotificationManager.createNotification(userId, {
          title: notifPayload.title,
          message: notifPayload.message,
          type: notifPayload.type,
          link: notifPayload.link
        });
      } catch (e) {
        console.warn('NotificationManager.createNotification failed', e);
        // Fallback to direct API
        throw e;
      }
    } else {
      throw new Error('NotificationManager not available');
    }
  } catch (e) {
    // Fallback: try direct API call
    try {
      const token = getToken();
      const userId = JSON.parse(localStorage.getItem('user') || '{}')?.id;
      if (!token || !userId) return;

      const store = (typeof StoreManager !== 'undefined' && StoreManager.getActiveStore) ? StoreManager.getActiveStore() : null;
      const storeName = store?.business_name || 'your store';

      const statusMessages = {
        'confirmed': `Your order #${orderId.slice(0, 8).toUpperCase()} has been confirmed and is being prepared.`,
        'processing': `Your order #${orderId.slice(0, 8).toUpperCase()} is now being processed.`,
        'shipped': `Your order #${orderId.slice(0, 8).toUpperCase()} has been shipped! You can track it soon.`,
        'delivered': `Your order #${orderId.slice(0, 8).toUpperCase()} has been delivered successfully.`,
      };

      await fetch(`${API_BASE}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Store-Id': getActiveStoreId()
        },
        body: JSON.stringify({
          user_id: userId,
          title: `Order ${capitalize(newStatus)}`,
          message: statusMessages[newStatus] || `Your order status has been updated to ${capitalize(newStatus)}.`,
          type: 'account',
          link: '/sellers/sellers order.html'
        })
      });
    } catch (fallbackErr) {
      console.warn('Failed to create order notification:', fallbackErr);
    }
  }
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    const res = await fetch(`${API_BASE}/seller/orders/${orderId}/status`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({
        status: newStatus,
        ...(newStatus === 'shipped' ? {
          courierName: document.getElementById('trackingCourier').value || null,
          trackingId:  document.getElementById('trackingIdInput').value || null,
          trackingLink: document.getElementById('trackingLinkInput').value || null,
        } : {})
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);

    showToast(`Order updated to "${capitalize(newStatus)}" ✓`);

    try {
      await createOrderNotification(orderId, newStatus);
    } catch (notifErr) {
      console.warn('Notification creation failed (non-blocking):', notifErr);
    }

    await fetchOrders(true);
    window.dispatchEvent(new CustomEvent('sellerNotificationsUpdated'));
  } catch (err) {
    console.error('updateOrderStatus error:', err);
    showToast('Failed to update order: ' + err.message, true);
  }
}
/* ── modal ───────────────────────────────────────────────── */

function closeModal() {
  confirmModal.classList.remove('show');
  pendingOrderId   = null;
  pendingNewStatus = null;
  document.getElementById('trackingFields').style.display = 'none';
  document.getElementById('trackingCourier').value = '';
  document.getElementById('trackingIdInput').value = '';
  document.getElementById('trackingLinkInput').value = '';
}

confirmYes.addEventListener('click', async () => {
  if (!pendingOrderId || !pendingNewStatus) return closeModal();
  const id     = pendingOrderId;
  const status = pendingNewStatus;
  closeModal();
  await updateOrderStatus(id, status);
});

confirmNo.addEventListener('click', closeModal);

document.getElementById('sellerPdClose')?.addEventListener('click', closeSellerProductDetailsModal);

document.getElementById('sellerProductDetailsModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'sellerProductDetailsModal') closeSellerProductDetailsModal();
});

window.addEventListener('click', e => {
  if (e.target === confirmModal) closeModal();
});

/* ── filters / search ────────────────────────────────────── */

let searchDebounceTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => fetchOrders(true), 400);
});

statusFilter.addEventListener('change', () => fetchOrders(true));

/* ── load more ───────────────────────────────────────────── */

loadMoreBtn.addEventListener('click', () => {
  if (allLoaded) return;
  currentPage++;
  fetchOrders(false);
});

/* ── navbar / tips (unchanged from original) ─────────────── */

document.addEventListener('DOMContentLoaded', async function () {
  const toggler       = document.getElementById('navbar-toggler');
  const offcanvasMenu = document.getElementById('offcanvasMenu');
  const offcanvasClose = document.getElementById('offcanvasClose');

  toggler.addEventListener('click', () => offcanvasMenu.classList.add('show'));
  offcanvasClose.addEventListener('click', () => offcanvasMenu.classList.remove('show'));

  document.addEventListener('click', e => {
    if (!offcanvasMenu.contains(e.target) && !toggler.contains(e.target)) {
      offcanvasMenu.classList.remove('show');
    }
  });

  offcanvasMenu.addEventListener('click', e => e.stopPropagation());

  document.querySelectorAll('.offcanvas-body a').forEach(link => {
    link.addEventListener('click', () => offcanvasMenu.classList.remove('show'));
  });

  // Profile dropdown
  document.querySelectorAll('.profile-icon').forEach(icon => {
    icon.addEventListener('click', toggleProfileDropdown);
  });

  document.addEventListener('click', e => {
    const dropdown = document.getElementById('profileDropdown');
    const profile  = document.querySelector('.profile-icon');
    if (dropdown && profile && !dropdown.contains(e.target) && !profile.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });

  // Seller tips close
  const closeTips = document.getElementById('closeTips');
  if (closeTips) {
    closeTips.addEventListener('click', () => {
      document.getElementById('sellerTips').style.display = 'none';
    });
  }

  const activeStore = await requireActiveStore();
  if (!activeStore) return;

  // Initial load
  loadProfile();
  fetchOrders(true);

  // Initialize notifications
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user?.id;
  if (userId) {
    try {
      if (typeof NotificationManager !== 'undefined' && NotificationManager.init) {
        await NotificationManager.init(userId);
        console.log('✓ Notifications initialized for order page');
      }
    } catch (e) {
      console.warn('Notification initialization failed:', e);
    }
  }
});

window.addEventListener('storeChanged', () => {
  fetchOrders(true);
});

function toggleProfileDropdown() {
  const dropdown = document.getElementById('profileDropdown');
  if (dropdown) {
    dropdown.style.display = dropdown.style.display === 'flex' ? 'none' : 'flex';
  }
}

window.toggleProfileDropdown = toggleProfileDropdown;

/* ── Load Profile ──────────────────────────────────────────── */
async function loadProfile() {
  try {
    const data = await apiFetch('/seller/profile');
    const profile = data?.data?.seller;
    if (profile) {
      renderProfileImage(profile);
    }
  } catch (err) {
    console.error('Error loading profile:', err);
  }
}
