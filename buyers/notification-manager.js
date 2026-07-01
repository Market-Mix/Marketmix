// Shared buyer/seller notification helper
// This module provides a small notification manager for frontend pages.

const API_BASE_URL = window.API_BASE_URL || 'https://marketmix-backend.onrender.com/api';

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
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
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
  const badge = document.querySelector('[data-notification-badge]');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

async function initializeBadgeUpdates(buyerId) {
  if (typeof NotificationManager?.syncUnreadCounts === 'function') {
    await NotificationManager.syncUnreadCounts();
  } else {
    const { unreadCount = 0 } = await fetchUnreadNotificationData();
    NotificationManager.cache.unreadCounts.totalUnread = Number(unreadCount) || 0;
  }

  const count = Number(NotificationManager?.cache?.unreadCounts?.totalUnread || 0);
  updateNotificationBadge(count);

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

  if (result.data && typeof result.data.unreadCount !== 'undefined') {
    return {
      unreadCount: Number(result.data.unreadCount) || 0,
      notifications: Array.isArray(result.data.notifications) ? result.data.notifications : []
    };
  }

  return { unreadCount: 0, notifications: Array.isArray(result.data?.notifications) ? result.data.notifications : [] };
}

async function markNotificationRead(notificationId) {
  if (!notificationId) return false;
  const result = await apiCall(`/notifications/${encodeURIComponent(notificationId)}/read`, { method: 'PUT' });
  return result.ok;
}

async function markTypeAsRead(type) {
  if (!type) return false;
  const result = await apiCall('/notifications?unread=true');
  if (!result.ok || !Array.isArray(result.data?.notifications)) return false;

  const notifications = result.data.notifications.filter(n => String(n.type) === String(type) && !n.isRead);
  await Promise.all(notifications.map(n => markNotificationRead(n.id)));
  await NotificationManager.syncUnreadCounts();
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

  async init() {
    const buyerId = getBuyerId();
    if (!buyerId) return false;

    if (NotificationManager.cache.timerId) {
      clearInterval(NotificationManager.cache.timerId);
      NotificationManager.cache.timerId = null;
    }

    await NotificationManager.syncUnreadCounts();

    NotificationManager.cache.timerId = setInterval(() => {
      NotificationManager.syncUnreadCounts().catch(() => {});
    }, NotificationManager.cache.fetchInterval);

    return true;
  },

  async syncUnreadCounts() {
    if (NotificationManager.cache.isSyncing) return;
    NotificationManager.cache.isSyncing = true;
    try {
      const { unreadCount } = await fetchUnreadNotificationData();
      const normalized = Number(unreadCount) || 0;
      NotificationManager.cache.unreadCounts.totalUnread = normalized;
      NotificationManager.cache.unreadCounts.account = normalized;
      updateNotificationBadge(normalized);
    } finally {
      NotificationManager.cache.isSyncing = false;
    }
  },

  createNotification,
  createWishlistNotification,
  markNotificationsReadByType: markTypeAsRead,
  markTypeAsRead,
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
}
