// ============================================
// CENTRALIZED NOTIFICATION MANAGER
// ============================================
// Manages all notifications using Backend API
// Auto-syncs every 30 seconds
// Updates all badge elements across pages

// Make API_BASE_URL globally accessible to all pages
window.API_BASE_URL = 'https://marketmix-backend.onrender.com/api';

// Get buyer ID from localStorage
function getBuyerId() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id || null;
  } catch (e) {
    console.error('❌ Error getting buyer ID:', e);
    return null;
  }
}

// Get JWT token from localStorage
function getAuthToken() {
  try {
    const token = localStorage.getItem('token');
    return token || null;
  } catch (e) {
    console.error('❌ Error getting auth token:', e);
    return null;
  }
}

// Make API call with auth
async function apiCall(endpoint, options = {}) {
  const token = getAuthToken();
  if (!token) {
    console.error('❌ No auth token available');
    return { error: 'No auth token' };
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };

  try {
    const response = await fetch(`${window.API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    const json = await response.json();

    if (!response.ok) {
      console.error('❌ API call HTTP error:', response.status, json);
      return { error: json.message || 'Request failed', details: json.errors || json.data };
    }

    if (json.status === 'error') {
      console.error('❌ API call returned error:', json);
      return { error: json.message || 'Request failed', details: json.errors || json.data };
    }

    return json.data || {};
  } catch (e) {
    console.error('❌ API call error:', e);
    return { error: e.message };
  }
}

// Global NotificationManager object
const NotificationManager = {
  cache: {
    unreadCounts: {
      refund: 0,
      cart: 0,
      wishlist: 0,
      order: 0,
      account: 0
    },
    totalUnread: 0,
    lastFetch: 0,
    fetchInterval: 30000 // 30 seconds
  },

  // Initialize for buyer
  init: async function(buyerId) {
    if (!buyerId) {
      console.warn('⚠️ No buyer ID provided to NotificationManager.init()');
      return;
    }

    console.log('🔔 Initializing NotificationManager for user:', buyerId);

    // Sync immediately
    await this.syncUnreadCounts(buyerId);

    // Set up periodic sync every 30 seconds
    setInterval(() => {
      this.syncUnreadCounts(buyerId);
    }, this.cache.fetchInterval);

    console.log('✅ NotificationManager initialized');
  },

  // Sync all counts from Backend API
  syncUnreadCounts: async function(buyerId) {
    try {
      // Fetch unread notifications from backend
      const response = await apiCall('/notifications?unread=true');
      
      if (response.error) {
        console.error('❌ Error fetching notifications:', response.error);
        return;
      }

      const unreadCount = response.unreadCount || 0;
      const notifications = response.notifications || [];

      // Count by type
      const counts = {
        refund: 0,
        cart: 0,
        wishlist: 0,
        order: 0,
        account: 0
      };

      notifications.forEach(notif => {
        const type = notif.type || 'account';
        if (counts[type] !== undefined) {
          counts[type]++;
        }
      });

      // Update cache
      this.cache.unreadCounts = counts;
      this.cache.totalUnread = unreadCount;
      this.cache.lastFetch = Date.now();

      console.log('✅ Synced unread counts:', this.cache.unreadCounts);

      // Update all badges
      updateAllBadges(buyerId);
    } catch (e) {
      console.error('❌ Error syncing counts:', e);
    }
  },

  // Create notification via backend API
  createNotification: async function(buyerId, notification) {
    try {
      const { title, message, type, link } = notification;

      const payload = {
        user_id: buyerId,
        title: title || 'Notification',
        message: message || '',
        type: type || 'account',
        link: link || ''
      };

      const response = await apiCall('/notifications', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (response.error) {
        console.error('❌ Error creating notification:', response.error);
        return null;
      }

      console.log('✅ Notification created:', response.notification);

      // Update cache immediately
      if (type && this.cache.unreadCounts[type] !== undefined) {
        this.cache.unreadCounts[type]++;
      }
      this.cache.totalUnread++;
      this.cache.unreadCounts.account = this.cache.totalUnread;

      // Update badges immediately (with slight delay to ensure DOM is ready)
      setTimeout(() => {
        updateAllBadges(buyerId);
      }, 100);

      return response.notification || null;
    } catch (e) {
      console.error('❌ Exception creating notification:', e);
      return null;
    }
  },

  // Mark type as read (update cache, will be synced on next fetch)
  markTypeAsRead: async function(buyerId, type) {
    try {
      // Note: Backend doesn't have bulk mark-by-type endpoint
      // Update cache locally - next sync will refresh from server
      const previousCount = this.cache.unreadCounts[type] || 0;
      this.cache.unreadCounts[type] = 0;
      this.cache.totalUnread -= previousCount;
      this.cache.unreadCounts.account = this.cache.totalUnread;

      console.log(`✅ Marked ${type} notifications as read (cache updated)`);

      // Update badges
      updateAllBadges(buyerId);
    } catch (e) {
      console.error(`❌ Exception marking ${type} as read:`, e);
    }
  },

  // Mark all as read via backend API
  markAllAsRead: async function(buyerId) {
    try {
      const response = await apiCall('/notifications/read-all', {
        method: 'PUT',
        body: JSON.stringify({})
      });

      if (response.error) {
        console.error('❌ Error marking all as read:', response.error);
        return;
      }

      console.log('✅ Marked all notifications as read');

      // Clear cache
      this.cache.unreadCounts = { refund: 0, cart: 0, wishlist: 0, order: 0, account: 0 };
      this.cache.totalUnread = 0;

      // Update badges
      updateAllBadges(buyerId);
    } catch (e) {
      console.error('❌ Exception marking all as read:', e);
    }
  },

  // Get cached counts
  getCachedCounts: function() {
    return this.cache.unreadCounts;
  }
};

// ============================================
// BADGE UPDATE FUNCTIONS
// ============================================

// Update navbar notification bell
function updateNavbarNotificationBadge(buyerId) {
  const count = NotificationManager.cache.unreadCounts.account || 0;
  const badge = document.querySelector('.notification .badge') || 
                document.querySelector('[data-notification-badge]');
  
  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

// Update cart badge
function updateCartBadge(buyerId) {
  const count = NotificationManager.cache.unreadCounts.cart || 0;
  const badge = document.querySelector('[data-cart-badge]');
  
  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

// Update wishlist badge
function updateWishlistBadge(buyerId) {
  const count = NotificationManager.cache.unreadCounts.wishlist || 0;
  const badge = document.querySelector('[data-wishlist-badge]');
  
  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

// Update refund badge
function updateRefundBadge(buyerId) {
  const count = NotificationManager.cache.unreadCounts.refund || 0;
  const badge = document.querySelector('[data-refund-badge]');
  
  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

// Update tracking badge
function updateTrackingBadge(buyerId) {
  const count = NotificationManager.cache.unreadCounts.order || 0;
  const badge = document.querySelector('[data-tracking-badge]');
  
  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

// Update account/profile badge (total unread)
function updateAccountBadge(buyerId) {
  const count = NotificationManager.cache.totalUnread || 0;
  const badge = document.querySelector('[data-account-badge]');
  
  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

// Update all badges
function updateAllBadges(buyerId) {
  updateNavbarNotificationBadge(buyerId);
  updateCartBadge(buyerId);
  updateWishlistBadge(buyerId);
  updateRefundBadge(buyerId);
  updateTrackingBadge(buyerId);
  updateAccountBadge(buyerId);
}

console.log('✅ Notification Manager loaded successfully');
