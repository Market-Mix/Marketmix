// Shared buyer/seller notification helper
// This module provides a small notification manager for frontend pages.

const DEFAULT_API_BASE_URL = 'https://marketmix-backend.onrender.com/api';
const RESOLVED_API_BASE_URL = String(
  window.API_BASE_URL || window.CONFIG?.API_BASE_URL || DEFAULT_API_BASE_URL || ''
).replace(/\/$/, '');
window.API_BASE_URL = RESOLVED_API_BASE_URL;

function getToken() {
  return sessionStorage.getItem('token')
    || localStorage.getItem('token')
    || localStorage.getItem('buyer_token')
    || localStorage.getItem('seller_token')
    || '';
}

function getBuyerId() {
  try {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    const id = storedUser?.id || storedUser?.userId || storedUser?.buyerId || storedUser?.buyer_id || storedUser?.user_id;
    if (id) return String(id);
  } catch (err) {
    console.warn('notification-manager: invalid stored user', err);
  }

  const fallback = localStorage.getItem('buyerId')
    || localStorage.getItem('buyer_id')
    || localStorage.getItem('userId')
    || localStorage.getItem('user_id')
    || null;

  return fallback ? String(fallback) : null;
}

async function apiCall(path, options = {}) {
  const baseUrl = RESOLVED_API_BASE_URL || DEFAULT_API_BASE_URL;
  const url = path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
  const token = getToken();
  const init = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  };

  if (token) {
    init.headers = init.headers || {};
    init.headers.Authorization = init.headers.Authorization || `Bearer ${token}`;
  }

  if (init.body && typeof init.body !== 'string') {
    init.body = JSON.stringify(init.body);
  }

  try {
    const response = await fetch(url, init);
    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch (err) {
      data = text;
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
      error: response.ok ? null : (data?.message || data?.error || text || `HTTP ${response.status}`)
    };
  } catch (error) {
    return { ok: false, status: 0, data: null, error: error.message || String(error) };
  }
}

function updateNotificationBadge(count) {
  if (typeof document === 'undefined') return;
  const badge = document.querySelector('[data-notification-badge]');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

function updateWishlistBadge(count) {
  if (typeof document === 'undefined') return;
  const badge = document.querySelector('[data-wishlist-badge]');
  if (!badge) return;
  const normalized = Number(count) || 0;
  badge.textContent = normalized > 0 ? String(normalized) : '';
  badge.style.display = normalized > 0 ? 'inline-block' : 'none';
}

function updateTrackingBadge(count) {
  if (typeof document === 'undefined') return;
  const badge = document.querySelector('[data-tracking-badge]');
  if (!badge) return;
  const normalized = Number(count) || 0;
  badge.textContent = normalized > 0 ? String(normalized) : '';
  badge.style.display = normalized > 0 ? 'inline-block' : 'none';
}

function updateRefundBadge(count) {
  if (typeof document === 'undefined') return;
  // Some pages opt-out of NotificationManager refund updates
  if (window.skipNotificationRefundBadge) return;
  const badge = document.querySelector('[data-refund-badge]');
  if (!badge) return;
  const normalized = Number(count) || 0;
  badge.textContent = normalized > 0 ? String(normalized) : '';
  badge.style.display = normalized > 0 ? 'inline-block' : 'none';
}

async function initializeBadgeUpdates(buyerId) {
  if (typeof NotificationManager?.syncUnreadCounts === 'function') {
    await NotificationManager.syncUnreadCounts(buyerId);
  } else {
    const { unreadCount = 0 } = await fetchUnreadNotificationData();
    if (NotificationManager?.cache?.unreadCounts) {
      NotificationManager.cache.unreadCounts.totalUnread = Number(unreadCount) || 0;
    }
  }

  const count = Number(NotificationManager?.cache?.unreadCounts?.totalUnread || 0);
  updateNotificationBadge(count);

  if (typeof document === 'undefined') return count;
  const accountBadge = document.getElementById('accountNotificationBadge') || document.querySelector('[data-account-badge]');
  if (accountBadge) {
    accountBadge.textContent = count > 99 ? '99+' : String(count);
    accountBadge.style.display = count > 0 ? 'inline-flex' : 'none';
  }

  if (typeof window.updateAccountNotification === 'function') {
    window.updateAccountNotification(count);
  }

  return count;
}

async function fetchUnreadNotificationData() {
  const result = await apiCall('/notifications?unread=true');
  if (!result.ok) {
    console.warn('notification-manager: unread fetch failed', result.error);
    return { unreadCount: 0, notifications: [] };
  }

  // Backend responses may be wrapped as { status, message, data: {...} }
  const responseBody = result.data || {};
  const payload = (responseBody.data && typeof responseBody.data === 'object')
    ? responseBody.data
    : responseBody;

  return {
    unreadCount: Number(payload.unreadCount || 0),
    notifications: Array.isArray(payload.notifications) ? payload.notifications : []
  };
}

async function markNotificationRead(notificationId) {
  if (!notificationId) return false;
  const result = await apiCall(`/notifications/${encodeURIComponent(notificationId)}/read`, { method: 'PUT' });
  return result.ok;
}

async function markTypeAsRead(typeOrBuyerId, maybeType) {
  const type = maybeType || typeOrBuyerId;
  if (!type) return false;

  const result = await apiCall('/notifications?unread=true');
  if (!result.ok) return false;

  const responseBody = result.data || {};
  const payload = (responseBody.data && typeof responseBody.data === 'object')
    ? responseBody.data
    : responseBody;
  if (!Array.isArray(payload.notifications)) return false;

  const notifications = payload.notifications.filter(n => String(n.type) === String(type) && !n.isRead);
  await Promise.all(notifications.map(n => markNotificationRead(n.id)));
  try {
    await NotificationManager?.syncUnreadCounts?.();
  } catch (error) {
    console.warn('notification-manager: markTypeAsRead sync failed', error);
  }
  return true;
}

async function markAllAsRead() {
  const result = await apiCall('/notifications/read-all', { method: 'PUT' });
  if (!result.ok) {
    console.warn('notification-manager: markAllAsRead failed', result.error);
    return false;
  }
  try {
    await NotificationManager?.syncUnreadCounts?.();
  } catch (error) {
    console.warn('notification-manager: markAllAsRead sync failed', error);
  }
  return true;
}

async function createNotification(buyerId, payload = {}) {
  if (!buyerId || !payload) return null;
  const body = {
    user_id: buyerId,
    title: payload.title || payload.subject || 'Notification',
    message: payload.message || payload.body || 'You have a new notification',
    type: payload.type || 'account',
    link: payload.link || payload.url || null
  };
  const result = await apiCall('/notifications', { method: 'POST', body });
  if (!result.ok) {
    console.warn('notification-manager: createNotification failed', result.error);
    return null;
  }
  return result.data;
}

async function createWishlistNotification(buyerId, productName, action = 'added') {
  if (!buyerId || !productName) return null;
  const title = action === 'removed' ? 'Wishlist item removed' : 'Wishlist updated';
  const message = action === 'removed'
    ? `${productName} was removed from your wishlist.`
    : `${productName} was added to your wishlist.`;
  return createNotification(buyerId, {
    title,
    message,
    type: 'wishlist',
    link: '/buyers/buyers%20wishlist.html'
  });
}

const NotificationManager = {
  cache: {
    unreadCounts: {
      account: 0,
      refund: 0,
      wishlist: 0,
      totalUnread: 0
    },
    fetchInterval: 3 * 60 * 1000,
    timerId: null,
    isSyncing: false
  },

  async init(buyerId = getBuyerId()) {
    const resolvedBuyerId = buyerId || getBuyerId();
    if (!resolvedBuyerId) return false;

    if (NotificationManager.cache.timerId) {
      clearInterval(NotificationManager.cache.timerId);
      NotificationManager.cache.timerId = null;
    }

    try {
      await NotificationManager.syncUnreadCounts(resolvedBuyerId);
    } catch (error) {
      console.warn('notification-manager: init failed', error);
    }

    NotificationManager.cache.timerId = setInterval(() => {
      NotificationManager.syncUnreadCounts(resolvedBuyerId).catch(() => {});
    }, NotificationManager.cache.fetchInterval);

    return true;
  },

  async syncUnreadCounts(buyerId = getBuyerId()) {
    if (NotificationManager.cache.isSyncing) return;
    NotificationManager.cache.isSyncing = true;
    try {
      const { unreadCount, notifications } = await fetchUnreadNotificationData();
      const normalized = Number(unreadCount) || 0;
      NotificationManager.cache.unreadCounts.totalUnread = normalized;
      NotificationManager.cache.unreadCounts.account = normalized;

      // Default all known buckets to zero before computing
      const buckets = ['wishlist', 'refund', 'order', 'account'];
      for (const b of buckets) NotificationManager.cache.unreadCounts[b] = 0;

      if (Array.isArray(notifications)) {
        for (const n of notifications) {
          if (n.isRead) continue;
          const t = String(n.type || 'account');
          NotificationManager.cache.unreadCounts[t] = (NotificationManager.cache.unreadCounts[t] || 0) + 1;
        }
      }

      updateNotificationBadge(normalized);
      try { updateWishlistBadge(NotificationManager.cache.unreadCounts.wishlist || 0); } catch (e) {}
      try { updateTrackingBadge(NotificationManager.cache.unreadCounts.order || 0); } catch (e) {}
      try { updateRefundBadge(NotificationManager.cache.unreadCounts.refund || 0); } catch (e) {}
    } catch (error) {
      console.warn('notification-manager: syncUnreadCounts failed', error);
      NotificationManager.cache.unreadCounts.totalUnread = Number(NotificationManager.cache.unreadCounts.totalUnread || 0);
      NotificationManager.cache.unreadCounts.account = Number(NotificationManager.cache.unreadCounts.account || 0);
      updateNotificationBadge(Number(NotificationManager.cache.unreadCounts.totalUnread || 0));
    } finally {
      NotificationManager.cache.isSyncing = false;
    }
  },

  createNotification,
  createWishlistNotification,
  markNotificationsReadByType: markTypeAsRead,
  markTypeAsRead,
  markAllAsRead,
  getToken,
  getBuyerId,
  apiCall,
  initializeBadgeUpdates
};

if (typeof window !== 'undefined') {
  if (typeof window.getBuyerId !== 'function') {
    window.getBuyerId = getBuyerId;
  }
  window.NotificationManager = NotificationManager;
  window.initializeBadgeUpdates = initializeBadgeUpdates;
  window.updateWishlistBadge = updateWishlistBadge;
  window.updateTrackingBadge = updateTrackingBadge;
  window.updateRefundBadge = updateRefundBadge;
}

// Ensure refund and seller events trigger an immediate unread sync
if (typeof window !== 'undefined') {
  window.addEventListener('refundCasesUpdated', () => {
    try { NotificationManager.syncUnreadCounts().catch(() => {}); } catch (e) {}
  });
  window.addEventListener('sellerNotificationsUpdated', () => {
    try { NotificationManager.syncUnreadCounts().catch(() => {}); } catch (e) {}
  });
}
