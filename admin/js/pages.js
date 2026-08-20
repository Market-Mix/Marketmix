// Dashboard Page
let adminRefundCases = [];
let refundFetchRetryTimer = null;
let refundFetchRetryCount = 0;
const ADMIN_API_BASE = window.ADMIN_API_BASE || (window.location.protocol === 'file:' ? 'http://localhost:5000/api' : 'https://marketmix-backend.onrender.com/api');

window.formatCurrency = window.formatCurrency || function formatCurrency(value) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return '₦0';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

window.escapeHtml = window.escapeHtml || function escapeHtml(text) {
  if (text === undefined || text === null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Sellers Management
async function fetchAdminSellers(search = '', status = 'All') {
  const params = new URLSearchParams({ page: 1, limit: 100 });
  if (search) params.set('search', search);
  if (status && status !== 'All') params.set('status', status.toLowerCase());
  const res = await fetch(`${ADMIN_API_BASE}/admin/sellers?${params}`, { headers: getAdminAuthHeaders() });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message || 'Failed to load sellers');
  return body?.data?.sellers || [];
}

async function suspendSeller(id) {
  if (!confirm('Suspend this seller account?')) return;
  const res = await fetch(`${ADMIN_API_BASE}/admin/sellers/${id}/suspend`, { method: 'POST', headers: getAdminAuthHeaders() });
  if (res.ok) { showToast('Seller suspended'); viewAdminSeller(id); } else showToast('Failed to suspend seller', 'error');
}

async function reactivateSeller(id) {
  const res = await fetch(`${ADMIN_API_BASE}/admin/sellers/${id}/activate`, { method: 'POST', headers: getAdminAuthHeaders() });
  if (res.ok) { showToast('Seller reactivated'); viewAdminSeller(id); } else showToast('Failed to reactivate seller', 'error');
}

async function loadRecentAdminActivity() {
  const container = document.getElementById('recentAdminActivityList');
  if (!container) return;
  try {
    const res = await fetch(`${ADMIN_API_BASE}/admin/activity?limit=5`, { headers: getAdminAuthHeaders() });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.message || 'Failed to load activity');
    const activities = body?.data?.activities || [];
    if (!activities.length) {
      container.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">No recent activity.</p>';
      return;
    }
    container.innerHTML = activities.map(a => `
      <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700">
        <div class="flex-1">
          <p class="text-sm font-semibold text-gray-900 dark:text-white">${escapeHtml(a.description)}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${escapeHtml(a.actor_name)} · ${new Date(a.created_at).toLocaleString()}</p>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('[Connection 7A]', err.message || err);
    container.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">Unable to load recent admin activity.</p>';
  }
}

async function loadMarketplaceHealth() {
  const container = document.getElementById('marketplaceHealthList');
  if (!container) return;

  const healthItems = [
    { key: 'paymentSystem', label: 'Payment System', icon: 'fa-credit-card' },
    { key: 'shippingAPI', label: 'Shipping API', icon: 'fa-truck' },
    { key: 'refundSystem', label: 'Refund System', icon: 'fa-undo' },
    { key: 'notifications', label: 'Notifications', icon: 'fa-bell' },
    { key: 'database', label: 'Database', icon: 'fa-database' }
  ];

  const fallbackState = (status = 'operational') => {
    const normalized = String(status || 'operational').toLowerCase();
    if (normalized === 'offline') {
      return { badgeClass: 'bg-red-500', textClass: 'text-red-600 dark:text-red-400', label: 'Offline' };
    }
    if (normalized === 'degraded') {
      return { badgeClass: 'bg-yellow-500', textClass: 'text-yellow-600 dark:text-yellow-400', label: 'Degraded' };
    }
    return { badgeClass: 'bg-green-500', textClass: 'text-green-600 dark:text-green-400', label: 'Operational' };
  };

  container.innerHTML = healthItems.map((item) => {
    const defaultState = fallbackState('operational');
    return `
      <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <i class="fas ${item.icon} ${defaultState.textClass} text-lg"></i>
          <span class="font-semibold text-sm text-gray-900 dark:text-white">${escapeHtml(item.label)}</span>
        </div>
        <div class="flex items-center gap-1">
          <span class="inline-block w-2.5 h-2.5 ${defaultState.badgeClass} rounded-full"></span>
          <span class="text-xs font-medium ${defaultState.textClass}">${defaultState.label}</span>
        </div>
      </div>
    `;
  }).join('');

  try {
    const response = await fetch(`${ADMIN_API_BASE}/admin/marketplace-health`, {
      headers: getAdminAuthHeaders()
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(body?.message || 'Marketplace health request failed');
    }

    const metrics = body?.data || {};
    container.innerHTML = healthItems.map((item) => {
      const status = String(metrics[item.key] || 'operational').toLowerCase();
      const state = fallbackState(status);
      return `
        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700">
          <div class="flex items-center gap-3">
            <i class="fas ${item.icon} ${state.textClass} text-lg"></i>
            <span class="font-semibold text-sm text-gray-900 dark:text-white">${escapeHtml(item.label)}</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="inline-block w-2.5 h-2.5 ${state.badgeClass} rounded-full"></span>
            <span class="text-xs font-medium ${state.textClass}">${state.label}</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('[Connection 7B]', err.message || err);
    container.innerHTML = healthItems.map((item) => {
      const state = fallbackState('operational');
      return `
        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700">
          <div class="flex items-center gap-3">
            <i class="fas ${item.icon} ${state.textClass} text-lg"></i>
            <span class="font-semibold text-sm text-gray-900 dark:text-white">${escapeHtml(item.label)}</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="inline-block w-2.5 h-2.5 ${state.badgeClass} rounded-full"></span>
            <span class="text-xs font-medium ${state.textClass}">${state.label}</span>
          </div>
        </div>
      `;
    }).join('');
  }
}

// Connection 6A: fetch refunds summary for admin dashboard
async function loadRefundSummary() {
  const ids = ['openCases','awaitingSeller','awaitingBuyer','awaitingDecision','refundProcessing','completedToday'];
  const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  ids.forEach(id => setText(id, '...'));

  try {
    const response = await fetch(`${ADMIN_API_BASE}/admin/refund-summary`, { headers: getAdminAuthHeaders() });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      console.error('Refund summary request failed:', body?.message || response.statusText);
      ids.forEach(id => setText(id, '0'));
      return;
    }

    const d = body?.data || {};
    setText('openCases', String(d.openCases ?? 0));
    setText('awaitingSeller', String(d.awaitingSellerResponse ?? 0));
    setText('awaitingBuyer', String(d.awaitingBuyerResponse ?? 0));
    setText('awaitingDecision', String(d.awaitingDecision ?? 0));
    setText('refundProcessing', String(d.refundProcessing ?? 0));
    setText('completedToday', String(d.completedToday ?? 0));
  } catch (err) {
    console.error('Error loading refund summary:', err);
    ids.forEach(id => setText(id, '0'));
  }
}

// Connection 6B: fetch seller debt summary for admin dashboard
async function loadDebtSummary() {
  const moneyIds = ['outstandingDebt','recoveredThisMonth','unrecoveredDebt'];
  const countIds = ['sellersWithDebt'];
  const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  moneyIds.concat(countIds).forEach(id => setText(id, '...'));

  try {
    const response = await fetch(`${ADMIN_API_BASE}/admin/debt-summary`, { headers: getAdminAuthHeaders() });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      console.error('[Connection 6B] Debt summary request failed:', body?.message || response.statusText);
      moneyIds.forEach(id => setText(id, '₦0'));
      countIds.forEach(id => setText(id, '0'));
      return;
    }

    const d = body?.data || {};
    setText('outstandingDebt', formatCurrency(d.outstandingDebt ?? 0));
    setText('sellersWithDebt', String(d.sellersWithDebt ?? 0));
    setText('recoveredThisMonth', formatCurrency(d.recoveredThisMonth ?? 0));
    setText('unrecoveredDebt', formatCurrency(d.unrecoveredDebt ?? 0));
  } catch (err) {
    console.error('[Connection 6B] Error loading debt summary:', err.message || err);
    moneyIds.forEach(id => setText(id, '₦0'));
    countIds.forEach(id => setText(id, '0'));
  }
}

function renderAdjustmentDashboard(container, adjustments = []) {
  if (!container) return;

  const normalizedAdjustments = Array.isArray(adjustments)
    ? adjustments
    : Array.isArray(adjustments?.adjustments)
      ? adjustments.adjustments
      : [];

  if (!normalizedAdjustments.length) {
    container.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">No adjustment activity to review.</p>';
    return;
  }

  const rows = normalizedAdjustments.map((adjustment) => {
    const recoveryHistory = Array.isArray(adjustment.recovery_history) && adjustment.recovery_history.length
      ? adjustment.recovery_history.map((entry) => `
          <li class="text-xs text-gray-600 dark:text-gray-400">
            ${new Date(entry.created_at).toLocaleDateString()} — ${formatRefundAmount(entry.recovered_amount)} recovered, ${formatRefundAmount(entry.remaining_debt)} remaining
          </li>`).join('')
      : '<li class="text-xs text-gray-600 dark:text-gray-400">No recovery activity yet.</li>';

    const sellerName = adjustment.seller_name || adjustment.seller || 'Unknown Seller';
    const refundCaseId = adjustment.refund_case_id || adjustment.refund_case || '—';
    const originalDebt = adjustment.original_debt ?? adjustment.original_amount ?? 0;
    const remainingDebt = adjustment.remaining_debt ?? adjustment.remaining_amount ?? 0;
    const recoveredAmount = adjustment.recovered_amount ?? 0;
    const createdAt = adjustment.created_at || adjustment.created_date || null;

    return `
      <tr class="border-b border-gray-200 dark:border-gray-700">
        <td class="px-3 py-3 text-sm text-gray-900 dark:text-white">${escapeHtml(sellerName)}</td>
        <td class="px-3 py-3 text-sm text-gray-900 dark:text-white">${formatRefundAmount(originalDebt)}</td>
        <td class="px-3 py-3 text-sm text-gray-900 dark:text-white">${formatRefundAmount(remainingDebt)}</td>
        <td class="px-3 py-3 text-sm text-gray-900 dark:text-white">${formatRefundAmount(recoveredAmount)}</td>
        <td class="px-3 py-3 text-sm text-gray-900 dark:text-white">${escapeHtml(adjustment.status || 'active')}</td>
        <td class="px-3 py-3 text-sm text-gray-900 dark:text-white">${escapeHtml(refundCaseId)}</td>
        <td class="px-3 py-3 text-sm text-gray-900 dark:text-white">${createdAt ? new Date(createdAt).toLocaleDateString() : '—'}</td>
        <td class="px-3 py-3 text-sm text-gray-900 dark:text-white">
          <ul class="space-y-1">${recoveryHistory}</ul>
        </td>
        <td class="px-3 py-3 text-sm text-gray-900 dark:text-white">${escapeHtml(adjustment.seller_notice || '—')}</td>
      </tr>`;
  }).join('');

  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="min-w-full text-left">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th class="px-3 py-2 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">Seller</th>
            <th class="px-3 py-2 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">Original Adjustment</th>
            <th class="px-3 py-2 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">Remaining Adjustment</th>
            <th class="px-3 py-2 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">Recovered</th>
            <th class="px-3 py-2 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">Status</th>
            <th class="px-3 py-2 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">Refund Case</th>
            <th class="px-3 py-2 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">Created</th>
            <th class="px-3 py-2 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">Recovery History</th>
            <th class="px-3 py-2 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">Seller Notice</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

async function loadAdjustmentDashboard(refundCaseId = null) {
  const container = document.getElementById('adjustmentDashboard');
  if (!container) return;

  container.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">Loading adjustment review...</p>';

  try {
    const response = await fetch(`${ADMIN_API_BASE}/admin/seller-adjustments${refundCaseId ? `?refundCaseId=${encodeURIComponent(refundCaseId)}` : ''}`, { headers: getAdminAuthHeaders() });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(body?.message || 'Unable to load adjustment review');
    }

    const adjustments = Array.isArray(body) ? body : body?.data?.adjustments || body?.adjustments || [];
    renderAdjustmentDashboard(container, adjustments);
  } catch (err) {
    container.innerHTML = `<p class="text-sm text-red-600 dark:text-red-400">${escapeHtml(err.message || 'Unable to load adjustment review')}</p>`;
  }
}

function parseRefundProductSpecs(refund = {}) {
  let color = refund.color || null;
  let size = refund.size || null;
  let snapshot = refund.product_snapshot || refund.productSnapshot || null;

  if ((!color || !size) && snapshot) {
    if (typeof snapshot === 'string') {
      try {
        snapshot = JSON.parse(snapshot);
      } catch (err) {
        snapshot = {};
      }
    }
    color = color || snapshot?.color || null;
    size = size || snapshot?.size || null;
  }

  return { color, size };
}

function renderRefundSpecifications(refund = {}) {
  const { color, size } = parseRefundProductSpecs(refund);
  if (!color && !size) return '';

  const specs = [];
  if (color) specs.push(`<div class="text-gray-900 dark:text-white"><span class="font-semibold">Color:</span> ${escapeHtml(color)}</div>`);
  if (size) specs.push(`<div class="text-gray-900 dark:text-white"><span class="font-semibold">Size:</span> ${escapeHtml(size)}</div>`);

  return `
    <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
      <p class="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase mb-3">Product Specifications</p>
      <div class="space-y-2">
        ${specs.join('')}
      </div>
    </div>
  `;
}

function escapeHtml(text) {
  if (text === undefined || text === null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getRefundDisplayState(refundCase = {}) {
  const buyerShipped = refundCase.buyer_shipped_at || refundCase.buyerShippedAt || refundCase.buyer_shipped || refundCase.buyerShipped || null;
  const returnReceived = refundCase.return_received === true || refundCase.returnReceived === true || false;
  const paymentStatus = String(refundCase?.refund_payment_status || refundCase?.payment_status || refundCase?.paymentStatus || '').toLowerCase();
  const decision = String(refundCase?.marketmix_decision || '').toLowerCase();
  const resolution = String(refundCase?.resolution_status || refundCase?.status || 'pending').toLowerCase();

  if (paymentStatus === 'paid' || resolution === 'resolved' || refundCase?.refund_paid_at) {
    return { label: 'Refund Completed', className: 'resolved', statusKey: 'resolved' };
  }

  if (returnReceived) {
    return { label: 'Seller confirmed receipt\nRefund Processing', className: 'seller_confirmed', statusKey: 'seller_confirmed' };
  }

  if (buyerShipped && !returnReceived) {
    return { label: 'Buyer shipped\nWaiting for seller confirmation', className: 'buyer_shipped_waiting_seller', statusKey: 'buyer_shipped_waiting_seller' };
  }

  if (decision === 'approved' || resolution === 'approved' || resolution === 'waiting_seller_return_decision') {
    return { label: 'Approved', className: 'approved', statusKey: 'approved' };
  }

  if (decision === 'rejected' || resolution === 'rejected' || resolution === 'refund_rejected') {
    return { label: 'Denied', className: 'denied', statusKey: 'denied' };
  }

  if (resolution === 'waiting_buyer_confirmation') {
    return { label: 'Awaiting Buyer Confirmation', className: 'waiting_buyer_confirmation', statusKey: 'waiting_buyer_confirmation' };
  }

  if (resolution === 'refund_processing') {
    return { label: 'Refund Processing', className: 'refund_processing', statusKey: 'refund_processing' };
  }

  if (resolution === 'awaiting_refund_release') {
    return { label: 'Awaiting Refund Release', className: 'awaiting_refund_release', statusKey: 'awaiting_refund_release' };
  }

  if (resolution === 'return_in_transit') {
    return { label: 'Return In Transit', className: 'return_in_transit', statusKey: 'return_in_transit' };
  }

  if (resolution === 'resolved') {
    return { label: 'Resolved', className: 'resolved', statusKey: 'resolved' };
  }

  if (resolution === 'escalated') {
    return { label: 'Escalated', className: 'escalated', statusKey: 'escalated' };
  }

  return { label: 'Pending', className: 'pending', statusKey: 'pending' };
}

function normalizeRefundCase(refundCase) {
  const displayState = getRefundDisplayState(refundCase);
  const backendAmountValue = Number(refundCase.total_amount ?? refundCase.amount ?? refundCase.refund_amount ?? 0);
  const createdAt = refundCase.created_at || refundCase.createdAt || refundCase.date || null;
  const createdDate = createdAt ? new Date(createdAt).toLocaleDateString() : '';
  const refundPaymentStatus = String(refundCase.refund_payment_status || refundCase.payment_status || refundCase.paymentStatus || '').toLowerCase();
  const refundPaidAt = refundCase.refund_paid_at || refundCase.refundPaidAt || null;

  return {
    id: String(refundCase.id || refundCase.refund_id || refundCase.case_id || ''),
    orderId: String(refundCase.order_id || refundCase.orderId || ''),
    buyer: refundCase.buyer_name || refundCase.buyer || refundCase.buyer_id || 'Unknown',
    seller: refundCase.store_name || refundCase.seller_name || refundCase.seller || refundCase.seller_id || 'Unknown',
    color: refundCase.color || null,
    size: refundCase.size || null,
    productSnapshot: refundCase.product_snapshot || refundCase.productSnapshot || null,
    amount: formatRefundAmount(backendAmountValue),
    amountValue: backendAmountValue,
    backendAmount: backendAmountValue,
    status: displayState.label,
    statusClass: displayState.className,
    statusKey: displayState.statusKey,
    rawResolutionStatus: refundCase.resolution_status || refundCase.status || '',
    date: createdDate,
    returnDate: createdDate,
    productName: refundCase.product_name || refundCase.productName || 'Unknown product',
    productImage: refundCase.product_image || refundCase.productImage || '',
    evidenceUrl: refundCase.evidence_url || refundCase.evidenceUrl || refundCase.evidenceURL || '',
    evidenceType: refundCase.evidence_type || refundCase.evidenceType || '',
    reason: refundCase.complaint_text || refundCase.reason || '',
    notes: refundCase.notes || '',
    marketmixDecision: refundCase.marketmix_decision || '',
    marketmixDecidedAt: refundCase.marketmix_decided_at || refundCase.marketmixDecidedAt || '',
    marketmixDecidedBy: refundCase.marketmix_decided_by || refundCase.marketmixDecidedBy || '',
    sellerReturnChoice: refundCase.seller_return_choice || '',
    shippingStatus: refundCase.shipping_status ? (String(refundCase.shipping_status).toLowerCase() === 'in_transit' ? 'In transit' : String(refundCase.shipping_status).toLowerCase() === 'delivered' ? 'Delivered' : 'Pending') : 'Pending',
    courierName: refundCase.courier_name || '',
    trackingNumber: refundCase.tracking_number || '',
    shippedOn: refundCase.buyer_shipped_at ? new Date(refundCase.buyer_shipped_at).toLocaleDateString() : '',
    receiptUrl: refundCase.shipping_receipt_url || '',
    shipmentNotes: refundCase.shipment_notes || refundCase.notes || '',
    rawStatus: refundCase.status || ''
    ,
    paymentSummary: refundCase.paymentSummary || refundCase.payment_summary || null,
    refund_payment_status: refundCase.refund_payment_status || refundCase.payment_status || refundCase.paymentStatus || '',
    payment_status: refundCase.refund_payment_status || refundCase.payment_status || refundCase.paymentStatus || '',
    paymentStatus: refundCase.refund_payment_status || refundCase.payment_status || refundCase.paymentStatus || '',
    refund_paid_at: refundPaidAt,
    // Map seller return receipt fields
    returnReceived: refundCase.return_received === true || refundCase.returnReceived === true || false,
    returnReceivedAt: refundCase.return_received_at || refundCase.returnReceivedAt || null,
    buyer_shipped_at: refundCase.buyer_shipped_at || refundCase.buyerShippedAt || null,
    paymentState: refundPaymentStatus
  };
}

async function fetchAdminRefundCases() {
  const container = document.getElementById('returnTableContainer');
  if (!container) return;

  const token = getAdminAuthToken();
  if (!token) {
    if (refundFetchRetryCount < 5) {
      refundFetchRetryCount += 1;
      container.innerHTML = `<div class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow"><p class="text-sm text-gray-600 dark:text-gray-400">Waiting for admin authentication...</p></div>`;
      if (refundFetchRetryTimer) clearTimeout(refundFetchRetryTimer);
      refundFetchRetryTimer = setTimeout(() => {
        refundFetchRetryTimer = null;
        fetchAdminRefundCases();
      }, 750);
      return;
    }

    container.innerHTML = `<div class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow"><p class="text-sm text-red-600 dark:text-red-400">Admin auth token missing. Please provide a valid admin JWT in localStorage.adminToken or window.ADMIN_AUTH_TOKEN.</p></div>`;
    return;
  }

  if (refundFetchRetryTimer) {
    clearTimeout(refundFetchRetryTimer);
    refundFetchRetryTimer = null;
  }
  refundFetchRetryCount = 0;

  container.innerHTML = `<div class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow"><p class="text-sm text-gray-600 dark:text-gray-400">Loading return requests...</p></div>`;

  const headers = getAdminAuthHeaders();
  if (!headers.Authorization) {
    container.innerHTML = `<div class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow"><p class="text-sm text-red-600 dark:text-red-400">Admin auth token missing. Please provide a valid admin JWT in localStorage.adminToken or window.ADMIN_AUTH_TOKEN.</p></div>`;
    return;
  }

  try {
    const response = await fetch(`${ADMIN_API_BASE}/admin/refunds`, { headers });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      const message = body?.message || 'Unable to fetch refund cases from backend.';
      container.innerHTML = `<div class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow"><p class="text-sm text-red-600 dark:text-red-400">${message}</p></div>`;
      return;
    }

    const refundCases = Array.isArray(body?.data?.refundCases) ? body.data.refundCases : [];
    adminRefundCases = refundCases.map(normalizeRefundCase);
    applyReturnFilters();
  } catch (err) {
    container.innerHTML = `<div class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow"><p class="text-sm text-red-600 dark:text-red-400">Error loading refund cases: ${err.message || 'Unknown error'}</p></div>`;
  }
}

function applyReturnFilters() {
  const searchInput = document.getElementById('returnSearch');
  const statusSelect = document.getElementById('returnStatusFilter');
  if (!searchInput || !statusSelect) return;

  const query = searchInput.value.toLowerCase().trim();
  const statusFilter = statusSelect.value;

  const filtered = adminRefundCases.filter(refund => {
    const matchesQuery = !query || [refund.orderId, refund.buyer, refund.seller, refund.productName]
      .some(value => String(value || '').toLowerCase().includes(query));

    const normalizedStatus = String(refund.statusKey || '').toLowerCase();
    const normalizedResolutionStatus = String(refund.rawResolutionStatus || '').toLowerCase();
    const matchesStatus = statusFilter === 'all' || normalizedStatus === statusFilter.toLowerCase() || normalizedResolutionStatus === statusFilter.toLowerCase();

    return matchesQuery && matchesStatus;
  });

  const container = document.getElementById('returnTableContainer');
  if (!container) return;

  if (!filtered.length) {
    container.innerHTML = `<div class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow"><p class="text-sm text-gray-600 dark:text-gray-400">No returns found matching your search or filter.</p></div>`;
    return;
  }

  container.innerHTML = renderTable(['ID', 'Buyer', 'Seller', 'Amount', 'Status', 'Date'], filtered, [
    { label: 'View', callback: 'viewReturn' }
  ]);
}

function createRefundErrorToast(message) {
  showToast(message, 'error');
}

function getAdminReturnActionHeaders() {
  const authHeaders = getAdminAuthHeaders();
  return {
    ...authHeaders,
    'Content-Type': 'application/json'
  };
}

function renderRefundEvidence(refundRequest = {}) {
  const evidenceUrl = refundRequest.evidenceUrl || refundRequest.evidence_url || refundRequest.evidenceURL || '';
  if (!evidenceUrl) {
    return `<div class="text-center"><i class="fas fa-image text-4xl text-gray-400 mb-2"></i><p class="text-gray-600 dark:text-gray-400 text-sm">No evidence uploaded.</p></div>`;
  }

  const normalizedUrl = String(evidenceUrl).split('?')[0].split('#')[0];
  const lower = normalizedUrl.toLowerCase();
  const isImage = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(lower);
  const isVideo = /\.(mp4|webm|mov|avi)$/i.test(lower);

  if (isImage) {
    return `<a href="${evidenceUrl}" target="_blank" rel="noopener noreferrer"><img src="${evidenceUrl}" alt="Refund evidence" class="max-h-full max-w-full object-contain cursor-pointer"></a>`;
  }

  if (isVideo) {
    return `<video controls class="w-full rounded-lg"><source src="${evidenceUrl}"></video>`;
  }

  return `<a href="${evidenceUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 underline">Open evidence in new tab</a>`;
}

function renderShippingReceipt(receiptUrl = '') {
  if (!receiptUrl) {
    return '-';
  }

  const normalizedUrl = String(receiptUrl).split('?')[0].split('#')[0];
  const lower = normalizedUrl.toLowerCase();
  const isImage = /\.(jpg|jpeg|png|webp|gif|svg|pdf)$/i.test(lower);
  const isVideo = /\.(mp4|webm|mov|avi)$/i.test(lower);

  if (isImage) {
    return `<a href="${receiptUrl}" target="_blank" rel="noopener noreferrer"><img src="${receiptUrl}" alt="Shipping receipt" class="max-h-48 max-w-sm object-contain rounded cursor-pointer border border-gray-300 dark:border-gray-600"></a>`;
  }

  if (isVideo) {
    return `<video controls class="max-w-sm rounded"><source src="${receiptUrl}"></video>`;
  }

  return `<a href="${receiptUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 underline">View receipt</a>`;
}

function getRefundSummaryMarkup(refundRequest = {}) {
  const paymentSummary = refundRequest.paymentSummary || refundRequest.payment_summary || null;
  const paymentStatus = String(
    paymentSummary?.paymentStatus ||
    paymentSummary?.payment_status ||
    refundRequest?.refund_payment_status ||
    refundRequest?.payment_status ||
    refundRequest?.paymentStatus ||
    'Processing'
  );

  if (!paymentSummary) {
    return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="bg-white/70 dark:bg-slate-800/60 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <p class="text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold">Refund Amount</p>
          <p class="text-sm font-semibold text-gray-900 dark:text-white mt-1">${formatRefundAmount(refundRequest.backendAmount ?? refundRequest.amount ?? 0)}</p>
        </div>
        <div class="bg-white/70 dark:bg-slate-800/60 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <p class="text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold">Payment Status</p>
          <p class="text-sm font-semibold text-gray-900 dark:text-white mt-1">${paymentStatus === 'paid' ? 'Paid' : paymentStatus}</p>
        </div>
      </div>
    `;
  }

  const rows = [
    ['Refund Amount', formatRefundAmount(paymentSummary.refundAmount ?? paymentSummary.refund_amount ?? 0)],
    ['Shipping Refund', formatRefundAmount(paymentSummary.shippingAmount ?? paymentSummary.shipping_amount ?? 0)],
    ['Escrow Used', formatRefundAmount(paymentSummary.amountFromEscrow ?? paymentSummary.amount_from_escrow ?? 0)],
    ['Seller Balance Used', formatRefundAmount(paymentSummary.amountFromBalance ?? paymentSummary.amount_from_balance ?? 0)],
    ['Remaining Uncovered', formatRefundAmount(paymentSummary.remainingUncovered ?? paymentSummary.remaining_uncovered ?? 0)],
    ['Payment Status', paymentStatus === 'paid' ? 'Paid' : paymentStatus]
  ];

  return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      ${rows.map(([label, value]) => `
        <div class="bg-white/70 dark:bg-slate-800/60 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <p class="text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold">${label}</p>
          <p class="text-sm font-semibold text-gray-900 dark:text-white mt-1">${value}</p>
        </div>
      `).join('')}
    </div>
  `;
}

function getRefundStatusBadgeMarkup(refundRequest = {}) {
  const displayState = getRefundDisplayState(refundRequest);
  const colorClasses = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    denied: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    waiting_buyer_confirmation: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    buyer_shipped_waiting_seller: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    seller_confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    resolved: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    escalated: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
  };

  const classes = colorClasses[displayState.statusKey] || colorClasses.pending;
  return `<span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${classes}">${displayState.label}</span>`;
}

(function ensureDashboardLoaders() {
  const getHeaders = window.getAdminAuthHeaders || function getAdminAuthHeaders() {
    const token = window.ADMIN_AUTH_TOKEN || localStorage.getItem('adminToken') || localStorage.getItem('adminSession') || localStorage.getItem('token') || '';
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  };

  const formatCurrencySafe = window.formatCurrency;
  const escapeHtmlSafe = window.escapeHtml;

  window.loadDashboardCounts = window.loadDashboardCounts || async function loadDashboardCounts() {
    try {
      const res = await fetch(`${ADMIN_API_BASE}/admin/dashboard-stats`, { headers: getHeaders() });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message || 'Failed to load dashboard stats');

      const d = body?.data || {};
      const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };

      set('totalBuyersCount', d.totalBuyers ?? '—');
      set('totalSellersCount', d.totalSellers ?? '—');
      set('totalProductsCount', d.totalProducts ?? '—');
      set('totalOrdersCount', d.totalOrders ?? '—');
      set('totalSalesValue', formatCurrencySafe(d.totalSales ?? 0));
      set('platformEarningsValue', formatCurrencySafe(d.platformEarnings ?? 0));
      set('fundsInEscrowValue', formatCurrencySafe(d.fundsInEscrow ?? 0));
      set('availableSellerFundsValue', formatCurrencySafe(d.availableSellerFunds ?? 0));
      set('pendingSellerEarningsValue', formatCurrencySafe(d.pendingSellerEarnings ?? 0));
      set('pendingWithdrawalsValue', formatCurrencySafe(d.pendingWithdrawals ?? 0));
      set('refundsValue', formatCurrencySafe(d.refunds ?? 0));
      set('outstandingSellerDebtValue', formatCurrencySafe(d.outstandingSellerDebt ?? 0));
    } catch (err) {
      console.error('loadDashboardCounts failed:', err?.message || err);
    }
  };

  window.loadPendingActionCounts = window.loadPendingActionCounts || async function loadPendingActionCounts() {
    try {
      const res = await fetch(`${ADMIN_API_BASE}/admin/pending-actions`, { headers: getHeaders() });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message || 'Failed to load pending actions');

      const d = body?.data || {};
      const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };

      set('pendingSellersCount', d.pendingSellers ?? 0);
      set('pendingProductsCount', d.pendingProducts ?? 0);
      set('pendingWithdrawalsCount', d.pendingWithdrawals ?? 0);
      set('refundCasesCount', d.refundCases ?? 0);
      set('escalatedCasesCount', d.escalatedCases ?? 0);
    } catch (err) {
      console.error('loadPendingActionCounts failed:', err?.message || err);
    }
  };

  window.loadDashboardActivity = window.loadDashboardActivity || async function loadDashboardActivity() {
    try {
      const res = await fetch(`${ADMIN_API_BASE}/admin/dashboard-activity`, { headers: getHeaders() });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message || 'Failed to load dashboard activity');

      const d = body?.data || {};

      const ordersEl = document.getElementById('recentOrdersContainer');
      if (ordersEl) {
        ordersEl.innerHTML = (d.recentOrders || []).length
          ? d.recentOrders.map((o) => `
              <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700">
                <div>
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">#${String(o.order_id || '').slice(0, 8)} — ${escapeHtmlSafe(o.buyer_name || 'Unknown buyer')}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">${escapeHtmlSafe(o.seller_name || 'Unknown seller')} · ${escapeHtmlSafe(o.status || 'unknown')}</p>
                </div>
                <p class="text-sm font-semibold text-gray-900 dark:text-white">${formatCurrencySafe(o.total_amount ?? 0)}</p>
              </div>`).join('')
          : '<p class="text-sm text-gray-500 dark:text-gray-400">No recent orders.</p>';
      }

      const productsEl = document.getElementById('topProductsContainer');
      if (productsEl) {
        productsEl.innerHTML = (d.topProducts || []).length
          ? d.topProducts.map((p) => `
              <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700">
                <div>
                  <p class="text-sm font-semibold text-gray-900 dark:text-white">${escapeHtmlSafe(p.name || 'Unnamed product')}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">${escapeHtmlSafe(p.seller_name || 'Unknown seller')} · ${p.quantity_sold ?? 0} sold</p>
                </div>
                <p class="text-sm font-semibold text-gray-900 dark:text-white">${formatCurrencySafe(p.price ?? 0)}</p>
              </div>`).join('')
          : '<p class="text-sm text-gray-500 dark:text-gray-400">No product data.</p>';
      }
    } catch (err) {
      console.error('loadDashboardActivity failed:', err?.message || err);
    }
  };
})();

function renderDashboard() {
  const html = `
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Dashboard</h1>
      
      <!-- Stats Grid - Clickable Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200" onclick="loadPage('buyers'); return false;">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 dark:text-gray-400 text-sm">Total Buyers</p>
              <p id="totalBuyersCount" class="text-3xl font-bold text-gray-900 dark:text-white mt-2">—</p>
            </div>
            <div class="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg p-3 text-2xl">
              <i class="fas fa-users"></i>
            </div>
          </div>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200" onclick="loadPage('sellers'); return false;">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 dark:text-gray-400 text-sm">Total Sellers</p>
              <p id="totalSellersCount" class="text-3xl font-bold text-gray-900 dark:text-white mt-2">—</p>
            </div>
            <div class="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-lg p-3 text-2xl">
              <i class="fas fa-store"></i>
            </div>
          </div>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200" onclick="loadPage('products'); return false;">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 dark:text-gray-400 text-sm">Total Products</p>
              <p id="totalProductsCount" class="text-3xl font-bold text-gray-900 dark:text-white mt-2">—</p>
            </div>
            <div class="bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 rounded-lg p-3 text-2xl">
              <i class="fas fa-box"></i>
            </div>
          </div>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200" onclick="loadPage('orders'); return false;">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 dark:text-gray-400 text-sm">Total Orders</p>
              <p id="totalOrdersCount" class="text-3xl font-bold text-gray-900 dark:text-white mt-2">—</p>
            </div>
            <div class="bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 rounded-lg p-3 text-2xl">
              <i class="fas fa-receipt"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Marketplace Performance & Approvals -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Marketplace Performance</h2>
            <div class="flex gap-2" id="periodSelectorContainer">
              <button onclick="switchMarketplacePeriod('today')" class="period-btn px-3 py-1 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700" data-period="today">Today</button>
              <button onclick="switchMarketplacePeriod('7days')" class="period-btn px-3 py-1 text-xs font-semibold rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600" data-period="7days">7 Days</button>
              <button onclick="switchMarketplacePeriod('30days')" class="period-btn px-3 py-1 text-xs font-semibold rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600" data-period="30days">30 Days</button>
              <button onclick="switchMarketplacePeriod('6months')" class="period-btn px-3 py-1 text-xs font-semibold rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600" data-period="6months">6 Months</button>
              <button onclick="switchMarketplacePeriod('1year')" class="period-btn px-3 py-1 text-xs font-semibold rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600" data-period="1year">1 Year</button>
            </div>
          </div>
          
          <!-- Marketplace Metrics Grid -->
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Gross Sales</p>
              <p class="text-2xl font-bold text-green-700 dark:text-green-400 mt-2">₦892,450</p>
              <p class="text-xs text-green-600 dark:text-green-300 mt-1">+12.5% vs previous period</p>
            </div>
            <div class="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Platform Revenue</p>
              <p class="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-2">₦89,245</p>
              <p class="text-xs text-blue-600 dark:text-blue-300 mt-1">10% of Gross Sales</p>
            </div>
            <div class="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Refunds</p>
              <p class="text-2xl font-bold text-orange-700 dark:text-orange-400 mt-2">₦23,580</p>
              <p class="text-xs text-orange-600 dark:text-orange-300 mt-1">2.6% refund rate</p>
            </div>
            <div class="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Seller Payouts</p>
              <p class="text-2xl font-bold text-purple-700 dark:text-purple-400 mt-2">₦780,625</p>
              <p class="text-xs text-purple-600 dark:text-purple-300 mt-1">87.5% of Gross Sales</p>
            </div>
          </div>
          
          <div style="position: relative; height: 280px;">
            <canvas id="revenueChart"></canvas>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-4" id="chartDescription">Marketplace performance trend (Last 6 months)</p>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pending Actions</h2>
          <div class="space-y-3">
            <div class="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded border border-yellow-200 dark:border-yellow-800">
              <div>
                <p class="font-semibold text-gray-900 dark:text-white text-sm">Pending Sellers</p>
                <p class="text-xs text-gray-600 dark:text-gray-300"><span id="pendingSellersCount">0</span> sellers awaiting approval</p>
              </div>
              <button onclick="loadPage('sellers')" class="px-3 py-1 text-xs font-semibold bg-yellow-600 text-white rounded hover:bg-yellow-700">Review</button>
            </div>
            <div class="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/30 rounded border border-orange-200 dark:border-orange-800">
              <div>
                <p class="font-semibold text-gray-900 dark:text-white text-sm">Pending Products</p>
                <p class="text-xs text-gray-600 dark:text-gray-300"><span id="pendingProductsCount">0</span> products awaiting approval</p>
              </div>
              <button onclick="loadPage('products')" class="px-3 py-1 text-xs font-semibold bg-orange-600 text-white rounded hover:bg-orange-700">Review</button>
            </div>
            <div class="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-800">
              <div>
                <p class="font-semibold text-gray-900 dark:text-white text-sm">Pending Withdrawals</p>
                <p class="text-xs text-gray-600 dark:text-gray-300"><span id="pendingWithdrawalsCount">0</span> withdrawals awaiting review</p>
              </div>
              <button onclick="loadPage('withdrawals')" class="px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700">Review</button>
            </div>
            <div class="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-800">
              <div>
                <p class="font-semibold text-gray-900 dark:text-white text-sm">Refund Cases</p>
                <p class="text-xs text-gray-600 dark:text-gray-300"><span id="refundCasesCount">0</span> refund cases requiring attention</p>
              </div>
              <button onclick="loadPage('refunds')" class="px-3 py-1 text-xs font-semibold bg-red-600 text-white rounded hover:bg-red-700">Review</button>
            </div>
            <div class="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/30 rounded border border-purple-200 dark:border-purple-800">
              <div>
                <p class="font-semibold text-gray-900 dark:text-white text-sm">Escalated Cases</p>
                <p class="text-xs text-gray-600 dark:text-gray-300"><span id="escalatedCasesCount">0</span> escalated disputes</p>
              </div>
              <button onclick="loadPage('support-center'); return false;" class="px-3 py-1 text-xs font-semibold bg-purple-600 text-white rounded hover:bg-purple-700">Review</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Financial Snapshot -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Financial Snapshot</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <p class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Total Sales</p>
            <p id="totalSalesValue" class="text-2xl font-bold text-green-700 dark:text-green-400 mt-2">₦—</p>
            <p class="text-xs text-green-600 dark:text-green-300 mt-1">All-time</p>
          </div>
          <div class="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <p class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Platform Earnings</p>
            <p id="platformEarningsValue" class="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-2">₦—</p>
            <p class="text-xs text-blue-600 dark:text-blue-300 mt-1">Platform revenue</p>
          </div>
          <div class="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
            <p class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Funds in Escrow</p>
            <p id="fundsInEscrowValue" class="text-2xl font-bold text-indigo-700 dark:text-indigo-400 mt-2">₦—</p>
            <p class="text-xs text-indigo-600 dark:text-indigo-300 mt-1">Held temporarily</p>
          </div>
          <div class="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-lg p-4 border border-teal-200 dark:border-teal-800">
            <p class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Available Seller Funds</p>
            <p id="availableSellerFundsValue" class="text-2xl font-bold text-teal-700 dark:text-teal-400 mt-2">₦—</p>
            <p class="text-xs text-teal-600 dark:text-teal-300 mt-1">Ready for payout</p>
          </div>
          <div class="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
            <p class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Pending Seller Earnings</p>
            <p id="pendingSellerEarningsValue" class="text-2xl font-bold text-yellow-700 dark:text-yellow-400 mt-2">₦—</p>
            <p class="text-xs text-yellow-600 dark:text-yellow-300 mt-1">Processing</p>
          </div>
          <div class="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
            <p class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Pending Withdrawals</p>
            <p id="pendingWithdrawalsValue" class="text-2xl font-bold text-orange-700 dark:text-orange-400 mt-2">₦—</p>
            <p class="text-xs text-orange-600 dark:text-orange-300 mt-1">Under review</p>
          </div>
          <div class="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
            <p class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Refunds</p>
            <p id="refundsValue" class="text-2xl font-bold text-red-700 dark:text-red-400 mt-2">₦—</p>
            <p class="text-xs text-red-600 dark:text-red-300 mt-1">Issued</p>
          </div>
          <div class="bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20 rounded-lg p-4 border border-rose-200 dark:border-rose-800">
            <p class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Outstanding Seller Debt</p>
            <p id="outstandingSellerDebtValue" class="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-2">₦—</p>
            <p class="text-xs text-rose-600 dark:text-rose-300 mt-1">Overdue</p>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Orders</h2>
          <div id="recentOrdersContainer" class="space-y-4">
            <p class="text-sm text-gray-500 dark:text-gray-400">Loading recent orders...</p>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Products</h2>
          <div id="topProductsContainer" class="space-y-4">
            <p class="text-sm text-gray-500 dark:text-gray-400">Loading top products...</p>
          </div>
        </div>
      </div>

      <!-- Returns & Refunds Summary (Connection 6A) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Returns & Refunds</h2>
            <button onclick="loadPage('returns'); return false;" class="px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700">View Returns & Refunds</button>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
              <p class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Open Cases</p>
              <p id="openCases" class="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1">—</p>
            </div>
            <div class="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
              <p class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Awaiting Seller Response</p>
              <p id="awaitingSeller" class="text-2xl font-bold text-yellow-700 dark:text-yellow-400 mt-1">—</p>
            </div>
            <div class="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
              <p class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Awaiting Buyer Response</p>
              <p id="awaitingBuyer" class="text-2xl font-bold text-orange-700 dark:text-orange-400 mt-1">—</p>
            </div>
            <div class="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
              <p class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Awaiting Decision</p>
              <p id="awaitingDecision" class="text-2xl font-bold text-purple-700 dark:text-purple-400 mt-1">—</p>
            </div>
            <div class="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 border border-green-200 dark:border-green-800">
              <p class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Refund Processing</p>
              <p id="refundProcessing" class="text-2xl font-bold text-green-700 dark:text-green-400 mt-1">—</p>
            </div>
            <div class="bg-teal-50 dark:bg-teal-900/30 rounded-lg p-3 border border-teal-200 dark:border-teal-800">
              <p class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Completed Today</p>
              <p id="completedToday" class="text-2xl font-bold text-teal-700 dark:text-teal-400 mt-1">—</p>
            </div>
          </div>
        </div>

        <!-- Seller Debt Summary -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Seller Debt</h2>
            <button onclick="loadPage('debt-adjustments'); return false;" class="px-3 py-1 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700">View Debt / Adjustments</button>
          </div>
          <div class="grid grid-cols-2 gap-3">
              <div class="bg-red-50 dark:bg-red-900/30 rounded-lg p-3 border border-red-200 dark:border-red-800">
                <p class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Outstanding Debt</p>
                <p id="outstandingDebt" class="text-2xl font-bold text-red-700 dark:text-red-400 mt-1">—</p>
              </div>
              <div class="bg-rose-50 dark:bg-rose-900/30 rounded-lg p-3 border border-rose-200 dark:border-rose-800">
                <p class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Sellers With Debt</p>
                <p id="sellersWithDebt" class="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1">—</p>
              </div>
              <div class="bg-emerald-50 dark:bg-emerald-900/30 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
                <p class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Recovered This Month</p>
                <p id="recoveredThisMonth" class="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">—</p>
              </div>
              <div class="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
                <p class="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Unrecovered Debt</p>
                <p id="unrecoveredDebt" class="text-2xl font-bold text-orange-700 dark:text-orange-400 mt-1">—</p>
              </div>
          </div>
        </div>
      </div>

      <!-- Recent Admin Activity & Marketplace Health -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Recent Admin Activity -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Admin Activity</h2>
          <div id="recentAdminActivityList" class="space-y-3">
            <p class="text-sm text-gray-500 dark:text-gray-400">Loading recent admin activity...</p>
          </div>
        </div>

        <!-- Marketplace Health -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Marketplace Health</h2>
          <div id="marketplaceHealthList" class="space-y-3">
            <p class="text-sm text-gray-500 dark:text-gray-400">Loading marketplace health...</p>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <button onclick="loadPage('products'); return false;" class="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm">
            <i class="fas fa-plus mr-2"></i>Add Product
          </button>
          <button onclick="loadPage('sellers'); return false;" class="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm">
            <i class="fas fa-check-circle mr-2"></i>Review Sellers
          </button>
          <button onclick="loadPage('products'); return false;" class="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold text-sm">
            <i class="fas fa-box-check mr-2"></i>Review Products
          </button>
          <button onclick="loadPage('orders'); return false;" class="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-sm">
            <i class="fas fa-receipt mr-2"></i>View Orders
          </button>
          <button onclick="loadPage('withdrawals'); return false;" class="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold text-sm">
            <i class="fas fa-money-bill-wave mr-2"></i>View Withdrawals
          </button>
          <button onclick="loadPage('returns'); return false;" class="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm">
            <i class="fas fa-undo mr-2"></i>View Refunds
          </button>
          <button onclick="loadPage('reports'); return false;" class="px-4 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-semibold text-sm">
            <i class="fas fa-chart-bar mr-2"></i>View Reports
          </button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('content').innerHTML = html;

  loadDashboardCounts();
  loadPendingActionCounts();
  loadDashboardActivity();
  loadRecentAdminActivity();
  loadMarketplaceHealth();
  
  // Load initial marketplace performance data for today
  setTimeout(() => {
    switchMarketplacePeriod('today');
  }, 100);

  // Initialize revenue chart
  setTimeout(() => {
    generateRevenueChart();
  }, 50);
  // Populate refunds summary (Connection 6A)
  setTimeout(() => {
    try { loadRefundSummary(); } catch (e) { console.error('loadRefundSummary failed', e); }
  }, 150);
  // Populate debt summary (Connection 6B)
  setTimeout(() => {
    try { loadDebtSummary(); } catch (e) { console.error('[Connection 6B] loadDebtSummary failed', e); }
  }, 200);
}

// Buyers Management
function renderBuyers() {
  const html = `
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Buyers Management</h1>
      
      <div class="mb-6 flex gap-4">
        <input type="text" id="buyerSearch" placeholder="Search buyers..." class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white">
        <button class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Export</button>
      </div>

      ${renderTable(['ID', 'Name', 'Email', 'Phone', 'Status', 'Join Date'], dummyData.buyers, [
        { label: 'View', callback: 'viewBuyer' }
      ])}
    </div>
  `;
  document.getElementById('content').innerHTML = html;
  
  document.getElementById('buyerSearch').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = dummyData.buyers.filter(b => 
      b.name.toLowerCase().includes(query) || b.email.toLowerCase().includes(query)
    );
    const tableHtml = renderTable(['ID', 'Name', 'Email', 'Phone', 'Status', 'Join Date'], filtered, [
      { label: 'View', callback: 'viewBuyer' }
    ]);
    document.querySelector('.overflow-x-auto').outerHTML = tableHtml;
  });
}

function viewBuyer(id) {
  const buyer = dummyData.buyers.find(b => b.id === id);
  const html = `
    <div>
      <button onclick="loadPage('buyers')" class="mb-6 text-blue-600 dark:text-blue-400 hover:underline">← Back to Buyers</button>
      
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">${buyer.name}</h2>
        
        <div class="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p class="text-gray-600 dark:text-gray-400">Email</p>
            <p class="font-semibold text-gray-900 dark:text-white">${buyer.email}</p>
          </div>
          <div>
            <p class="text-gray-600 dark:text-gray-400">Phone</p>
            <p class="font-semibold text-gray-900 dark:text-white">${buyer.phone}</p>
          </div>
          <div>
            <p class="text-gray-600 dark:text-gray-400">Joined</p>
            <p class="font-semibold text-gray-900 dark:text-white">${buyer.joinDate}</p>
          </div>
        </div>

        <div class="flex gap-3">
          <button onclick="toggleBuyerStatus('${buyer.id}')" class="px-6 py-2 ${buyer.status === 'Active' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg">
            ${buyer.status === 'Active' ? 'Suspend' : 'Activate'} Buyer
          </button>
          <button onclick="openModal('Delete Buyer', 'Are you sure you want to delete this buyer?', () => { deleteBuyer('${buyer.id}'); })" class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Delete Buyer
          </button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('content').innerHTML = html;
}

// Sellers Management
async function fetchAdminSellers(search = '', status = 'All') {
  const params = new URLSearchParams({ page: 1, limit: 100 });
  if (search) params.set('search', search);
  if (status && status !== 'All') params.set('status', status.toLowerCase());
  const res = await fetch(`${ADMIN_API_BASE}/admin/sellers?${params}`, { headers: getAdminAuthHeaders() });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message || 'Failed to load sellers');
  return body?.data?.sellers || [];
}

function renderSellers() {
  const sellerData = Array.isArray(dummyData && dummyData.sellers) ? dummyData.sellers : [];
  const statusOptions = ['All', ...Array.from(new Set(sellerData.map(s => s && s.status).filter(Boolean)))];
  const columns = ['ID', 'Shop Name', 'Seller Name', 'Email', 'Phone', 'Status', 'Join Date'];
  const actions = [{ label: 'View', callback: 'viewSeller' }];

  const statusCounts = {
    total: sellerData.length,
    pending: sellerData.filter(s => String(s?.kyc_status || s?.status || '').toLowerCase() === 'pending').length,
    approved: sellerData.filter(s => String(s?.kyc_status || s?.status || '').toLowerCase() === 'approved').length,
    suspended: sellerData.filter(s => String(s?.kyc_status || s?.status || '').toLowerCase() === 'suspended').length
  };

  const statCards = [
    { label: 'Total Sellers', value: statusCounts.total, tone: 'blue', icon: 'fa-users' },
    { label: 'Pending', value: statusCounts.pending, tone: 'amber', icon: 'fa-clock' },
    { label: 'Approved', value: statusCounts.approved, tone: 'green', icon: 'fa-check-circle' },
    { label: 'Suspended', value: statusCounts.suspended, tone: 'red', icon: 'fa-ban' }
  ];

  const renderSellerTable = (rows) => {
    if (!rows.length) {
      return `
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <p class="text-gray-600 dark:text-gray-300">No sellers found.</p>
        </div>
      `;
    }

    return renderTable(columns, rows, actions);
  };

  const html = `
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Sellers Management</h1>
      <div class="mb-6 flex flex-col sm:flex-row gap-4">
        <input type="text" id="sellerSearch" placeholder="Search sellers..." class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white">
        <select id="sellerStatusFilter" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white">
          <option value="All">All</option><option value="pending">Pending</option>
          <option value="approved">Approved</option><option value="rejected">Rejected</option>
          <option value="not_submitted">Not Submitted</option>
        </select>
      </div>
      <div id="sellerTableContainer" class="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <p class="text-sm text-gray-500 dark:text-gray-400">Loading sellers...</p>
      </div>
    </div>`;
  document.getElementById('content').innerHTML = html;

  window._adminSellers = [];

  async function reload() {
    const container = document.getElementById('sellerTableContainer');
    try {
      const search = document.getElementById('sellerSearch').value.trim();
      const status = document.getElementById('sellerStatusFilter').value;
      const sellers = await fetchAdminSellers(search, status);
      window._adminSellers = sellers;
      if (!sellers.length) {
        container.innerHTML = `<p class="text-sm text-gray-600 dark:text-gray-300 text-center py-6">No sellers found.</p>`;
        return;
      }
      container.innerHTML = renderTable(
        ['ID', 'Shop Name', 'Seller Name', 'Email', 'Phone', 'KYC Status', 'Account Status', 'Join Date'],
        sellers.map(s => ({ ...s, id: s.id, kycstatus: s.kycStatus, accountstatus: s.accountStatus, joindate: new Date(s.joinDate).toLocaleDateString() })),
        [{ label: 'View', callback: 'viewAdminSeller' }]
      );
    } catch (err) {
      container.innerHTML = `<p class="text-sm text-red-600">${err.message}</p>`;
    }
  }

  document.getElementById('sellerSearch').addEventListener('input', () => { clearTimeout(window._sellerSearchDebounce); window._sellerSearchDebounce = setTimeout(reload, 350); });
  document.getElementById('sellerStatusFilter').addEventListener('change', reload);
  reload();
}

async function viewAdminSeller(id) {
  const container = document.getElementById('content');
  if (!container) return;
  container.innerHTML = `<p class="text-sm text-gray-500 p-6">Loading seller...</p>`;

  try {
    const res = await fetch(`${ADMIN_API_BASE}/admin/sellers/${encodeURIComponent(id)}`, { headers: getAdminAuthHeaders() });
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.message || 'Failed to load seller');

    const sellerDisplay = body?.data?.seller || body?.data || {};

    const financialSummary = [
      { label: 'Wallet Balance', value: formatCurrency((sellerDisplay.wallet && sellerDisplay.wallet.balance) || sellerDisplay.walletBalance || 0) },
      { label: 'Pending Settlements', value: formatCurrency((sellerDisplay.wallet && sellerDisplay.wallet.pending) || sellerDisplay.pendingSettlements || 0) },
      { label: 'Total Sales', value: formatCurrency((sellerDisplay.financial && sellerDisplay.financial.totalSales) || sellerDisplay.totalSales || 0) },
      { label: 'Total Payouts', value: formatCurrency((sellerDisplay.financial && sellerDisplay.financial.totalPayouts) || sellerDisplay.totalPayouts || 0) }
    ];

    function renderSellerDocumentPreview(url, label) {
      if (!url) return `<p class="text-sm text-gray-500 dark:text-gray-400">No ${escapeHtml(label)} available.</p>`;
      const safe = escapeHtml(url);
      if (/\.(jpg|jpeg|png|gif|webp)$/i.test(url)) {
        return `<a href="${safe}" target="_blank" rel="noopener noreferrer"><img src="${safe}" alt="${escapeHtml(label)}" class="max-h-48 rounded-md border"/></a>`;
      }
      return `<a href="${safe}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${escapeHtml(label)}</a>`;
    }

    const html = `
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Seller Details</h1>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section class="lg:col-span-2">
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p class="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase mb-1">Full Name</p>
                <p class="font-semibold text-gray-900 dark:text-white text-lg break-words">${escapeHtml(sellerDisplay.fullName || sellerDisplay.sellerName || 'N/A')}</p>
              </div>
              <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p class="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase mb-1">Date of Birth</p>
                <p class="font-semibold text-gray-900 dark:text-white text-lg break-words">${escapeHtml(sellerDisplay.dateOfBirth || 'N/A')}</p>
              </div>
              <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p class="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase mb-1">Country</p>
                <p class="font-semibold text-gray-900 dark:text-white text-lg break-words">${escapeHtml(sellerDisplay.country || 'N/A')}</p>
              </div>
              <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p class="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase mb-1">ID Type</p>
                <p class="font-semibold text-gray-900 dark:text-white text-lg break-words">${escapeHtml(sellerDisplay.idType || 'N/A')}</p>
              </div>
              <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p class="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase mb-1">ID Number</p>
                <p class="font-semibold text-gray-900 dark:text-white text-lg break-words">${escapeHtml(sellerDisplay.idNumber || 'N/A')}</p>
              </div>
              <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p class="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase mb-1">Residential Address</p>
                <p class="font-semibold text-gray-900 dark:text-white text-lg break-words whitespace-normal overflow-wrap-anywhere">${escapeHtml(sellerDisplay.residentialAddress || 'N/A')}</p>
              </div>
            </div>

            <div class="mt-6 space-y-4">
              <div>
                <label class="block text-gray-700 dark:text-gray-300 font-semibold mb-3">ID Document</label>
                ${renderSellerDocumentPreview(sellerDisplay.idDocumentUrl || sellerDisplay.idDocument || '', 'ID Document')}
              </div>
              <div>
                <label class="block text-gray-700 dark:text-gray-300 font-semibold mb-3">Proof of Address</label>
                ${renderSellerDocumentPreview(sellerDisplay.proofOfAddressUrl || sellerDisplay.proofOfAddress || '', 'Proof of Address')}
              </div>
            </div>
          </div>
        </section>

        <aside>
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-6">
            <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p class="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase mb-1">Account Status</p>
              <p class="font-semibold text-lg ${sellerDisplay.isSuspended ? 'text-red-600' : 'text-green-600'}">${sellerDisplay.isSuspended ? 'Suspended' : 'Active'}</p>
            </div>

            <div>
              <p class="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold">Financial Summary</p>
              <h3 class="text-xl font-bold text-gray-900 dark:text-white mt-1">Wallet & Settlement</h3>
            </div>
            <div class="grid grid-cols-1 gap-3">
              ${financialSummary.map(item => `<div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 p-3"><p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">${item.label}</p><p class="text-lg font-semibold text-gray-500 dark:text-gray-400">${item.value}</p></div>`).join('')}
            </div>

            <div>
              <p class="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold">Seller Actions</p>
              <div class="flex flex-wrap gap-3 mt-3">
                ${['pending', 'not_submitted'].includes(String(sellerDisplay.kycStatus || sellerDisplay.kyc_status || sellerDisplay.status || '').toLowerCase()) ? `<button data-seller-kyc-action="approve" onclick="approveSeller('${escapeHtml(sellerDisplay.id||'')}')" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"><i class="fas fa-check mr-2"></i>Approve KYC</button>` : ''}
                ${['pending','approved','rejected','not_submitted'].includes(String(sellerDisplay.kycStatus || sellerDisplay.kyc_status || sellerDisplay.status || '').toLowerCase()) ? `<button data-seller-kyc-action="reject" onclick="rejectSeller('${escapeHtml(sellerDisplay.id||'')}')" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"><i class="fas fa-times mr-2"></i>Reject KYC</button>` : ''}
                ${sellerDisplay.isSuspended
                  ? `<button onclick="reactivateSeller('${escapeHtml(sellerDisplay.id||'')}')" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"><i class="fas fa-user-check mr-2"></i>Reactivate</button>`
                  : `<button onclick="suspendSeller('${escapeHtml(sellerDisplay.id||'')}')" class="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-semibold"><i class="fas fa-ban mr-2"></i>Suspend</button>`
                }
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
    `;

    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<p class="text-sm text-red-600 p-6">${escapeHtml(err.message || 'Unable to load seller')}</p>`;
  }
}

// Products Management
let realProductData = [];

function getProductStatus(product) {
  if (product.is_active === false) return 'Inactive';
  if (Number(product.stock_quantity) === 0) return 'Out of Stock';
  if (Number(product.stock_quantity) <= 10) return 'Low Stock';
  return 'Active';
}

function normalizeProduct(product) {
  return {
    ...product,
    id: product.id ?? null,
    name: product.name ?? null,
    category: product.category_name ?? product.category ?? null,
    seller: null,
    price: product.price ?? null,
    stock: product.stock_quantity ?? null,
    status: getProductStatus(product)
  };
}

function renderProductState(message, isError = false) {
  const color = isError ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300';
  return `<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center"><p class="${color}">${message}</p></div>`;
}

function renderProductTable(products) {
  return products.length
    ? renderTable(['ID', 'Name', 'Category', 'Seller', 'Price', 'Stock', 'Status'], products, [{ label: 'View', callback: 'viewProduct' }])
    : renderProductState('No products found.');
}

function renderProductList(products) {
  const categories = ['All Categories', ...Array.from(new Set(products.map(product => product.category).filter(Boolean)))];
  const statuses = ['All Statuses', ...Array.from(new Set(products.map(product => product.status).filter(Boolean)))];
  const content = document.getElementById('content');

  content.innerHTML = `
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Products Management</h1>
      <div class="mb-6 flex flex-col sm:flex-row gap-4">
        <input type="text" id="productSearch" placeholder="Search products..." class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white">
        <select id="productCategoryFilter" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white">
          ${categories.map(category => `<option value="${category}">${category}</option>`).join('')}
        </select>
        <select id="productStatusFilter" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white">
          ${statuses.map(status => `<option value="${status}">${status}</option>`).join('')}
        </select>
        <button class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Export</button>
      </div>
      <div id="productTableContainer">${renderProductTable(products)}</div>
    </div>
  `;

  const applyFilters = () => {
    const query = document.getElementById('productSearch').value.trim().toLowerCase();
    const category = document.getElementById('productCategoryFilter').value;
    const status = document.getElementById('productStatusFilter').value;
    const filteredProducts = products.filter(product => {
      const searchable = [product.id, product.name, product.category, product.seller, product.price, product.stock, product.status]
        .map(value => value == null ? '' : String(value)).join(' ').toLowerCase();
      return (!query || searchable.includes(query))
        && (category === 'All Categories' || product.category === category)
        && (status === 'All Statuses' || product.status === status);
    });
    document.getElementById('productTableContainer').innerHTML = renderProductTable(filteredProducts);
  };

  document.getElementById('productSearch').addEventListener('input', applyFilters);
  document.getElementById('productCategoryFilter').addEventListener('change', applyFilters);
  document.getElementById('productStatusFilter').addEventListener('change', applyFilters);
}

function renderProducts() {
  const content = document.getElementById('content');
  content.innerHTML = renderProductState('Loading products...');
  const apiBase = window.ADMIN_API_BASE || (window.location.protocol === 'file:'
    ? 'http://localhost:5000/api'
    : 'https://marketmix-backend.onrender.com/api');

  fetch(`${apiBase}/products?page=1&limit=1000`)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(payload => {
      realProductData = (Array.isArray(payload?.data) ? payload.data : []).map(normalizeProduct);
      renderProductList(realProductData);
    })
    .catch(error => {
      console.error('Failed to load products:', error);
      content.innerHTML = renderProductState('Unable to load products.', true);
    });
}

function viewProduct(id) {
  const product = realProductData.find(p => String(p.id) === String(id));
  if (!product) {
    document.getElementById('content').innerHTML = renderProductState('Unable to load product.', true);
    return;
  }
  const html = `
    <div>
      <button onclick="loadPage('products')" class="mb-6 text-blue-600 dark:text-blue-400 hover:underline">← Back to Products</button>
      
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">${product.name}</h2>
        
        <div class="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p class="text-gray-600 dark:text-gray-400">Category</p>
            <p class="font-semibold text-gray-900 dark:text-white">${product.category}</p>
          </div>
          <div>
            <p class="text-gray-600 dark:text-gray-400">Seller</p>
            <p class="font-semibold text-gray-900 dark:text-white">${product.seller}</p>
          </div>
          <div>
            <p class="text-gray-600 dark:text-gray-400">Price</p>
            <p class="font-semibold text-gray-900 dark:text-white">$${product.price}</p>
          </div>
          <div>
            <p class="text-gray-600 dark:text-gray-400">Stock</p>
            <p class="font-semibold text-gray-900 dark:text-white">${product.stock}</p>
          </div>
          <div>
            <p class="text-gray-600 dark:text-gray-400">Status</p>
            <p class="font-semibold text-gray-900 dark:text-white">${product.status}</p>
          </div>
        </div>

        <div class="flex gap-3">
          <button onclick="toggleProductStatus('${product.id}')" class="px-6 py-2 ${product.status === 'Active' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg">
            ${product.status === 'Active' ? 'Deactivate' : 'Activate'} Product
          </button>
          <button onclick="openModal('Delete Product','Are you sure you want to delete this product?', () => { deleteProduct('${product.id}'); })" class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Delete Product
          </button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('content').innerHTML = html;
}

// Orders Management
function renderOrders() {
  const html = `
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Orders Management</h1>
      
      <div class="mb-6 flex gap-4">
        <input type="text" id="orderSearch" placeholder="Search orders..." class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white">
        <select class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white">
          <option>All Status</option>
          <option>Pending</option>
          <option>Processing</option>
          <option>Shipped</option>
          <option>Delivered</option>
        </select>
        <button class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Export</button>
      </div>

      ${renderTable(['ID', 'Buyer', 'Seller', 'Amount', 'Status', 'Date'], dummyData.orders, [
        { label: 'View', callback: 'viewOrder' }
      ])}
    </div>
  `;
  document.getElementById('content').innerHTML = html;
}

function viewOrder(id) {
  const order = dummyData.orders.find(o => o.id === id);
  const html = `
    <div>
      <button onclick="loadPage('orders')" class="mb-6 text-blue-600 dark:text-blue-400 hover:underline">← Back to Orders</button>
      
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">${order.id}</h2>
        
        <div class="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p class="text-gray-600 dark:text-gray-400">Buyer</p>
            <p class="font-semibold text-gray-900 dark:text-white">${order.buyer}</p>
          </div>
          <div>
            <p class="text-gray-600 dark:text-gray-400">Seller</p>
            <p class="font-semibold text-gray-900 dark:text-white">${order.seller}</p>
          </div>
          <div>
            <p class="text-gray-600 dark:text-gray-400">Amount</p>
            <p class="font-semibold text-gray-900 dark:text-white">$${order.amount}</p>
          </div>
          <div>
            <p class="text-gray-600 dark:text-gray-400">Date</p>
            <p class="font-semibold text-gray-900 dark:text-white">${order.date}</p>
          </div>
        </div>

        <div class="mb-6">
          <h3 class="font-semibold text-gray-900 dark:text-white mb-3">Order Timeline</h3>
          <div class="flex gap-4">
            <div class="flex flex-col items-center">
              <div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white"><i class="fas fa-check"></i></div>
              <p class="text-xs mt-2">Pending</p>
            </div>
            <div class="flex-1 h-px bg-green-500 mt-4"></div>
            <div class="flex flex-col items-center">
              <div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white"><i class="fas fa-check"></i></div>
              <p class="text-xs mt-2">Processing</p>
            </div>
            <div class="flex-1 h-px bg-blue-500 mt-4"></div>
            <div class="flex flex-col items-center">
              <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white"><i class="fas fa-box"></i></div>
              <p class="text-xs mt-2">Shipped</p>
            </div>
            <div class="flex-1 h-px bg-gray-300 mt-4"></div>
            <div class="flex flex-col items-center">
              <div class="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white"><i class="fas fa-truck"></i></div>
              <p class="text-xs mt-2">Delivered</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('content').innerHTML = html;
}

// Categories Management
function renderCategories() {
  const html = `
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Categories Management</h1>
      
      <button onclick="addCategory()" class="mb-6 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">+ Add Category</button>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${dummyData.categories.map(cat => `
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 class="font-bold text-gray-900 dark:text-white mb-2">${cat.name}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">${cat.products} products</p>
            <div class="flex gap-2">
              <button onclick="toggleCategoryStatus('${cat.id}')" class="flex-1 px-3 py-2 text-sm ${cat.status === 'Active' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'} rounded hover:opacity-80">
                ${cat.status === 'Active' ? 'Deactivate' : 'Activate'}
              </button>
              <button onclick="openModal('Delete Category', 'Are you sure you want to delete ${cat.name}?', () => { deleteCategory('${cat.id}'); })" class="px-3 py-2 text-sm bg-red-100 text-red-600 rounded hover:opacity-80">Delete</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  document.getElementById('content').innerHTML = html;
}

function addCategory() {
  const name = prompt('Category name:');
  if (name) {
    dummyData.categories.push({ id: 'CAT' + (dummyData.categories.length + 1), name, status: 'Active', products: 0 });
    renderCategories();
    showToast('Category added successfully');
  }
}

// Reports & Analytics
let salesChart = null;

function renderReports() {
  const html = `
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Reports & Analytics</h1>
      
      <div class="mb-6 flex gap-4 items-center">
        <input id="reportStart" type="date" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white">
        <span class="px-4 py-2">to</span>
        <input id="reportEnd" type="date" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white">
        <select id="reportInterval" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white">
          <option value="day">Day</option>
          <option value="month">Month</option>
        </select>
        <button id="generateReportBtn" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Generate</button>
        <button id="exportCsv" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">CSV</button>
        <button id="exportPdf" class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">PDF</button>
      </div>
  
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sales Reports</h2>
            <div class="h-64">
              <canvas id="salesChart" width="400" height="200"></canvas>
            </div>
          </div>

          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Selling Categories</h2>
            <div class="space-y-4">
              ${['Electronics', 'Fashion', 'Home & Garden', 'Sports'].map((cat, idx) => {
                const pct = 100 - idx * 15;
                return `
                <div class="flex items-center justify-between">
                  <p class="text-gray-700 dark:text-gray-300 w-32">${cat}</p>
                  <div class="w-40 h-6 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden relative">
                    <div class="h-full bg-blue-500" style="width: ${pct}%"></div>
                    <span class="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-900 dark:text-white">${pct}%</span>
                  </div>
                </div>
              `;
              }).join('')}
            </div>
          </div>
        </div>
    </div>
  `;
  document.getElementById('content').innerHTML = html;

  // wire up generate button and initialize
  setTimeout(() => {
    const gen = document.getElementById('generateReportBtn');
    if (gen) gen.addEventListener('click', () => generateReport());

    const csv = document.getElementById('exportCsv');
    if (csv) csv.addEventListener('click', () => exportReportCSV());

    const pdf = document.getElementById('exportPdf');
    if (pdf) pdf.addEventListener('click', () => exportReportPDF());

    const startInput = document.getElementById('reportStart');
    const endInput = document.getElementById('reportEnd');
    const today = new Date();
    const prior = new Date(); prior.setDate(today.getDate() - 30);
    if (startInput && endInput) {
      startInput.value = prior.toISOString().split('T')[0];
      endInput.value = today.toISOString().split('T')[0];
    }

    generateReport();
  }, 50);
}

// Build / update the sales chart using orders in dummyData
function generateReport() {
  const startStr = document.getElementById('reportStart')?.value;
  const endStr = document.getElementById('reportEnd')?.value;
  const interval = document.getElementById('reportInterval')?.value || 'day';

  const start = startStr ? new Date(startStr) : null;
  const end = endStr ? new Date(endStr) : null;

  const agg = aggregateSales(start, end, interval);
  const labels = agg.labels;
  const data = agg.values;

  const canvas = document.getElementById('salesChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // register datalabels plugin if available
  if (window.Chart && window.Chart.register && window.ChartDataLabels) {
    try { Chart.register(ChartDataLabels); } catch (e) { /* ignore */ }
  }

  if (salesChart) {
    salesChart.data.labels = labels;
    salesChart.data.datasets[0].data = data;
    salesChart.update();
    return;
  }

  const total = data.reduce((s, v) => s + v, 0) || 1;

  salesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{ label: 'Sales', data: data, backgroundColor: '#3b82f6' }]
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const v = context.raw || 0;
              const pct = total ? (v / total * 100).toFixed(1) : '0.0';
              return `₦${v.toFixed(2)} (${pct}%)`;
            }
          }
        },
        datalabels: {
          color: '#111827',
          anchor: 'end',
          align: 'start',
          formatter: function(value) {
            const pct = total ? (value / total * 100).toFixed(1) : '0.0';
            return pct + '%';
          },
          font: { weight: '600' }
        }
      },
      scales: { y: { beginAtZero: true } }
    }
  });
}

// Aggregate orders by day or month between start and end inclusive
function aggregateSales(start, end, interval) {
  const orders = (window.dummyData && window.dummyData.orders) || [];
  const map = new Map();

  orders.forEach(o => {
    if (!o.date) return;
    const d = new Date(o.date);
    // normalize to local midnight for comparisons
    d.setHours(0,0,0,0);
    if (start) { const s = new Date(start); s.setHours(0,0,0,0); if (d < s) return; }
    if (end) { const e = new Date(end); e.setHours(23,59,59,999); if (d > e) return; }

    let key;
    if (interval === 'month') {
      const m = d.getMonth() + 1; const y = d.getFullYear();
      key = `${y}-${String(m).padStart(2,'0')}`;
    } else {
      key = d.toISOString().split('T')[0];
    }

    const prev = map.get(key) || 0;
    map.set(key, prev + (parseFloat(o.amount) || 0));
  });

  const keys = Array.from(map.keys()).sort();
  const values = keys.map(k => map.get(k));
  if (keys.length === 0) return { labels: ['No data'], values: [0] };
  return { labels: keys, values };
}

// Generate and render the revenue chart for dashboard
function generateRevenueChart() {
  // Determine currently selected period from buttons
  const active = document.querySelector('.period-btn.bg-blue-600');
  const period = active ? active.getAttribute('data-period') : 'today';

  const canvas = document.getElementById('revenueChart');
  if (!canvas || !window.Chart) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Show loading state (clear chart area)
  try {
    if (window.revenueChart && typeof window.revenueChart.destroy === 'function') {
      window.revenueChart.destroy();
    }
  } catch (e) {
    console.error('[Connection 3B] Error destroying previous chart', e);
  }
  window.revenueChart = null;

  // Fetch chart data from backend
  (async () => {
    try {
      const resp = await fetch(`${ADMIN_API_BASE}/admin/marketplace-performance/chart?period=${encodeURIComponent(period)}`, { headers: getAdminAuthHeaders() });
      if (!resp.ok) {
        console.error('[Connection 3B] Failed to fetch chart data', resp.status, resp.statusText);
        return;
      }
      const json = await resp.json();
      if (json.status !== 'success' || !json.data) {
        console.error('[Connection 3B] Invalid chart response', json);
        return;
      }

      const { labels, datasets } = json.data;
      const gross = Array.isArray(datasets.grossSales) ? datasets.grossSales : [];
      const platform = Array.isArray(datasets.platformRevenue) ? datasets.platformRevenue : [];
      const refunds = Array.isArray(datasets.refunds) ? datasets.refunds : [];
      const payouts = Array.isArray(datasets.sellerPayouts) ? datasets.sellerPayouts : [];

      const total = gross.reduce((s, v) => s + (v || 0), 0) || 1;

      // Register datalabels plugin if available
      if (window.Chart && window.Chart.register && window.ChartDataLabels) {
        try { Chart.register(ChartDataLabels); } catch (e) { /* ignore */ }
      }

      window.revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            { label: 'Gross Sales', data: gross, borderColor: '#0ea5e9', backgroundColor: 'rgba(14,165,233,0.08)', tension: 0.2, fill: true },
            { label: 'Platform Revenue', data: platform, borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.08)', tension: 0.2, fill: true },
            { label: 'Refunds', data: refunds, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)', tension: 0.2, fill: true },
            { label: 'Seller Payouts', data: payouts, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)', tension: 0.2, fill: true }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const v = context.raw || 0;
                  const pct = total ? (v / total * 100).toFixed(1) : '0.0';
                  return `₦${Number(v).toFixed(2)} (${pct}%)`;
                }
              }
            },
            datalabels: {
              display: false
            }
          },
          scales: { y: { beginAtZero: true } }
        }
      });
    } catch (err) {
      console.error('[Connection 3B] Error loading chart data', err);
      // leave blank chart area as fallback
    }
  })();
}

// Get monthly revenue for last 6 months (for dashboard)
function getMonthlyRevenue() {
  const orders = (window.dummyData && window.dummyData.orders) || [];
  const map = new Map();
  
  // Generate last 6 months
  const months = [];
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const key = `${y}-${String(m).padStart(2,'0')}`;
    months.push(key);
    map.set(key, 0);
  }
  
  // Aggregate orders by month
  orders.forEach(o => {
    if (!o.date) return;
    const d = new Date(o.date);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const key = `${y}-${String(m).padStart(2,'0')}`;
    if (map.has(key)) {
      map.set(key, map.get(key) + (parseFloat(o.amount) || 0));
    }
  });
  
  const values = months.map(k => map.get(k));
  const labels = months.map(k => {
    const [y, m] = k.split('-');
    const monthName = new Date(y, m - 1).toLocaleDateString('en-US', { month: 'short' });
    return `${monthName} ${y}`;
  });
  
  return { labels, values };
}

// Export report data as CSV
function exportReportCSV() {
  const startStr = document.getElementById('reportStart')?.value;
  const endStr = document.getElementById('reportEnd')?.value;
  const interval = document.getElementById('reportInterval')?.value || 'day';

  const start = startStr ? new Date(startStr) : null;
  const end = endStr ? new Date(endStr) : null;

  const agg = aggregateSales(start, end, interval);
  const labels = agg.labels;
  const values = agg.values;

  const total = values.reduce((s, v) => s + v, 0) || 1;

  // Build CSV
  let csv = 'Date/Period,Sales Amount,Percentage\n';
  labels.forEach((label, idx) => {
    const val = values[idx];
    const pct = ((val / total) * 100).toFixed(2);
    csv += `"${label}","${val.toFixed(2)}","${pct}%"\n`;
  });
  csv += `\nTotal,"${total.toFixed(2)}","100%"\n`;

  // Download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sales_report_${startStr}_to_${endStr}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported successfully', 'success');
}

// Export report data as PDF
function exportReportPDF() {
  const startStr = document.getElementById('reportStart')?.value;
  const endStr = document.getElementById('reportEnd')?.value;
  const interval = document.getElementById('reportInterval')?.value || 'day';

  const start = startStr ? new Date(startStr) : null;
  const end = endStr ? new Date(endStr) : null;

  const agg = aggregateSales(start, end, interval);
  const labels = agg.labels;
  const values = agg.values;

  const total = values.reduce((s, v) => s + v, 0) || 1;

  // Simple PDF generation using basic HTML (no external lib needed for simple PDFs)
  let html = '<html><head><style>';
  html += 'body { font-family: Arial, sans-serif; margin: 20px; } ';
  html += 'h1 { color: #1f2937; } ';
  html += 'table { width: 100%; border-collapse: collapse; margin: 20px 0; } ';
  html += 'th, td { padding: 10px; text-align: left; border: 1px solid #ddd; } ';
  html += 'th { background-color: #3b82f6; color: white; } ';
  html += 'tr:nth-child(even) { background-color: #f3f4f6; } ';
  html += '</style></head><body>';
  html += '<h1>MarketMix Sales Report</h1>';
  html += `<p><strong>Date Range:</strong> ${startStr} to ${endStr}</p>`;
  html += `<p><strong>Interval:</strong> ${interval.charAt(0).toUpperCase() + interval.slice(1)}</p>`;
  html += '<table><thead><tr><th>Date/Period</th><th>Sales Amount</th><th>Percentage</th></tr></thead><tbody>';

  labels.forEach((label, idx) => {
    const val = values[idx];
    const pct = ((val / total) * 100).toFixed(2);
    html += `<tr><td>${label}</td><td>₦${val.toFixed(2)}</td><td>${pct}%</td></tr>`;
  });

  html += `<tr style="background-color: #dbeafe; font-weight: bold;"><td>TOTAL</td><td>₦${total.toFixed(2)}</td><td>100%</td></tr>`;
  html += '</tbody></table></body></html>';

  // Convert to PDF using browser's print-to-PDF
  const printWindow = window.open('', '', 'height=600,width=800');
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
  showToast('PDF generated - check your print dialog', 'success');
}

// Transactions
function renderTransactions() {
  const html = `
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Transactions</h1>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        ${renderCard('Wallet Balance', '₦45,230.50', 'wallet', 'blue')}
        ${renderCard('Monthly Earnings', '₦12,500.00', 'dollar-sign', 'green')}
        ${renderCard('Pending Payouts', '₦3,200.00', 'clock', 'orange')}
        ${renderCard('Withdrawal Requests', '5', 'arrow-right', 'red')}
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Withdrawal Requests</h2>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200">ID</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200">Seller</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200">Amount</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200">Status</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${dummyData.withdrawals.map(wr => `
                <tr class="border-b border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-600">
                  <td class="px-6 py-4 text-gray-700 dark:text-gray-300">${wr.id}</td>
                  <td class="px-6 py-4 text-gray-700 dark:text-gray-300">${wr.seller}</td>
                  <td class="px-6 py-4 font-semibold text-gray-900 dark:text-white">₦${wr.amount.toFixed(2)}</td>
                  <td class="px-6 py-4">
                    <span class="px-3 py-1 rounded-full text-xs font-semibold ${
                      wr.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      wr.status === 'Approved' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }">${wr.status}</span>
                  </td>
                  <td class="px-6 py-4">
                    ${wr.status === 'Pending' ? `<button onclick="approveWithdrawal('${wr.id}')" class="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Approve</button>` : '<span class="text-gray-500 text-xs">-</span>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  document.getElementById('content').innerHTML = html;
}

// Admin Users
function renderAdminUsers() {
  const html = `
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Admin Users</h1>
      
      <button onclick="openAddAdminUserModal()" class="mb-6 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">+ Add Admin User</button>

      <div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200">Name</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200">Email</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200">Role</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200">Status</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${dummyData.adminUsers.map(admin => `
              <tr class="border-b border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-600">
                <td class="px-6 py-4 text-gray-700 dark:text-gray-300">${admin.name}</td>
                <td class="px-6 py-4 text-gray-700 dark:text-gray-300">${admin.email}</td>
                <td class="px-6 py-4 text-gray-700 dark:text-gray-300">${admin.role}</td>
                <td class="px-6 py-4"><span class="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">${admin.status}</span></td>
                <td class="px-6 py-4"><button onclick="openEditAdminUserModal('${admin.id}')" class="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Edit</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
  document.getElementById('content').innerHTML = html;
}

// Profile
function renderProfile() {
  const html = `
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">My Profile</h1>
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-3xl">
        <div class="flex items-center gap-6 mb-6">
          <img src="https://via.placeholder.com/96" alt="Admin avatar" class="w-24 h-24 rounded-full">
          <div>
            <p class="text-lg font-semibold text-gray-900 dark:text-white">Admin User</p>
            <p class="text-sm text-gray-600 dark:text-gray-300">admin@marketmix.com</p>
            <p class="text-sm text-gray-600 dark:text-gray-300">+1 (555) 123-4567</p>
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-gray-700 dark:text-gray-300 mb-1">Full name</label>
            <input class="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white" value="Admin User">
          </div>
          <div>
            <label class="block text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input class="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white" value="admin@marketmix.com">
          </div>
          <div class="flex gap-3">
            <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
            <button onclick="openPasswordModal()" class="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600">Change password</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('content').innerHTML = html;
}

// Settings
function renderSettings() {
  const html = `
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>
      
      <div class="space-y-6">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">General Settings</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-gray-700 dark:text-gray-300 mb-2">Site Name</label>
              <input type="text" value="MarketMix" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
            </div>
            <div>
              <label class="block text-gray-700 dark:text-gray-300 mb-2">Site Logo URL</label>
              <input type="text" value="https://marketmix.com/logo.png" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
            </div>
            <button onclick="showToast('Settings saved')" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Email Settings</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-gray-700 dark:text-gray-300 mb-2">SMTP Server</label>
              <input type="text" value="smtp.gmail.com" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
            </div>
            <div>
              <label class="block text-gray-700 dark:text-gray-300 mb-2">SMTP Port</label>
              <input type="text" value="587" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
            </div>
            <button onclick="showToast('Email settings saved')" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Gateway</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-gray-700 dark:text-gray-300 mb-2">Stripe Secret Key</label>
              <input type="password" value="sk_test_****" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
            </div>
            <button onclick="showToast('Payment settings saved')" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('content').innerHTML = html;
}

function renderDebtAdjustments() {
  const html = `
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Seller Debt & Adjustments</h1>
      <div class="mb-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Current Seller Debt</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400">Read-only admin view based on the existing seller debt and recovery records.</p>
          </div>
          <button onclick="loadPage('dashboard'); return false;" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Back to Dashboard</button>
        </div>
        <div id="debtAdjustmentsContainer">
          <p class="text-sm text-gray-500 dark:text-gray-400">Loading seller debt adjustments...</p>
        </div>
      </div>
    </div>
  `;

  document.getElementById('content').innerHTML = html;

  const container = document.getElementById('debtAdjustmentsContainer');
  if (!container) return;

  (async () => {
    try {
      const response = await fetch(`${ADMIN_API_BASE}/admin/seller-adjustments`, { headers: getAdminAuthHeaders() });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.message || 'Unable to load seller adjustments');
      }

      const adjustments = Array.isArray(body) ? body : body?.data?.adjustments || body?.adjustments || [];
      if (!adjustments.length) {
        container.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">No current seller debt adjustments found.</p>';
        return;
      }

      container.innerHTML = renderTable(['Seller', 'Store', 'Original Debt', 'Remaining Debt', 'Recovered', 'Status', 'Refund Case'], adjustments.map((item) => ({
        seller: item.seller_name || item.seller || 'Unknown Seller',
        store: item.store_name || '—',
        original_debt: formatCurrency(item.original_debt ?? item.original_amount ?? 0),
        remaining_debt: formatCurrency(item.remaining_debt ?? item.remaining_amount ?? 0),
        recovered: formatCurrency(item.recovered_amount ?? 0),
        status: item.status || 'active',
        refund_case: item.refund_case_id || item.refund_case || '—'
      })), [
        { label: 'View', callback: 'viewReturn' }
      ]);
    } catch (err) {
      console.error('[Connection 6B] Error loading debt adjustments:', err.message || err);
      container.innerHTML = '<p class="text-sm text-red-600 dark:text-red-400">Unable to load seller debt adjustments.</p>';
    }
  })();
}

// Returns & Refunds Management
function renderReturns() {
  const html = `
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Returns & Refunds</h1>
      
      <div class="mb-6 flex gap-4">
        <input type="text" id="returnSearch" placeholder="Search returns by Order ID or Buyer..." class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white">
        <select id="returnStatusFilter" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="denied">Denied</option>
          <option value="waiting_buyer_confirmation">Awaiting Buyer Confirmation</option>
          <option value="buyer_shipped_waiting_seller">Buyer shipped / Waiting for seller confirmation</option>
          <option value="seller_confirmed">Seller confirmed receipt / Refund Processing</option>
          <option value="resolved">Resolved</option>
          <option value="escalated">Escalated</option>
        </select>
        <button class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Export</button>
      </div>

      <div class="mb-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Adjustment Review</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400">Admin-only view for seller adjustments linked to refund cases.</p>
          </div>
        </div>
        <div id="adjustmentDashboard"></div>
      </div>

      <div id="returnTableContainer">
        ${renderTable(['ID', 'Buyer', 'Seller', 'Amount', 'Status', 'Date'], [], [
          { label: 'View', callback: 'viewReturn' }
        ])}
      </div>
    </div>
  `;
  document.getElementById('content').innerHTML = html;

  document.getElementById('returnSearch').addEventListener('input', () => {
    applyReturnFilters();
  });

  document.getElementById('returnStatusFilter').addEventListener('change', () => {
    applyReturnFilters();
  });

  // Load refund cases for the admin view
  if (typeof fetchAdminRefundCases === 'function') {
    fetchAdminRefundCases();
  }
}

// Marketplace Performance Period Selector
async function switchMarketplacePeriod(period) {
  // Update active button
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.classList.remove('bg-blue-600', 'text-white', 'hover:bg-blue-700');
    btn.classList.add('bg-gray-200', 'dark:bg-gray-700', 'text-gray-800', 'dark:text-gray-300', 'hover:bg-gray-300', 'dark:hover:bg-gray-600');
  });
  
  document.querySelector(`[data-period="${period}"]`)?.classList.add('bg-blue-600', 'text-white', 'hover:bg-blue-700');
  document.querySelector(`[data-period="${period}"]`)?.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-800', 'dark:text-gray-300', 'hover:bg-gray-300', 'dark:hover:bg-gray-600');
  
  // Show loading state in metric cards
  const metricsCards = document.querySelectorAll('.bg-gradient-to-br');
  if (metricsCards.length >= 4) {
    metricsCards[0].querySelector('p:nth-child(2)').textContent = '₦—';
    metricsCards[1].querySelector('p:nth-child(2)').textContent = '₦—';
    metricsCards[2].querySelector('p:nth-child(2)').textContent = '₦—';
    metricsCards[3].querySelector('p:nth-child(2)').textContent = '₦—';
  }
  
  try {
    // Fetch marketplace performance data from backend
    const periodParam = period === 'today' ? 'today' : period;
    const token = getAdminAuthToken();
    if (!token) {
      showToast('Authentication required. Please log in again.', 'error');
      return;
    }
    
    const response = await fetch(`${ADMIN_API_BASE}/admin/marketplace-performance?period=${periodParam}`, {
      method: 'GET',
      headers: getAdminAuthHeaders()
    });
    
    if (!response.ok) {
      console.error('[Connection 3A] Failed to fetch marketplace performance:', response.status, response.statusText);
      showToast('Failed to load marketplace performance data', 'error');
      return;
    }
    
    const result = await response.json();
    if (result.status !== 'success' || !result.data) {
      console.error('[Connection 3A] Invalid response format:', result);
      showToast('Invalid marketplace performance data received', 'error');
      return;
    }
    
    const { metrics, comparison } = result.data;
    const { grossSales, platformRevenue, refunds, sellerPayouts } = metrics;
    const { grossSalesPercentage, platformRevenuePercentage, refundRate, sellerPayoutPercentage } = comparison;
    
    // Update metric cards with real data
    if (metricsCards.length >= 4) {
      // Gross Sales
      const grossSalesValue = formatCurrency(grossSales);
      const grossSalesChange = grossSalesPercentage >= 0 ? `+${grossSalesPercentage.toFixed(1)}%` : `${grossSalesPercentage.toFixed(1)}%`;
      metricsCards[0].querySelector('p:nth-child(2)').textContent = grossSalesValue;
      const grossSalesSubtext = metricsCards[0].querySelector('p:nth-child(3)');
      if (grossSalesSubtext) {
        grossSalesSubtext.textContent = `${grossSalesChange} vs previous period`;
      }
      
      // Platform Revenue
      const revenueValue = formatCurrency(platformRevenue);
      const revenuePercent = platformRevenuePercentage ? `${platformRevenuePercentage.toFixed(1)}% of sales` : '— of sales';
      metricsCards[1].querySelector('p:nth-child(2)').textContent = revenueValue;
      const revenueSubtext = metricsCards[1].querySelector('p:nth-child(3)');
      if (revenueSubtext) {
        revenueSubtext.textContent = revenuePercent;
      }
      
      // Refunds
      const refundsValue = formatCurrency(refunds);
      const refundRateText = refundRate ? `${refundRate.toFixed(1)}% refund rate` : '— refund rate';
      metricsCards[2].querySelector('p:nth-child(2)').textContent = refundsValue;
      const refundsSubtext = metricsCards[2].querySelector('p:nth-child(3)');
      if (refundsSubtext) {
        refundsSubtext.textContent = refundRateText;
      }
      
      // Seller Payouts
      const payoutsValue = formatCurrency(sellerPayouts);
      const payoutsPercent = sellerPayoutPercentage ? `${sellerPayoutPercentage.toFixed(1)}% of sales` : '— of sales';
      metricsCards[3].querySelector('p:nth-child(2)').textContent = payoutsValue;
      const payoutsSubtext = metricsCards[3].querySelector('p:nth-child(3)');
      if (payoutsSubtext) {
        payoutsSubtext.textContent = payoutsPercent;
      }
    }
    
    // Update chart description
    const periodLabels = {
      today: 'Today\'s marketplace performance',
      '7days': 'Last 7 days marketplace performance',
      '7d': 'Last 7 days marketplace performance',
      '30days': 'Last 30 days marketplace performance',
      '30d': 'Last 30 days marketplace performance',
      '6months': 'Last 6 months marketplace performance',
      '6m': 'Last 6 months marketplace performance',
      '1year': 'Last 12 months marketplace performance',
      '1y': 'Last 12 months marketplace performance'
    };
    
    const description = document.getElementById('chartDescription');
    if (description) {
      description.textContent = periodLabels[period] || 'Marketplace performance';
    }
    
    // Regenerate chart with new data
    generateRevenueChart();
    
    console.log('[Connection 3A] Successfully loaded marketplace performance data for period:', period, metrics);
  } catch (error) {
    console.error('[Connection 3A] Error fetching marketplace performance:', error);
    showToast('Error loading marketplace performance data', 'error');
    
    // Show fallback — symbols
    if (metricsCards.length >= 4) {
      metricsCards[0].querySelector('p:nth-child(2)').textContent = '₦—';
      metricsCards[1].querySelector('p:nth-child(2)').textContent = '₦—';
      metricsCards[2].querySelector('p:nth-child(2)').textContent = '₦—';
      metricsCards[3].querySelector('p:nth-child(2)').textContent = '₦—';
    }
  }
}

async function viewReturn(id) {
  const returnRequest = adminRefundCases.find(r => r.id === id);
  if (!returnRequest) {
    showToast('Return request not found. Please refresh the list.', 'error');
    loadPage('returns');
    return;
  }
  const html = `
    <div>
      <button onclick="loadPage('returns')" class="mb-6 text-blue-600 dark:text-blue-400 hover:underline">← Back to Returns & Refunds</button>
      
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Return Request #${returnRequest.id}</h2>
        <p class="text-gray-600 dark:text-gray-400 mb-6">Order #${returnRequest.orderId}</p>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <!-- Return Information (Left) -->
          <div class="space-y-4">
            <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p class="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase mb-1">Product Name / Order ID</p>
              <p class="font-semibold text-gray-900 dark:text-white text-lg">${returnRequest.productName}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Order ID: ${returnRequest.orderId}</p>
              ${renderRefundSpecifications(returnRequest)}
            </div>
            
            <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p class="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase mb-1">Reason for Return</p>
              <p class="font-semibold text-gray-900 dark:text-white text-base">${returnRequest.reason}</p>
            </div>
            
            <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p class="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase mb-1">Additional Notes</p>
              <p class="text-gray-900 dark:text-white text-base">${returnRequest.notes}</p>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p class="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase mb-1">Buyer</p>
                <p class="font-semibold text-gray-900 dark:text-white">${returnRequest.buyer}</p>
              </div>
              <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p class="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase mb-1">Seller</p>
                <p class="font-semibold text-gray-900 dark:text-white">${returnRequest.seller}</p>
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p class="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase mb-1">Refund Amount</p>
                <p class="font-semibold text-gray-900 dark:text-white text-lg">${returnRequest.backendAmount ? formatRefundAmount(returnRequest.backendAmount) : returnRequest.amount}</p>
              </div>
              <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p class="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase mb-1">Status</p>
                <div class="font-semibold text-lg">${getRefundStatusBadgeMarkup(returnRequest)}</div>
              </div>
            </div>
          </div>
          
          <!-- Evidence / Return Details (Right) -->
          <div class="space-y-4">
            <div>
              <label class="block text-gray-700 dark:text-gray-300 font-semibold mb-3">Buyer Evidence</label>
              <div class="border border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-700 min-h-80 flex items-center justify-center overflow-hidden">
                ${renderRefundEvidence(returnRequest)}
              </div>
            </div>
            
            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p class="text-sm text-blue-900 dark:text-blue-200 font-semibold mb-3">Return Details</p>
              <p class="text-sm text-blue-800 dark:text-blue-300 mb-2"><span class="font-semibold">Return Date:</span> ${returnRequest.returnDate}</p>
              <p class="text-sm text-blue-800 dark:text-blue-300 mb-2"><span class="font-semibold">Request Date:</span> ${returnRequest.date}</p>
              <p class="text-sm text-blue-800 dark:text-blue-300 mb-2"><span class="font-semibold">Status:</span> ${getRefundStatusBadgeMarkup(returnRequest)}</p>
              <p class="text-sm text-blue-800 dark:text-blue-300"><span class="font-semibold">MarketMix Decision:</span> ${returnRequest.marketmixDecision ? (returnRequest.marketmixDecision === 'approved' ? 'Approved' : 'Denied') : 'Pending'}</p>
              ${returnRequest.marketmixReason ? `<p class="text-sm text-blue-800 dark:text-blue-300 mt-2"><span class="font-semibold">Decision Note:</span> ${returnRequest.marketmixReason}</p>` : ''}
              ${returnRequest.sellerReturnChoice ? `<p class="text-sm text-blue-800 dark:text-blue-300 mt-2"><span class="font-semibold">Seller Decision:</span> ${returnRequest.sellerReturnChoice === 'return_product' ? 'Return Product' : 'Returnless Refund'}</p>` : ''}
              ${returnRequest.sellerReturnChoice === 'return_product' ? `
                <div class="mt-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-white/70 dark:bg-slate-800/60 p-3">
                  <p class="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Buyer Return Shipment</p>
                  <p class="text-sm text-blue-800 dark:text-blue-300 mb-1"><span class="font-semibold">Status:</span> ${returnRequest.shippingStatus || 'Pending'}</p>
                  <p class="text-sm text-blue-800 dark:text-blue-300 mb-1"><span class="font-semibold">Courier:</span> ${returnRequest.courierName || '-'}</p>
                  <p class="text-sm text-blue-800 dark:text-blue-300 mb-1"><span class="font-semibold">Tracking Number:</span> ${returnRequest.trackingNumber || '-'}</p>
                  <p class="text-sm text-blue-800 dark:text-blue-300 mb-1"><span class="font-semibold">Shipped On:</span> ${returnRequest.shippedOn || '-'}</p>
                  <p class="text-sm text-blue-800 dark:text-blue-300 mb-1"><span class="font-semibold">Receipt:</span> ${renderShippingReceipt(returnRequest.receiptUrl)}</p>
                  <p class="text-sm text-blue-800 dark:text-blue-300"><span class="font-semibold">Notes:</span> ${returnRequest.shipmentNotes || '-'}</p>
                </div>
              ` : ''}
              
              <div class="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-slate-800/60 p-3">
                <p class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Refund Summary</p>
                ${getRefundSummaryMarkup(returnRequest)}
              </div>

              <div class="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-slate-800/60 p-3">
                <p class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Adjustment Review</p>
                <div id="adjustmentDetailPanel"></div>
              </div>

              <!-- Seller Receipt Confirmation -->
              <div class="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-slate-800/60 p-3">
                <p class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Seller Receipt Confirmation</p>
                ${returnRequest.returnReceived ? `
                  <p class="text-sm text-gray-700 dark:text-gray-300 mb-1">✔ Seller confirmed product received</p>
                  <p class="text-sm text-gray-700 dark:text-gray-300">Confirmed At: ${returnRequest.returnReceivedAt ? new Date(returnRequest.returnReceivedAt).toLocaleString() : '—'}</p>
                  <p class="text-sm text-gray-700 dark:text-gray-300 mt-2">MarketMix will now process the buyer's refund payment.</p>
                ` : `
                  <p class="text-sm text-gray-700 dark:text-gray-300">Waiting for seller to confirm receipt of the returned product.</p>
                `}
              </div>
            </div>
          </div>
        </div>
        
        <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
          <div class="flex gap-3 flex-wrap">
            ${['Escalated'].includes(returnRequest.status) || ['escalated'].includes(returnRequest.statusKey) ? `
              <button onclick="approveReturn('${returnRequest.id}')" class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center gap-2">
                <i class="fas fa-check"></i> Approve Refund
              </button>
              <button onclick="denyReturn('${returnRequest.id}')" class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold flex items-center gap-2">
                <i class="fas fa-times"></i> Deny Refund
              </button>
            ` : ''}
            <button onclick="openModal('Delete Return Request', 'Are you sure? This will delete the return request permanently.', () => { deleteReturn('${returnRequest.id}'); })" class="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold flex items-center gap-2">
              <i class="fas fa-trash"></i> Delete Request
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('content').innerHTML = html;

  try {
    const detailContainer = document.getElementById('adjustmentDetailPanel');
    if (detailContainer) {
      const response = await fetch(`${ADMIN_API_BASE}/admin/seller-adjustments?refundCaseId=${encodeURIComponent(returnRequest.id)}`, { headers: getAdminAuthHeaders() });
      const body = await response.json().catch(() => null);
      if (response.ok) {
        const adjustments = Array.isArray(body) ? body : body?.data?.adjustments || body?.adjustments || [];
        renderAdjustmentDashboard(detailContainer, adjustments);
      } else {
        detailContainer.innerHTML = '<p class="text-sm text-red-600 dark:text-red-400">Unable to load adjustment review.</p>';
      }
    }
  } catch (err) {
    const detailContainer = document.getElementById('adjustmentDetailPanel');
    if (detailContainer) {
      detailContainer.innerHTML = '<p class="text-sm text-red-600 dark:text-red-400">Unable to load adjustment review.</p>';
    }
  }
}
