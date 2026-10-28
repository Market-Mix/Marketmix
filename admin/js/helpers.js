// Product actions: toggle status, delete
function toggleProductStatus(id) {
  const p = dummyData.products.find(x => x.id === id);
  if (!p) return showToast('Product not found', 'error');
  p.status = p.status === 'Active' ? 'Inactive' : 'Active';
  showToast(`Product ${p.status === 'Active' ? 'activated' : 'deactivated'}`);
  if (currentPage === 'products') renderProducts(); else if (typeof viewProduct === 'function') try { viewProduct(id); } catch(e){}
}

function deleteProduct(id) {
  const idx = dummyData.products.findIndex(x => x.id === id);
  if (idx === -1) return showToast('Product not found', 'error');
  dummyData.products.splice(idx, 1);
  showToast('Product deleted');
  renderProducts();
}

const adminNotificationState = {
  items: [],
  unreadCount: 0,
  filter: 'all',
  loading: false,
  error: '',
  pendingReads: new Set(),
  pendingOpens: new Set(),
  markAllPending: false,
  pollTimer: null
};

const adminNotificationApiBase = window.ADMIN_API_BASE || (window.location.protocol === 'file:'
  ? 'http://localhost:5000/api'
  : 'https://marketmix-backend.onrender.com/api');

function adminNotificationHeaders() {
  if (typeof getAdminAuthHeaders === 'function') return getAdminAuthHeaders();
  const token = window.ADMIN_AUTH_TOKEN || localStorage.getItem('adminToken') || localStorage.getItem('token') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function escapeAdminNotificationText(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[character]);
}

function updateAdminNotificationBadge() {
  const badge = document.getElementById('adminNotificationBadge');
  if (!badge) return;
  const count = Math.max(0, Number(adminNotificationState.unreadCount) || 0);
  badge.textContent = String(count);
  badge.classList.toggle('hidden', count === 0);
  badge.classList.toggle('flex', count > 0);
  badge.setAttribute('aria-label', `${count} unread notifications`);
}

function notificationTimeLabel(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : 'Date unavailable';
}

function notificationIcon(type) {
  const value = String(type || '').toLowerCase();
  if (value.includes('refund') || value.includes('return')) return 'fa-rotate-left';
  if (value.includes('support') || value.includes('ticket')) return 'fa-headset';
  if (value.includes('seller') || value.includes('kyc')) return 'fa-store';
  if (value.includes('product')) return 'fa-box';
  if (value.includes('order')) return 'fa-receipt';
  if (value.includes('withdraw')) return 'fa-money-bill-transfer';
  return 'fa-circle-info';
}

function filteredAdminNotifications() {
  if (adminNotificationState.filter === 'unread') return adminNotificationState.items.filter(item => !item.isRead);
  if (adminNotificationState.filter === 'read') return adminNotificationState.items.filter(item => item.isRead);
  return adminNotificationState.items;
}

function renderAdminNotificationOverlay() {
  const overlay = document.getElementById('adminNotificationOverlay');
  if (!overlay) return;

  const items = filteredAdminNotifications();
  const count = adminNotificationState.unreadCount;
  const message = adminNotificationState.error
    ? `<div class="mx-5 mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">${escapeAdminNotificationText(adminNotificationState.error)} <button type="button" data-notification-retry class="ml-2 font-semibold underline">Retry</button></div>`
    : '';
  const stateMessage = adminNotificationState.error && !adminNotificationState.items.length
    ? ''
    : adminNotificationState.loading && !adminNotificationState.items.length
    ? '<div class="px-6 py-12 text-center text-sm text-gray-500">Loading notifications...</div>'
    : !items.length
      ? `<div class="px-6 py-12 text-center text-sm text-gray-500">${adminNotificationState.items.length === 0 ? 'No notifications yet.' : count === 0 ? "You're all caught up." : 'No notifications in this filter.'}</div>`
      : '';
  const rows = items.map(item => {
    const id = escapeAdminNotificationText(item.id);
    const title = escapeAdminNotificationText(item.title || 'Notification');
    const description = escapeAdminNotificationText(item.message || '');
    const type = escapeAdminNotificationText(item.type || 'General');
    const timestamp = escapeAdminNotificationText(notificationTimeLabel(item.createdAt));
    const readState = item.isRead ? 'bg-white' : 'bg-blue-50/70';
    const dot = item.isRead ? '' : '<span class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-label="Unread"></span>';
    return `<button type="button" data-admin-notification-id="${id}" class="flex w-full gap-3 border-b border-gray-100 px-5 py-4 text-left transition hover:bg-blue-50 ${readState}" ${adminNotificationState.pendingReads.has(String(item.id)) || adminNotificationState.markAllPending ? 'disabled' : ''}>
      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700"><i class="fas ${notificationIcon(item.type)}" aria-hidden="true"></i></span>
      <span class="min-w-0 flex-1"><span class="flex items-start justify-between gap-3"><span class="font-semibold text-gray-900">${title}</span>${dot}</span>
        <span class="mt-1 block text-sm leading-5 text-gray-600">${description}</span>
        <span class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500"><span class="rounded-sm bg-gray-100 px-2 py-0.5">${type}</span><time>${timestamp}</time></span>
      </span>
    </button>`;
  }).join('');

  overlay.querySelector('[data-notification-unread-count]').textContent = `${count} unread`;
  overlay.querySelector('[data-notification-mark-all]').disabled = count === 0 || adminNotificationState.loading || adminNotificationState.markAllPending;
  overlay.querySelector('[data-notification-mark-all]').classList.toggle('opacity-50', count === 0 || adminNotificationState.loading || adminNotificationState.markAllPending);
  overlay.querySelectorAll('[data-notification-filter]').forEach(button => {
    const active = button.dataset.notificationFilter === adminNotificationState.filter;
    button.classList.toggle('border-blue-600', active);
    button.classList.toggle('text-blue-700', active);
    button.classList.toggle('border-transparent', !active);
    button.setAttribute('aria-pressed', String(active));
  });
  overlay.querySelector('[data-notification-error]').innerHTML = message;
  overlay.querySelector('[data-notification-list]').innerHTML = stateMessage || rows;
  overlay.querySelector('[data-notification-list]').setAttribute('aria-busy', String(adminNotificationState.loading));
}

function closeAdminNotificationOverlay() {
  document.getElementById('adminNotificationOverlay')?.remove();
  document.getElementById('adminNotificationBell')?.setAttribute('aria-expanded', 'false');
}

function createAdminNotificationOverlay() {
  if (document.getElementById('adminNotificationOverlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'adminNotificationOverlay';
  overlay.className = 'fixed inset-0 z-[100] flex justify-end bg-gray-900/40';
  overlay.setAttribute('role', 'presentation');
  overlay.innerHTML = `<section class="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="adminNotificationTitle">
    <header class="border-b border-gray-200 px-5 py-4 sm:px-6">
      <div class="flex items-start justify-between gap-4">
        <div><h2 id="adminNotificationTitle" class="text-lg font-semibold text-gray-900">Notifications</h2><p data-notification-unread-count class="mt-1 text-sm text-gray-500">0 unread</p></div>
        <div class="flex items-center gap-3"><button type="button" data-notification-mark-all class="text-sm font-semibold text-blue-700 hover:text-blue-800">Mark all as read</button><button type="button" data-notification-close aria-label="Close notifications" class="flex h-9 w-9 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-900"><i class="fas fa-xmark" aria-hidden="true"></i></button></div>
      </div>
      <div class="mt-4 flex gap-5 border-b border-gray-200" role="tablist" aria-label="Notification filters">
        <button type="button" data-notification-filter="all" role="tab" aria-pressed="true" class="border-b-2 border-blue-600 px-1 pb-2 text-sm font-medium text-blue-700">All</button>
        <button type="button" data-notification-filter="unread" role="tab" aria-pressed="false" class="border-b-2 border-transparent px-1 pb-2 text-sm font-medium text-gray-500 hover:text-gray-800">Unread</button>
        <button type="button" data-notification-filter="read" role="tab" aria-pressed="false" class="border-b-2 border-transparent px-1 pb-2 text-sm font-medium text-gray-500 hover:text-gray-800">Read</button>
      </div>
    </header>
    <div data-notification-error></div>
    <div data-notification-list class="min-h-0 flex-1 overflow-y-auto" aria-live="polite"></div>
  </section>`;
  overlay.addEventListener('click', event => {
    if (event.target === overlay || event.target.closest('[data-notification-close]')) {
      closeAdminNotificationOverlay();
      return;
    }
    const filterButton = event.target.closest('[data-notification-filter]');
    if (filterButton) {
      adminNotificationState.filter = filterButton.dataset.notificationFilter;
      renderAdminNotificationOverlay();
      return;
    }
    if (event.target.closest('[data-notification-retry]')) {
      refreshAdminNotifications();
      return;
    }
    if (event.target.closest('[data-notification-mark-all]')) {
      markAllAdminNotificationsRead();
      return;
    }
    const notificationButton = event.target.closest('[data-admin-notification-id]');
    if (notificationButton) openAdminNotification(notificationButton.dataset.adminNotificationId);
  });
  document.body.appendChild(overlay);
  document.getElementById('adminNotificationBell')?.setAttribute('aria-expanded', 'true');
  renderAdminNotificationOverlay();
}

function toggleNotificationBell() {
  if (document.getElementById('adminNotificationOverlay')) {
    closeAdminNotificationOverlay();
    return;
  }
  createAdminNotificationOverlay();
  refreshAdminNotifications();
}

async function refreshAdminNotifications() {
  if (adminNotificationState.loading || adminNotificationState.pendingReads.size || adminNotificationState.markAllPending) return;
  adminNotificationState.loading = true;
  adminNotificationState.error = '';
  renderAdminNotificationOverlay();
  try {
    const response = await fetch(`${adminNotificationApiBase}/notifications`, { headers: adminNotificationHeaders() });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(response.status === 401 ? 'Your session has expired. Sign in again to load notifications.' : body?.message || 'Unable to load notifications.');
    const data = body?.data || {};
    adminNotificationState.items = Array.isArray(data.notifications) ? data.notifications : [];
    adminNotificationState.unreadCount = Math.max(0, Number(data.unreadCount) || 0);
    updateAdminNotificationBadge();
  } catch (error) {
    adminNotificationState.error = error.message || 'Unable to load notifications.';
  } finally {
    adminNotificationState.loading = false;
    renderAdminNotificationOverlay();
  }
}

async function markAllAdminNotificationsRead() {
  if (!adminNotificationState.unreadCount || adminNotificationState.markAllPending || adminNotificationState.pendingReads.size) return;
  adminNotificationState.markAllPending = true;
  adminNotificationState.error = '';
  renderAdminNotificationOverlay();
  try {
    const response = await fetch(`${adminNotificationApiBase}/notifications/read-all`, {
      method: 'PUT',
      headers: { ...adminNotificationHeaders(), 'Content-Type': 'application/json' }
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(response.status === 401 ? 'Your session has expired. Sign in again.' : body?.message || 'Could not mark notifications as read.');
    const updatedCount = Math.max(0, Number(body?.data?.updatedCount) || 0);
    adminNotificationState.unreadCount = Math.max(0, adminNotificationState.unreadCount - updatedCount);
    adminNotificationState.items = adminNotificationState.items.map(item => ({ ...item, isRead: true }));
    adminNotificationState.error = '';
    updateAdminNotificationBadge();
  } catch (error) {
    adminNotificationState.error = error.message || 'Could not mark notifications as read.';
  } finally {
    adminNotificationState.markAllPending = false;
  }
  renderAdminNotificationOverlay();
}

function resolveAdminNotificationDestination(notification) {
  const type = String(notification.type || '').toLowerCase();
  let linkUrl = null;
  try {
    if (notification.link) linkUrl = new URL(notification.link, window.location.origin);
  } catch (error) {
    linkUrl = null;
  }

  let page = null;
  if (linkUrl && linkUrl.pathname.toLowerCase().startsWith('/admin/')) {
    const route = linkUrl.pathname.toLowerCase().split('/').filter(Boolean)[1];
    const routes = { sellers: 'sellers', products: 'products', orders: 'orders', withdrawals: 'withdrawals', refunds: 'returns', returns: 'returns', support: 'support-center' };
    page = routes[route] || null;
  }
  if (!page) {
    if (type.includes('refund') || type.includes('return')) page = 'returns';
    else if (type.includes('support') || type.includes('ticket')) page = 'support-center';
    else if (type.includes('seller') || type.includes('kyc')) page = 'sellers';
    else if (type.includes('product')) page = 'products';
    else if (type.includes('order')) page = 'orders';
    else if (type.includes('withdraw')) page = 'withdrawals';
    else if (type.includes('system')) page = 'dashboard';
  }

  return {
    page,
    recordId: notification.referenceId || linkUrl?.searchParams.get('reference_id') || linkUrl?.searchParams.get('ref') || null
  };
}

async function navigateToAdminNotification(notification) {
  const destination = resolveAdminNotificationDestination(notification);
  if (!destination.page || typeof loadPage !== 'function') return false;

  closeAdminNotificationOverlay();
  if (destination.page === 'returns' && destination.recordId && typeof fetchAdminRefundCases === 'function' && typeof viewReturn === 'function') {
    loadPage('returns');
    await fetchAdminRefundCases();
    await viewReturn(String(destination.recordId));
    return true;
  }
  if (destination.page === 'orders' && destination.recordId && typeof viewAdminOrder === 'function') {
    loadPage('orders');
    await viewAdminOrder(String(destination.recordId));
    return true;
  }
  if (destination.page === 'sellers' && destination.recordId && typeof viewAdminSeller === 'function') {
    loadPage('sellers');
    await viewAdminSeller(String(destination.recordId));
    return true;
  }
  loadPage(destination.page);
  return true;
}

async function openAdminNotification(notificationId) {
  const notification = adminNotificationState.items.find(item => String(item.id) === String(notificationId));
  const notificationKey = String(notificationId);
  if (!notification || adminNotificationState.pendingOpens.has(notificationKey)) return;

  adminNotificationState.pendingOpens.add(notificationKey);
  try {
    if (!notification.isRead) {
      adminNotificationState.pendingReads.add(notificationKey);
      adminNotificationState.error = '';
      renderAdminNotificationOverlay();
      try {
        const response = await fetch(`${adminNotificationApiBase}/notifications/${encodeURIComponent(notificationId)}/read`, {
          method: 'PUT',
          headers: { ...adminNotificationHeaders(), 'Content-Type': 'application/json' }
        });
        const body = await response.json().catch(() => null);
        if (!response.ok || body?.data?.notification?.isRead !== true) {
          throw new Error(response.status === 401 ? 'Your session has expired. Sign in again.' : body?.message || 'Could not mark this notification as read.');
        }
        notification.isRead = true;
        adminNotificationState.unreadCount = Math.max(0, adminNotificationState.unreadCount - 1);
        updateAdminNotificationBadge();
      } catch (error) {
        adminNotificationState.error = error.message || 'Could not mark this notification as read.';
        renderAdminNotificationOverlay();
        return;
      } finally {
        adminNotificationState.pendingReads.delete(notificationKey);
      }
    }

    if (await navigateToAdminNotification(notification)) return;
    renderAdminNotificationOverlay();
    const errorContainer = document.querySelector('#adminNotificationOverlay [data-notification-error]');
    if (errorContainer) {
      errorContainer.innerHTML = `<div class="mx-5 mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800"><strong>${escapeAdminNotificationText(notification.title || 'Notification')}</strong><p class="mt-1">${escapeAdminNotificationText(notification.message || '')}</p><p class="mt-2 text-xs">No admin destination is available for this notification.</p></div>`;
    }
  } finally {
    adminNotificationState.pendingOpens.delete(notificationKey);
    if (document.getElementById('adminNotificationOverlay')) renderAdminNotificationOverlay();
  }
}

function initializeAdminNotifications() {
  updateAdminNotificationBadge();
  refreshAdminNotifications();
  if (!adminNotificationState.pollTimer) {
    adminNotificationState.pollTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshAdminNotifications();
    }, 60000);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshAdminNotifications();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.getElementById('adminNotificationOverlay')) closeAdminNotificationOverlay();
  });
}

document.addEventListener('DOMContentLoaded', initializeAdminNotifications);

// Profile dropdown toggle
function toggleProfileDropdown() {
  const dropdown = document.getElementById('profileDropdown');
  if (!dropdown) return;
  dropdown.classList.toggle('hidden');

  // close when clicking outside
  if (!window._profileDropdownListenerAdded) {
    window._profileDropdownListenerAdded = true;
    document.addEventListener('click', (e) => {
      const open = document.getElementById('profileDropdown');
      if (!open || open.classList.contains('hidden')) return;
      if (e.target.closest && !e.target.closest('#profileDropdown') && !e.target.closest('button[onclick="toggleProfileDropdown()"]')) {
        open.classList.add('hidden');
      }
    });
  }
}
