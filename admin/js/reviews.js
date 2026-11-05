(function () {
  const PAGE_SIZE = 50;
  const state = {
    reviews: [],
    selectedReview: null,
    selectedIds: new Set(),
    page: 1,
    total: 0,
    totalPages: 1,
    loading: false,
    requestSequence: 0,
    initializedRoot: null,
    searchTimer: null
  };

  function getApiBase() {
    return window.ADMIN_API_BASE || (window.location.protocol === 'file:'
      ? 'http://localhost:5000/api'
      : 'https://marketmix-backend.onrender.com/api');
  }

  function getAuthHeaders() {
    if (typeof getAdminAuthHeaders === 'function') return getAdminAuthHeaders();
    const token = window.ADMIN_AUTH_TOKEN ||
      localStorage.getItem('adminToken') ||
      localStorage.getItem('adminSession') ||
      localStorage.getItem('token') || '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  function safeMediaUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const url = new URL(value, window.location.href);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
    } catch {
      return '';
    }
  }

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${getApiBase()}${path}`, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers
      }
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.status !== 'success') {
      throw new Error(data?.message || `Admin request failed with status ${response.status}`);
    }
    return data;
  }

  function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.classList.toggle('text-red-700', type === 'error');
    setTimeout(() => toast.classList.add('hidden'), 3000);
  }

  function formatDate(value) {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'Date unavailable';
  }

  function renderStars(rating) {
    const value = Math.max(0, Math.min(5, Number(rating) || 0));
    return `<span class="rating-stars" aria-label="${value} out of 5 stars">${'★'.repeat(value)}${'☆'.repeat(5 - value)}</span>`;
  }

  function statusClass(status) {
    const normalized = String(status || 'Pending').toLowerCase();
    return `status-${['published', 'pending', 'reported', 'hidden', 'removed'].includes(normalized) ? normalized : 'pending'}`;
  }

  function getFilters() {
    return {
      search: document.getElementById('searchInput')?.value.trim() || '',
      status: document.getElementById('statusFilter')?.value || 'all',
      rating: document.getElementById('ratingFilter')?.value || 'all',
      category: document.getElementById('categoryFilter')?.value || 'all',
      date: document.getElementById('dateRangeInput')?.value || '',
      seller: document.getElementById('sellerFilter')?.value || 'all',
      buyer: document.getElementById('buyerFilter')?.value || 'all'
    };
  }

  function setLoadingRow() {
    const body = document.getElementById('reviewsTableBody');
    if (!body) return;
    body.innerHTML = '<tr><td colspan="11" class="px-4 py-16 text-center text-sm text-slate-500">Loading reviews…</td></tr>';
  }

  function setErrorRow(message) {
    const body = document.getElementById('reviewsTableBody');
    if (!body) return;
    body.innerHTML = `<tr><td colspan="11" class="px-4 py-12 text-center">
      <p class="mb-3 text-sm text-red-700">${escapeHtml(message)}</p>
      <button id="retryReviewsBtn" type="button" class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white">Retry</button>
    </td></tr>`;
    document.getElementById('retryReviewsBtn')?.addEventListener('click', () => loadReviews());
  }

  function renderPagination() {
    const container = document.getElementById('reviewsPagination');
    if (!container) return;
    const start = state.total ? ((state.page - 1) * PAGE_SIZE) + 1 : 0;
    const end = Math.min(state.page * PAGE_SIZE, state.total);
    container.innerHTML = `
      <span class="text-sm text-slate-500">Showing ${start}–${end} of ${state.total}</span>
      <div class="flex gap-2">
        <button id="reviewsPrevPage" type="button" ${state.page <= 1 ? 'disabled' : ''} class="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-50">Previous</button>
        <span class="px-2 py-2 text-sm text-slate-600">Page ${state.page} of ${state.totalPages}</span>
        <button id="reviewsNextPage" type="button" ${state.page >= state.totalPages ? 'disabled' : ''} class="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-50">Next</button>
      </div>`;
    document.getElementById('reviewsPrevPage')?.addEventListener('click', () => {
      if (state.page > 1) {
        state.page -= 1;
        loadReviews();
      }
    });
    document.getElementById('reviewsNextPage')?.addEventListener('click', () => {
      if (state.page < state.totalPages) {
        state.page += 1;
        loadReviews();
      }
    });
  }

  function renderReviewRows() {
    const body = document.getElementById('reviewsTableBody');
    if (!body) return;
    if (!state.reviews.length) {
      body.innerHTML = `<tr><td colspan="11" class="px-4 py-16 text-center">
        <h3 class="text-lg font-semibold text-slate-800">No reviews found.</h3>
        <p class="mt-2 text-sm text-slate-500">Try adjusting the filters or clear them to see the full queue.</p>
      </td></tr>`;
      renderPagination();
      updateSelectionUi();
      return;
    }

    body.innerHTML = state.reviews.map(review => {
      const image = safeMediaUrl(review.productImage);
      const reviewText = String(review.review || '');
      return `<tr class="table-row bg-white hover:bg-slate-50">
        <td class="px-3 py-3"><input type="checkbox" class="review-checkbox h-4 w-4 rounded border-slate-300 text-blue-600" data-id="${escapeHtml(review.id)}" ${state.selectedIds.has(String(review.id)) ? 'checked' : ''}></td>
        <td class="px-3 py-3 text-sm font-medium text-slate-900">${escapeHtml(review.displayId || review.id)}</td>
        <td class="px-3 py-3"><div class="flex items-center gap-3">
          ${image ? `<img src="${escapeHtml(image)}" alt="" class="h-10 w-10 rounded-xl object-cover">` : '<span class="h-10 w-10 rounded-xl bg-slate-100"></span>'}
          <div><p class="text-sm font-semibold text-slate-900">${escapeHtml(review.product || 'Product')}</p><p class="text-xs text-slate-500">${escapeHtml(review.category || 'Uncategorized')}</p></div>
        </div></td>
        <td class="px-3 py-3 text-sm text-slate-600">${escapeHtml(review.buyer || 'Buyer')}</td>
        <td class="px-3 py-3 text-sm text-slate-600">${escapeHtml(review.seller || '—')}</td>
        <td class="px-3 py-3 text-sm">${renderStars(review.rating)}</td>
        <td class="px-3 py-3"><p class="max-w-[220px] text-sm text-slate-600">${escapeHtml(reviewText.length > 100 ? `${reviewText.slice(0, 100)}…` : reviewText)}</p></td>
        <td class="px-3 py-3"><span class="status-pill ${statusClass(review.status)}">${escapeHtml(review.status || 'Pending')}</span></td>
        <td class="px-3 py-3"><span class="report-badge">${Number(review.reports) || 0}</span></td>
        <td class="px-3 py-3 text-sm text-slate-500">${escapeHtml(formatDate(review.created))}</td>
        <td class="px-3 py-3 text-sm"><div class="flex flex-wrap items-center gap-2">
          <button class="view-btn rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" data-id="${escapeHtml(review.id)}"><i class="fas fa-eye mr-2"></i>View</button>
          <button class="approve-btn rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50" data-id="${escapeHtml(review.id)}">Approve</button>
        </div></td>
      </tr>`;
    }).join('');

    body.querySelectorAll('.view-btn').forEach(button => button.addEventListener('click', () => openReviewModal(button.dataset.id)));
    body.querySelectorAll('.approve-btn').forEach(button => button.addEventListener('click', () => applyReviewAction(button.dataset.id, 'approve')));
    body.querySelectorAll('.review-checkbox').forEach(checkbox => checkbox.addEventListener('change', () => {
      if (checkbox.checked) state.selectedIds.add(String(checkbox.dataset.id));
      else state.selectedIds.delete(String(checkbox.dataset.id));
      updateSelectionUi();
    }));
    renderPagination();
    updateSelectionUi();
  }

  function updateSelectionUi() {
    const count = state.selectedIds.size;
    const countElement = document.getElementById('selectionCount');
    const selectAll = document.getElementById('selectAllCheckbox');
    if (countElement) countElement.textContent = `${count} selected`;
    if (selectAll) {
      selectAll.checked = state.reviews.length > 0 &&
        state.reviews.every(review => state.selectedIds.has(String(review.id)));
    }
  }

  function renderSummary(data) {
    const summary = data?.data || {};
    const cards = [
      { title: 'Total Reviews', value: summary.total ?? '—', detail: 'All reviews' },
      { title: 'Pending Moderation', value: summary.pending ?? '—', detail: 'Awaiting review' },
      { title: 'Reported Reviews', value: summary.reported ?? '—', detail: 'Open reports' },
      { title: 'Removed Reviews', value: summary.removed ?? '—', detail: 'Removed' },
      { title: 'Published Reviews', value: summary.published ?? '—', detail: 'Visible publicly' },
      { title: 'Average Marketplace Rating', value: summary.avgRating == null ? '—' : `${summary.avgRating}/5`, detail: 'Marketplace average' }
    ];
    const container = document.getElementById('summaryCards');
    if (container) container.innerHTML = cards.map(card => `
      <div class="metric-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-sm text-slate-500">${card.title}</p>
        <p class="mt-2 text-2xl font-semibold text-slate-900">${escapeHtml(card.value)}</p>
        <p class="mt-1 text-xs text-slate-500">${card.detail}</p>
      </div>`).join('');

    const analytics = document.getElementById('analyticsPanel');
    if (analytics) {
      const items = Array.isArray(summary.analytics) ? summary.analytics : [];
      analytics.innerHTML = items.length ? items.map(item => `
        <div class="analytics-card rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p class="text-sm text-slate-500">${escapeHtml(item.title)}</p>
          <p class="mt-2 text-xl font-semibold text-slate-900">${escapeHtml(item.value)}</p>
          <p class="mt-1 text-sm text-slate-500">${escapeHtml(item.detail)}</p>
        </div>`).join('') : '<p class="text-sm text-slate-500">No analytics available.</p>';
    }
    const pulse = document.getElementById('pulseCards');
    if (pulse) {
      const items = Array.isArray(summary.pulse) ? summary.pulse : [];
      pulse.innerHTML = items.length ? items.map(item => `
        <div class="rounded-2xl border border-slate-200 bg-white p-3">
          <div class="flex items-center justify-between"><p class="text-sm font-semibold text-slate-900">${escapeHtml(item.title)}</p><span class="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase text-blue-700">${escapeHtml(item.value)}</span></div>
        </div>`).join('') : '<p class="text-sm text-slate-500">No moderation signals available.</p>';
    }
  }

  function setFilterOptions(selectId, values, label, valueKey = 'id', nameKey = 'name') {
    const select = document.getElementById(selectId);
    if (!select) return;
    const current = select.value;
    select.replaceChildren(new Option(label, 'all'));
    for (const item of values) {
      const value = typeof item === 'string' ? item : item[valueKey];
      const name = typeof item === 'string' ? item : item[nameKey];
      select.add(new Option(name || value, value));
    }
    if ([...select.options].some(option => option.value === current)) select.value = current;
  }

  async function loadMeta() {
    try {
      const response = await apiRequest('/admin/reviews/meta');
      const data = response.data || {};
      setFilterOptions('categoryFilter', data.categories || [], 'All Categories');
      setFilterOptions('sellerFilter', data.sellers || [], 'All Sellers');
      setFilterOptions('buyerFilter', data.buyers || [], 'All Buyers');
    } catch (error) {
      console.error('Admin review filters could not be loaded:', error);
      setFilterOptions('categoryFilter', [], 'All Categories');
      setFilterOptions('sellerFilter', [], 'All Sellers');
      setFilterOptions('buyerFilter', [], 'All Buyers');
      showToast(error.message || 'Review filter options could not be loaded.', 'error');
    }
  }

  async function loadReviews() {
    const requestId = ++state.requestSequence;
    state.loading = true;
    setLoadingRow();
    try {
      const params = new URLSearchParams({ page: String(state.page), limit: String(PAGE_SIZE) });
      for (const [key, value] of Object.entries(getFilters())) {
        if (value && value !== 'all') params.set(key, value);
      }
      const listResponse = await apiRequest(`/admin/reviews?${params}`);
      if (requestId !== state.requestSequence) return;
      const data = listResponse.data || {};
      if (!Array.isArray(data.reviews)) throw new Error('The review list response was invalid.');
      state.reviews = data.reviews;
      state.total = Number(data.total) || 0;
      state.page = Number(data.page) || state.page;
      state.totalPages = Math.max(1, Math.ceil(state.total / PAGE_SIZE));
      const currentIds = new Set(state.reviews.map(review => String(review.id)));
      state.selectedIds = new Set([...state.selectedIds].filter(id => currentIds.has(id)));
      renderReviewRows();
      apiRequest('/admin/reviews/summary')
        .then(renderSummary)
        .catch(error => {
          console.error('Admin review summary could not be loaded:', error);
          const summary = document.getElementById('summaryCards');
          if (summary) summary.innerHTML = '<p class="text-sm text-red-700">Review summary could not be loaded.</p>';
        });
    } catch (error) {
      if (requestId !== state.requestSequence) return;
      console.error('Admin reviews could not be loaded:', error);
      state.reviews = [];
      state.selectedIds.clear();
      setErrorRow(error.message || 'Reviews could not be loaded.');
      const pagination = document.getElementById('reviewsPagination');
      if (pagination) pagination.replaceChildren();
      updateSelectionUi();
    } finally {
      if (requestId === state.requestSequence) state.loading = false;
    }
  }

  function fillMetaReview(review) {
    const productImage = document.getElementById('modalProductImage');
    const safeImage = safeMediaUrl(review.productImage);
    productImage.src = safeImage || '';
    productImage.hidden = !safeImage;
    document.getElementById('modalTitle').textContent = `${review.displayId || review.id} • ${review.title || review.product || 'Review'}`;
    document.getElementById('modalProductName').textContent = review.product || 'Product';
    document.getElementById('modalCategory').textContent = review.category || 'Uncategorized';
    document.getElementById('modalOrderId').textContent = review.orderId || '—';
    document.getElementById('modalVerified').textContent = review.verified ? 'Purchase Verified' : 'Unverified';
    document.getElementById('modalRating').textContent = `${Number(review.rating) || 0}/5`;
    const status = document.getElementById('modalStatusBadge');
    status.className = `status-pill ${statusClass(review.status)}`;
    status.textContent = review.status || 'Pending';
    document.getElementById('modalParties').innerHTML = `
      <div class="rounded-xl border border-slate-200 bg-slate-50 p-3"><p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Buyer</p>
        <p class="mt-2 font-semibold text-slate-900">${escapeHtml(review.buyer || 'Buyer')}</p><p class="text-sm text-slate-600">${escapeHtml(review.buyerEmail || '')}</p></div>
      <div class="rounded-xl border border-slate-200 bg-slate-50 p-3"><p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Seller</p>
        <p class="mt-2 font-semibold text-slate-900">${escapeHtml(review.seller || '—')}</p><p class="text-sm text-slate-600">${escapeHtml(review.sellerEmail || '')}</p></div>`;
    document.getElementById('modalSummary').innerHTML = `
      <div class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span>Reports</span><strong>${Number(review.reports) || 0}</strong></div>
      <div class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span>Created</span><strong>${escapeHtml(formatDate(review.created))}</strong></div>
      <div class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span>Updated</span><strong>${escapeHtml(formatDate(review.updated))}</strong></div>`;
    document.getElementById('modalReviewText').textContent = review.review || '';
    document.getElementById('adminNotesInput').value = review.adminNotes || '';
    renderDetailSections(review);
  }

  function renderDetailSections(review) {
    const media = review.media || {};
    const images = Array.isArray(media.images) ? media.images : [];
    const videos = Array.isArray(media.videos) ? media.videos : [];
    const evidence = document.getElementById('modalEvidence');
    evidence.innerHTML = [
      ...images.map(url => {
        const safeUrl = safeMediaUrl(url);
        return safeUrl ? `<div class="rounded-2xl border border-slate-200 p-2"><button type="button" class="review-evidence-image" data-evidence-image="${escapeHtml(safeUrl)}" aria-label="View review evidence image"><img src="${escapeHtml(safeUrl)}" alt="Review media" class="h-32 w-full rounded-xl object-cover"></button></div>` : '';
      }),
      ...videos.map(url => {
        const safeUrl = safeMediaUrl(url);
        return safeUrl ? `<div class="rounded-2xl border border-slate-200 p-2"><video controls preload="none" class="h-32 w-full rounded-xl object-cover" src="${escapeHtml(safeUrl)}"></video></div>` : '';
      })
    ].filter(Boolean).join('') || '<div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-sm text-slate-500">No media attached.</div>';

    const reports = Array.isArray(review.reportHistory) ? review.reportHistory : [];
    document.getElementById('modalReportHistory').innerHTML = reports.length ? reports.map(item => `
      <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div class="flex items-center justify-between"><p class="text-sm font-semibold text-slate-900">${escapeHtml(item.reason)}</p><span class="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase text-amber-700">${escapeHtml(item.status)}</span></div>
        <p class="mt-2 text-sm text-slate-600">Reported by ${escapeHtml(item.reporter)} on ${escapeHtml(formatDate(item.date))}</p>
        <p class="mt-1 text-sm text-slate-600">${escapeHtml(item.details || '')}</p>
      </div>`).join('') : '<p class="text-sm text-slate-500">No reports recorded.</p>';

    const timeline = Array.isArray(review.timeline) ? review.timeline : [];
    document.getElementById('modalTimeline').innerHTML = timeline.map(entry => `
      <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div class="flex items-center justify-between"><p class="text-sm font-semibold text-slate-900">${escapeHtml(entry.event)}</p><span class="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase text-blue-700">${escapeHtml(entry.status)}</span></div>
        <p class="mt-2 text-sm text-slate-600">${escapeHtml(entry.admin)} • ${escapeHtml(formatDate(entry.date))}</p>
      </div>`).join('') || '<p class="text-sm text-slate-500">No timeline available.</p>';

    const history = Array.isArray(review.history) ? review.history : [];
    document.getElementById('modalHistory').innerHTML = history.map(entry => `
      <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div class="flex items-center justify-between"><p class="text-sm font-semibold text-slate-900">${escapeHtml(entry.event)}</p><span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase text-slate-600">${escapeHtml(entry.status)}</span></div>
        <p class="mt-2 text-sm text-slate-600">${escapeHtml(entry.admin)} • ${escapeHtml(formatDate(entry.date))}</p>
      </div>`).join('') || '<p class="text-sm text-slate-500">No moderation history available.</p>';
  }

  async function openReviewModal(reviewId) {
    const review = state.reviews.find(item => String(item.id) === String(reviewId));
    if (!review) return;
    state.selectedReview = review;
    fillMetaReview(review);
    document.getElementById('reviewModal').classList.remove('hidden');
    try {
      const response = await apiRequest(`/admin/reviews/${encodeURIComponent(review.id)}`);
      if (state.selectedReview?.id !== review.id) return;
      state.selectedReview = response.data?.review || review;
      fillMetaReview(state.selectedReview);
    } catch (error) {
      console.error('Review details could not be loaded:', error);
      showToast(error.message || 'Review details could not be loaded.', 'error');
    }
  }

  function closeReviewModal() {
    const modal = document.getElementById('reviewModal');
    if (modal) modal.classList.add('hidden');
    state.selectedReview = null;
  }

  function openEvidenceImage(url) {
    let viewer = document.getElementById('evidenceImageViewer');
    if (!viewer) {
      viewer = document.createElement('div');
      viewer.id = 'evidenceImageViewer';
      viewer.className = 'evidence-image-viewer hidden';
      viewer.setAttribute('role', 'dialog');
      viewer.setAttribute('aria-modal', 'true');
      viewer.setAttribute('aria-label', 'Review evidence image');
      viewer.innerHTML = `
        <button type="button" class="evidence-image-viewer-close" data-close-evidence aria-label="Close image">&times;</button>
        <img class="evidence-image-viewer-content" alt="Review evidence">
      `;
      viewer.addEventListener('click', event => {
        if (event.target === viewer || event.target.closest('[data-close-evidence]')) {
          viewer.classList.add('hidden');
        }
      });
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape') viewer.classList.add('hidden');
      });
      document.body.appendChild(viewer);
    }

    viewer.querySelector('img').src = url;
    viewer.classList.remove('hidden');
  }

  async function applyReviewAction(reviewId, action) {
    if (!reviewId) return;
    try {
      const note = document.getElementById('adminNotesInput')?.value || '';
      await apiRequest(`/admin/reviews/${encodeURIComponent(reviewId)}/action`, {
        method: 'POST',
        body: JSON.stringify({ action, note })
      });
      showToast('Review moderation action saved.', 'success');
      await loadReviews();
      if (!document.getElementById('reviewModal').classList.contains('hidden')) {
        await openReviewModal(reviewId);
      }
    } catch (error) {
      console.error('Review moderation action failed:', error);
      showToast(error.message || 'Review action could not be saved.', 'error');
    }
  }

  async function bulkAction(action) {
    const ids = [...state.selectedIds];
    if (!ids.length) {
      showToast('Select one or more reviews first.', 'error');
      return;
    }
    const backendAction = action === 'delete' ? 'remove' : action;
    try {
      await apiRequest('/admin/reviews/bulk', {
        method: 'POST',
        body: JSON.stringify({ ids, action: backendAction })
      });
      state.selectedIds.clear();
      showToast(`${ids.length} review(s) updated.`, 'success');
      await loadReviews();
    } catch (error) {
      console.error('Bulk review action failed:', error);
      showToast(error.message || 'Bulk review action could not be saved.', 'error');
    }
  }

  async function saveNotes() {
    const review = state.selectedReview;
    if (!review) return;
    const button = document.getElementById('saveNotesBtn');
    button.disabled = true;
    try {
      const notes = document.getElementById('adminNotesInput').value;
      await apiRequest(`/admin/reviews/${encodeURIComponent(review.id)}/notes`, {
        method: 'PUT',
        body: JSON.stringify({ notes })
      });
      review.adminNotes = notes;
      showToast('Admin notes saved.', 'success');
    } catch (error) {
      console.error('Review notes save failed:', error);
      showToast(error.message || 'Admin notes could not be saved.', 'error');
    } finally {
      button.disabled = false;
    }
  }

  async function exportReviews(format) {
    if (format === 'print' || format === 'pdf') {
      window.print();
      return;
    }
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(getFilters())) {
      if (value && value !== 'all') params.set(key, value);
    }
    if (state.selectedIds.size) params.set('ids', [...state.selectedIds].join(','));

    try {
      const response = await fetch(`${getApiBase()}/admin/reviews/export?${params}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.message || `Export failed with status ${response.status}`);
      }
      const link = document.createElement('a');
      link.href = URL.createObjectURL(await response.blob());
      link.download = 'reviews-export.csv';
      link.click();
      URL.revokeObjectURL(link.href);
      showToast('Review export downloaded.', 'success');
    } catch (error) {
      console.error('Review export failed:', error);
      showToast(error.message || 'Review export could not be downloaded.', 'error');
    }
  }

  function resetFilters() {
    ['searchInput', 'dateRangeInput'].forEach(id => {
      const control = document.getElementById(id);
      if (control) control.value = '';
    });
    ['statusFilter', 'ratingFilter', 'categoryFilter', 'sellerFilter', 'buyerFilter'].forEach(id => {
      const control = document.getElementById(id);
      if (control) control.value = 'all';
    });
    state.page = 1;
    state.selectedIds.clear();
    loadReviews();
  }

  function attachEvents(root) {
    const listen = (id, eventName, handler) => {
      const element = document.getElementById(id);
      if (element && element.dataset.reviewsBound !== 'true') {
        element.dataset.reviewsBound = 'true';
        element.addEventListener(eventName, handler);
      }
    };
    const filterChange = () => {
      state.page = 1;
      state.selectedIds.clear();
      loadReviews();
    };
    listen('searchInput', 'input', () => {
      clearTimeout(state.searchTimer);
      state.searchTimer = setTimeout(filterChange, 300);
    });
    ['statusFilter', 'ratingFilter', 'categoryFilter', 'dateRangeInput', 'sellerFilter', 'buyerFilter'].forEach(id => {
      listen(id, 'change', filterChange);
    });
    listen('resetFiltersBtn', 'click', resetFilters);
    listen('refreshDataBtn', 'click', () => {
      state.page = 1;
      loadMeta();
      loadReviews();
    });
    listen('selectAllCheckbox', 'change', event => {
      state.reviews.forEach(review => {
        if (event.target.checked) state.selectedIds.add(String(review.id));
        else state.selectedIds.delete(String(review.id));
      });
      renderReviewRows();
    });
    listen('exportToggle', 'click', () => document.getElementById('exportMenu').classList.toggle('hidden'));
    document.querySelectorAll('.export-option').forEach(button => button.addEventListener('click', () => {
      exportReviews(button.dataset.format);
      document.getElementById('exportMenu').classList.add('hidden');
    }));
    document.querySelectorAll('.bulk-action').forEach(button => button.addEventListener('click', () => {
      const action = button.dataset.action;
      if (action === 'export') exportReviews('csv');
      else bulkAction(action);
    }));
    document.getElementById('modalEvidence')?.addEventListener('click', event => {
      const imageButton = event.target.closest('button[data-evidence-image]');
      if (imageButton) openEvidenceImage(imageButton.dataset.evidenceImage);
    });
    document.querySelectorAll('[data-close-modal]').forEach(element => element.addEventListener('click', closeReviewModal));
    listen('saveNotesBtn', 'click', saveNotes);
    document.querySelectorAll('.moderation-btn').forEach(button => button.addEventListener('click', () => {
      if (state.selectedReview) applyReviewAction(state.selectedReview.id, button.dataset.action);
    }));
  }

  async function initializeReviewsPage() {
    const root = document.getElementById('reviewsTableBody');
    if (!root || state.initializedRoot === root) return;
    state.initializedRoot = root;
    state.reviews = [];
    state.selectedIds.clear();
    state.page = 1;

    const tableWrapper = root.closest('.overflow-hidden');
    if (tableWrapper && !document.getElementById('reviewsPagination')) {
      const pagination = document.createElement('div');
      pagination.id = 'reviewsPagination';
      pagination.className = 'flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3';
      tableWrapper.after(pagination);
    }
    attachEvents(root);
    setLoadingRow();
    await Promise.all([loadMeta(), loadReviews()]);
  }

  window.initializeReviewsPage = initializeReviewsPage;
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
      if (document.getElementById('reviewsTableBody')) initializeReviewsPage();
    });
  } else if (document.getElementById('reviewsTableBody')) {
    initializeReviewsPage();
  }
})();
