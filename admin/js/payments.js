const paymentsData = [
  {
    id: 'TXN-10482',
    buyer: 'Aisha Yusuf',
    seller: 'Bright Cart',
    orderId: 'ORD-2084',
    amount: 184500,
    gateway: 'Stripe',
    method: 'Card',
    status: 'Paid',
    date: '2026-07-30',
    reference: 'pi_3M2A1wD6fGxQ4a',
    fee: 1845,
    earnings: 182655,
    notes: 'Payment captured successfully and settled to seller wallet.',
    timeline: ['complete', 'complete', 'complete', 'complete', 'complete', 'complete'],
    buyerInfo: { name: 'Aisha Yusuf', email: 'aisha@example.com', phone: '+234 813 222 1111' },
    sellerInfo: { name: 'Bright Cart', email: 'support@brightcart.com', phone: '+234 802 344 0990' }
  },
  {
    id: 'TXN-10483',
    buyer: 'Kazeem Bello',
    seller: 'Luxe House',
    orderId: 'ORD-2085',
    amount: 92500,
    gateway: 'Paystack',
    method: 'Bank Transfer',
    status: 'Pending',
    date: '2026-07-29',
    reference: 'psk_892011',
    fee: 925,
    earnings: 91575,
    notes: 'Awaiting payment authorization from the issuing bank.',
    timeline: ['complete', 'active', 'pending', 'pending', 'pending', 'pending'],
    buyerInfo: { name: 'Kazeem Bello', email: 'kazeem@example.com', phone: '+234 903 445 1200' },
    sellerInfo: { name: 'Luxe House', email: 'finance@luxehouse.com', phone: '+234 701 221 9000' }
  },
  {
    id: 'TXN-10484',
    buyer: 'Sola Ade',
    seller: 'Nexa Tech',
    orderId: 'ORD-2086',
    amount: 286000,
    gateway: 'Flutterwave',
    method: 'Card',
    status: 'Failed',
    date: '2026-07-28',
    reference: 'flw_883910',
    fee: 0,
    earnings: 0,
    notes: 'The transaction was declined due to an AVS mismatch.',
    timeline: ['complete', 'complete', 'failed', 'pending', 'pending', 'pending'],
    buyerInfo: { name: 'Sola Ade', email: 'sola@example.com', phone: '+234 810 400 9102' },
    sellerInfo: { name: 'Nexa Tech', email: 'ops@nexatech.com', phone: '+234 812 777 9911' }
  },
  {
    id: 'TXN-10485',
    buyer: 'Mina Raji',
    seller: 'Urban Wear',
    orderId: 'ORD-2087',
    amount: 67500,
    gateway: 'Crypto',
    method: 'Crypto',
    status: 'Refunded',
    date: '2026-07-27',
    reference: 'crypto_34821',
    fee: 675,
    earnings: 66825,
    notes: 'Buyer requested a refund after delivery delay. Funds were reversed.',
    timeline: ['complete', 'complete', 'complete', 'complete', 'complete', 'refunded'],
    buyerInfo: { name: 'Mina Raji', email: 'mina@example.com', phone: '+234 915 111 2211' },
    sellerInfo: { name: 'Urban Wear', email: 'billing@urbanwear.com', phone: '+234 805 908 2222' }
  },
  {
    id: 'TXN-10486',
    buyer: 'Tunde Okafor',
    seller: 'Trendset',
    orderId: 'ORD-2088',
    amount: 132400,
    gateway: 'Paystack',
    method: 'Wallet',
    status: 'Cancelled',
    date: '2026-07-26',
    reference: 'psk_775221',
    fee: 0,
    earnings: 0,
    notes: 'Order was cancelled before payment capture.',
    timeline: ['complete', 'cancelled', 'pending', 'pending', 'pending', 'pending'],
    buyerInfo: { name: 'Tunde Okafor', email: 'tunde@example.com', phone: '+234 906 241 7800' },
    sellerInfo: { name: 'Trendset', email: 'settlements@trendset.com', phone: '+234 700 111 0999' }
  },
  {
    id: 'TXN-10487',
    buyer: 'Grace Ibe',
    seller: 'Fresh Foods',
    orderId: 'ORD-2089',
    amount: 240000,
    gateway: 'Stripe',
    method: 'Card',
    status: 'Paid',
    date: '2026-07-25',
    reference: 'pi_3M2F4vD8uCqP9r',
    fee: 2400,
    earnings: 237600,
    notes: 'Payment completed and settlement queued for next business day.',
    timeline: ['complete', 'complete', 'complete', 'complete', 'active', 'pending'],
    buyerInfo: { name: 'Grace Ibe', email: 'grace@example.com', phone: '+234 812 900 3344' },
    sellerInfo: { name: 'Fresh Foods', email: 'pay@freshfoods.com', phone: '+234 803 555 1000' }
  },
  {
    id: 'TXN-10488',
    buyer: 'Daniel Cole',
    seller: 'Glow Skin',
    orderId: 'ORD-2090',
    amount: 158900,
    gateway: 'Flutterwave',
    method: 'Wallet',
    status: 'Paid',
    date: '2026-07-24',
    reference: 'flw_091244',
    fee: 1589,
    earnings: 157311,
    notes: 'Customer used wallet balance and payment completed instantly.',
    timeline: ['complete', 'complete', 'complete', 'complete', 'complete', 'complete'],
    buyerInfo: { name: 'Daniel Cole', email: 'daniel@example.com', phone: '+234 802 223 4455' },
    sellerInfo: { name: 'Glow Skin', email: 'support@glowskin.com', phone: '+234 814 777 4444' }
  },
  {
    id: 'TXN-10489',
    buyer: 'Nneka Okoro',
    seller: 'Home Craft',
    orderId: 'ORD-2091',
    amount: 84000,
    gateway: 'Stripe',
    method: 'Bank Transfer',
    status: 'Pending',
    date: '2026-07-23',
    reference: 'pi_3M3L1gZ8hV3r1s',
    fee: 840,
    earnings: 83160,
    notes: 'Awaiting confirmation from bank transfer settlement processor.',
    timeline: ['complete', 'active', 'pending', 'pending', 'pending', 'pending'],
    buyerInfo: { name: 'Nneka Okoro', email: 'nneka@example.com', phone: '+234 909 880 2233' },
    sellerInfo: { name: 'Home Craft', email: 'team@homecraft.com', phone: '+234 805 662 1188' }
  }
];

const gatewayData = [
  { name: 'Stripe', status: 'Healthy', successRate: '98.7%', transactions: '1,842', processingTime: '1.2s', health: 'good' },
  { name: 'Paystack', status: 'Stable', successRate: '96.3%', transactions: '1,149', processingTime: '1.6s', health: 'good' },
  { name: 'Flutterwave', status: 'Monitoring', successRate: '94.8%', transactions: '932', processingTime: '2.1s', health: 'medium' },
  { name: 'Crypto', status: 'Peak', successRate: '99.1%', transactions: '324', processingTime: '0.8s', health: 'good' }
];

const activityData = [
  { icon: 'fa-money-bill-wave', title: 'Buyer paid', description: 'Aisha Yusuf completed payment for ORD-2084', time: '8 mins ago' },
  { icon: 'fa-undo', title: 'Refund issued', description: 'Refund processed for TXN-10485', time: '22 mins ago' },
  { icon: 'fa-check-circle', title: 'Settlement completed', description: 'Settlement finalized for TXN-10482', time: '54 mins ago' },
  { icon: 'fa-exclamation-triangle', title: 'Failed payment', description: 'Payment for ORD-2086 was declined', time: '1 hr ago' },
  { icon: 'fa-shield-alt', title: 'Chargeback', description: 'Fraud review flagged a high-risk transaction', time: '2 hrs ago' }
];

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

function formatCurrency(value) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(value);
}

function getStatusClass(status) {
  return `status-${status.toLowerCase()}`;
}

function getStatusBadge(status) {
  const normalized = String(status || '').toLowerCase();
  const label = status || 'Pending';
  return `<span class="status-pill ${normalized === 'paid' ? 'status-paid' : normalized === 'pending' ? 'status-pending' : normalized === 'failed' ? 'status-failed' : normalized === 'refunded' ? 'status-refunded' : 'status-cancelled'}">${label}</span>`;
}

function renderSummaryCards() {
  const cards = [
    { title: 'Total Payments', value: '₦18,450,250', trend: '+12.4%', positive: true, accent: 'from-emerald-500 to-emerald-600' },
    { title: "Today's Payments", value: '₦920,000', trend: '+8.2%', positive: true, accent: 'from-blue-500 to-blue-600' },
    { title: 'Pending Payments', value: '43', trend: '6 awaiting review', positive: false, accent: 'from-amber-500 to-amber-600' },
    { title: 'Failed Payments', value: '12', trend: '2 critical', positive: false, accent: 'from-rose-500 to-rose-600' },
    { title: 'Refunded Payments', value: '₦340,000', trend: '+4.1%', positive: true, accent: 'from-cyan-500 to-cyan-600' },
    { title: 'Payment Gateways', value: '4 Active', trend: 'All online', positive: true, accent: 'from-violet-500 to-violet-600' }
  ];

  const container = document.getElementById('summaryCards');
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
      renderPayments();
    });
    return;
  }

  body.innerHTML = filtered.map((payment) => `
    <tr class="table-row bg-white hover:bg-slate-50">
      <td class="px-4 py-3 text-sm font-medium text-slate-900">${payment.id}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${payment.buyer}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${payment.seller}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${payment.orderId}</td>
      <td class="px-4 py-3 text-sm font-semibold text-slate-900">${formatCurrency(payment.amount)}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${payment.gateway}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${payment.method}</td>
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
  return paymentsData.filter((payment) => {
    const searchValue = state.filters.search.trim().toLowerCase();
    const matchesSearch = !searchValue || [payment.id, payment.buyer, payment.seller, payment.orderId, payment.gateway].join(' ').toLowerCase().includes(searchValue);
    const matchesStatus = state.filters.status === 'all' || payment.status === state.filters.status;
    const matchesMethod = state.filters.method === 'all' || payment.method === state.filters.method;
    const matchesGateway = state.filters.gateway === 'all' || payment.gateway === state.filters.gateway;
    const matchesDate = !state.filters.date || payment.date === state.filters.date;

    return matchesSearch && matchesStatus && matchesMethod && matchesGateway && matchesDate;
  });
}

function renderGatewayCards() {
  const container = document.getElementById('gatewayCards');
  container.innerHTML = gatewayData.map((gateway) => `
    <div class="gateway-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-semibold text-slate-900">${gateway.name}</h3>
          <p class="text-sm text-slate-500">${gateway.status}</p>
        </div>
        <span class="health-dot ${gateway.health === 'good' ? 'health-good' : gateway.health === 'medium' ? 'health-medium' : 'health-poor'}"></span>
      </div>
      <div class="mt-4 grid gap-3 text-sm text-slate-600">
        <div class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span>Success rate</span><strong class="text-slate-900">${gateway.successRate}</strong></div>
        <div class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span>Today's transactions</span><strong class="text-slate-900">${gateway.transactions}</strong></div>
        <div class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span>Processing time</span><strong class="text-slate-900">${gateway.processingTime}</strong></div>
      </div>
    </div>
  `).join('');
}

function renderFinanceSummary() {
  const container = document.getElementById('financeSummary');
  container.innerHTML = `
    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div class="flex items-center justify-between">
        <p class="text-sm text-slate-500">Marketplace Revenue</p>
        <span class="text-sm font-semibold text-emerald-600">+8.6%</span>
      </div>
      <p class="mt-2 text-2xl font-semibold text-slate-900">₦14.2M</p>
    </div>
    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div class="flex items-center justify-between">
        <p class="text-sm text-slate-500">Pending Settlements</p>
        <span class="text-sm font-semibold text-amber-600">11 pending</span>
      </div>
      <p class="mt-2 text-2xl font-semibold text-slate-900">₦2.3M</p>
    </div>
    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div class="flex items-center justify-between">
        <p class="text-sm text-slate-500">Total Withdrawals</p>
        <span class="text-sm font-semibold text-blue-600">₦8.7M</span>
      </div>
      <p class="mt-2 text-2xl font-semibold text-slate-900">₦8.7M</p>
    </div>
    <div class="grid gap-3 sm:grid-cols-2">
      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <p class="text-sm text-slate-500">Refund Ratio</p>
        <p class="mt-2 text-xl font-semibold text-slate-900">1.8%</p>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <p class="text-sm text-slate-500">Chargeback Ratio</p>
        <p class="mt-2 text-xl font-semibold text-slate-900">0.4%</p>
      </div>
    </div>
  `;
}

function renderActivityTimeline() {
  const container = document.getElementById('activityTimeline');
  container.innerHTML = activityData.map((item) => `
    <div class="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600"><i class="fas ${item.icon}"></i></div>
      <div class="flex-1">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-sm font-semibold text-slate-900">${item.title}</h3>
          <span class="text-xs text-slate-500">${item.time}</span>
        </div>
        <p class="mt-1 text-sm text-slate-600">${item.description}</p>
      </div>
    </div>
  `).join('');
}

function renderSkeletons() {
  const summaryContainer = document.getElementById('summaryCards');
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

  const tableBody = document.getElementById('paymentsTableBody');
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

function openPaymentModal(paymentId) {
  const payment = paymentsData.find((item) => item.id === paymentId);
  if (!payment) return;
  state.selectedPayment = payment;

  document.getElementById('modalTitle').textContent = `${payment.id} • ${payment.status}`;
  document.getElementById('modalOverview').innerHTML = `
    <div class="flex items-center justify-between rounded-xl bg-white px-3 py-2"><span>Transaction ID</span><strong>${payment.id}</strong></div>
    <div class="flex items-center justify-between rounded-xl bg-white px-3 py-2"><span>Order ID</span><strong>${payment.orderId}</strong></div>
    <div class="flex items-center justify-between rounded-xl bg-white px-3 py-2"><span>Payment Amount</span><strong>${formatCurrency(payment.amount)}</strong></div>
    <div class="flex items-center justify-between rounded-xl bg-white px-3 py-2"><span>Marketplace Fee</span><strong>${formatCurrency(payment.fee)}</strong></div>
    <div class="flex items-center justify-between rounded-xl bg-white px-3 py-2"><span>Seller Earnings</span><strong>${formatCurrency(payment.earnings)}</strong></div>
    <div class="flex items-center justify-between rounded-xl bg-white px-3 py-2"><span>Gateway</span><strong>${payment.gateway}</strong></div>
    <div class="flex items-center justify-between rounded-xl bg-white px-3 py-2"><span>Method</span><strong>${payment.method}</strong></div>
    <div class="flex items-center justify-between rounded-xl bg-white px-3 py-2"><span>Payment Reference</span><strong>${payment.reference}</strong></div>
    <div class="flex items-center justify-between rounded-xl bg-white px-3 py-2"><span>Date</span><strong>${new Date(payment.date).toLocaleDateString()}</strong></div>
    <div class="flex items-center justify-between rounded-xl bg-white px-3 py-2"><span>Status</span><strong>${getStatusBadge(payment.status)}</strong></div>
  `;
  document.getElementById('modalParties').innerHTML = `
    <div class="rounded-xl bg-white px-3 py-3"><p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Buyer</p><p class="mt-2 font-semibold text-slate-900">${payment.buyerInfo.name}</p><p class="text-sm text-slate-600">${payment.buyerInfo.email}</p><p class="text-sm text-slate-600">${payment.buyerInfo.phone}</p></div>
    <div class="rounded-xl bg-white px-3 py-3"><p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Seller</p><p class="mt-2 font-semibold text-slate-900">${payment.sellerInfo.name}</p><p class="text-sm text-slate-600">${payment.sellerInfo.email}</p><p class="text-sm text-slate-600">${payment.sellerInfo.phone}</p></div>
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

  document.getElementById('modalNotes').textContent = payment.notes;
  document.getElementById('paymentModal').classList.remove('hidden');
}

function closePaymentModal() {
  document.getElementById('paymentModal').classList.add('hidden');
}

function attachEvents() {
  document.getElementById('searchInput').addEventListener('input', (event) => {
    state.filters.search = event.target.value;
    renderPayments();
  });

  document.getElementById('statusFilter').addEventListener('change', (event) => {
    state.filters.status = event.target.value;
    renderPayments();
  });

  document.getElementById('methodFilter').addEventListener('change', (event) => {
    state.filters.method = event.target.value;
    renderPayments();
  });

  document.getElementById('gatewayFilter').addEventListener('change', (event) => {
    state.filters.gateway = event.target.value;
    renderPayments();
  });

  document.getElementById('dateRangeInput').addEventListener('change', (event) => {
    state.filters.date = event.target.value;
    renderPayments();
  });

  document.getElementById('refreshDataBtn').addEventListener('click', () => {
    renderSkeletons();
    setTimeout(() => {
      renderSummaryCards();
      renderPayments();
      renderGatewayCards();
      renderFinanceSummary();
      renderActivityTimeline();
    }, 800);
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

  document.getElementById('sidebarOverlay').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('active');
  });
}

window.addEventListener('DOMContentLoaded', () => {
  renderSkeletons();
  setTimeout(() => {
    renderSummaryCards();
    renderPayments();
    renderGatewayCards();
    renderFinanceSummary();
    renderActivityTimeline();
    attachEvents();
  }, 900);
});
