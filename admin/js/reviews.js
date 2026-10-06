(function() {
  const API = `${ADMIN_API_BASE}/admin/reviews`;
  const esc = s => window.escapeHtml(s);
  let reviewsData = [], summary = {}, totalRows = 0;

  async function api(path = '', method = 'GET', body) {
    const r = await fetch(API + path, { method,
      headers: { ...getAdminAuthHeaders(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new Error(j?.message || 'Request failed');
    return j.data;
  }
  const guard = fn => async (...a) => { try { return await fn(...a); } catch (e) { showToast(e.message); } };
  const debounce = (fn, ms = 350) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const state = {
  page: 1,
  limit: 50,
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
  const normalized = String(status || 'pending').toLowerCase();
  return ['published', 'pending', 'reported', 'hidden', 'removed'].includes(normalized)
    ? `status-${normalized}`
    : 'status-pending';
}

function getStatusBadge(status) {
  const label = status || 'Pending';
  const normalized = String(label).toLowerCase();
  const statusClass = normalized === 'published' ? 'status-published' : normalized === 'pending' ? 'status-pending' : normalized === 'reported' ? 'status-reported' : normalized === 'hidden' ? 'status-hidden' : 'status-removed';
  return `<span class="status-pill ${statusClass}">${esc(label)}</span>`;
}
function renderStars(rating) {
  const safeRating = Math.max(1, Math.min(5, Number(rating) || 0));
  const full = '★'.repeat(safeRating);
  const empty = '☆'.repeat(5 - safeRating);
  return `<span class="rating-stars">${full}${empty}</span>`;
}

function renderSummaryCards() {
  const s = summary;
  const cards = [
    { title: 'Total Reviews', value: s.total ?? 0, trend: `${s.month ?? 0} this month`, positive: true, accent: 'from-blue-500 to-blue-600' },
    { title: 'Pending Moderation', value: s.pending ?? 0, trend: 'Needs action', positive: false, accent: 'from-amber-500 to-amber-600' },
    { title: 'Reported Reviews', value: s.reported ?? 0, trend: 'Open reports', positive: false, accent: 'from-rose-500 to-rose-600' },
    { title: 'Removed Reviews', value: s.removed ?? 0, trend: 'All time', positive: true, accent: 'from-violet-500 to-violet-600' },
    { title: 'Published Reviews', value: s.published ?? 0, trend: 'Live', positive: true, accent: 'from-emerald-500 to-emerald-600' },
    { title: 'Average Marketplace Rating', value: s.avgRating ?? 0, trend: 'Out of 5', positive: true, accent: 'from-cyan-500 to-cyan-600' }
  ];
  const container = document.getElementById('summaryCards');
  container.innerHTML = cards.map((card) => `
    <div class="metric-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="mb-4 flex items-center justify-between">
        <div class="rounded-xl bg-gradient-to-br ${card.accent} px-3 py-2 text-white shadow-sm">
          <i class="fas ${card.title.includes('Pending') ? 'fa-hourglass-half' : card.title.includes('Reported') ? 'fa-flag' : card.title.includes('Removed') ? 'fa-trash' : card.title.includes('Published') ? 'fa-check-circle' : card.title.includes('Average') ? 'fa-star' : 'fa-comments'}"></i>
        </div>
        <span class="rounded-full ${card.positive ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-700'} px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">${esc(card.trend)}</span>
      </div>
      <p class="text-sm text-slate-500">${esc(card.title)}</p>
      <p class="mt-2 text-2xl font-semibold text-slate-900">${esc(card.value)}</p>
    </div>
  `).join('');
}

function getFilteredReviews() { return reviewsData; }

const qs = () => {
  const p = new URLSearchParams({ page: state.page, limit: state.limit });
  Object.entries(state.filters).forEach(([k, v]) => { if (v && v !== 'all') p.set(k, v); });
  return p;
};
const loadReviews = guard(async () => {
  const d = await api('?' + qs());
  reviewsData = d.reviews; totalRows = d.total;
  renderReviews(); renderPagination();
});
const loadSummary = guard(async () => { summary = await api('/summary'); renderSummaryCards(); renderAnalytics(); });
const refreshAll = () => Promise.all([loadSummary(), loadReviews()]);

const loadMeta = guard(async () => {
  const m = await api('/meta');
  const opt = (arr, all) => `<option value="all">${all}</option>` + arr.map(x => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
  document.getElementById('sellerFilter').innerHTML = opt(m.sellers, 'All Sellers');
  document.getElementById('buyerFilter').innerHTML = opt(m.buyers, 'All Buyers');
  document.getElementById('categoryFilter').innerHTML = '<option value="all">All Categories</option>' +
    m.categories.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
});

function renderPagination() {
  const el = document.getElementById('reviewsPagination'); if (!el) return;
  const pages = Math.max(Math.ceil(totalRows / state.limit), 1);
  el.innerHTML = `<span>${totalRows} reviews · Page ${state.page} of ${pages}</span>
    <div class="flex gap-2">
      <button data-pg="${state.page - 1}" ${state.page <= 1 ? 'disabled' : ''} class="rounded-xl border border-slate-200 bg-white px-3 py-2 disabled:opacity-40">Previous</button>
      <button data-pg="${state.page + 1}" ${state.page >= pages ? 'disabled' : ''} class="rounded-xl border border-slate-200 bg-white px-3 py-2 disabled:opacity-40">Next</button></div>`;
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
    <td class="px-3 py-3"><input type="checkbox" class="review-checkbox h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" data-id="${esc(review.id)}" ${state.selectedIds.has(review.id) ? 'checked' : ''} /></td>
    <td class="px-3 py-3 text-sm font-medium text-slate-900">${esc(review.displayId)}</td>
    <td class="px-3 py-3"><div class="flex items-center gap-3">
      <img src="${esc(review.productImage || '')}" alt="" class="h-10 w-10 rounded-xl object-cover bg-slate-100" />
      <div><p class="text-sm font-semibold text-slate-900">${esc(review.product)}</p><p class="text-xs text-slate-500">${esc(review.category)}</p></div></div></td>
    <td class="px-3 py-3 text-sm text-slate-600">${esc(review.buyer)}</td>
    <td class="px-3 py-3 text-sm text-slate-600">${esc(review.seller)}</td>
    <td class="px-3 py-3 text-sm">${renderStars(review.rating)}</td>
    <td class="px-3 py-3"><p class="max-w-[220px] text-sm text-slate-600">${esc(review.review.length > 100 ? review.review.slice(0, 100) + '...' : review.review)}</p></td>
    <td class="px-3 py-3">${getStatusBadge(review.status)}</td>
    <td class="px-3 py-3"><span class="report-badge">${esc(review.reports)}</span></td>
    <td class="px-3 py-3 text-sm text-slate-500">${formatDate(review.created)}</td>
    <td class="px-3 py-3 text-sm"><div class="flex flex-wrap items-center gap-2">
      <button class="view-btn rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" data-id="${esc(review.id)}"><i class="fas fa-eye mr-2"></i>View</button>
      <button class="approve-btn rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" data-id="${esc(review.id)}"><i class="fas fa-check mr-2"></i>Approve</button>
    </div></td>
  </tr>`).join('');
  bindReviewRowEvents();
  updateSelectionUi();
}

function bindReviewRowEvents() {
  document.querySelectorAll('.view-btn').forEach((button) => {
    button.addEventListener('click', () => openReviewModal(button.getAttribute('data-id')));
  });

  document.querySelectorAll('.approve-btn').forEach((button) => {
    button.addEventListener('click', () => perform([button.dataset.id], 'approve'));
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
  container.innerHTML = (summary.analytics || []).map((card) => `
    <div class="analytics-card rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p class="text-sm text-slate-500">${esc(card.title)}</p>
      <p class="mt-2 text-xl font-semibold text-slate-900">${esc(card.value)}</p>
      <p class="mt-1 text-sm text-slate-500">${esc(card.detail)}</p>
    </div>
  `).join('');

  const pulse = document.getElementById('pulseCards');
  pulse.innerHTML = (summary.pulse || []).map((item) => `
    <div class="rounded-2xl border border-slate-200 bg-white p-3">
      <div class="flex items-center justify-between">
        <p class="text-sm font-semibold text-slate-900">${esc(item.title)}</p>
        <span class="rounded-full ${item.accent === 'blue' ? 'bg-blue-50 text-blue-700' : item.accent === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'} px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">${esc(item.value)}</span>
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

const openReviewModal = guard(async (id) => {
  const review = (await api('/' + encodeURIComponent(id))).review;
  state.selectedReview = review;
  const $ = i => document.getElementById(i);
  $('modalTitle').textContent = `${review.displayId} • ${review.title}`;
  $('modalProductImage').src = review.productImage || '';
  $('modalProductName').textContent = review.product;
  $('modalCategory').textContent = review.category;
  $('modalOrderId').textContent = review.orderId;
  $('modalVerified').textContent = review.verified ? 'Purchase Verified' : 'Unverified';
  $('modalRating').innerHTML = `${renderStars(review.rating)} <span class="ml-2 text-slate-500">${esc(review.rating)}/5</span>`;
  const badge = $('modalStatusBadge');
  badge.className = `status-pill ${getStatusClass(review.status)}`;
  badge.textContent = review.status;

  $('modalParties').innerHTML = `
    <div class="rounded-xl border border-slate-200 bg-slate-50 p-3"><p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Buyer</p>
      <p class="mt-2 font-semibold text-slate-900">${esc(review.buyer)}</p><p class="text-sm text-slate-600">${esc(review.buyerEmail || '')}</p></div>
    <div class="rounded-xl border border-slate-200 bg-slate-50 p-3"><p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Seller</p>
      <p class="mt-2 font-semibold text-slate-900">${esc(review.seller)}</p><p class="text-sm text-slate-600">${esc(review.sellerEmail || '')}</p></div>`;

  const row = (l, v) => `<div class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span>${l}</span><strong>${esc(v)}</strong></div>`;
  $('modalSummary').innerHTML = row('Review ID', review.displayId) + row('Reports', review.reports) +
    row('Created', formatDate(review.created)) + row('Last updated', formatDate(review.updated));

  $('modalReviewText').textContent = review.review;
  $('adminNotesInput').value = review.adminNotes || '';

  const imgs = review.media.images, vids = review.media.videos;
  $('modalEvidence').innerHTML = [
    ...imgs.map(s => `<div class="rounded-2xl border border-slate-200 p-2"><a href="${esc(s)}" target="_blank" rel="noopener"><img src="${esc(s)}" alt="" class="h-32 w-full rounded-xl object-cover" /></a></div>`),
    ...vids.map(s => `<div class="rounded-2xl border border-slate-200 p-2"><video controls class="h-32 w-full rounded-xl object-cover"><source src="${esc(s)}" /></video></div>`),
    ...(imgs.length || vids.length ? [] : ['<div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-sm text-slate-500">No media attached.</div>'])
  ].join('');

  $('modalReportHistory').innerHTML = review.reportHistory.length ? review.reportHistory.map(i => `
    <div class="rounded-xl border border-slate-200 bg-slate-50 p-3"><div class="flex items-center justify-between">
      <p class="text-sm font-semibold text-slate-900 capitalize">${esc(i.reason)}</p>
      <span class="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">${esc(i.status)}</span></div>
      <p class="mt-2 text-sm text-slate-600">Reported by ${esc(i.reporter)} on ${formatDate(i.date)}</p>
      ${i.details ? `<p class="mt-1 text-sm text-slate-500">${esc(i.details)}</p>` : ''}</div>`).join('')
    : '<p class="text-sm text-slate-500">No reports recorded.</p>';

  const entry = (e, cls) => `<div class="rounded-xl border border-slate-200 bg-slate-50 p-3"><div class="flex items-center justify-between">
    <p class="text-sm font-semibold text-slate-900 capitalize">${esc(e.event)}</p>
    <span class="rounded-full ${cls} px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">${esc(e.status)}</span></div>
    <p class="mt-2 text-sm text-slate-600">${esc(e.admin)} • ${formatDate(e.date)}</p></div>`;
  $('modalTimeline').innerHTML = review.timeline.map(e => entry(e, 'bg-blue-50 text-blue-700')).join('');
  $('modalHistory').innerHTML = review.history.length ? review.history.map(e => entry(e, 'bg-slate-100 text-slate-600')).join('')
    : '<p class="text-sm text-slate-500">No moderation actions yet.</p>';

  $('reviewModal').classList.remove('hidden');
});
function closeReviewModal() {
  document.getElementById('reviewModal').classList.add('hidden');
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2200);
}

const NEEDS_NOTE = ['hide', 'remove', 'warn-seller', 'warn-buyer'];
const perform = guard(async (ids, action) => {
  let note = '';
  if (NEEDS_NOTE.includes(action)) {
    note = (prompt(`Reason / message for "${action}" (required):`) || '').trim();
    if (!note) return showToast('A reason is required.');
  }
  if (action === 'remove' && !confirm(`Remove ${ids.length} review(s)? They disappear from the storefront.`)) return;
  await (ids.length === 1
    ? api(`/${ids[0]}/action`, 'POST', { action, note })
    : api('/bulk', 'POST', { ids, action, note }));
  const reopen = state.selectedReview && ids.includes(state.selectedReview.id) &&
    !document.getElementById('reviewModal').classList.contains('hidden');
  state.selectedIds.clear();
  showToast(`${action} applied to ${ids.length} review(s)`);
  await refreshAll();
  if (reopen) await openReviewModal(state.selectedReview.id);
});

function bulkAction(action) {
  if (!state.selectedIds.size) return showToast('Select one or more reviews first.');
  perform([...state.selectedIds], action === 'delete' ? 'remove' : action);
}

const exportReviews = guard(async (format, onlySelected = false) => {
  if (format === 'print' || format === 'pdf') return window.print();
  const p = qs(); p.delete('page'); p.delete('limit');
  if (onlySelected && state.selectedIds.size) p.set('ids', [...state.selectedIds].join(','));
  const r = await fetch(`${API}/export?${p}`, { headers: getAdminAuthHeaders() });
  if (!r.ok) throw new Error((await r.json().catch(() => null))?.message || 'Export failed');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(await r.blob()); a.download = `reviews-${Date.now()}.csv`; a.click();
  showToast('Export downloaded (CSV opens in Excel)');
});
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
  state.page = 1;
  loadReviews();
}

function attachEvents() {
  const bind = (id, key, ev = 'change') => document.getElementById(id).addEventListener(ev,
    debounce(e => { state.filters[key] = e.target.value; state.page = 1; loadReviews(); }, ev === 'input' ? 350 : 0));
  bind('searchInput', 'search', 'input'); bind('statusFilter', 'status'); bind('ratingFilter', 'rating');
  bind('categoryFilter', 'category'); bind('dateRangeInput', 'date'); bind('sellerFilter', 'seller'); bind('buyerFilter', 'buyer');

  document.getElementById('resetFiltersBtn').addEventListener('click', resetFilters);
  document.getElementById('selectAllCheckbox').addEventListener('change', (event) => {
    const filtered = getFilteredReviews();
    if (event.target.checked) filtered.forEach((review) => state.selectedIds.add(review.id));
    else filtered.forEach((review) => state.selectedIds.delete(review.id));
    renderReviews();
  });

  document.querySelectorAll('.bulk-action').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.action;
    if (a === 'export') return exportReviews('csv', true);
    bulkAction(a);
  }));
  document.getElementById('refreshDataBtn').addEventListener('click', () => { renderSkeletons(); refreshAll(); });

  document.getElementById('exportToggle').addEventListener('click', () => {
    document.getElementById('exportMenu').classList.toggle('hidden');
  });
  document.querySelectorAll('.export-option').forEach(b => b.addEventListener('click', () => {
    exportReviews(b.dataset.format);
    document.getElementById('exportMenu').classList.add('hidden');
  }));
  document.querySelectorAll('[data-close-modal]').forEach(element => element.addEventListener('click', closeReviewModal));

  document.getElementById('saveNotesBtn').addEventListener('click', guard(async () => {
    if (!state.selectedReview) return;
    await api(`/${state.selectedReview.id}/notes`, 'PUT', { notes: document.getElementById('adminNotesInput').value });
    showToast('Notes saved');
  }));
  document.querySelectorAll('.moderation-btn').forEach(b => b.addEventListener('click', () => {
    if (state.selectedReview) perform([state.selectedReview.id], b.dataset.action);
  }));

  document.getElementById('reviewsPagination')?.addEventListener('click', e => {
    const b = e.target.closest('button[data-pg]');
    if (b && !b.disabled) { state.page = +b.dataset.pg; loadReviews(); }
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

  state.page = 1; state.selectedIds.clear();
  renderSkeletons();
  loadMeta().then(() => { attachEvents(); refreshAll(); });
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
