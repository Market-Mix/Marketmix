(function() {
  const reviewsData = [
  {
    id: 'REV-1041',
    product: 'Galaxy S24 Ultra',
    productImage: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80',
    category: 'Phones',
    buyer: 'Aisha Yusuf',
    seller: 'Nexa Tech',
    rating: 5,
    review: 'The phone arrived earlier than expected and the camera quality is excellent. The packaging was premium and the seller communication was fantastic.',
    title: 'Excellent delivery and premium finish',
    status: 'Pending',
    reports: 2,
    created: '2026-08-01',
    orderId: 'ORD-3921',
    verified: true,
    device: 'iPhone 14 Pro',
    browser: 'Safari 17',
    ip: '192.168.0.42',
    store: 'Nexa Store',
    buyerEmail: 'aisha@example.com',
    sellerEmail: 'support@nexatech.com',
    adminNotes: 'Requires final review before publishing.',
    media: {
      images: ['https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=400&q=80'],
      videos: []
    },
    reportHistory: [
      { reporter: 'Admin Ops', reason: 'Spam', date: '2026-08-02', status: 'Under review' }
    ],
    history: [
      { event: 'Review Submitted', date: '2026-08-01', admin: 'System', status: 'Submitted' },
      { event: 'Assigned', date: '2026-08-01', admin: 'Mina', status: 'Queue' }
    ],
    timeline: [
      { event: 'Review Submitted', date: '2026-08-01', admin: 'System', status: 'Completed' },
      { event: 'Reported', date: '2026-08-02', admin: 'Ops', status: 'Active' },
      { event: 'Moderated', date: '2026-08-02', admin: 'Mina', status: 'Pending' }
    ]
  },
  {
    id: 'REV-1042',
    product: 'Vintage Leather Tote',
    productImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80',
    category: 'Fashion',
    buyer: 'Kazeem Bello',
    seller: 'Urban Wear',
    rating: 4,
    review: 'The material felt premium and the color looked exactly like the photos. My only concern is the strap width, but overall a solid purchase.',
    title: 'Great look, minor strap issue',
    status: 'Published',
    reports: 0,
    created: '2026-07-31',
    orderId: 'ORD-3918',
    verified: true,
    device: 'OnePlus 11',
    browser: 'Chrome 125',
    ip: '10.24.0.15',
    store: 'Urban Wear Studio',
    buyerEmail: 'kazeem@example.com',
    sellerEmail: 'billing@urbanwear.com',
    adminNotes: 'Accepted and published.',
    media: {
      images: [],
      videos: []
    },
    reportHistory: [],
    history: [
      { event: 'Review Submitted', date: '2026-07-31', admin: 'System', status: 'Submitted' },
      { event: 'Published', date: '2026-07-31', admin: 'Ada', status: 'Approved' }
    ],
    timeline: [
      { event: 'Review Submitted', date: '2026-07-31', admin: 'System', status: 'Completed' },
      { event: 'Published', date: '2026-07-31', admin: 'Ada', status: 'Completed' }
    ]
  },
  {
    id: 'REV-1043',
    product: 'Smart Blender Pro',
    productImage: 'https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?auto=format&fit=crop&w=400&q=80',
    category: 'Home',
    buyer: 'Sola Ade',
    seller: 'Glow Home',
    rating: 2,
    review: 'The blender was noisy and one of the settings stopped working after the second use. Customer support took too long to respond.',
    title: 'Poor durability',
    status: 'Reported',
    reports: 5,
    created: '2026-07-30',
    orderId: 'ORD-3917',
    verified: true,
    device: 'Samsung Galaxy A54',
    browser: 'Chrome 124',
    ip: '172.16.2.90',
    store: 'Glow Home',
    buyerEmail: 'sola@example.com',
    sellerEmail: 'ops@glowhome.com',
    adminNotes: 'Escalated for seller response.',
    media: {
      images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80'],
      videos: []
    },
    reportHistory: [
      { reporter: 'Buyer', reason: 'Fake Review', date: '2026-07-31', status: 'Investigating' },
      { reporter: 'Seller', reason: 'Harassment', date: '2026-08-01', status: 'Open' }
    ],
    history: [
      { event: 'Review Submitted', date: '2026-07-30', admin: 'System', status: 'Submitted' },
      { event: 'Reported', date: '2026-07-31', admin: 'Nina', status: 'Investigating' }
    ],
    timeline: [
      { event: 'Review Submitted', date: '2026-07-30', admin: 'System', status: 'Completed' },
      { event: 'Reported', date: '2026-07-31', admin: 'Nina', status: 'Active' },
      { event: 'Assigned', date: '2026-07-31', admin: 'Nina', status: 'Completed' }
    ]
  },
  {
    id: 'REV-1044',
    product: 'Ergo Desk Lamp',
    productImage: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=400&q=80',
    category: 'Home',
    buyer: 'Mina Raji',
    seller: 'Bright Cart',
    rating: 1,
    review: 'The product was not what was advertised. The finish looked cheap and the light did not function properly on arrival.',
    title: 'Misleading listing',
    status: 'Hidden',
    reports: 12,
    created: '2026-07-29',
    orderId: 'ORD-3912',
    verified: false,
    device: 'Pixel 8',
    browser: 'Firefox 127',
    ip: '203.0.113.10',
    store: 'Bright Cart',
    buyerEmail: 'mina@example.com',
    sellerEmail: 'support@brightcart.com',
    adminNotes: 'Hidden pending evidence review.',
    media: {
      images: [],
      videos: []
    },
    reportHistory: [
      { reporter: 'Buyer', reason: 'Wrong Product', date: '2026-07-30', status: 'Resolved' }
    ],
    history: [
      { event: 'Review Submitted', date: '2026-07-29', admin: 'System', status: 'Submitted' },
      { event: 'Hidden', date: '2026-07-30', admin: 'Lola', status: 'Hidden' }
    ],
    timeline: [
      { event: 'Review Submitted', date: '2026-07-29', admin: 'System', status: 'Completed' },
      { event: 'Reported', date: '2026-07-30', admin: 'Lola', status: 'Completed' },
      { event: 'Hidden', date: '2026-07-30', admin: 'Lola', status: 'Completed' }
    ]
  },
  {
    id: 'REV-1045',
    product: 'Aero Headphones',
    productImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80',
    category: 'Electronics',
    buyer: 'Tunde Okafor',
    seller: 'Luxe House',
    rating: 5,
    review: 'Outstanding sound quality and the battery life is remarkable. I can use them all day and they still feel comfortable.',
    title: 'Excellent audio experience',
    status: 'Published',
    reports: 0,
    created: '2026-07-28',
    orderId: 'ORD-3909',
    verified: true,
    device: 'MacBook Pro',
    browser: 'Chrome 126',
    ip: '192.0.2.84',
    store: 'Luxe House',
    buyerEmail: 'tunde@example.com',
    sellerEmail: 'finance@luxehouse.com',
    adminNotes: 'No issues found.',
    media: {
      images: [],
      videos: []
    },
    reportHistory: [],
    history: [
      { event: 'Review Submitted', date: '2026-07-28', admin: 'System', status: 'Submitted' },
      { event: 'Published', date: '2026-07-28', admin: 'Ada', status: 'Approved' }
    ],
    timeline: [
      { event: 'Review Submitted', date: '2026-07-28', admin: 'System', status: 'Completed' },
      { event: 'Published', date: '2026-07-28', admin: 'Ada', status: 'Completed' }
    ]
  },
  {
    id: 'REV-1046',
    product: 'Pro Gaming Chair',
    productImage: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&w=400&q=80',
    category: 'Gaming',
    buyer: 'Grace Ibe',
    seller: 'Trendset',
    rating: 3,
    review: 'Comfortable but the assembly instructions were confusing. It works well for long sessions, though the materials feel a little cheap.',
    title: 'Comfortable but manual is weak',
    status: 'Removed',
    reports: 3,
    created: '2026-07-27',
    orderId: 'ORD-3905',
    verified: true,
    device: 'Windows 11 PC',
    browser: 'Edge 125',
    ip: '198.51.100.7',
    store: 'Trendset',
    buyerEmail: 'grace@example.com',
    sellerEmail: 'settlements@trendset.com',
    adminNotes: 'Removed due to policy violation.',
    media: {
      images: ['https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=400&q=80'],
      videos: ['https://www.w3schools.com/html/mov_bbb.mp4']
    },
    reportHistory: [
      { reporter: 'Moderator', reason: 'Offensive', date: '2026-07-28', status: 'Resolved' }
    ],
    history: [
      { event: 'Review Submitted', date: '2026-07-27', admin: 'System', status: 'Submitted' },
      { event: 'Removed', date: '2026-07-28', admin: 'Kai', status: 'Removed' }
    ],
    timeline: [
      { event: 'Review Submitted', date: '2026-07-27', admin: 'System', status: 'Completed' },
      { event: 'Reported', date: '2026-07-28', admin: 'Kai', status: 'Completed' },
      { event: 'Removed', date: '2026-07-28', admin: 'Kai', status: 'Completed' }
    ]
  }
];

const analyticsData = [
  { title: 'Average Rating', value: '4.7/5', detail: '+0.2 vs last week' },
  { title: 'Most Reviewed Category', value: 'Electronics', detail: '34 reviews' },
  { title: 'Lowest Rated Category', value: 'Beauty', detail: '3.1 average' },
  { title: 'Most Reported Seller', value: 'Glow Home', detail: '12 reports' },
  { title: 'Most Reported Product', value: 'Smart Blender Pro', detail: '5 reports' },
  { title: 'Pending Queue', value: '12', detail: '2 high-risk' },
  { title: 'Today\'s Reviews', value: '8', detail: '5 need action' },
  { title: 'Reviews This Month', value: '146', detail: '+18.4%' }
];

const pulseData = [
  { title: 'Priority queue', value: '4 urgent reviews', accent: 'blue' },
  { title: 'Seller warnings', value: '3 pending', accent: 'amber' },
  { title: 'Auto-hide rules', value: 'Active', accent: 'emerald' }
];

const state = {
  selectedReview: null,
  filters: {
    search: '',
    status: 'all',
    rating: 'all',
    category: 'all',
    date: '',
    seller: 'all',
    buyer: 'all'
  },
  selectedIds: new Set()
};

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getStatusClass(status) {
  return `status-${String(status || 'pending').toLowerCase()}`;
}

function getStatusBadge(status) {
  const label = status || 'Pending';
  const normalized = String(label).toLowerCase();
  return `<span class="status-pill ${normalized === 'published' ? 'status-published' : normalized === 'pending' ? 'status-pending' : normalized === 'reported' ? 'status-reported' : normalized === 'hidden' ? 'status-hidden' : 'status-removed'}">${label}</span>`;
}

function renderStars(rating) {
  const safeRating = Math.max(1, Math.min(5, Number(rating) || 0));
  const full = '★'.repeat(safeRating);
  const empty = '☆'.repeat(5 - safeRating);
  return `<span class="rating-stars">${full}${empty}</span>`;
}

function renderSummaryCards() {
  const cards = [
    { title: 'Total Reviews', value: '1,284', trend: '+12.4%', positive: true, accent: 'from-blue-500 to-blue-600' },
    { title: 'Pending Moderation', value: '24', trend: '4 urgent', positive: false, accent: 'from-amber-500 to-amber-600' },
    { title: 'Reported Reviews', value: '18', trend: '+3.1%', positive: false, accent: 'from-rose-500 to-rose-600' },
    { title: 'Removed Reviews', value: '42', trend: '2 today', positive: true, accent: 'from-violet-500 to-violet-600' },
    { title: 'Published Reviews', value: '1,200', trend: '+8.2%', positive: true, accent: 'from-emerald-500 to-emerald-600' },
    { title: 'Average Marketplace Rating', value: '4.7', trend: 'Excellent', positive: true, accent: 'from-cyan-500 to-cyan-600' }
  ];

  const container = document.getElementById('summaryCards');
  container.innerHTML = cards.map((card) => `
    <div class="metric-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="mb-4 flex items-center justify-between">
        <div class="rounded-xl bg-gradient-to-br ${card.accent} px-3 py-2 text-white shadow-sm">
          <i class="fas ${card.title.includes('Pending') ? 'fa-hourglass-half' : card.title.includes('Reported') ? 'fa-flag' : card.title.includes('Removed') ? 'fa-trash' : card.title.includes('Published') ? 'fa-check-circle' : card.title.includes('Average') ? 'fa-star' : 'fa-comments'}"></i>
        </div>
        <span class="rounded-full ${card.positive ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-700'} px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">${card.trend}</span>
      </div>
      <p class="text-sm text-slate-500">${card.title}</p>
      <p class="mt-2 text-2xl font-semibold text-slate-900">${card.value}</p>
    </div>
  `).join('');
}

function getFilteredReviews() {
  const searchValue = state.filters.search.trim().toLowerCase();
  return reviewsData.filter((review) => {
    const matchesSearch = !searchValue || [review.id, review.product, review.buyer, review.seller, review.review].join(' ').toLowerCase().includes(searchValue);
    const matchesStatus = state.filters.status === 'all' || review.status === state.filters.status;
    const matchesRating = state.filters.rating === 'all' || String(review.rating) === state.filters.rating;
    const matchesCategory = state.filters.category === 'all' || review.category === state.filters.category;
    const matchesDate = !state.filters.date || review.created === state.filters.date;
    const matchesSeller = state.filters.seller === 'all' || review.seller === state.filters.seller;
    const matchesBuyer = state.filters.buyer === 'all' || review.buyer === state.filters.buyer;

    return matchesSearch && matchesStatus && matchesRating && matchesCategory && matchesDate && matchesSeller && matchesBuyer;
  });
}

function populateFilterOptions() {
  const sellerSelect = document.getElementById('sellerFilter');
  const buyerSelect = document.getElementById('buyerFilter');
  const sellerNames = [...new Set(reviewsData.map((review) => review.seller))];
  const buyerNames = [...new Set(reviewsData.map((review) => review.buyer))];

  sellerSelect.innerHTML = ['<option value="all">All Sellers</option>', ...sellerNames.map((seller) => `<option value="${seller}">${seller}</option>`)].join('');
  buyerSelect.innerHTML = ['<option value="all">All Buyers</option>', ...buyerNames.map((buyer) => `<option value="${buyer}">${buyer}</option>`)].join('');
}

function renderReviews() {
  const body = document.getElementById('reviewsTableBody');
  const filtered = getFilteredReviews();

  if (!filtered.length) {
    body.innerHTML = `
      <tr>
        <td colspan="11" class="px-4 py-16 text-center">
          <div class="mx-auto flex max-w-sm flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10">
            <i class="fas fa-search text-3xl text-slate-400"></i>
            <h3 class="mt-4 text-lg font-semibold text-slate-800">No reviews found.</h3>
            <p class="mt-2 text-sm text-slate-500">Try adjusting the filters or clear them to see the full queue.</p>
            <button id="emptyStateReset" class="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white">Clear Filters</button>
          </div>
        </td>
      </tr>
    `;
    document.getElementById('emptyStateReset')?.addEventListener('click', resetFilters);
    updateSelectionUi();
    return;
  }

  body.innerHTML = filtered.map((review) => `
    <tr class="table-row bg-white hover:bg-slate-50">
      <td class="px-3 py-3">
        <input type="checkbox" class="review-checkbox h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" data-id="${review.id}" ${state.selectedIds.has(review.id) ? 'checked' : ''} />
      </td>
      <td class="px-3 py-3 text-sm font-medium text-slate-900">${review.id}</td>
      <td class="px-3 py-3">
        <div class="flex items-center gap-3">
          <img src="${review.productImage}" alt="${review.product}" class="h-10 w-10 rounded-xl object-cover" />
          <div>
            <p class="text-sm font-semibold text-slate-900">${review.product}</p>
            <p class="text-xs text-slate-500">${review.category}</p>
          </div>
        </div>
      </td>
      <td class="px-3 py-3 text-sm text-slate-600">${review.buyer}</td>
      <td class="px-3 py-3 text-sm text-slate-600">${review.seller}</td>
      <td class="px-3 py-3 text-sm">${renderStars(review.rating)}</td>
      <td class="px-3 py-3">
        <p class="max-w-[220px] text-sm text-slate-600">${review.review.length > 100 ? `${review.review.slice(0, 100)}...` : review.review}</p>
      </td>
      <td class="px-3 py-3">${getStatusBadge(review.status)}</td>
      <td class="px-3 py-3"><span class="report-badge">${review.reports}</span></td>
      <td class="px-3 py-3 text-sm text-slate-500">${formatDate(review.created)}</td>
      <td class="px-3 py-3 text-sm">
        <div class="flex flex-wrap items-center gap-2">
          <button class="view-btn rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 transition hover:bg-slate-50" data-id="${review.id}"><i class="fas fa-eye mr-2"></i>View</button>
          <button class="approve-btn rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 transition hover:bg-slate-50" data-id="${review.id}"><i class="fas fa-check mr-2"></i>Approve</button>
          <button class="menu-btn rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 transition hover:bg-slate-50" data-id="${review.id}"><i class="fas fa-ellipsis-v"></i></button>
        </div>
      </td>
    </tr>
  `).join('');

  bindReviewRowEvents();
  updateSelectionUi();
}

function bindReviewRowEvents() {
  document.querySelectorAll('.view-btn').forEach((button) => {
    button.addEventListener('click', () => openReviewModal(button.getAttribute('data-id')));
  });

  document.querySelectorAll('.approve-btn').forEach((button) => {
    button.addEventListener('click', () => updateReviewStatus(button.getAttribute('data-id'), 'Published'));
  });

  document.querySelectorAll('.menu-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.getAttribute('data-id');
      const review = reviewsData.find((item) => item.id === id);
      if (!review) return;
      showToast(`More menu opened for ${review.id}`);
    });
  });

  document.querySelectorAll('.review-checkbox').forEach((checkbox) => {
    checkbox.addEventListener('change', (event) => {
      const id = event.target.getAttribute('data-id');
      if (event.target.checked) {
        state.selectedIds.add(id);
      } else {
        state.selectedIds.delete(id);
      }
      updateSelectionUi();
    });
  });
}

function updateSelectionUi() {
  const count = state.selectedIds.size;
  const selectAll = document.getElementById('selectAllCheckbox');
  document.getElementById('selectionCount').textContent = `${count} selected`;
  if (selectAll) {
    selectAll.checked = count > 0 && count === getFilteredReviews().length;
  }
}

function renderAnalytics() {
  const container = document.getElementById('analyticsPanel');
  container.innerHTML = analyticsData.map((card) => `
    <div class="analytics-card rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p class="text-sm text-slate-500">${card.title}</p>
      <p class="mt-2 text-xl font-semibold text-slate-900">${card.value}</p>
      <p class="mt-1 text-sm text-slate-500">${card.detail}</p>
    </div>
  `).join('');

  const pulse = document.getElementById('pulseCards');
  pulse.innerHTML = pulseData.map((item) => `
    <div class="rounded-2xl border border-slate-200 bg-white p-3">
      <div class="flex items-center justify-between">
        <p class="text-sm font-semibold text-slate-900">${item.title}</p>
        <span class="rounded-full ${item.accent === 'blue' ? 'bg-blue-50 text-blue-700' : item.accent === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'} px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">${item.value}</span>
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

  const body = document.getElementById('reviewsTableBody');
  body.innerHTML = Array.from({ length: 6 }).map(() => `
    <tr>
      <td class="px-3 py-4"><div class="skeleton h-5 w-5"></div></td>
      <td class="px-3 py-4"><div class="skeleton h-5 w-24"></div></td>
      <td class="px-3 py-4"><div class="skeleton h-8 w-40"></div></td>
      <td class="px-3 py-4"><div class="skeleton h-5 w-24"></div></td>
      <td class="px-3 py-4"><div class="skeleton h-5 w-24"></div></td>
      <td class="px-3 py-4"><div class="skeleton h-5 w-24"></div></td>
      <td class="px-3 py-4"><div class="skeleton h-5 w-40"></div></td>
      <td class="px-3 py-4"><div class="skeleton h-6 w-20 rounded-full"></div></td>
      <td class="px-3 py-4"><div class="skeleton h-6 w-10 rounded-full"></div></td>
      <td class="px-3 py-4"><div class="skeleton h-5 w-24"></div></td>
      <td class="px-3 py-4"><div class="skeleton h-8 w-24"></div></td>
    </tr>
  `).join('');
}

function openReviewModal(reviewId) {
  const review = reviewsData.find((item) => item.id === reviewId);
  if (!review) return;
  state.selectedReview = review;

  document.getElementById('modalTitle').textContent = `${review.id} • ${review.title}`;
  document.getElementById('modalProductImage').src = review.productImage;
  document.getElementById('modalProductName').textContent = review.product;
  document.getElementById('modalCategory').textContent = review.category;
  document.getElementById('modalOrderId').textContent = review.orderId;
  document.getElementById('modalVerified').textContent = review.verified ? 'Purchase Verified' : 'Unverified';
  document.getElementById('modalRating').innerHTML = `${renderStars(review.rating)} <span class="ml-2 text-slate-500">${review.rating}/5</span>`;
  document.getElementById('modalStatusBadge').outerHTML = `<span class="status-pill ${getStatusClass(review.status)}">${review.status}</span>`;

  document.getElementById('modalParties').innerHTML = `
    <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Buyer</p>
      <p class="mt-2 font-semibold text-slate-900">${review.buyer}</p>
      <p class="text-sm text-slate-600">${review.buyerEmail}</p>
    </div>
    <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Seller</p>
      <p class="mt-2 font-semibold text-slate-900">${review.seller}</p>
      <p class="text-sm text-slate-600">${review.sellerEmail}</p>
      <p class="text-sm text-slate-600">${review.store}</p>
    </div>
  `;

  document.getElementById('modalSummary').innerHTML = `
    <div class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span>Device</span><strong>${review.device}</strong></div>
    <div class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span>Browser</span><strong>${review.browser}</strong></div>
    <div class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span>IP Address</span><strong>${review.ip}</strong></div>
    <div class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span>Created</span><strong>${formatDate(review.created)}</strong></div>
  `;

  document.getElementById('modalReviewText').textContent = review.review;
  document.getElementById('adminNotesInput').value = review.adminNotes;

  const evidence = document.getElementById('modalEvidence');
  const images = review.media.images || [];
  const videos = review.media.videos || [];
  evidence.innerHTML = [
    ...images.map((src) => `<div class="rounded-2xl border border-slate-200 p-2"><img src="${src}" alt="Review media" class="h-32 w-full rounded-xl object-cover" /></div>`),
    ...videos.map((src) => `<div class="rounded-2xl border border-slate-200 p-2"><video controls class="h-32 w-full rounded-xl object-cover"><source src="${src}" type="video/mp4" /></video></div>`),
    ...(images.length || videos.length ? [] : ['<div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-sm text-slate-500">No media attached.</div>'])
  ].join('');

  document.getElementById('modalReportHistory').innerHTML = (review.reportHistory || []).length ? review.reportHistory.map((item) => `
    <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div class="flex items-center justify-between">
        <p class="text-sm font-semibold text-slate-900">${item.reason}</p>
        <span class="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">${item.status}</span>
      </div>
      <p class="mt-2 text-sm text-slate-600">Reported by ${item.reporter} on ${formatDate(review.created)}</p>
    </div>
  `).join('') : '<p class="text-sm text-slate-500">No reports recorded.</p>';

  document.getElementById('modalTimeline').innerHTML = (review.timeline || []).map((entry) => `
    <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div class="flex items-center justify-between">
        <p class="text-sm font-semibold text-slate-900">${entry.event}</p>
        <span class="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700">${entry.status}</span>
      </div>
      <p class="mt-2 text-sm text-slate-600">${entry.admin} • ${formatDate(review.created)}</p>
    </div>
  `).join('');

  document.getElementById('modalHistory').innerHTML = (review.history || []).map((entry) => `
    <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div class="flex items-center justify-between">
        <p class="text-sm font-semibold text-slate-900">${entry.event}</p>
        <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">${entry.status}</span>
      </div>
      <p class="mt-2 text-sm text-slate-600">${entry.admin} • ${entry.date}</p>
    </div>
  `).join('');

  document.getElementById('reviewModal').classList.remove('hidden');
}

function closeReviewModal() {
  document.getElementById('reviewModal').classList.add('hidden');
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2200);
}

function updateReviewStatus(reviewId, status) {
  const review = reviewsData.find((item) => item.id === reviewId);
  if (!review) return;
  review.status = status;
  review.adminNotes = `Updated to ${status} from moderation console.`;
  renderReviews();
  showToast(`${reviewId} marked as ${status}`);
}

function bulkAction(action) {
  if (!state.selectedIds.size) {
    showToast('Select one or more reviews first.');
    return;
  }

  const nextStatus = action === 'approve' ? 'Published' : action === 'hide' ? 'Hidden' : action === 'reviewed' ? 'Pending' : 'Removed';
  state.selectedIds.forEach((id) => {
    const review = reviewsData.find((item) => item.id === id);
    if (review) {
      review.status = nextStatus;
      review.adminNotes = `Bulk action applied: ${action}`;
    }
  });

  state.selectedIds.clear();
  renderReviews();
  showToast(`Applied ${action} to ${state.selectedIds.size} reviews`);
}

function exportReviews(format) {
  const filtered = getFilteredReviews();
  if (format === 'print') {
    window.print();
    return;
  }

  const payload = filtered.map((review) => `${review.id},${review.product},${review.buyer},${review.seller},${review.status}`).join('\n');
  const blob = new Blob([`Review ID,Product,Buyer,Seller,Status\n${payload}`], { type: 'text/plain;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `reviews-export.${format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv'}`;
  link.click();
  showToast(`Exported ${filtered.length} reviews as ${format.toUpperCase()}`);
}

function resetFilters() {
  state.filters = {
    search: '',
    status: 'all',
    rating: 'all',
    category: 'all',
    date: '',
    seller: 'all',
    buyer: 'all'
  };
  state.selectedIds.clear();
  document.getElementById('searchInput').value = '';
  document.getElementById('statusFilter').value = 'all';
  document.getElementById('ratingFilter').value = 'all';
  document.getElementById('categoryFilter').value = 'all';
  document.getElementById('dateRangeInput').value = '';
  document.getElementById('sellerFilter').value = 'all';
  document.getElementById('buyerFilter').value = 'all';
  renderReviews();
}

function attachEvents() {
  document.getElementById('searchInput').addEventListener('input', (event) => {
    state.filters.search = event.target.value;
    renderReviews();
  });

  document.getElementById('statusFilter').addEventListener('change', (event) => {
    state.filters.status = event.target.value;
    renderReviews();
  });

  document.getElementById('ratingFilter').addEventListener('change', (event) => {
    state.filters.rating = event.target.value;
    renderReviews();
  });

  document.getElementById('categoryFilter').addEventListener('change', (event) => {
    state.filters.category = event.target.value;
    renderReviews();
  });

  document.getElementById('dateRangeInput').addEventListener('change', (event) => {
    state.filters.date = event.target.value;
    renderReviews();
  });

  document.getElementById('sellerFilter').addEventListener('change', (event) => {
    state.filters.seller = event.target.value;
    renderReviews();
  });

  document.getElementById('buyerFilter').addEventListener('change', (event) => {
    state.filters.buyer = event.target.value;
    renderReviews();
  });

  document.getElementById('resetFiltersBtn').addEventListener('click', resetFilters);
  document.getElementById('selectAllCheckbox').addEventListener('change', (event) => {
    const filtered = getFilteredReviews();
    if (event.target.checked) {
      filtered.forEach((review) => state.selectedIds.add(review.id));
    } else {
      filtered.forEach((review) => state.selectedIds.delete(review.id));
    }
    renderReviews();
  });

  document.querySelectorAll('.bulk-action').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.getAttribute('data-action');
      if (action === 'export') {
        exportReviews('csv');
        return;
      }
      bulkAction(action);
    });
  });

  document.getElementById('refreshDataBtn').addEventListener('click', () => {
    renderSkeletons();
    setTimeout(() => {
      renderSummaryCards();
      renderReviews();
      renderAnalytics();
    }, 800);
  });

  document.getElementById('exportToggle').addEventListener('click', () => {
    document.getElementById('exportMenu').classList.toggle('hidden');
  });

  document.querySelectorAll('.export-option').forEach((button) => {
    button.addEventListener('click', () => {
      exportReviews(button.getAttribute('data-format'));
      document.getElementById('exportMenu').classList.add('hidden');
    });
  });

  document.querySelectorAll('[data-close-modal]').forEach((element) => {
    element.addEventListener('click', closeReviewModal);
  });

  document.getElementById('saveNotesBtn').addEventListener('click', () => {
    if (state.selectedReview) {
      state.selectedReview.adminNotes = document.getElementById('adminNotesInput').value;
      showToast('Notes saved locally.');
    }
  });

  document.querySelectorAll('.moderation-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.getAttribute('data-action');
      const review = state.selectedReview;
      if (!review) return;
      if (action === 'approve') {
        review.status = 'Published';
      } else if (action === 'hide') {
        review.status = 'Hidden';
      } else if (action === 'remove') {
        review.status = 'Removed';
      } else if (action === 'flag') {
        review.status = 'Reported';
      } else if (action === 'restore') {
        review.status = 'Published';
      } else {
        review.status = 'Pending';
      }
      review.adminNotes = `Moderation action: ${action}`;
      renderReviews();
      showToast(`${review.id} updated`);
    });
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

function initializeReviewsPage() {
  const requiredElements = ['summaryCards', 'reviewsTableBody', 'analyticsPanel', 'pulseCards'];
  const hasRequiredElements = requiredElements.every((id) => document.getElementById(id));

  if (!hasRequiredElements) {
    setTimeout(initializeReviewsPage, 120);
    return;
  }

  populateFilterOptions();
  renderSkeletons();
  setTimeout(() => {
    renderSummaryCards();
    renderReviews();
    renderAnalytics();
    attachEvents();
  }, 900);
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('summaryCards')) {
      initializeReviewsPage();
    }
  });
} else if (document.getElementById('summaryCards')) {
  initializeReviewsPage();
}

window.initializeReviewsPage = initializeReviewsPage;
})();
