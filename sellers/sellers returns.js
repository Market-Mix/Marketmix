let returnsData = [];
let currentCaseInfo = null; // Store latest case info from polling
let caseInfoCache = {}; // cache for latest case info per refund ID (in-memory only)
let pollingIntervals = {}; // track polling intervals per case (in-memory only)
let unreadCounts = {}; // track unread refund_chat notifications per refund ID

const SUPABASE_URL = 'https://zfyoxmwwuwgvaevwlgzn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeW94bXd3dXdndmFldhdsZ3puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDkyNzc2MzksImV4cCI6MTk5NTA1MzYzOX0.a1_-jLQu5NXhKYr5pQvCJvCB0BEfxCqw8DvL5P5qEHs';
let supabaseClient = null;

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('❌ Supabase client not loaded.');
    return null;
  }
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabaseClient;
}

function getStoredAuthUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
  } catch (err) {
    return {};
  }
}

function getCurrentSellerId() {
  const user = getStoredAuthUser();
  return user?.id || user?._id || user?.userId || null;
}

function getRefundStatusMeta(refundCase = {}) {
  const decision = String(refundCase?.marketmix_decision || '').toLowerCase();
  const resolution = String(refundCase?.resolution_status || refundCase?.status || 'pending').toLowerCase();

  if (resolution === 'return_required') {
    return { label: 'Return Required', statusClass: 'return_required', statusKey: 'return_required', isRejected: false };
  }

  if (resolution === 'refund_processing') {
    return { label: 'Refund Processing', statusClass: 'refund_processing', statusKey: 'refund_processing', isRejected: false };
  }

  if (resolution === 'awaiting_refund_release') {
    return { label: 'Awaiting Refund Release', statusClass: 'awaiting_refund_release', statusKey: 'awaiting_refund_release', isRejected: false };
  }

  if (decision === 'approved' || resolution === 'waiting_seller_return_decision') {
    return { label: 'Approved', statusClass: 'approved', statusKey: 'approved', isRejected: false };
  }

  if (decision === 'rejected' || resolution === 'refund_rejected') {
    return { label: 'Denied', statusClass: 'denied', statusKey: 'denied', isRejected: true };
  }

  if (resolution === 'waiting_buyer_confirmation') {
    return { label: 'Awaiting Buyer Confirmation', statusClass: 'waiting_buyer_confirmation', statusKey: 'waiting_buyer_confirmation', isRejected: false };
  }

  if (resolution === 'return_in_transit') {
    return { label: 'Return In Transit', statusClass: 'return_in_transit', statusKey: 'return_in_transit', isRejected: false };
  }

  if (resolution === 'resolved') {
    return { label: 'Resolved', statusClass: 'resolved', statusKey: 'resolved', isRejected: false };
  }

  if (resolution === 'escalated') {
    return { label: 'Escalated', statusClass: 'escalated', statusKey: 'escalated', isRejected: false };
  }

  return { label: 'Pending', statusClass: 'pending', statusKey: 'pending', isRejected: false };
}

function mapRefundCaseFromSupabase(caseData) {
  // Extract color/size from order_item or product_snapshot
  let color = caseData.color || null;
  let size = caseData.size || null;
  const statusMeta = getRefundStatusMeta(caseData);
  
  let ps = caseData.product_snapshot;
  if (ps && typeof ps === 'string') {
    try {
      ps = JSON.parse(ps);
      if (!color) color = ps.color || null;
      if (!size) size = ps.size || null;
    } catch (e) {
      ps = {};
    }
  }
  
  return {
    id: caseData.id,
    buyerName: caseData.buyer_name || caseData.buyer_id || 'Buyer',
    productName: caseData.product_name || 'Purchased Item',
    orderId: caseData.order_id || 'N/A',
    reason: caseData.reason || caseData.complaint_text || '',
    notes: caseData.complaint_text || caseData.reason || '',
    productImage: caseData.product_image || caseData.product_image_url || 'https://via.placeholder.com/200?text=Product',
    amount: Number(caseData.total_amount || caseData.amount || 0),
    status: statusMeta.label,
    statusClass: statusMeta.statusClass,
    statusKey: statusMeta.statusKey,
    marketMixReason: caseData.marketmix_decision_reason || caseData.marketmix_reason || caseData.seller_response || 'Awaiting review.',
    purchase_date: caseData.purchase_date || caseData.created_at,
    evidence_submitted_at: caseData.evidence_submitted_at || caseData.created_at,
    messages: [],
    date: caseData.evidence_submitted_at || caseData.created_at,
    evidence_url: caseData.evidence_url || null,
    seller_id: caseData.seller_id,
    store_name: caseData.store_name || 'Store',
    chat_started: caseData.chat_started || false,
    resolution_status: caseData.resolution_status || 'pending',
    marketmix_decision: caseData.marketmix_decision || null,
    marketmix_decided_at: caseData.marketmix_decided_at || null,
    marketmix_decided_by: caseData.marketmix_decided_by || null,
    seller_return_choice: caseData.seller_return_choice || null,
    seller_return_choice_at: caseData.seller_return_choice_at || null,
    return_address_line1: caseData.return_address_line1 || null,
    return_address_line2: caseData.return_address_line2 || null,
    return_city: caseData.return_city || null,
    return_state: caseData.return_state || null,
    return_postal_code: caseData.return_postal_code || null,
    return_country: caseData.return_country || null,
    buyer_return_deadline: caseData.buyer_return_deadline || null,
    seller_marked_resolved: caseData.seller_marked_resolved || false,
    buyer_confirmed_resolution: caseData.buyer_confirmed_resolution || false,
    escalated_to_marketmix: caseData.escalated_to_marketmix || false,
    seller_resolved_at: caseData.seller_resolved_at || null,
    escalated_at: caseData.escalated_at || null,
    buyer_confirmed_at: caseData.buyer_confirmed_at || null,
    shipping_status: caseData.shipping_status || null,
    shipment_notes: caseData.shipment_notes || caseData.notes || null,
    courier_name: caseData.courier_name || null,
    tracking_number: caseData.tracking_number || null,
    shipping_receipt_url: caseData.shipping_receipt_url || null,
    buyer_shipped_at: caseData.buyer_shipped_at || null,
    color: color,
    size: size,
    product_snapshot: ps
  };
}

async function loadSellerRefundCases() {
  const token = getToken();
  if (!token) {
    console.error('No auth token available.');
    return [];
  }

  try {
    const res = await fetch(`${API_BASE}/seller/refund-cases`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      console.error(`Failed to fetch refund cases: ${res.status} ${res.statusText}`);
      return [];
    }

    const json = await res.json();
    const data = json?.data || [];
    
    // DEBUG: Log raw API response for first item
    if (data.length > 0) {
      console.log('SELLER REFUND API RESPONSE (RAW)', data[0]);
    }

    returnsData = (data || []).map(mapRefundCaseFromSupabase);
    
    // DEBUG: Log mapped data for first item
    if (returnsData.length > 0) {
      console.log('SELLER REFUND MAPPED DATA', returnsData[0]);
    }

    dispatchSellerNotificationsUpdated();
    return returnsData;
  } catch (err) {
    console.error('Error loading seller refund cases:', err);
    return [];
  }
}

function calculateSellerOpenRefundCount(refunds = []) {
  const openStatuses = new Set([
    'open',
    'pending',
    'active',
    'waiting_buyer_confirmation',
    'in_progress',
    'in_review',
    'under_review',
    'under review'
  ]);

  return (refunds || []).reduce((count, refund) => {
    const status = String(refund?.resolution_status || refund?.status || '').toLowerCase().trim();
    return openStatuses.has(status) ? count + 1 : count;
  }, 0);
}

function dispatchSellerNotificationsUpdated() {
  const count = calculateSellerOpenRefundCount(returnsData);
  console.log('Seller notification refresh triggered');
  console.log('Seller returns count:', count);
  try {
    localStorage.setItem('sellerReturnsActiveCount', String(count));
    localStorage.setItem('sellerNotificationsUpdatedAt', String(Date.now()));
  } catch (e) {
    console.warn('Could not persist seller notification count for cross-tab sync:', e);
  }

  try {
    // include detail to allow listeners to update badges immediately
    window.dispatchEvent(new CustomEvent('sellerNotificationsUpdated', { detail: { count } }));
  } catch (e) {
    console.warn('Could not dispatch sellerNotificationsUpdated event:', e);
  }
}

// API Constants
const API_BASE = 'https://marketmix-backend.onrender.com/api';

// Auth helpers
function getToken() {
  // Prefer seller-scoped token to avoid buyer session overwrite
  return localStorage.getItem('seller_token') || localStorage.getItem('token') || '';
}

function authHeaders() {
  return {
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json'
  };
}

// API Fetch
async function apiFetch(path, opts = {}) {
  opts.headers = { ...authHeaders(), ...(opts.headers || {}) };
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (res.status === 401) {
    handleLogout();
    throw new Error('Unauthorized');
  }
  return res.json();
}

// ── Unread Notification Helpers ────────────────────────────
function getUnreadCount(refundId) {
  return unreadCounts[refundId] || 0;
}

function setUnreadCount(refundId, count) {
  if (count > 0) {
    unreadCounts[refundId] = count;
  } else {
    delete unreadCounts[refundId];
  }
}

function getTotalUnreadCount() {
  let total = 0;
  returnsData.forEach(item => {
    total += getUnreadCount(item.id);
  });
  return total;
}

function updateNotificationBadges() {
  const total = getTotalUnreadCount();
  // Update notification badge if global function exists
  window.updateReturnsNotification?.(total);
}

function refreshChatBadge(refundId) {
  const row = document.querySelector(`.table-row[data-refund-id="${refundId}"]`);
  if (!row) return;
  const chatCell = row.querySelector('.col-chat');
  if (!chatCell) return;
  const button = chatCell.querySelector('button.btn-chat');
  if (!button) return;
  chatCell.innerHTML = getChatButtonWithBadge(refundId, button.outerHTML);
}

function refreshAllChatBadges() {
  returnsData.forEach(item => refreshChatBadge(item.id));
}

async function refreshRefundUnreadCounts() {
  const token = getToken();
  if (!token || !returnsData.length) return;

  await Promise.all(returnsData.map(async item => {
    try {
      const res = await fetch(`${API_BASE}/refund-chat/${item.id}/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      const count = Number(data?.data?.count || 0);
      setUnreadCount(item.id, count);
    } catch (err) {
      console.warn(`Failed to refresh unread count for refund ${item.id}:`, err.message || err);
    }
  }));

  updateNotificationBadges();
  refreshAllChatBadges();
}

function getBadgeHtml(refundId) {
  const count = getUnreadCount(refundId);
  if (count > 0) {
    const displayCount = count > 99 ? '99+' : count;
    return `<span class="notification-badge" style="position: absolute; top: -6px; right: -6px; background: #ef4444; color: white; border-radius: 50%; min-width: 20px; height: 20px; padding: 0 6px; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 600; border: 2px solid white; line-height: 1; pointer-events: none;">${displayCount}</span>`;
  }
  return '';
}

function getChatButtonWithBadge(refundId, buttonHtml) {
  const badge = getBadgeHtml(refundId);
  if (badge) {
    return `<div style="position: relative; display: inline-flex; width: auto;">${buttonHtml}${badge}</div>`;
  }
  return buttonHtml;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Profile Image
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

// Logout
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

// Load Profile
async function loadProfile() {
  try {
    const data = await apiFetch('/seller/profile');
    const profile = data?.data?.seller;
    if (profile) {
      renderProfileImage(profile);
    }

    const account = await apiFetch('/auth/me');
    const user = account?.data?.user;
    if (user) {
      currentSellerReturnAddress = {
        address: user.address || '',
        address2: user.address2 || '',
        city: user.city || '',
        state: user.state || '',
        postalCode: user.postalCode || '',
        country: user.country || 'Nigeria'
      };
    }
  } catch (err) {
    console.error('Error loading profile:', err);
  }
}

let currentReturnId = null;
let currentSellerReturnAddress = {
  address: '',
  address2: '',
  city: '',
  state: '',
  postalCode: '',
  country: ''
};

function setReturnAddressFormVisibility(show) {
  const form = document.getElementById('marketmixConfirmForm');
  if (!form) return;
  form.style.display = show ? 'block' : 'none';
}

function populateReturnAddressForm(defaultDeadline = 7) {
  const addressEl = document.getElementById('marketmixReturnAddress');
  const address2El = document.getElementById('marketmixReturnAddress2');
  const cityEl = document.getElementById('marketmixReturnCity');
  const stateEl = document.getElementById('marketmixReturnState');
  const postalCodeEl = document.getElementById('marketmixReturnPostalCode');
  const countryEl = document.getElementById('marketmixReturnCountry');
  const deadlineEl = document.getElementById('marketmixReturnDeadline');

  if (addressEl) addressEl.value = currentSellerReturnAddress.address || '';
  if (address2El) address2El.value = currentSellerReturnAddress.address2 || '';
  if (cityEl) cityEl.value = currentSellerReturnAddress.city || '';
  if (stateEl) stateEl.value = currentSellerReturnAddress.state || '';
  if (postalCodeEl) postalCodeEl.value = currentSellerReturnAddress.postalCode || '';
  if (countryEl) countryEl.value = currentSellerReturnAddress.country || 'Nigeria';
  if (deadlineEl) {
    deadlineEl.value = defaultDeadline;
    deadlineEl.min = 3;
    deadlineEl.max = 14;
  }

  const errorEl = document.getElementById('marketmixReturnFormError');
  if (errorEl) {
    errorEl.style.display = 'none';
    errorEl.textContent = '';
  }
}

function getReturnAddressFormData() {
  return {
    return_address: document.getElementById('marketmixReturnAddress')?.value.trim() || '',
    return_address2: document.getElementById('marketmixReturnAddress2')?.value.trim() || '',
    return_city: document.getElementById('marketmixReturnCity')?.value.trim() || '',
    return_state: document.getElementById('marketmixReturnState')?.value.trim() || '',
    return_postal_code: document.getElementById('marketmixReturnPostalCode')?.value.trim() || '',
    return_country: document.getElementById('marketmixReturnCountry')?.value.trim() || '',
    return_deadline: Number(document.getElementById('marketmixReturnDeadline')?.value || 0)
  };
}

function validateReturnAddressForm() {
  const data = getReturnAddressFormData();
  const errorEl = document.getElementById('marketmixReturnFormError');
  if (!data.return_address) {
    if (errorEl) {
      errorEl.textContent = 'Please enter the return street address.';
      errorEl.style.display = 'block';
    }
    return false;
  }
  if (!data.return_city) {
    if (errorEl) {
      errorEl.textContent = 'Please enter the return city.';
      errorEl.style.display = 'block';
    }
    return false;
  }
  if (!data.return_address2) {
    if (errorEl) {
      errorEl.textContent = 'Please enter address line 2.';
      errorEl.style.display = 'block';
    }
    return false;
  }
  if (!data.return_state) {
    if (errorEl) {
      errorEl.textContent = 'Please enter the return state.';
      errorEl.style.display = 'block';
    }
    return false;
  }
  if (!data.return_postal_code) {
    if (errorEl) {
      errorEl.textContent = 'Please enter the return postal code.';
      errorEl.style.display = 'block';
    }
    return false;
  }
  if (!data.return_country) {
    if (errorEl) {
      errorEl.textContent = 'Please enter the return country.';
      errorEl.style.display = 'block';
    }
    return false;
  }
  if (!Number.isInteger(data.return_deadline) || data.return_deadline < 3 || data.return_deadline > 14) {
    if (errorEl) {
      errorEl.textContent = 'Return deadline must be between 3 and 14 days.';
      errorEl.style.display = 'block';
    }
    return false;
  }
  if (errorEl) {
    errorEl.style.display = 'none';
    errorEl.textContent = '';
  }
  return true;
}

// DOM Elements
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const returnsTableBody = document.getElementById('returnsTableBody');
const modalBackdrop = document.getElementById('modalBackdrop');
const returnModal = document.getElementById('returnModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const navbarToggler = document.getElementById('navbar-toggler');
const offcanvasMenu = document.getElementById('offcanvasMenu');
const offcanvasClose = document.getElementById('offcanvasClose');

// Profile Dropdown
function toggleProfileDropdown() {
  const dropdown = document.getElementById('profileDropdown');
  if (dropdown) {
    dropdown.style.display = dropdown.style.display === 'flex' ? 'none' : 'flex';
  }
}

window.toggleProfileDropdown = toggleProfileDropdown;

// Navbar Toggle
if (navbarToggler) {
  navbarToggler.addEventListener('click', () => {
    offcanvasMenu.style.right = '0';
  });
}

if (offcanvasClose) {
  offcanvasClose.addEventListener('click', () => {
    offcanvasMenu.style.right = '-300px';
  });
}

// ═══════════════════════════════════════════════════════════════════════════════════
// REAL-TIME POLLING FOR REFUND CASE STATUS
// ═══════════════════════════════════════════════════════════════════════════════════

async function pollRefundCaseStatus(refundId) {
  if (!refundId) return;

  const token = getToken();
  try {
    const response = await fetch(`${API_BASE}/refunds/${refundId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      console.warn(`⚠️ Failed to poll refund ${refundId}:`, response.status);
      return null;
    }

    const result = await response.json();
    const caseInfo = result.refundCase || null;

    if (caseInfo) {
      caseInfoCache[refundId] = caseInfo;
      
      // Fetch unread notification count for this refund case
      try {
        const notifCountRes = await fetch(`${API_BASE}/refund-chat/${refundId}/unread-count`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (notifCountRes.ok) {
          const notifCountData = await notifCountRes.json();
          const unreadNotifCount = Number(notifCountData.data?.count || 0);
          setUnreadCount(refundId, unreadNotifCount);
        }
      } catch (err) {
        console.warn('Failed to fetch notification count:', err.message);
      }
      
      updateNotificationBadges();
      refreshChatBadge(refundId);

      // If chat is currently open for this case, update UI
      if (currentChatId === refundId) {
        currentCaseInfo = caseInfo;
        applyChatLockState(caseInfo);
        updateChatStatusDisplay(caseInfo);
      }

      // Update table row UI
      updateReturnRowUI(refundId, caseInfo);
    }

    return caseInfo;
  } catch (err) {
    console.error(`⚠️ Polling error for refund ${refundId}:`, err.message);
    return null;
  }
}

function startPolling(refundId) {
  if (!refundId) return;

  // Clear existing interval if any
  stopPolling(refundId);

  // Start new polling interval every 10 seconds
  pollingIntervals[refundId] = setInterval(() => {
    pollRefundCaseStatus(refundId);
  }, 10000);

  // Poll immediately on start
  pollRefundCaseStatus(refundId);

  console.log(`🔄 Polling started for refund ${refundId}`);
}

function stopPolling(refundId) {
  if (pollingIntervals[refundId]) {
    clearInterval(pollingIntervals[refundId]);
    delete pollingIntervals[refundId];
    console.log(`⏹️ Polling stopped for refund ${refundId}`);
  }
}

function updateChatStatusDisplay(caseInfo) {
  const statusEl = document.getElementById('chatResolutionStatus');
  if (!statusEl || !caseInfo) return;

  const status = String(caseInfo.resolution_status || '').toLowerCase();
  statusEl.className = 'resolution-status ' + status;

  const statusText = {
    pending: '⏳ Pending Resolution',
    waiting_buyer_confirmation: '⏸️ Awaiting Buyer Decision',
    awaiting_refund_release: '⏳ Awaiting Refund Release',
    resolved: '✓ Case Resolved',
    escalated: '⛔ Escalated To MarketMix'
  }[status] || 'Unknown Status';

  statusEl.textContent = statusText;
}

function updateReturnRowUI(refundId, caseInfo) {
  if (!caseInfo) return;

  // Find table row for this return
  const rows = document.querySelectorAll('.table-row');
  let targetRow = null;

  rows.forEach(row => {
    const cells = row.querySelectorAll('td, div');
    if (cells.length > 0) {
      // Check if this is the right row by looking at order ID or other identifier
      const rowText = row.textContent;
      if (rowText.includes(caseInfo.order_id)) {
        targetRow = row;
      }
    }
  });

  if (!targetRow) return;

  // Update status badge
  const statusCell = targetRow.querySelector('[style*="Pending"]')?.parentElement;
  if (statusCell) {
    statusCell.textContent = caseInfo.resolution_status.replace(/_/g, ' ').toUpperCase();
  }

  // Update button visibility based on resolution status
  const buttons = targetRow.querySelectorAll('button');
  buttons.forEach(btn => {
    if (btn.textContent.includes('Issue Resolved')) {
      if (['resolved', 'escalated', 'waiting_buyer_confirmation'].includes(caseInfo.resolution_status)) {
        btn.style.display = 'none';
      }
    } else if (btn.textContent.includes('Escalate')) {
      if (['resolved', 'escalated'].includes(caseInfo.resolution_status)) {
        btn.style.display = 'none';
      }
    }
  });
}

// Render Table
function renderTable(data = returnsData) {
  returnsTableBody.innerHTML = '';
  
  data.forEach(item => {
    const row = document.createElement('div');
    row.className = 'table-row';
    
    const statusMeta = getRefundStatusMeta(item);
    const statusClass = statusMeta.statusClass;
    const now = Date.now();
    let chatBtnHtml = '';
    let workflowBtnHtml = '';
    let chatDate = item.date;
    row.dataset.refundId = item.id;

    const pending = statusMeta.statusKey === 'pending';
    const hasEvidence = !!item.evidence_submitted_at;

    if (pending && hasEvidence) {
      const evidenceTime = new Date(item.evidence_submitted_at).getTime();
      const expiryTime = evidenceTime + (2 * 24 * 60 * 60 * 1000);
      const timeLeft = expiryTime - now;
      const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      chatDate = formatDate(item.evidence_submitted_at);
      if (timeLeft > 0) {
        const btnHtml = `
          <button class="btn-chat" onclick="openChat('${item.id}')">
            <i class="fas fa-comments"></i> Chat (${daysLeft}d ${hoursLeft}h ${minutesLeft}m)
          </button>
        `;
        chatBtnHtml = getChatButtonWithBadge(item.id, btnHtml);
      } else {
        chatBtnHtml = `
          <button class="btn-chat" style="background: #ccc; cursor: not-allowed;" disabled>
            <i class="fas fa-comments"></i> Expired
          </button>
        `;
      }
    } else if (pending) {
      const purchaseTime = new Date(item.purchase_date).getTime();
      const expiryTime = purchaseTime + (5 * 24 * 60 * 60 * 1000);
      const timeLeft = expiryTime - now;
      const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      chatDate = formatDate(item.purchase_date);
      if (timeLeft > 0) {
        const btnHtml = `
          <button class="btn-chat" onclick="openChat('${item.id}')">
            <i class="fas fa-comments"></i> Report issue (${daysLeft}d ${hoursLeft}h ${minutesLeft}m)
          </button>
        `;
        chatBtnHtml = getChatButtonWithBadge(item.id, btnHtml);
      } else {
        chatBtnHtml = `
          <button class="btn-chat" style="background: #ccc; cursor: not-allowed;" disabled>
            <i class="fas fa-comments"></i> Expired
          </button>
        `;
      }
    } else {
      if (item.statusKey === 'awaiting_refund_release') {
        chatBtnHtml = `
          <button class="btn-chat" style="background: #f59e0b; color: #fff; cursor: not-allowed; width:100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" disabled>
            Awaiting Refund Release
          </button>
        `;
      } else {
        chatBtnHtml = `
          <button class="btn-chat" style="background: #ccc; cursor: not-allowed;" disabled>
            <i class="fas fa-comments"></i> ${item.status}
          </button>
        `;
      }
    }

    // Show workflow buttons based on resolution_status
    // pending + chat_started → Show "Issue Resolved" and "Escalate" buttons
    // waiting_buyer_confirmation → Show read-only message
    // resolved → Show "✓ Case Resolved" badge
    // escalated → Show "Escalated To MarketMix" badge
    // approved + no seller choice → Show seller return decision buttons
    if (item.marketmix_decision === 'approved' && !item.seller_return_choice) {
      workflowBtnHtml = `
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn-action" style="background: #22c55e; color: white;" onclick="showConfirmSellerReturnDecision('${item.id}', 'return_product')">Return Product</button>
          <button class="btn-action" style="background: #f97316; color: white;" onclick="showConfirmSellerReturnDecision('${item.id}', 'returnless')">Returnless Refund</button>
        </div>
      `;
    } else if (item.chat_started && item.resolution_status === 'pending') {
      workflowBtnHtml = `
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn-action" style="background: #22c55e; color: white;" onclick="showConfirmMarkResolved('${item.id}')">Issue Resolved</button>
          <button class="btn-action" style="background: #f97316; color: white;" onclick="showConfirmEscalateSeller('${item.id}')">Escalate</button>
        </div>
      `;
    } else if (item.resolution_status === 'waiting_buyer_confirmation') {
      // Seller has marked resolved, waiting for buyer to confirm
      workflowBtnHtml = `
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <span style="padding: 0.5rem 1rem; background: #e3e6eb; border-radius: 4px; color: #333; font-size: 0.9rem;">⏸️ Awaiting buyer confirmation...</span>
        </div>
      `;
    } else if (item.resolution_status === 'awaiting_refund_release') {
      workflowBtnHtml = `
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <span style="padding: 0.5rem 1rem; background: #fff3bf; border-radius: 4px; color: #664d03; font-size: 0.9rem; font-weight: 600;">Awaiting Refund Release</span>
        </div>
      `;
    } else if (item.resolution_status === 'resolved') {
      workflowBtnHtml = `
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <span style="padding: 0.5rem 1rem; background: #d4edda; border-radius: 4px; color: #155724; font-size: 0.9rem; font-weight: 600;">✓ Case Resolved</span>
        </div>
      `;
    } else if (item.resolution_status === 'escalated') {
      workflowBtnHtml = `
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <span style="padding: 0.5rem 1rem; background: #f8d7da; border-radius: 4px; color: #721c24; font-size: 0.9rem; font-weight: 600;">⛔ Escalated To MarketMix</span>
        </div>
      `;
    } else if (item.seller_return_choice) {
      if (item.seller_return_choice === 'return_product' && !item.return_received && (item.shipping_status || item.buyer_shipped_at || item.courier_name || item.tracking_number || item.shipping_receipt_url)) {
        workflowBtnHtml = `
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button class="btn-action" style="background: #2563eb; color: white;" onclick="showConfirmReturnReceived('${item.id}')">Confirm Return Received</button>
          </div>
        `;
      } else {
        const decisionLabel = item.seller_return_choice === 'return_product' ? 'Return Product' : 'Returnless Refund';
        const receivedText = item.seller_return_choice === 'return_product' && item.return_received
          ? '<span style="padding: 0.5rem 1rem; background: #d4edda; border-radius: 4px; color: #155724; font-size: 0.9rem; font-weight: 600;">Return Received</span>'
          : '';
        workflowBtnHtml = `
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; flex-direction: column; align-items: flex-start;">
            <span style="padding: 0.5rem 1rem; background: #dbeafe; border-radius: 4px; color: #1d4ed8; font-size: 0.9rem; font-weight: 600;">Seller Decision Submitted</span>
            <span style="padding: 0.5rem 1rem; background: #f3f4f6; border-radius: 4px; color: #374151; font-size: 0.9rem;">Decision: ${decisionLabel}</span>
            ${receivedText}
          </div>
        `;
      }
    }

    row.innerHTML = `
      <div class="col-buyer">${item.buyerName}</div>
      <div class="col-product">
        <div style="font-weight:600">${escapeHtmlSpec(item.productName)}</div>
      </div>
      <div class="col-order">${item.orderId}</div>
      <div class="col-amount">\₦${item.amount.toFixed(2)}</div>
      <div class="col-status"><span class="status-badge ${statusClass}">${statusMeta.label}</span></div>
      <div class="col-date">${chatDate}</div>
      <div class="col-action"><button class="btn-action" onclick="openModal('${item.id}')">View</button></div>
      <div class="col-chat">${chatBtnHtml}</div>
      ${workflowBtnHtml ? `<div class="col-workflow" style="grid-column: span 8; padding: 0.9rem;">${workflowBtnHtml}</div>` : ''}
    `;
    
    returnsTableBody.appendChild(row);
  });
}

// Open Modal
function openModal(returnId) {
  const returnItem = returnsData.find(r => r.id === returnId);
  if (!returnItem) return;

  currentReturnId = returnId;
  
  // DEBUG: Log the exact object passed to modal
  console.log('SELLER VIEW MODAL DATA', returnItem);

  // Populate modal
  document.getElementById('modalBuyerName').textContent = returnItem.buyerName;
  document.getElementById('modalProductName').textContent = returnItem.productName;
  document.getElementById('modalOrderId').textContent = returnItem.orderId;
  document.getElementById('modalAmount').textContent = `₦${Number(returnItem.amount || 0).toLocaleString('en-NG')}`;
  document.getElementById('modalReason').textContent = returnItem.reason;
  document.getElementById('modalNotes').textContent = returnItem.notes || 'No additional notes';
  const modalProductImage = document.getElementById('modalProductImage');
  if (modalProductImage) modalProductImage.src = returnItem.productImage;
  
  // Render specifications section
  const specsGroup = document.getElementById('modalSpecificationsGroup');
  const specsDiv = document.getElementById('modalSpecifications');
  const specsHtml = renderRefundSpecifications(returnItem);
  if (specsHtml) {
    specsGroup.style.display = 'block';
    specsDiv.innerHTML = specsHtml;
  } else {
    specsGroup.style.display = 'none';
  }

  // Debug: evidence URL
  console.log('Refund evidence URL:', returnItem.evidence_url || returnItem.evidenceUrl || returnItem.evidenceUrl);

  const shipmentGroup = document.getElementById('shipmentStatusGroup');
  const shippingStatusEl = document.getElementById('modalShippingStatus');
  const courierEl = document.getElementById('modalCourierName');
  const trackingEl = document.getElementById('modalTrackingNumber');
  const shippedOnEl = document.getElementById('modalShippedOn');
  const receiptLinkEl = document.getElementById('modalReceiptLink');
  const shipmentNotesEl = document.getElementById('modalShipmentNotes');

  if (shipmentGroup && shippingStatusEl && courierEl && trackingEl && shippedOnEl && receiptLinkEl) {
    const hasShipmentInfo = Boolean(returnItem.courier_name || returnItem.tracking_number || returnItem.shipping_receipt_url || returnItem.shipping_status || returnItem.buyer_shipped_at);
    shipmentGroup.style.display = hasShipmentInfo ? 'block' : 'none';
    const shippingStatus = String(returnItem.shipping_status || '').toLowerCase();
    shippingStatusEl.textContent = shippingStatus === 'in_transit' ? 'In transit' : shippingStatus === 'delivered' ? 'Delivered' : 'Pending';
    courierEl.textContent = returnItem.courier_name || '-';
    trackingEl.textContent = returnItem.tracking_number || '-';
    shippedOnEl.textContent = returnItem.buyer_shipped_at ? formatDate(returnItem.buyer_shipped_at) : '-';
    
    // Render receipt with image preview support
    if (returnItem.shipping_receipt_url) {
      const receiptUrl = returnItem.shipping_receipt_url;
      const normalizedUrl = String(receiptUrl).split('?')[0].split('#')[0];
      const lower = normalizedUrl.toLowerCase();
      const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(lower);
      const isVideo = /\.(mp4|webm|mov)$/i.test(lower);
      
      if (isImage) {
        receiptLinkEl.innerHTML = `<a href="${receiptUrl}" target="_blank" rel="noopener noreferrer"><img src="${receiptUrl}" alt="Shipping receipt" style="max-width: 200px; max-height: 200px; border-radius: 6px; cursor: pointer;"></a>`;
      } else if (isVideo) {
        receiptLinkEl.innerHTML = `<video controls style="max-width: 200px; max-height: 200px; border-radius: 6px;"><source src="${receiptUrl}"></video>`;
      } else {
        receiptLinkEl.innerHTML = `<a href="${receiptUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">View receipt</a>`;
      }
    } else {
      receiptLinkEl.textContent = '-';
    }
    
    if (shipmentNotesEl) {
      shipmentNotesEl.textContent = returnItem.shipment_notes || '-';
    }
  }

  // Render Buyer Evidence into modalEvidence
  const evidenceContainer = document.getElementById('modalEvidence');
  const evidenceEmpty = document.getElementById('modalEvidenceEmpty');
  // Clear previous content except the empty placeholder
  if (evidenceContainer) {
    // Remove any existing children
    while (evidenceContainer.firstChild) evidenceContainer.removeChild(evidenceContainer.firstChild);
  }

  const evidenceUrl = returnItem.evidence_url || returnItem.evidenceUrl || null;
  if (!evidenceContainer) {
    console.warn('modalEvidence container not found in DOM');
  } else if (!evidenceUrl) {
    const p = document.createElement('p');
    p.id = 'modalEvidenceEmpty';
    p.textContent = 'No evidence uploaded.';
    evidenceContainer.appendChild(p);
  } else {
    // determine file type
    const url = String(evidenceUrl).split('?')[0].split('#')[0];
    const lower = url.toLowerCase();
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(lower);
    const isVideo = /\.(mp4|webm|mov)$/i.test(lower);

    if (isImage) {
      const a = document.createElement('a');
      a.href = evidenceUrl;
      a.target = '_blank';
      const img = document.createElement('img');
      img.src = evidenceUrl;
      img.alt = 'Buyer Evidence';
      img.loading = 'lazy';
      img.addEventListener('click', () => { /* open in new tab handled by anchor */ });
      a.appendChild(img);
      evidenceContainer.appendChild(a);
    } else if (isVideo) {
      const video = document.createElement('video');
      video.controls = true;
      const src = document.createElement('source');
      src.src = evidenceUrl;
      video.appendChild(src);
      evidenceContainer.appendChild(video);
    } else {
      // Unknown type - try to render as image, fallback to link
      const tryImg = document.createElement('img');
      tryImg.src = evidenceUrl;
      tryImg.alt = 'Buyer Evidence';
      tryImg.loading = 'lazy';
      tryImg.onerror = function() {
        // replace with link
        evidenceContainer.removeChild(tryImg);
        const a = document.createElement('a');
        a.href = evidenceUrl;
        a.target = '_blank';
        a.textContent = 'Open evidence in new tab';
        evidenceContainer.appendChild(a);
      };
      evidenceContainer.appendChild(tryImg);
    }
  }
  
  const statusMeta = getRefundStatusMeta(returnItem);
  const statusElement = document.getElementById('modalStatus');
  statusElement.textContent = statusMeta.label;
  statusElement.className = `status-badge ${statusMeta.statusClass}`;

  // Show admin decision status
  const adminDecisionElement = document.getElementById('adminDecision');
  adminDecisionElement.textContent = statusMeta.label;
  adminDecisionElement.className = `status-badge ${statusMeta.statusClass}`;
  document.getElementById('adminReason').textContent = returnItem.marketMixReason || (returnItem.marketmix_decision ? `Reviewed by ${returnItem.marketmix_decided_by || 'MarketMix'}` : 'Awaiting final review.');

  // Show modal
  modalBackdrop.classList.add('active');
  returnModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Close Modal
function closeModal() {
  modalBackdrop.classList.remove('active');
  returnModal.classList.remove('active');
  document.body.style.overflow = 'auto';
  currentReturnId = null;
}

// Close modal when clicking backdrop
modalBackdrop.addEventListener('click', closeModal);

// Close button click
closeModalBtn.addEventListener('click', closeModal);

// Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
  }
});

// ─── Refund Workflow Confirmation Modals (Seller) ─────────────────────────────
function createMarketmixConfirmDialog() {
  let dialog = document.getElementById('marketmixConfirmDialog');
  if (!dialog) {
    dialog = document.createElement('div');
    dialog.id = 'marketmixConfirmDialog';
    dialog.className = 'marketmix-confirm-dialog';
    dialog.innerHTML = `
      <div class="marketmix-confirm-backdrop"></div>
      <div class="marketmix-confirm-card">
        <div class="marketmix-confirm-header">
          <h3 id="marketmixConfirmTitle">Confirm Action</h3>
          <button class="marketmix-confirm-close" id="marketmixConfirmClose">&times;</button>
        </div>
        <div class="marketmix-confirm-body">
          <p id="marketmixConfirmMessage"></p>
        </div>
        <div class="marketmix-confirm-actions">
          <button type="button" id="marketmixCancelBtn" class="marketmix-btn marketmix-btn-secondary">Cancel</button>
          <button type="button" id="marketmixConfirmBtn" class="marketmix-btn marketmix-btn-primary">Confirm</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);
  }

  if (dialog.dataset.confirmDialogSetup === 'true') return;

  dialog.addEventListener('click', event => {
    const target = event.target;
    if (target.closest('#marketmixConfirmClose') || target.closest('#marketmixCancelBtn') || target.closest('.marketmix-confirm-backdrop')) {
      event.preventDefault();
      closeMarketmixConfirmDialog();
      return;
    }
    if (target.closest('#marketmixConfirmBtn')) {
      event.preventDefault();
      confirmDialogAction();
    }
  });

  dialog.dataset.confirmDialogSetup = 'true';
}

function openMarketmixConfirmDialog(options) {
  createMarketmixConfirmDialog();

  const dialog = document.getElementById('marketmixConfirmDialog');
  const dialogTitle = document.getElementById('marketmixConfirmTitle');
  const dialogMessage = document.getElementById('marketmixConfirmMessage');
  const confirmBtn = document.getElementById('marketmixConfirmBtn');
  const cancelBtn = document.getElementById('marketmixCancelBtn');

  if (!dialog || !dialogTitle || !dialogMessage || !confirmBtn || !cancelBtn) {
    return;
  }

  dialogTitle.textContent = options.title || 'Confirm action';
  dialogMessage.textContent = options.message || '';
  dialog.dataset.confirmAction = options.action || '';
  dialog.dataset.refundId = options.refundId || '';
  dialog.dataset.decision = options.decision || '';
  dialog.dataset.confirmStep = options.step || 'initial';

  setReturnAddressFormVisibility(options.step === 'address');
  if (options.step === 'address') {
    populateReturnAddressForm();
  }

  confirmBtn.textContent = options.confirmText || 'Confirm';
  cancelBtn.textContent = options.cancelText || 'Cancel';

  // Ensure the confirmation buttons are clickable when dialog is reused.
  confirmBtn.disabled = false;
  cancelBtn.disabled = false;

  dialog.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeMarketmixConfirmDialog() {
  const dialog = document.getElementById('marketmixConfirmDialog');
  if (!dialog) return;
  dialog.classList.remove('active');
  dialog.dataset.confirmAction = '';
  dialog.dataset.refundId = '';
  dialog.dataset.decision = '';
  dialog.dataset.confirmStep = '';
  setReturnAddressFormVisibility(false);
  document.body.style.overflow = 'auto';
}

function confirmDialogAction() {
  const dialog = document.getElementById('marketmixConfirmDialog');
  if (!dialog) return;
  const action = dialog.dataset.confirmAction;
  const refundId = dialog.dataset.refundId;
  const decision = dialog.dataset.decision;
  const step = dialog.dataset.confirmStep || 'initial';

  if (action === 'sellerReturnDecision' && decision === 'return_product' && step !== 'address') {
    closeMarketmixConfirmDialog();
    showSellerReturnAddressDialog(refundId, decision);
    return;
  }

  if (action === 'sellerReturnDecision' && decision === 'return_product' && step === 'address') {
    if (!validateReturnAddressForm()) return;
    closeMarketmixConfirmDialog();
    submitSellerReturnDecision(refundId, decision);
    populateReturnAddressForm(7);
    return;
  }

  closeMarketmixConfirmDialog();

  if (action === 'markResolved') {
    markRefundResolved(refundId);
  } else if (action === 'escalateSeller') {
    escalateRefund(refundId, 'seller');
  } else if (action === 'confirmReturnReceived') {
    confirmReturnReceived(refundId);
  } else if (action === 'sellerReturnDecision') {
    submitSellerReturnDecision(refundId, decision);
  }

  populateReturnAddressForm(7);
}

function showConfirmMarkResolved(refundId) {
  const refund = returnsData.find(r => r.id === refundId);
  if (!refund) return;

  openMarketmixConfirmDialog({
    title: 'Mark Refund Resolved',
    message: `Mark refund as resolved?\n\nBuyer: ${refund.buyerName}\nProduct: ${refund.productName}\n\nThe buyer will be asked to confirm if they are satisfied.`,
    confirmText: 'Mark Resolved',
    cancelText: 'Cancel',
    action: 'markResolved',
    refundId
  });
}

function showConfirmReturnReceived(refundId) {
  const refund = returnsData.find(r => r.id === refundId);
  if (!refund) return;

  openMarketmixConfirmDialog({
    title: 'Confirm Return Received',
    message: `Confirm that the returned product has been received from the buyer?\n\nBuyer: ${refund.buyerName}\nProduct: ${refund.productName}`,
    confirmText: 'Confirm Received',
    cancelText: 'Cancel',
    action: 'confirmReturnReceived',
    refundId
  });
}

function showConfirmEscalateSeller(refundId) {
  const refund = returnsData.find(r => r.id === refundId);
  if (!refund) return;

  openMarketmixConfirmDialog({
    title: 'Escalate to MarketMix',
    message: `Escalate this refund to MarketMix?\n\nBuyer: ${refund.buyerName}\nProduct: ${refund.productName}\n\nMarketMix support will review and make a final decision.`,
    confirmText: 'Escalate',
    cancelText: 'Cancel',
    action: 'escalateSeller',
    refundId
  });
}

function showConfirmSellerReturnDecision(refundId, decision) {
  const refund = returnsData.find(r => r.id === refundId);
  if (!refund) return;

  const title = decision === 'return_product' ? 'Return Product' : 'Returnless Refund';
  const message = decision === 'return_product'
    ? 'The buyer will be instructed to return your product. The shipping reimbursement for the buyer will be deducted from your account according to MarketMix refund policy.'
    : 'The buyer will keep the product. The refund will proceed without requiring a return.';

  openMarketmixConfirmDialog({
    title: title,
    message: `${message}\n\nDo you want to continue?`,
    confirmText: 'Yes, continue',
    cancelText: 'Cancel',
    action: 'sellerReturnDecision',
    refundId,
    decision
  });
}

function showSellerReturnAddressDialog(refundId, decision) {
  const refund = returnsData.find(r => r.id === refundId);
  if (!refund) return;

  openMarketmixConfirmDialog({
    title: 'Return Product — Confirm Return Address',
    message: 'Please confirm the return address and deadline for the buyer. These details will be saved as part of the return request.',
    confirmText: 'Submit Return Details',
    cancelText: 'Cancel',
    action: 'sellerReturnDecision',
    refundId,
    decision,
    step: 'address'
  });

  populateReturnAddressForm(7);
}

async function submitSellerReturnDecision(refundId, decision) {
  try {
    const payload = { decision };
    if (decision === 'return_product') {
      Object.assign(payload, getReturnAddressFormData());
    }

    console.log('📤 Submitting seller return decision:', { refundId, decision, payload });

    const response = await fetch(`${API_BASE}/seller/refunds/${refundId}/seller-return-decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));
    console.log('📥 Backend response:', { status: response.status, result });
    
    if (!response.ok) {
      const message = result.message || result.details || 'Failed to submit seller decision.';
      console.error('❌ Error message:', message);
      renderMarketmixNotification(message, 'error');
      return;
    }

    console.log('✅ Decision submitted successfully');
    renderMarketmixNotification(decision === 'return_product' ? 'Return Product decision submitted.' : 'Returnless Refund decision submitted.', 'success');
    await loadSellerRefundCases();
    window.dispatchEvent(new CustomEvent('sellerNotificationsUpdated'));
    renderTable();
  } catch (err) {
    console.error('Error submitting seller return decision:', err);
    renderMarketmixNotification(err.message || 'Failed to submit seller return decision.', 'error');
  }
}

async function markRefundResolved(refundId) {
  try {
    console.log('📤 Marking refund as resolved:', refundId);
    const response = await fetch(`${API_BASE}/refunds/mark-resolved`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ refund_id: refundId })
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('❌ Failed to mark refund resolved:', result);
      renderMarketmixNotification(result.message || 'Failed to mark resolved', 'error');
      return;
    }

    console.log('✅ Refund marked as resolved');
    renderMarketmixNotification('Refund marked as resolved. Buyer will confirm.', 'success');
    await loadSellerRefundCases();
    window.dispatchEvent(new CustomEvent('sellerNotificationsUpdated'));
    renderTable();
  } catch (err) {
    console.error('❌ Error marking refund resolved:', err);
    renderMarketmixNotification(err.message || 'Error marking refund resolved.', 'error');
  }
}

async function confirmReturnReceived(refundId) {
  try {
    console.log('📤 Confirming return received for refund:', refundId);
    const response = await fetch(`${API_BASE}/seller/refunds/${refundId}/confirm-return-received`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('❌ Failed to confirm return received:', result);
      renderMarketmixNotification(result.message || 'Failed to confirm return received', 'error');
      return;
    }

    console.log('✅ Return receipt confirmed');
    renderMarketmixNotification('Return receipt confirmed. Refund is now awaiting release.', 'success');
    await loadSellerRefundCases();
    window.dispatchEvent(new CustomEvent('sellerNotificationsUpdated'));
    renderTable();
  } catch (err) {
    console.error('❌ Error confirming return received:', err);
    renderMarketmixNotification(err.message || 'Error confirming return received.', 'error');
  }
}

async function escalateRefund(refundId, escalatedBy) {
  try {
    console.log('📤 Escalating refund to MarketMix:', refundId);
    const response = await fetch(`${API_BASE}/refunds/escalate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ refund_id: refundId, escalated_by: escalatedBy })
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('❌ Failed to escalate refund:', result);
      renderMarketmixNotification(result.message || 'Failed to escalate', 'error');
      return;
    }

    console.log('✅ Refund escalated to MarketMix');
    renderMarketmixNotification('Refund escalated to MarketMix support.', 'success');
    await loadSellerRefundCases();
    window.dispatchEvent(new CustomEvent('sellerNotificationsUpdated'));
    renderTable();
  } catch (err) {
    console.error('❌ Error escalating refund:', err);
    renderMarketmixNotification(err.message || 'Error escalating refund.', 'error');
  }
}


// Filter and Search
function filterTable() {
  const searchTerm = searchInput.value.toLowerCase();
  const statusTerm = statusFilter.value.toLowerCase();

  const filtered = returnsData.filter(item => {
    const matchesSearch = item.buyerName.toLowerCase().includes(searchTerm) || 
                         item.orderId.toLowerCase().includes(searchTerm);
    const matchesStatus = statusTerm === 'all' || item.status.toLowerCase() === statusTerm;
    
    return matchesSearch && matchesStatus;
  });

  renderTable(filtered);
}

searchInput.addEventListener('input', filterTable);
statusFilter.addEventListener('change', filterTable);

// ──────────────────────────────────────────────────────────────────────
// CHAT FUNCTIONALITY
// ──────────────────────────────────────────────────────────────────────

let currentChatId = null;
let currentChatData = null;
let attachedFile = null;

const CLOUDINARY_UPLOAD_URL = window.CLOUDINARY_UPLOAD_URL || 'https://api.cloudinary.com/v1_1/dioy51alg/auto/upload';
const CLOUDINARY_UNSIGNED_UPLOAD_PRESET = window.CLOUDINARY_UNSIGNED_UPLOAD_PRESET || 'marketmix_refunds';
const CLOUDINARY_UPLOAD_FOLDER = window.CLOUDINARY_UPLOAD_FOLDER || 'marketmix/refund_evidence';

async function uploadChatAttachment(file, refundId) {
  if (!file) return null;
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UNSIGNED_UPLOAD_PRESET);
    formData.append('folder', `${CLOUDINARY_UPLOAD_FOLDER}/${refundId}`);
    formData.append('public_id', `refund_chat_${refundId}_${Date.now()}`);

    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: 'POST',
      body: formData
    });
    const result = await response.json();
    if (!response.ok || !result.secure_url) {
      console.error('Cloudinary upload failed for refund chat attachment:', result);
      return null;
    }
    return { url: result.secure_url, resource_type: result.resource_type };
  } catch (err) {
    console.error('Failed to upload chat attachment:', err);
    return null;
  }
}

// DOM Elements for Chat
const chatPanel = document.getElementById('chatPanel');
const chatOverlay = document.getElementById('chatOverlay');
const chatCloseBtn = document.getElementById('chatCloseBtn');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const chatFileInput = document.getElementById('chatFileInput');
const attachmentPreview = document.getElementById('attachmentPreview');

// Chat Storage Key
function getChatStorageKey(returnId) {
  return `mm_return_chat_${returnId}`;
}

// Open Chat Panel
function openChat(returnId) {
  const returnItem = returnsData.find(r => r.id === returnId);
  if (!returnItem) return;

  currentChatId = returnId;
  currentChatData = returnItem;

  document.getElementById('chatBuyerName').textContent = `Chat with ${returnItem.buyerName}`;
  document.getElementById('chatOrderId').textContent = `Order ID: ${returnItem.orderId}`;

  chatPanel.classList.add('active');
  chatOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Mark refund chat notifications as read
  const token = getToken();
  fetch(`${API_BASE}/refund-chat/${returnId}/mark-notifications-read`, {
    method: 'PUT',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }).then(() => {
    setUnreadCount(returnId, 0);
    updateNotificationBadges();
    refreshChatBadge(returnId);
    console.log(`✅ Notifications marked as read for refund ${returnId}`);
  }).catch(err => {
    console.warn('Failed to mark notifications as read:', err.message);
  });

  // Start polling for real-time updates (10-second interval)
  startPolling(returnId);
  
  loadAndRenderChat(returnId);
  updateChatCountdown(returnItem);

  // Start polling every 5 seconds
  if (window._chatPollInterval) clearInterval(window._chatPollInterval);
  window._chatPollInterval = setInterval(() => loadAndRenderChat(currentChatId), 5000);
}

// Close Chat Panel
function closeChat() {
  chatPanel.classList.remove('active');
  chatOverlay.classList.remove('active');
  document.body.style.overflow = 'auto';
  
  // Stop polling when chat closes
  if (currentChatId) {
    stopPolling(currentChatId);
  }
  currentChatId = null;
  currentCaseInfo = null;

  if (window._chatPollInterval) {
    clearInterval(window._chatPollInterval);
    window._chatPollInterval = null;
  }
}

async function loadAndRenderChat(caseId) {
  const token = getToken();
  try {
    const res = await fetch(`${API_BASE}/refund-chat/${caseId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    const messages = data.data?.messages || [];
    const caseInfo = data.data?.caseInfo || null;
    if (caseInfo) applyChatLockState(caseInfo);
    renderChatMessages(messages);
  } catch (err) {
    console.error('Load chat failed:', err);
  }
}

function applyChatLockState(caseInfo) {
  const status = String(caseInfo.resolution_status || '').toLowerCase();
  const readOnly = ['resolved', 'escalated', 'awaiting_refund_release'].includes(status);
  if (chatInput) chatInput.disabled = readOnly;
  if (sendChatBtn) sendChatBtn.disabled = readOnly;
  if (chatFileInput) chatFileInput.disabled = readOnly;

  const statusEl = document.getElementById('chatResolutionStatus');
  if (statusEl) {
    statusEl.className = 'resolution-status ' + status;
    statusEl.textContent = readOnly
      ? (status === 'resolved' ? 'Case Resolved' : status === 'awaiting_refund_release' ? 'Awaiting Refund Release' : 'Escalated to MarketMix')
      : 'Pending Resolution';
  }

  const infoEl = document.querySelector('.chat-info-text');
  if (infoEl) infoEl.textContent = readOnly ? 'Chat is read-only once the return is confirmed and awaiting refund release.' : 'All conversations are monitored by MarketMix';
}

function renderChatMessages(messages) {
  chatMessages.innerHTML = messages.length ? messages.map(msg => {
    const isSeller = msg.sender_type === 'seller';
    const time = new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const messageText = msg.message || msg.message_text || '';
    const mediaUrl = msg.media_url || msg.file_url || '';
    const mediaType = msg.media_type || msg.file_type || '';
    let mediaHtml = '';

    if (mediaUrl) {
      const isImg = mediaType === 'image' || /\.(jpg|jpeg|png|webp|gif)$/i.test(mediaUrl);
      const isVid = mediaType === 'video' || /\.(mp4|webm|mov)$/i.test(mediaUrl);
      if (isImg) {
        mediaHtml = `<div class="message-media"><a href="${mediaUrl}" target="_blank" rel="noopener noreferrer"><img src="${mediaUrl}" class="message-image" alt="attachment"></a></div>`;
      } else if (isVid) {
        mediaHtml = `<div class="message-media"><video controls class="message-video"><source src="${mediaUrl}"></video></div>`;
      } else {
        mediaHtml = `<a href="${mediaUrl}" class="message-file" target="_blank" rel="noopener noreferrer">📎 Attachment</a>`;
      }
    }

    return `
      <div class="chat-message ${isSeller ? 'seller' : 'buyer'}">
        <div class="message-content">
          <span class="message-sender">${isSeller ? 'You' : 'Buyer'}</span>
          ${messageText ? `<p class="message-text">${escapeHtml(messageText)}</p>` : ''}
          ${mediaHtml}
          <span class="message-time">${time}</span>
        </div>
      </div>
    `;
  }).join('') : '<div class="chat-message system"><p>No messages yet.</p></div>';
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function loadChatMessages(returnId) {
  return loadAndRenderChat(returnId);
}

function updateChatCountdown(returnItem) {
  const countdownBanner = document.getElementById('chatCountdownBanner');
  if (!returnItem) {
    countdownBanner.classList.remove('active');
    return;
  }

  if (returnItem.evidence_submitted_at) {
    const evidenceTime = new Date(returnItem.evidence_submitted_at).getTime();
    const decisionTime = evidenceTime + (2 * 24 * 60 * 60 * 1000);
    const timeLeft = decisionTime - Date.now();

    if (timeLeft > 0) {
      const dLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      countdownBanner.textContent = `You have ${dLeft}d ${hLeft}h ${mLeft}m to resolve the issue with the buyer before MarketMix takes a decision.`;
      countdownBanner.classList.add('active');
    } else {
      countdownBanner.textContent = `Time limit exceeded. MarketMix is reviewing this case.`;
      countdownBanner.classList.add('active');
    }
  } else {
    countdownBanner.textContent = 'Awaiting buyer evidence. Once it is submitted, you will have 2 days to resolve the issue with the buyer before MarketMix takes a decision.';
    countdownBanner.classList.add('active');
  }
}

// Mark Messages as Read
function markMessagesAsRead(returnId) {
  const storageKey = getChatStorageKey(returnId);
  const messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
  let updated = false;

  messages.forEach(msg => {
    // Mark buyer messages as read when seller opens chat
    if (msg.sender === 'buyer' && !msg.status) {
      msg.status = 'delivered';
      updated = true;
    }
    // Mark seller messages as seen (already delivered)
    if (msg.sender === 'seller' && msg.status === 'sent') {
      msg.status = 'delivered';
      updated = true;
    }
  });

  if (updated) {
    localStorage.setItem(storageKey, JSON.stringify(messages));
    loadChatMessages(returnId);
  }
}

// Send Chat Message
async function sendChatMessage() {
  const text = chatInput.value.trim();
  const file = chatFileInput.files?.[0] || null;
  if (!text && !file) return;
  if (!currentChatId) return;

  const token = getToken();
  try {
    const payload = { message_text: text || null };
    if (file) {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (isImage || isVideo) {
        const uploadResult = await uploadChatAttachment(file, currentChatId);
        if (!uploadResult) {
          console.error('Attachment upload failed for refund chat.');
          return;
        }
        payload.message_text = null;
        payload.media_url = uploadResult.url;
        payload.media_type = isImage ? 'image' : 'video';
      }
    }

    const msgResponse = await fetch(`${API_BASE}/refund-chat/${currentChatId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    if (msgResponse.ok) {
      console.log('📨 Seller message sent successfully for refund:', currentChatId);
      
      // Mark chat as started after first message
      try {
        const chatStartedResponse = await fetch(`${API_BASE}/refunds/chat-started`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ refund_id: currentChatId })
        });
        
        const chatStartedResult = await chatStartedResponse.json();
        console.log(`✅ Chat-started marked for refund ${currentChatId}:`, {
          success: chatStartedResponse.ok,
          response: chatStartedResult
        });
      } catch (err) {
        console.error(`⚠️ Failed to mark chat started for refund ${currentChatId}:`, err);
      }
    }
    
    chatInput.value = '';
    removeAttachment();
    await loadAndRenderChat(currentChatId); // reload messages
  } catch (err) {
    console.error('Send failed:', err);
  }
}

// Simulate Buyer Response (for demo)
function simulateBuyerResponse(returnId) {
  if (currentChatId !== returnId) return; // Only if chat is still open

  const responses = [
    "Thanks for your help!",
    "When can I expect the replacement?",
    "I've uploaded the proof images.",
    "This issue needs to be resolved ASAP!",
    "Okay, I'll return the item.",
    "What's the return process?"
  ];

  const storageKey = getChatStorageKey(returnId);
  const messages = JSON.parse(localStorage.getItem(storageKey) || '[]');

  const message = {
    id: Date.now(),
    sender: 'buyer',
    text: responses[Math.floor(Math.random() * responses.length)],
    timestamp: new Date().toISOString(),
    status: 'sent',
    file: null
  };

  messages.push(message);
  localStorage.setItem(storageKey, JSON.stringify(messages));
  loadChatMessages(returnId);

  // Simulate buyer message delivery after 1 second
  setTimeout(() => {
    const updatedMessages = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const lastMsg = updatedMessages[updatedMessages.length - 1];
    if (lastMsg && lastMsg.status === 'sent') {
      lastMsg.status = 'delivered';
      localStorage.setItem(storageKey, JSON.stringify(updatedMessages));
      if (currentChatId === returnId) {
        loadChatMessages(returnId);
      }
    }
  }, 1000);
}

// Handle File Upload
chatFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    attachedFile = {
      name: file.name,
      type: isImage ? 'image' : isVideo ? 'video' : 'file',
      data: event.target.result
    };

    const previewContent = document.getElementById('previewContent');
    if (!previewContent) return;
    previewContent.innerHTML = '';

    if (isImage) {
      const img = document.createElement('img');
      img.id = 'previewImage';
      img.src = event.target.result;
      img.alt = 'Attachment preview';
      previewContent.appendChild(img);
    } else if (isVideo) {
      const video = document.createElement('video');
      video.id = 'previewVideo';
      video.src = event.target.result;
      video.controls = true;
      previewContent.appendChild(video);
    } else {
      const fileLabel = document.createElement('div');
      fileLabel.className = 'preview-file-label';
      fileLabel.textContent = file.name;
      previewContent.appendChild(fileLabel);
    }

    attachmentPreview.style.display = 'flex';
  };
  reader.readAsDataURL(file);
});

// Remove Attachment
function removeAttachment() {
  attachedFile = null;
  attachmentPreview.style.display = 'none';
  chatFileInput.value = '';
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Event Listeners
chatCloseBtn.addEventListener('click', closeChat);
chatOverlay.addEventListener('click', closeChat);
sendChatBtn.addEventListener('click', sendChatMessage);

// Enable send on Enter key
chatInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
});

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  loadProfile();
  await loadSellerRefundCases();
  renderTable();
  await refreshRefundUnreadCounts();

  window.addEventListener('storeChanged', async () => {
    unreadCounts = {};
    returnsData = [];
    Object.values(pollingIntervals).forEach(clearInterval);
    pollingIntervals = {};
    await loadSellerRefundCases();
    renderTable();
    await refreshRefundUnreadCounts();
  });

  setInterval(refreshRefundUnreadCounts, 15000);
});

// Notification
function renderMarketmixNotification(message, type = 'success') {
  showNotification(message, type);
}

function showNotification(message, type = 'success') {
  const existing = document.querySelector('.marketmix-toast');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = `marketmix-toast ${type}`;
  notification.innerHTML = `
    <div class="marketmix-toast-icon">${type === 'success' ? '&#10004;' : type === 'warning' ? '&#9888;' : '&#10060;'}</div>
    <div class="marketmix-toast-content">
      <strong>MarketMix</strong>
      <p>${message}</p>
    </div>
  `;
  notification.style.cssText = `
    position: fixed;
    top: 1rem;
    right: 1rem;
    min-width: 300px;
    max-width: 380px;
    padding: 1rem 1.25rem;
    border-radius: 16px;
    box-shadow: 0 18px 42px rgba(15, 23, 42, 0.22);
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    color: #fff;
    z-index: 99999;
    animation: marketmix-toast-in 0.22s ease-out;
  `;

  if (type === 'success') {
    notification.style.background = 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)';
  } else if (type === 'warning') {
    notification.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
  } else {
    notification.style.background = 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)';
  }

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-12px)';
    setTimeout(() => notification.remove(), 400);
  }, 3200);
}

