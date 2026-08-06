const withdrawalsState = {
  filters: {
    search: '',
    status: 'all',
    method: 'all',
    bank: 'all',
    country: 'all',
    currency: 'all',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: ''
  },
  selectedIds: new Set(),
  selectedWithdrawal: null
};

const withdrawalsData = [
  {
    id: 'WD-20314',
    seller: 'Fashion Pro',
    store: 'Fashion Pro',
    bank: 'Zenith Bank',
    accountName: 'Emeka David',
    amount: 145000,
    currency: 'NGN',
    requestedDate: '2026-07-28',
    processingDate: '2026-08-01',
    status: 'Pending',
    priority: 'High',
    paymentMethod: 'Bank Transfer',
    country: 'Nigeria',
    walletBalance: 415200,
    marketplaceFees: 7250,
    netAmount: 137750,
    rating: 4.8,
    bankVerification: 'Verified',
    identityVerification: 'Completed',
    notes: 'Waiting for account confirmation before approving payout.',
    approvals: { requested: '2026-07-28', reviewed: '2026-07-29', approved: '', paid: '', rejected: '' },
    attachments: ['bank-statement.pdf', 'seller-id.png'],
    previousWithdrawals: ['WD-20110 • ₦120,000 • Completed', 'WD-20256 • ₦85,000 • Completed'],
    recentOrders: ['ORD-8122 • ₦58,700 • Delivered', 'ORD-8149 • ₦42,300 • Shipped']
  },
  {
    id: 'WD-20315',
    seller: 'TechHub',
    store: 'TechHub',
    bank: 'Access Bank',
    accountName: 'Mike Johnson',
    amount: 278500,
    currency: 'NGN',
    requestedDate: '2026-07-27',
    processingDate: '2026-07-30',
    status: 'Under Review',
    priority: 'Medium',
    paymentMethod: 'Bank Transfer',
    country: 'Nigeria',
    walletBalance: 842000,
    marketplaceFees: 13925,
    netAmount: 264575,
    rating: 4.9,
    bankVerification: 'Pending',
    identityVerification: 'Completed',
    notes: 'Additional KYC documents have been requested for this seller.',
    approvals: { requested: '2026-07-27', reviewed: '2026-07-28', approved: '', paid: '', rejected: '' },
    attachments: ['kyc-documents.pdf'],
    previousWithdrawals: ['WD-20289 • ₦195,000 • Completed', 'WD-20290 • ₦104,500 • Completed'],
    recentOrders: ['ORD-8108 • ₦89,000 • Delivered', 'ORD-8121 • ₦76,400 • Delivered']
  },
  {
    id: 'WD-20316',
    seller: 'Home Craft',
    store: 'Home Craft',
    bank: 'GTBank',
    accountName: 'Nneka Okoro',
    amount: 68000,
    currency: 'NGN',
    requestedDate: '2026-07-25',
    processingDate: '2026-07-27',
    status: 'Approved',
    priority: 'Low',
    paymentMethod: 'Wallet',
    country: 'Nigeria',
    walletBalance: 56000,
    marketplaceFees: 3400,
    netAmount: 64600,
    rating: 4.5,
    bankVerification: 'Verified',
    identityVerification: 'Verified',
    notes: 'Ready for payout after bank fund clearance.',
    approvals: { requested: '2026-07-25', reviewed: '2026-07-26', approved: '2026-07-26', paid: '' },
    attachments: ['payment-approval.pdf'],
    previousWithdrawals: ['WD-20199 • ₦74,000 • Completed', 'WD-20222 • ₦62,500 • Completed'],
    recentOrders: ['ORD-8098 • ₦41,250 • Delivered', 'ORD-8102 • ₦29,300 • Delivered']
  },
  {
    id: 'WD-20317',
    seller: 'Bright Cart',
    store: 'Bright Cart',
    bank: 'First Bank',
    accountName: 'Aisha Yusuf',
    amount: 420000,
    currency: 'NGN',
    requestedDate: '2026-07-24',
    processingDate: '2026-07-26',
    status: 'Processing',
    priority: 'High',
    paymentMethod: 'Card',
    country: 'Nigeria',
    walletBalance: 315000,
    marketplaceFees: 21000,
    netAmount: 399000,
    rating: 4.7,
    bankVerification: 'Verified',
    identityVerification: 'Verified',
    notes: 'Funds are being authorised and transferred to the seller account.',
    approvals: { requested: '2026-07-24', reviewed: '2026-07-24', approved: '2026-07-25', paid: '' },
    attachments: ['transfer-receipt.pdf'],
    previousWithdrawals: ['WD-20205 • ₦297,000 • Completed', 'WD-20240 • ₦185,000 • Completed'],
    recentOrders: ['ORD-8115 • ₦124,500 • Delivered', 'ORD-8130 • ₦59,200 • Shipped']
  },
  {
    id: 'WD-20318',
    seller: 'Green Gadget',
    store: 'Green Gadget',
    bank: 'Zenith Bank',
    accountName: 'Tolani Adebayo',
    amount: 95000,
    currency: 'NGN',
    requestedDate: '2026-07-22',
    processingDate: '2026-07-24',
    status: 'Completed',
    priority: 'Medium',
    paymentMethod: 'Bank Transfer',
    country: 'Nigeria',
    walletBalance: 102000,
    marketplaceFees: 4750,
    netAmount: 90250,
    rating: 4.6,
    bankVerification: 'Verified',
    identityVerification: 'Verified',
    notes: 'Withdrawal completed successfully and paid out to seller.',
    approvals: { requested: '2026-07-22', reviewed: '2026-07-22', approved: '2026-07-23', paid: '2026-07-24' },
    attachments: ['payout-confirmation.pdf'],
    previousWithdrawals: ['WD-20210 • ₦78,500 • Completed', 'WD-20230 • ₦88,000 • Completed'],
    recentOrders: ['ORD-8077 • ₦34,900 • Delivered', 'ORD-8089 • ₦46,200 • Delivered']
  },
  {
    id: 'WD-20319',
    seller: 'Market Moments',
    store: 'Market Moments',
    bank: 'GTBank',
    accountName: 'Tunde Akin',
    amount: 78000,
    currency: 'NGN',
    requestedDate: '2026-07-21',
    processingDate: '2026-07-23',
    status: 'Rejected',
    priority: 'High',
    paymentMethod: 'Bank Transfer',
    country: 'Nigeria',
    walletBalance: 65000,
    marketplaceFees: 3900,
    netAmount: 74100,
    rating: 4.4,
    bankVerification: 'Pending',
    identityVerification: 'Verified',
    notes: 'Request rejected due to invalid bank account number.',
    approvals: { requested: '2026-07-21', reviewed: '2026-07-22', approved: '', paid: '', rejected: '2026-07-22' },
    attachments: ['bank-error-report.pdf'],
    previousWithdrawals: ['WD-20218 • ₦63,000 • Completed', 'WD-20260 • ₦69,800 • Completed'],
    recentOrders: ['ORD-8051 • ₦27,500 • Delivered', 'ORD-8055 • ₦31,700 • Delivered']
  },
  {
    id: 'WD-20320',
    seller: 'Glam Hub',
    store: 'Glam Hub',
    bank: 'Access Bank',
    accountName: 'Funke Ade',
    amount: 123500,
    currency: 'NGN',
    requestedDate: '2026-07-20',
    processingDate: '2026-07-21',
    status: 'Cancelled',
    priority: 'Low',
    paymentMethod: 'Wallet',
    country: 'Nigeria',
    walletBalance: 92000,
    marketplaceFees: 6175,
    netAmount: 117325,
    rating: 4.3,
    bankVerification: 'Verified',
    identityVerification: 'Verified',
    notes: 'Seller cancelled the withdrawal request before processing.',
    approvals: { requested: '2026-07-20', reviewed: '2026-07-20', approved: '', paid: '', rejected: '' },
    attachments: ['cancellation-note.pdf'],
    previousWithdrawals: ['WD-20235 • ₦101,000 • Completed', 'WD-20270 • ₦88,500 • Completed'],
    recentOrders: ['ORD-8033 • ₦53,400 • Delivered', 'ORD-8040 • ₦21,700 • Delivered']
  }
];

function formatCurrency(value, currency = 'NGN') {
  if (currency === 'NGN') {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}

function getStatusBadge(status) {
  const normalized = status?.toLowerCase?.() || 'pending';
  const classes = {
    pending: 'status-pending',
    'under review': 'status-under-review',
    approved: 'status-approved',
    processing: 'status-processing',
    completed: 'status-completed',
    rejected: 'status-rejected',
    cancelled: 'status-cancelled'
  };
  return `<span class="status-pill ${classes[normalized] || 'status-pending'}">${status}</span>`;
}

function getRowActions(withdrawal) {
  return [{ label: 'View', icon: 'fa-eye', action: 'view' }];
}

function renderSummaryCards() {
  const cards = [
    { title: 'Wallet Balance', value: formatCurrency(24580450), badge: '+8.4%', icon: 'fa-wallet', color: 'from-sky-500 to-blue-600' },
    { title: 'Pending Withdrawals', value: '18', badge: 'Awaiting Approval', icon: 'fa-clock', color: 'from-orange-500 to-amber-600' },
    { title: 'Approved Today', value: '12', badge: '', icon: 'fa-check-circle', color: 'from-emerald-500 to-emerald-600' },
    { title: 'Completed Payouts', value: formatCurrency(8450000), badge: '', icon: 'fa-money-bill-wave', color: 'from-emerald-500 to-teal-600' },
    { title: 'Rejected Requests', value: '6', badge: '', icon: 'fa-xmark-circle', color: 'from-rose-500 to-red-600' },
    { title: 'Average Processing Time', value: '1.8 Days', badge: '', icon: 'fa-chart-line', color: 'from-violet-500 to-purple-600' }
  ];

  const container = document.getElementById('summaryCards');
  container.innerHTML = cards.map((card) => `
    <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex min-h-[220px] flex-col justify-between min-w-0">
      <div class="flex items-center justify-between gap-3">
        <div class="rounded-2xl bg-gradient-to-br ${card.color} p-4 text-white shadow-sm"><i class="fas ${card.icon} text-lg"></i></div>
        <span class="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">${card.badge || 'Live'}</span>
      </div>
      <div class="mt-4 break-words">
        <p class="text-sm text-slate-500">${card.title}</p>
        <p class="mt-3 text-3xl font-semibold leading-tight text-slate-900">${card.value}</p>
      </div>
    </div>
  `).join('');
}

function filterWithdrawals() {
  return withdrawalsData.filter((item) => {
    const search = withdrawalsState.filters.search.trim().toLowerCase();
    const minAmount = Number(withdrawalsState.filters.minAmount || 0);
    const maxAmount = Number(withdrawalsState.filters.maxAmount || Infinity);
    const requestDate = new Date(item.requestedDate);
    const fromDate = withdrawalsState.filters.dateFrom ? new Date(withdrawalsState.filters.dateFrom) : null;
    const toDate = withdrawalsState.filters.dateTo ? new Date(withdrawalsState.filters.dateTo) : null;

    const matchesSearch = !search || [item.id, item.seller, item.store, item.bank, item.accountName].join(' ').toLowerCase().includes(search);
    const matchesStatus = withdrawalsState.filters.status === 'all' || item.status === withdrawalsState.filters.status;
    const matchesMethod = withdrawalsState.filters.method === 'all' || item.paymentMethod === withdrawalsState.filters.method;
    const matchesBank = withdrawalsState.filters.bank === 'all' || item.bank === withdrawalsState.filters.bank;
    const matchesCountry = withdrawalsState.filters.country === 'all' || item.country === withdrawalsState.filters.country;
    const matchesCurrency = withdrawalsState.filters.currency === 'all' || item.currency === withdrawalsState.filters.currency;
    const matchesMin = item.amount >= minAmount;
    const matchesMax = item.amount <= maxAmount;
    const matchesFrom = !fromDate || requestDate >= fromDate;
    const matchesTo = !toDate || requestDate <= toDate;

    return matchesSearch && matchesStatus && matchesMethod && matchesBank && matchesCountry && matchesCurrency && matchesMin && matchesMax && matchesFrom && matchesTo;
  });
}

function updateSelectionDisplay() {
  const count = withdrawalsState.selectedIds.size;
  document.getElementById('selectedCount').textContent = `${count} selected`;
}

function toggleSelection(withdrawalId) {
  if (withdrawalsState.selectedIds.has(withdrawalId)) {
    withdrawalsState.selectedIds.delete(withdrawalId);
  } else {
    withdrawalsState.selectedIds.add(withdrawalId);
  }
  updateSelectionDisplay();
}

function toggleSelectAll(checked) {
  const filtered = filterWithdrawals();
  if (checked) {
    filtered.forEach((item) => withdrawalsState.selectedIds.add(item.id));
  } else {
    filtered.forEach((item) => withdrawalsState.selectedIds.delete(item.id));
  }
  updateSelectionDisplay();
  renderWithdrawalsTable();
}

function renderWithdrawalsTable() {
  const body = document.getElementById('withdrawalsTableBody');
  const filtered = filterWithdrawals();

  if (!filtered.length) {
    body.innerHTML = `
      <tr>
        <td colspan="13" class="px-4 py-16 text-center">
          <div class="mx-auto flex max-w-sm flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14">
            <i class="fas fa-wallet text-4xl text-slate-400"></i>
            <h3 class="mt-5 text-xl font-semibold text-slate-900">No withdrawal requests found.</h3>
            <p class="mt-2 text-sm text-slate-500">Adjust your filters or refresh the queue to view payout requests.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = filtered.map((withdrawal) => {
    const actions = getRowActions(withdrawal);
    return `
      <tr class="table-row bg-white hover:bg-slate-50">
        <td class="px-4 py-3 text-sm text-slate-600"><input type="checkbox" class="row-checkbox h-4 w-4 text-blue-600" data-id="${withdrawal.id}" ${withdrawalsState.selectedIds.has(withdrawal.id) ? 'checked' : ''} /></td>
        <td class="px-4 py-3 text-sm font-medium text-slate-900">${withdrawal.id}</td>
        <td class="px-4 py-3 text-sm text-slate-600">${withdrawal.seller}</td>
        <td class="px-4 py-3 text-sm text-slate-600">${withdrawal.store}</td>
        <td class="px-4 py-3 text-sm text-slate-600">${withdrawal.bank}</td>
        <td class="px-4 py-3 text-sm text-slate-600">${withdrawal.accountName}</td>
        <td class="px-4 py-3 text-sm font-semibold text-slate-900">${formatCurrency(withdrawal.amount, withdrawal.currency)}</td>
        <td class="px-4 py-3 text-sm text-slate-600">${withdrawal.currency}</td>
        <td class="px-4 py-3 text-sm text-slate-600">${new Date(withdrawal.requestedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
        <td class="px-4 py-3 text-sm text-slate-600">${new Date(withdrawal.processingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
        <td class="px-4 py-3 text-sm">${getStatusBadge(withdrawal.status)}</td>
        <td class="px-4 py-3 text-sm text-slate-600">${withdrawal.priority}</td>
        <td class="px-4 py-3 text-sm">
          ${actions.map((action) => `<button type="button" class="action-button inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50" onclick="openWithdrawalDrawer('${withdrawal.id}')"><i class="fas ${action.icon}"></i>${action.label}</button>`).join('')}
        </td>
      </tr>
    `;
  }).join('');

  document.getElementById('selectAllRows').checked = filtered.every((item) => withdrawalsState.selectedIds.has(item.id));
}

function renderFinanceSummary() {
  const items = [
    { title: "Today's Withdrawals", value: formatCurrency(1125000) },
    { title: 'Weekly Withdrawals', value: formatCurrency(4870000) },
    { title: 'Monthly Withdrawals', value: formatCurrency(18250000) },
    { title: 'Average Withdrawal', value: formatCurrency(128500) },
    { title: 'Largest Withdrawal', value: formatCurrency(420000) },
    { title: 'Pending Balance', value: formatCurrency(2580000) },
    { title: 'Platform Revenue', value: formatCurrency(965000) },
    { title: 'Escrow Balance', value: formatCurrency(3500000) },
    { title: 'Top Seller by Withdrawal', value: 'TechHub' }
  ];

  document.getElementById('financeSummary').innerHTML = items.map((item) => `
    <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p class="text-sm text-slate-500">${item.title}</p>
      <p class="mt-2 text-xl font-semibold text-slate-900">${item.value}</p>
    </div>
  `).join('');
}

function renderRiskMonitoring() {
  const risks = [
    { label: 'Large Withdrawals', value: '4 active', tone: 'text-slate-900', badge: 'bg-blue-50 text-blue-600' },
    { label: 'Repeated Requests', value: '7 sellers', tone: 'text-slate-900', badge: 'bg-amber-50 text-amber-700' },
    { label: 'Bank Verification Pending', value: '3 accounts', tone: 'text-slate-900', badge: 'bg-slate-50 text-slate-600' },
    { label: 'High Risk Accounts', value: '2 flagged', tone: 'text-slate-900', badge: 'bg-rose-50 text-rose-700' },
    { label: 'Suspicious Activity', value: '1 review', tone: 'text-slate-900', badge: 'bg-violet-50 text-violet-700' }
  ];

  document.getElementById('riskMonitoring').innerHTML = risks.map((item) => `
    <div class="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div>
        <p class="text-sm font-semibold text-slate-900">${item.label}</p>
        <p class="mt-1 text-sm text-slate-500">${item.value}</p>
      </div>
      <span class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${item.badge}">${item.value.split(' ')[1] || 'status'}</span>
    </div>
  `).join('');
}

function renderActivityTimeline() {
  const events = [
    { time: '09:10 AM', title: 'Withdrawal approved', store: 'Fashion Pro', amount: formatCurrency(150000) },
    { time: '08:25 AM', title: 'Withdrawal rejected', store: 'TechHub', amount: 'Invalid bank account' },
    { time: '07:40 AM', title: 'Withdrawal completed', store: 'Bright Cart', amount: formatCurrency(420000) }
  ];

  document.getElementById('activityTimeline').innerHTML = events.map((event) => `
    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm font-semibold text-slate-900">${event.title}</p>
        <span class="text-xs uppercase tracking-[0.2em] text-slate-500">${event.time}</span>
      </div>
      <div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <p>${event.store}</p>
        <p class="font-semibold text-slate-900">${event.amount}</p>
      </div>
    </div>
  `).join('');
}


function resetFilters() {
  withdrawalsState.filters = {
    search: '',
    status: 'all',
    method: 'all',
    bank: 'all',
    country: 'all',
    currency: 'all',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: ''
  };
  document.getElementById('searchSeller').value = '';
  document.getElementById('statusFilter').value = 'all';
  document.getElementById('methodFilter').value = 'all';
  document.getElementById('bankFilter').value = 'all';
  document.getElementById('countryFilter').value = 'all';
  document.getElementById('currencyFilter').value = 'all';
  document.getElementById('dateFrom').value = '';
  document.getElementById('dateTo').value = '';
  document.getElementById('minAmount').value = '';
  document.getElementById('maxAmount').value = '';
  withdrawalsState.selectedIds.clear();
  updateSelectionDisplay();
  renderWithdrawalsTable();
}

function openWithdrawalDrawer(withdrawalId) {
  const withdrawal = withdrawalsData.find((item) => item.id === withdrawalId);
  if (!withdrawal) return;
  withdrawalsState.selectedWithdrawal = withdrawal;

  const drawerEl = document.getElementById('withdrawalDrawer');
  const titleEl = document.getElementById('drawerTitle');
  const subtitleEl = document.getElementById('drawerSubtitle');

  if (!drawerEl) {
    console.warn('openWithdrawalDrawer: drawer element (#withdrawalDrawer) not found in DOM');
    return;
  }

  if (titleEl) titleEl.textContent = `${withdrawal.id} • ${withdrawal.status}`;
  else console.warn('openWithdrawalDrawer: #drawerTitle not found');

  if (subtitleEl) subtitleEl.textContent = `${withdrawal.store} payout request`;
  else console.warn('openWithdrawalDrawer: #drawerSubtitle not found');
  const sellerInfoEl = document.getElementById('drawerSellerInfo');
  if (sellerInfoEl) sellerInfoEl.innerHTML = `
    <div class="rounded-2xl bg-white p-3 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Seller</p>
      <p class="mt-2 font-semibold text-slate-900">${withdrawal.seller}</p>
      <p class="text-sm text-slate-600">${withdrawal.store}</p>
      <p class="text-sm text-slate-600">Rating • ${withdrawal.rating} / 5.0</p>
    </div>
    <div class="rounded-2xl bg-white p-3 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Store</p>
      <p class="mt-2 font-semibold text-slate-900">${withdrawal.store}</p>
      <p class="text-sm text-slate-600">${withdrawal.country}</p>
    </div>
  `;
  else console.warn('openWithdrawalDrawer: #drawerSellerInfo not found');

  const bankInfoEl = document.getElementById('drawerBankInfo');
  if (bankInfoEl) bankInfoEl.innerHTML = `
    <div class="rounded-2xl bg-white p-3 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Bank</p>
      <p class="mt-2 font-semibold text-slate-900">${withdrawal.bank}</p>
      <p class="text-sm text-slate-600">${withdrawal.accountName}</p>
      <p class="text-sm text-slate-600">${withdrawal.paymentMethod}</p>
    </div>
  `;
  else console.warn('openWithdrawalDrawer: #drawerBankInfo not found');

  const verificationEl = document.getElementById('drawerVerification');
  if (verificationEl) verificationEl.innerHTML = `
    <div class="rounded-2xl bg-white p-3 shadow-sm">
      <p class="text-sm font-semibold text-slate-900">Identity Verification</p>
      <p class="mt-2 text-sm text-slate-600">${withdrawal.identityVerification}</p>
    </div>
    <div class="rounded-2xl bg-white p-3 shadow-sm">
      <p class="text-sm font-semibold text-slate-900">Bank Verification</p>
      <p class="mt-2 text-sm text-slate-600">${withdrawal.bankVerification}</p>
    </div>
  `;
  else console.warn('openWithdrawalDrawer: #drawerVerification not found');

  const amountsEl = document.getElementById('drawerAmounts');
  if (amountsEl) amountsEl.innerHTML = `
    <div class="rounded-2xl bg-slate-50 p-3">
      <div class="flex items-center justify-between text-sm text-slate-500"><span>Requested Amount</span><strong>${formatCurrency(withdrawal.amount, withdrawal.currency)}</strong></div>
    </div>
    <div class="rounded-2xl bg-slate-50 p-3">
      <div class="flex items-center justify-between text-sm text-slate-500"><span>Marketplace Fees</span><strong>${formatCurrency(withdrawal.marketplaceFees, withdrawal.currency)}</strong></div>
    </div>
    <div class="rounded-2xl bg-slate-50 p-3">
      <div class="flex items-center justify-between text-sm text-slate-500"><span>Net Amount</span><strong>${formatCurrency(withdrawal.netAmount, withdrawal.currency)}</strong></div>
    </div>
    <div class="rounded-2xl bg-slate-50 p-3">
      <div class="flex items-center justify-between text-sm text-slate-500"><span>Wallet Balance</span><strong>${formatCurrency(withdrawal.walletBalance, withdrawal.currency)}</strong></div>
    </div>
  `;
  else console.warn('openWithdrawalDrawer: #drawerAmounts not found');

  const timelineEl = document.getElementById('drawerTimeline');
  if (timelineEl) timelineEl.innerHTML = `
    <div class="rounded-2xl bg-white p-3 shadow-sm">
      <p class="text-sm font-semibold text-slate-900">Requested</p>
      <p class="mt-2 text-sm text-slate-600">${withdrawal.approvals.requested}</p>
    </div>
    <div class="rounded-2xl bg-white p-3 shadow-sm">
      <p class="text-sm font-semibold text-slate-900">Reviewed</p>
      <p class="mt-2 text-sm text-slate-600">${withdrawal.approvals.reviewed}</p>
    </div>
    <div class="rounded-2xl bg-white p-3 shadow-sm">
      <p class="text-sm font-semibold text-slate-900">Approved</p>
      <p class="mt-2 text-sm text-slate-600">${withdrawal.approvals.approved || 'Pending'}</p>
    </div>
    <div class="rounded-2xl bg-white p-3 shadow-sm">
      <p class="text-sm font-semibold text-slate-900">Paid</p>
      <p class="mt-2 text-sm text-slate-600">${withdrawal.approvals.paid || 'Pending'}</p>
    </div>
    <div class="rounded-2xl bg-white p-3 shadow-sm">
      <p class="text-sm font-semibold text-slate-900">Rejected</p>
      <p class="mt-2 text-sm text-slate-600">${withdrawal.approvals.rejected || 'None'}</p>
    </div>
  `;
  else console.warn('openWithdrawalDrawer: #drawerTimeline not found');

  const notesEl = document.getElementById('drawerNotes');
  if (notesEl) notesEl.textContent = withdrawal.notes;
  else console.warn('openWithdrawalDrawer: #drawerNotes not found');

  const attachmentsEl = document.getElementById('drawerAttachments');
  if (attachmentsEl) attachmentsEl.innerHTML = withdrawal.attachments.map((attachment) => `
    <div class="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div class="flex items-center gap-3">
        <i class="fas fa-paperclip text-slate-500"></i>
        <div>
          <p class="text-sm font-semibold text-slate-900">${attachment}</p>
          <p class="text-xs text-slate-500">Download file</p>
        </div>
      </div>
      <button class="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"><i class="fas fa-download"></i></button>
    </div>
  `).join('');
  else console.warn('openWithdrawalDrawer: #drawerAttachments not found');

  drawerEl.classList.remove('hidden');
}

function closeWithdrawalDrawer() {
  document.getElementById('withdrawalDrawer').classList.add('hidden');
}

function handleRowAction(withdrawalId, action) {
  const withdrawal = withdrawalsData.find((item) => item.id === withdrawalId);
  if (!withdrawal) return;
  switch (action) {
    case 'view':
      openWithdrawalDrawer(withdrawalId);
      break;
    case 'approve':
      showToast(`Withdrawal ${withdrawalId} approved`);
      break;
    case 'reject':
      showToast(`Withdrawal ${withdrawalId} rejected`);
      break;
    case 'hold':
      showToast(`Withdrawal ${withdrawalId} placed on hold`);
      break;
    case 'processing':
      showToast(`Withdrawal ${withdrawalId} marked processing`);
      break;
    case 'completed':
      showToast(`Withdrawal ${withdrawalId} marked completed`);
      break;
    case 'download':
      showToast(`Downloading receipt for ${withdrawalId}`);
      break;
  }
}

function handleBulkAction(action) {
  const selected = Array.from(withdrawalsState.selectedIds);
  if (!selected.length) {
    showToast('No rows selected', 'error');
    return;
  }
  showToast(`${action} ${selected.length} selected withdrawal${selected.length > 1 ? 's' : ''}`);
}

function renderSkeletons() {
  const summaryContainer = document.getElementById('summaryCards');
  const tableBody = document.getElementById('withdrawalsTableBody');
  const financeSummary = document.getElementById('financeSummary');
  const riskMonitoring = document.getElementById('riskMonitoring');
  const activityTimeline = document.getElementById('activityTimeline');

  summaryContainer.innerHTML = Array.from({ length: 6 }).map(() => `
    <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="mb-4 flex items-center justify-between">
        <div class="skeleton h-10 w-10"></div>
        <div class="skeleton h-7 w-16 rounded-full"></div>
      </div>
      <div class="skeleton h-4 w-24"></div>
      <div class="mt-3 skeleton h-8 w-28"></div>
    </div>
  `).join('');

  tableBody.innerHTML = Array.from({ length: 5 }).map(() => `
    <tr>
      ${Array.from({ length: 13 }).map(() => `<td class="px-4 py-4"><div class="skeleton h-5 w-full"></div></td>`).join('')}
    </tr>
  `).join('');

  financeSummary.innerHTML = Array.from({ length: 4 }).map(() => `
    <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div class="skeleton h-4 w-32"></div>
      <div class="mt-3 skeleton h-6 w-24"></div>
    </div>
  `).join('');

  riskMonitoring.innerHTML = Array.from({ length: 3 }).map(() => `
    <div class="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <div class="skeleton h-4 w-32"></div>
      <div class="mt-3 skeleton h-4 w-20"></div>
    </div>
  `).join('');

  activityTimeline.innerHTML = Array.from({ length: 3 }).map(() => `
    <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div class="skeleton h-4 w-40"></div>
      <div class="mt-3 skeleton h-4 w-28"></div>
    </div>
  `).join('');
}

function bindTableEvents() {
  document.querySelectorAll('.row-checkbox').forEach((checkbox) => {
    checkbox.addEventListener('change', (event) => {
      toggleSelection(event.target.dataset.id);
      renderWithdrawalsTable();
    });
  });

  document.querySelectorAll('.action-button').forEach((button) => {
    button.addEventListener('click', () => handleRowAction(button.dataset.id, button.dataset.action));
  });
}

function attachEvents() {
  document.getElementById('searchSeller').addEventListener('input', (event) => {
    withdrawalsState.filters.search = event.target.value;
    renderWithdrawalsTable();
  });

  document.getElementById('statusFilter').addEventListener('change', (event) => {
    withdrawalsState.filters.status = event.target.value;
    renderWithdrawalsTable();
  });

  document.getElementById('methodFilter').addEventListener('change', (event) => {
    withdrawalsState.filters.method = event.target.value;
    renderWithdrawalsTable();
  });

  document.getElementById('bankFilter').addEventListener('change', (event) => {
    withdrawalsState.filters.bank = event.target.value;
    renderWithdrawalsTable();
  });

  document.getElementById('countryFilter').addEventListener('change', (event) => {
    withdrawalsState.filters.country = event.target.value;
    renderWithdrawalsTable();
  });

  document.getElementById('currencyFilter').addEventListener('change', (event) => {
    withdrawalsState.filters.currency = event.target.value;
    renderWithdrawalsTable();
  });

  document.getElementById('dateFrom').addEventListener('change', (event) => {
    withdrawalsState.filters.dateFrom = event.target.value;
    renderWithdrawalsTable();
  });

  document.getElementById('dateTo').addEventListener('change', (event) => {
    withdrawalsState.filters.dateTo = event.target.value;
    renderWithdrawalsTable();
  });

  document.getElementById('minAmount').addEventListener('input', (event) => {
    withdrawalsState.filters.minAmount = event.target.value;
    renderWithdrawalsTable();
  });

  document.getElementById('maxAmount').addEventListener('input', (event) => {
    withdrawalsState.filters.maxAmount = event.target.value;
    renderWithdrawalsTable();
  });

  document.getElementById('resetFiltersBtn').addEventListener('click', resetFilters);
  document.getElementById('refreshDataBtn').addEventListener('click', () => {
    renderSkeletons();
    setTimeout(() => {
      renderSummaryCards();
      renderWithdrawalsTable();
      renderFinanceSummary();
      renderRiskMonitoring();
      renderActivityTimeline();
    }, 700);
  });

  document.getElementById('exportBtn').addEventListener('click', () => {
    const csv = [
      ['Withdrawal ID', 'Seller', 'Store', 'Bank', 'Amount', 'Currency', 'Status', 'Requested Date', 'Processing Date']
    ].concat(filterWithdrawals().map((item) => [item.id, item.seller, item.store, item.bank, item.amount, item.currency, item.status, item.requestedDate, item.processingDate]));
    const csvText = csv.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'withdrawals-export.csv';
    link.click();
  });

  document.getElementById('bulkApproveBtn').addEventListener('click', () => handleBulkAction('Approving'));
  document.getElementById('approveSelectedBtn').addEventListener('click', () => handleBulkAction('Approving'));
  document.getElementById('rejectSelectedBtn').addEventListener('click', () => handleBulkAction('Rejecting'));
  document.getElementById('exportSelectedBtn').addEventListener('click', () => handleBulkAction('Exporting'));
  document.getElementById('markProcessingBtn').addEventListener('click', () => handleBulkAction('Processing'));
  document.getElementById('downloadCsvBtn').addEventListener('click', () => {
    const selected = Array.from(withdrawalsState.selectedIds);
    if (!selected.length) return showToast('No rows selected', 'error');
    const rows = withdrawalsData.filter((item) => selected.includes(item.id));
    const csv = [
      ['Withdrawal ID', 'Seller', 'Amount', 'Status']
    ].concat(rows.map((item) => [item.id, item.seller, item.amount, item.status]));
    const csvText = csv.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'withdrawals-selected.csv';
    link.click();
  });

  const selectAllRows = document.getElementById('selectAllRows');
  if (selectAllRows) {
    selectAllRows.addEventListener('change', (event) => toggleSelectAll(event.target.checked));
  }

  const withdrawalsTableBody = document.getElementById('withdrawalsTableBody');
  if (withdrawalsTableBody) {
    withdrawalsTableBody.addEventListener('click', (event) => {
      const button = event.target.closest('.action-button');
      if (button) {
        const action = button.dataset.action || 'view';
        if (action === 'view') {
          openWithdrawalDrawer(button.dataset.id);
        } else {
          handleRowAction(button.dataset.id, action);
        }
      }
      const checkbox = event.target.closest('.row-checkbox');
      if (checkbox) {
        toggleSelection(checkbox.dataset.id);
        renderWithdrawalsTable();
      }
    });
  }

  document.querySelectorAll('[data-close-drawer]').forEach((element) => {
    element.addEventListener('click', closeWithdrawalDrawer);
  });

  const drawerApproveBtn = document.getElementById('drawerApproveBtn');
  const drawerRejectBtn = document.getElementById('drawerRejectBtn');
  const drawerHoldBtn = document.getElementById('drawerHoldBtn');

  if (drawerApproveBtn) {
    drawerApproveBtn.addEventListener('click', () => {
      if (!withdrawalsState.selectedWithdrawal) return;
      showToast(`Withdrawal ${withdrawalsState.selectedWithdrawal.id} approved`);
      closeWithdrawalDrawer();
    });
  }

  if (drawerRejectBtn) {
    drawerRejectBtn.addEventListener('click', () => {
      if (!withdrawalsState.selectedWithdrawal) return;
      showToast(`Withdrawal ${withdrawalsState.selectedWithdrawal.id} rejected`);
      closeWithdrawalDrawer();
    });
  }

  if (drawerHoldBtn) {
    drawerHoldBtn.addEventListener('click', () => {
      if (!withdrawalsState.selectedWithdrawal) return;
      showToast(`Withdrawal ${withdrawalsState.selectedWithdrawal.id} placed on hold`);
      closeWithdrawalDrawer();
    });
  }
}

function initializeWithdrawalsPage() {
  const required = ['summaryCards', 'withdrawalsTableBody', 'financeSummary', 'riskMonitoring', 'activityTimeline'];
  const ready = required.every((id) => document.getElementById(id));
  if (!ready) {
    setTimeout(initializeWithdrawalsPage, 120);
    return;
  }

  if (!window.__withdrawalsInitialized) {
    window.__withdrawalsInitialized = true;
    renderSkeletons();
    setTimeout(() => {
      renderSummaryCards();
      renderWithdrawalsTable();
      renderFinanceSummary();
      renderRiskMonitoring();
      renderActivityTimeline();
      attachEvents();
    }, 800);
    return;
  }

  renderSummaryCards();
  renderWithdrawalsTable();
  renderFinanceSummary();
  renderRiskMonitoring();
  renderActivityTimeline();
  attachEvents();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initializeWithdrawalsPage);
} else {
  initializeWithdrawalsPage();
}

window.initializeWithdrawalsPage = initializeWithdrawalsPage;
