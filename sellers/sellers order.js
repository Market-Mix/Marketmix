/* =============================================================
   sellers order.js  —  MarketMix Seller Orders (API-integrated)
   ============================================================= */

const API_BASE = 'https://marketmix-backend.onrender.com/api';

/* ── helpers ─────────────────────────────────────────────── */

function getToken() {
  return localStorage.getItem('token') || '';
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
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

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
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
  const img = document.getElementById('sellerProfileImage');
  if (!img) return;
  const logo = profile?.profile?.storeLogo;
  if (logo) {
    img.src = logo;
    img.onerror = () => {
      img.src = '';
    };
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
    const productLabel = (firstItem.productName || '—') + extraCount;
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
  });

  // Attach event listeners to action buttons
  document.querySelectorAll('.mark-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      pendingOrderId   = btn.dataset.id;
      pendingNewStatus = btn.dataset.status;
      newStatusText.textContent = capitalize(pendingNewStatus);
      confirmModal.classList.add('show');
    });
  });
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

async function updateOrderStatus(orderId, newStatus) {
  try {
    const res = await fetch(`${API_BASE}/seller/orders/${orderId}/status`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ status: newStatus }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || `HTTP ${res.status}`);
    }

    showToast(`Order updated to "${capitalize(newStatus)}" ✓`);

    // Refresh the list to reflect the new status
    await fetchOrders(true);
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
}

confirmYes.addEventListener('click', async () => {
  if (!pendingOrderId || !pendingNewStatus) return closeModal();
  const id     = pendingOrderId;
  const status = pendingNewStatus;
  closeModal();
  await updateOrderStatus(id, status);
});

confirmNo.addEventListener('click', closeModal);

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

document.addEventListener('DOMContentLoaded', function () {
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

  // Initial load
  loadProfile();
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