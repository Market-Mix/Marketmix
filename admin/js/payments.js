(function () {
  let paymentsData = [];
  let stats = {};
  let overview = {};
  let total = 0;
  const API = `${window.ADMIN_API_BASE || 'https://marketmix-backend.onrender.com/api'}/admin/payments`;

  const state = {
    selectedPayment: null,
    filters: {
      search: '',
      status: 'all',
      method: 'all',
      gateway: 'all',
      date: ''
    }
  };

  async function api(path = '') {
    const r = await fetch(API + path, { headers: getAdminAuthHeaders() });
    const b = await r.json().catch(() => null);
    if (!r.ok) throw new Error(b?.message || 'Request failed');
    return b.data;
  }

  async function loadPayments() {
    const f = state.filters;
    const q = new URLSearchParams({ status: f.status, method: f.method, gateway: f.gateway, limit: 50 });
    if (f.search) q.set('search', f.search);
    if (f.date) q.set('date', f.date);
    try {
      const d = await api('?' + q);
      paymentsData = d.payments || [];
      stats = d.stats || {};
      total = d.total || 0;
      renderSummaryCards();
      renderPayments();
      const c = document.getElementById('paymentsCount');
      if (c) c.textContent = `${total} transactions`;
    } catch (e) { showToast(e.message, 'error'); }
  }

  let _t;
  const reload = () => { clearTimeout(_t); _t = setTimeout(loadPayments, 300); };

  async function loadOverview() {
    try {
      overview = await api('/overview');
      renderGatewayCards();
      renderFinanceSummary();
      renderActivityTimeline();
    } catch (e) { showToast(e.message, 'error'); }
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  function getStatusClass(status) {
    return `status-${String(status || '').toLowerCase()}`;
  }

  function getStatusBadge(status) {
    const normalized = String(status || '').toLowerCase();
    const label = status || 'Pending';
    return `<span class="status-pill ${normalized === 'paid' ? 'status-paid' : normalized === 'pending' ? 'status-pending' : normalized === 'failed' ? 'status-failed' : normalized === 'refunded' ? 'status-refunded' : 'status-cancelled'}">${label}</span>`;
  }

  function renderSummaryCards() {
    const cards = [
      { title: 'Total Payments', value: formatCurrency(stats.total || 0), trend: 'All time', positive: true, accent: 'from-emerald-500 to-emerald-600' },
      { title: "Today's Payments", value: formatCurrency(stats.today || 0), trend: 'Today', positive: true, accent: 'from-blue-500 to-blue-600' },
      { title: 'Pending Payments', value: stats.pending ?? 0, trend: 'Awaiting', positive: false, accent: 'from-amber-500 to-amber-600' },
      { title: 'Failed Payments', value: stats.failed ?? 0, trend: 'Needs review', positive: false, accent: 'from-rose-500 to-rose-600' },
      { title: 'Refunded Payments', value: formatCurrency(stats.refunded || 0), trend: 'Refunded', positive: true, accent: 'from-cyan-500 to-cyan-600' },
      { title: 'Payment Gateways', value: `${(overview.gateways || []).length} Active`, trend: 'Live', positive: true, accent: 'from-violet-500 to-violet-600' }
    ];

    const container = document.getElementById('summaryCards');
    if (!container) return;
    container.innerHTML = cards.map((card) => `
      <div class="metric-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <div class="rounded-xl bg-gradient-to-br ${card.accent} px-3 py-2 text-white shadow-sm">
            <i class="fa-solid ${card.title.includes('Gateways') ? 'fa-plug' : card.title.includes('Refunded') ? 'fa-rotate-left' : card.title.includes('Failed') ? 'fa-times-circle' : card.title.includes('Pending') ? 'fa-hourglass-half' : card.title.includes("Today's") ? 'fa-calendar-day' : 'fa-wallet'}"></i>
          </div>
          <span class="rounded-full ${card.positive ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-700'} px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">${card.trend}</span>
        </div>
        <p class="text-sm text-slate-500">${card.title}</p>
        <p class="mt-2 text-2xl font-semibold text-slate-900">${card.value}</p>
      </div>
    `).join('');
  }

  function renderPayments() {
    const body = document.getElementById('paymentsTableBody');
    if (!body) return;
    const filtered = getFilteredPayments();

    if (!filtered.length) {
      body.innerHTML = `
        <tr>
          <td colspan="10" class="px-4 py-16 text-center">
            <div class="mx-auto flex max-w-sm flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10">
              <i class="fas fa-search text-3xl text-slate-400"></i>
              <h3 class="mt-4 text-lg font-semibold text-slate-800">No payments found</h3>
              <p class="mt-2 text-sm text-slate-500">Try changing your filters or resetting the search.</p>
              <button id="resetFiltersBtn" class="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white">Reset Filters</button>
            </div>
          </td>
        </tr>
      `;
      document.getElementById('resetFiltersBtn')?.addEventListener('click', () => {
        state.filters = { search: '', status: 'all', method: 'all', gateway: 'all', date: '' };
        document.getElementById('searchInput').value = '';
        document.getElementById('statusFilter').value = 'all';
        document.getElementById('methodFilter').value = 'all';
        document.getElementById('gatewayFilter').value = 'all';
        document.getElementById('dateRangeInput').value = '';
        loadPayments();
      });
      return;
    }

    body.innerHTML = filtered.map((payment) => `
      <tr class="table-row bg-white hover:bg-slate-50">
        <td class="px-4 py-3 text-sm font-medium text-slate-900">${payment.displayId || payment.id}</td>
        <td class="px-4 py-3 text-sm text-slate-600">${payment.buyer || payment.buyerName || '—'}</td>
        <td class="px-4 py-3 text-sm text-slate-600">${payment.seller || payment.sellerName || '—'}</td>
        <td class="px-4 py-3 text-sm text-slate-600">${payment.orderId || '—'}</td>
        <td class="px-4 py-3 text-sm font-semibold text-slate-900">${formatCurrency(payment.amount)}</td>
        <td class="px-4 py-3 text-sm text-slate-600">${payment.gateway || '—'}</td>
        <td class="px-4 py-3 text-sm text-slate-600">${payment.method || '—'}</td>
        <td class="px-4 py-3 text-sm">${getStatusBadge(payment.status)}</td>
        <td class="px-4 py-3 text-sm text-slate-600">${new Date(payment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
        <td class="px-4 py-3 text-sm">
          <button class="view-btn rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 transition hover:bg-slate-50" data-id="${payment.id}">
            <i class="fas fa-eye mr-2"></i>View
          </button>
        </td>
      </tr>
    `).join('');

    document.querySelectorAll('.view-btn').forEach((button) => {
      button.addEventListener('click', () => openPaymentModal(button.getAttribute('data-id')));
    });
  }

  function getFilteredPayments() {
    return paymentsData;
  }

  function renderGatewayCards() {
    const container = document.getElementById('gatewayCards');
    if (!container) return;
    container.innerHTML = (overview.gateways || []).map((gateway) => `
      <div class="gateway-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-slate-900">${gateway.name}</h3>
            <p class="text-sm text-slate-500">${gateway.status || 'Healthy'}</p>
          </div>
          <span class="health-dot ${gateway.health === 'good' ? 'health-good' : gateway.health === 'medium' ? 'health-medium' : 'health-poor'}"></span>
        </div>
        <div class="mt-4 grid gap-3 text-sm text-slate-600">
          <div class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span>Success rate</span><strong class="text-slate-900">${gateway.successRate || '—'}</strong></div>
          <div class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span>Today's transactions</span><strong class="text-slate-900">${gateway.transactions || '0'}</strong></div>
          <div class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span>Processing time</span><strong class="text-slate-900">${gateway.processingTime || '—'}</strong></div>
        </div>
      </div>
    `).join('');
  }

  function renderFinanceSummary() {
    const container = document.getElementById('financeSummary');
    if (!container) return;
    container.innerHTML = `
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div class="flex items-center justify-between">
          <p class="text-sm text-slate-500">Marketplace Revenue</p>
          <span class="text-sm font-semibold text-emerald-600">+8.6%</span>
        </div>
        <p class="mt-2 text-2xl font-semibold text-slate-900">${formatCurrency(overview.finance?.revenue || 0)}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div class="flex items-center justify-between">
          <p class="text-sm text-slate-500">Pending Settlements</p>
          <span class="text-sm font-semibold text-amber-600">${overview.finance?.pendingCount ?? 0} pending</span>
        </div>
        <p class="mt-2 text-2xl font-semibold text-slate-900">${formatCurrency(overview.finance?.pendingSettlements || 0)}</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div class="flex items-center justify-between">
          <p class="text-sm text-slate-500">Total Withdrawals</p>
          <span class="text-sm font-semibold text-blue-600">${formatCurrency(overview.finance?.withdrawals || 0)}</span>
        </div>
        <p class="mt-2 text-2xl font-semibold text-slate-900">${formatCurrency(overview.finance?.withdrawals || 0)}</p>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="rounded-2xl border border-slate-200 bg-white p-4">
          <p class="text-sm text-slate-500">Refund Ratio</p>
          <p class="mt-2 text-xl font-semibold text-slate-900">${overview.finance?.refundRatio ?? 0}%</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-white p-4">
          <p class="text-sm text-slate-500">Chargeback Ratio</p>
          <p class="mt-2 text-xl font-semibold text-slate-900">N/A</p>
        </div>
      </div>
    `;
  }

  function renderActivityTimeline() {
    const container = document.getElementById('activityTimeline');
    if (!container) return;
    container.innerHTML = (overview.activity || []).map((item) => `
      <div class="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600"><i class="fas ${item.icon || 'fa-money-bill-wave'}"></i></div>
        <div class="flex-1">
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-sm font-semibold text-slate-900">${item.title}</h3>
            <span class="text-xs text-slate-500">${new Date(item.time).toLocaleString()}</span>
          </div>
          <p class="mt-1 text-sm text-slate-600">${item.description}</p>
        </div>
      </div>
    `).join('');
  }

  function renderSkeletons() {
    const summaryContainer = document.getElementById('summaryCards');
    if (summaryContainer) {
      summaryContainer.innerHTML = Array.from({ length: 6 }).map(() => `
        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="mb-4 flex items-center justify-between">
            <div class="skeleton h-10 w-10"></div>
            <div class="skeleton h-7 w-16 rounded-full"></div>
          </div>
          <div class="skeleton h-4 w-24"></div>
          <div class="skeleton mt-3 h-8 w-28"></div>
        </div>
      `).join('');
    }

    const tableBody = document.getElementById('paymentsTableBody');
    if (tableBody) {
      tableBody.innerHTML = Array.from({ length: 5 }).map(() => `
        <tr>
          <td class="px-4 py-4"><div class="skeleton h-5 w-24"></div></td>
          <td class="px-4 py-4"><div class="skeleton h-5 w-24"></div></td>
          <td class="px-4 py-4"><div class="skeleton h-5 w-24"></div></td>
          <td class="px-4 py-4"><div class="skeleton h-5 w-24"></div></td>
          <td class="px-4 py-4"><div class="skeleton h-5 w-24"></div></td>
          <td class="px-4 py-4"><div class="skeleton h-5 w-24"></div></td>
          <td class="px-4 py-4"><div class="skeleton h-5 w-24"></div></td>
          <td class="px-4 py-4"><div class="skeleton h-5 w-24"></div></td>
          <td class="px-4 py-4"><div class="skeleton h-5 w-24"></div></td>
          <td class="px-4 py-4"><div class="skeleton h-5 w-24"></div></td>
        </tr>
      `).join('');
    }
  }

  async function openPaymentModal(paymentId) {
    let payment;
    try { payment = await api('/' + paymentId); } catch (e) { return showToast(e.message, 'error'); }
    state.selectedPayment = payment;

    document.getElementById('modalTitle').textContent = `${payment.displayId || payment.id} • ${payment.status}`;
    document.getElementById('modalOverview').innerHTML = `
      <div class="flex items-center justify-between rounded-xl bg-white px-3 py-2"><span>Transaction ID</span><strong>${payment.displayId || payment.id}</strong></div>
      <div class="flex items-center justify-between rounded-xl bg-white px-3 py-2"><span>Order ID</span><strong>${payment.orderId || '—'}</strong></div>
      <div class="flex items-center justify-between rounded-xl bg-white px-3 py-2"><span>Payment Amount</span><strong>${formatCurrency(payment.amount)}</strong></div>
      <div class="flex items-center justify-between rounded-xl bg-white px-3 py-2"><span>Marketplace Fee</span><strong>${formatCurrency(payment.fee || 0)}</strong></div>
      <div class="flex items-center justify-between rounded-xl bg-white px-3 py-2"><span>Seller Earnings</span><strong>${formatCurrency(payment.earnings || 0)}</strong></div>
      <div class="flex items-center justify-between rounded-xl bg-white px-3 py-2"><span>Gateway</span><strong>${payment.gateway || '—'}</strong></div>
      <div class="flex items-center justify-between rounded-xl bg-white px-3 py-2"><span>Method</span><strong>${payment.method || '—'}</strong></div>
      <div class="flex items-center justify-between rounded-xl bg-white px-3 py-2"><span>Payment Reference</span><strong>${payment.reference || '—'}</strong></div>
      <div class="flex items-center justify-between rounded-xl bg-white px-3 py-2"><span>Date</span><strong>${payment.date ? new Date(payment.date).toLocaleDateString() : '—'}</strong></div>
      <div class="flex items-center justify-between rounded-xl bg-white px-3 py-2"><span>Status</span><strong>${getStatusBadge(payment.status)}</strong></div>
    `;
    document.getElementById('modalParties').innerHTML = `
      <div class="rounded-xl bg-white px-3 py-3"><p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Buyer</p><p class="mt-2 font-semibold text-slate-900">${payment.buyerInfo?.name || payment.buyer || '—'}</p><p class="text-sm text-slate-600">${payment.buyerInfo?.email || '—'}</p><p class="text-sm text-slate-600">${payment.buyerInfo?.phone || '—'}</p></div>
      <div class="rounded-xl bg-white px-3 py-3"><p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Seller</p><p class="mt-2 font-semibold text-slate-900">${payment.sellerInfo?.name || payment.seller || '—'}</p><p class="text-sm text-slate-600">${payment.sellerInfo?.email || '—'}</p><p class="text-sm text-slate-600">${payment.sellerInfo?.phone || '—'}</p></div>
    `;

    const timelineLabels = ['Payment Created', 'Payment Authorized', 'Payment Captured', 'Order Confirmed', 'Settlement Pending', 'Settlement Completed'];
    const timelineSteps = payment.timeline || [];
    document.getElementById('modalTimeline').innerHTML = timelineLabels.map((label, index) => {
      const stateValue = timelineSteps[index] || 'pending';
      const dotClass = stateValue === 'complete' ? 'complete' : stateValue === 'active' ? 'active' : stateValue === 'failed' ? 'failed' : 'pending';
      const contentClass = stateValue === 'complete' ? 'text-slate-900' : stateValue === 'active' ? 'text-amber-700' : stateValue === 'failed' ? 'text-rose-700' : 'text-slate-500';
      const icon = stateValue === 'complete' ? '<i class="fas fa-check"></i>' : stateValue === 'active' ? '<i class="fas fa-spinner"></i>' : stateValue === 'failed' ? '<i class="fas fa-times"></i>' : '<i class="fas fa-clock"></i>';
      return `
        <div class="timeline-step">
          <div class="timeline-dot ${dotClass}">${stateValue === 'pending' ? '' : icon}</div>
          <div class="flex-1 rounded-xl bg-slate-50 px-3 py-2">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-semibold ${contentClass}">${label}</p>
              <span class="text-xs uppercase tracking-wide ${contentClass}">${stateValue}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    document.getElementById('modalNotes').textContent = payment.notes || 'No notes available.';
    document.getElementById('paymentModal').classList.remove('hidden');
  }

  function closePaymentModal() {
    document.getElementById('paymentModal').classList.add('hidden');
  }

  function attachEvents() {
    document.getElementById('searchInput').addEventListener('input', (event) => {
      state.filters.search = event.target.value;
      reload();
    });

    document.getElementById('statusFilter').addEventListener('change', (event) => {
      state.filters.status = event.target.value;
      reload();
    });

    document.getElementById('methodFilter').addEventListener('change', (event) => {
      state.filters.method = event.target.value;
      reload();
    });

    document.getElementById('gatewayFilter').addEventListener('change', (event) => {
      state.filters.gateway = event.target.value;
      reload();
    });

    document.getElementById('dateRangeInput').addEventListener('change', (event) => {
      state.filters.date = event.target.value;
      reload();
    });

    document.getElementById('refreshDataBtn').addEventListener('click', () => {
      renderSkeletons();
      loadPayments();
      loadOverview();
    });

    document.getElementById('exportBtn').addEventListener('click', () => {
      const payload = getFilteredPayments().map((payment) => `${payment.id},${payment.buyer},${payment.status},${payment.amount}`).join('\n');
      const blob = new Blob([`Transaction ID,Buyer,Status,Amount\n${payload}`], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'payments-export.csv';
      link.click();
    });

    document.querySelectorAll('[data-close-modal]').forEach((element) => {
      element.addEventListener('click', closePaymentModal);
    });

    document.getElementById('printBtn').addEventListener('click', () => window.print());
    document.getElementById('receiptBtn').addEventListener('click', () => {
      const payment = state.selectedPayment;
      if (!payment) return;
      const blob = new Blob([`Receipt for ${payment.id}\nAmount: ${formatCurrency(payment.amount)}\nStatus: ${payment.status}`], { type: 'text/plain;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${payment.id}-receipt.txt`;
      link.click();
    });

    document.getElementById('toggleSidebar')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
      document.getElementById('sidebarOverlay').classList.toggle('active');
    });

    document.getElementById('sidebarOverlay')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebarOverlay').classList.remove('active');
    });
  }

  async function initializePaymentsPage() {
    const requiredElements = ['summaryCards', 'paymentsTableBody', 'gatewayCards', 'financeSummary', 'activityTimeline'];
    const hasRequiredElements = requiredElements.every((id) => document.getElementById(id));

    if (!hasRequiredElements) {
      setTimeout(initializePaymentsPage, 120);
      return;
    }

    if (!window.__paymentsInitialized) {
      window.__paymentsInitialized = true;
    }

    renderSkeletons();
    await Promise.all([loadPayments(), loadOverview()]);
    renderSummaryCards();
    attachEvents();
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initializePaymentsPage);
  } else {
    initializePaymentsPage();
  }

  window.initializePaymentsPage = initializePaymentsPage;
})();
