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

function getSupabaseClient() {
  if (window.marketmixSupabaseClient) return window.marketmixSupabaseClient;
  if (window.supabaseClient) return window.supabaseClient;
  if (window.supabase && typeof window.supabase.from === 'function' && typeof window.supabase.auth?.getSession === 'function') {
    console.log('🔔 Reusing existing Supabase client instance from window.supabase');
    return window.supabase;
  }
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('❌ Supabase client library is not loaded.');
    return null;
  }

  const url = window.MARKETMIX_SUPABASE_URL || 'https://zfyoxmwwuwgvaevwlgzn.supabase.co';
  const key = window.MARKETMIX_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeW94bXd3dXdndmFldndsZ3puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NzIxNzIsImV4cCI6MjA3OTI0ODE3Mn0.k35O8K2mQyoI8T2PCI5RhInlaSTDMpwJ8xRw5zITL_0';

  window.marketmixSupabaseClient = window.supabase.createClient(url, key);
  return window.marketmixSupabaseClient;
}

async function getAuthenticatedSupabaseClient() {
  const client = getSupabaseClient();
  if (!client) return null;
  if (!client.auth || typeof client.auth.getSession !== 'function') {
    console.error('❌ Supabase client auth interface is unavailable.');
    return null;
  }

  let sessionResponse;
  try {
    sessionResponse = await client.auth.getSession();
  } catch (error) {
    console.error('❌ Error fetching Supabase session:', error);
    return null;
  }

  const currentSession = sessionResponse?.data?.session || sessionResponse?.session || null;
  const currentUser = sessionResponse?.data?.user || sessionResponse?.user || null;

  console.log('🔐 Supabase current session:', currentSession);
  console.log('🔐 Supabase current user:', currentUser);

  if (!currentSession || !currentUser) {
    const token = getAuthToken();
    if (!token) {
      console.warn('⚠️ No auth token found in localStorage for Supabase session recovery.');
      return null;
    }

    try {
      console.log('🔄 Restoring Supabase session from stored auth token');
      const { data: setSessionData, error: setSessionError } = await client.auth.setSession({
        access_token: token,
        refresh_token: token
      });

      if (setSessionError) {
        console.error('❌ Error restoring Supabase session:', setSessionError);
        return null;
      }

      const restoredSession = setSessionData?.session || null;
      const restoredUser = setSessionData?.user || null;
      console.log('🔐 Restored Supabase session:', restoredSession);
      console.log('🔐 Restored Supabase user:', restoredUser);

      if (!restoredSession || !restoredUser) {
        console.warn('⚠️ Supabase session restoration did not produce an authenticated user.');
        return null;
      }

      return { client, session: restoredSession, user: restoredUser };
    } catch (error) {
      console.error('❌ Exception restoring Supabase session:', error);
      return null;
    }
  }

  return { client, session: currentSession, user: currentUser };
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

      counts.account = unreadCount;

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

      console.log('🔔 Creating notification payload:', payload);
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

  // Create notification via Supabase direct insert
  createNotificationViaSupabase: async function(buyerId, notification) {
    if (!buyerId || !notification) {
      console.warn('⚠️ createNotificationViaSupabase missing buyerId or notification payload');
      return null;
    }

    const authState = await getAuthenticatedSupabaseClient();
    if (!authState) {
      console.error('❌ No authenticated Supabase client available for direct notification insert');
      return null;
    }

    const { client, session, user } = authState;
    if (!user || !user.id) {
      console.error('❌ Authenticated Supabase user missing or invalid.');
      return null;
    }

    if (String(user.id) !== String(buyerId)) {
      console.warn('⚠️ Supabase authenticated user does not match buyerId for notification insert:', {
        buyerId,
        authenticatedUserId: user.id
      });
    }

    const { title, message, type, link } = notification;
    const payload = {
      user_id: buyerId,
      title: title || 'Notification',
      message: message || '',
      type: type || 'account',
      link: link || '',
      is_read: false,
      is_deleted: false
    };

    console.log('🔔 Notification payload to insert via Supabase:', payload);
    console.log('🔔 Using authenticated Supabase user:', user);
    console.log('🔔 Using authenticated Supabase session:', session);

    const { data, error } = await client.from('notifications').insert([payload]).select().single();

    if (error) {
      console.error('❌ Error inserting notification via Supabase:', error);
      return null;
    }

    const inserted = data || null;
    console.log('✅ Direct Supabase notification created successfully:', inserted);

    if (type && this.cache.unreadCounts[type] !== undefined) {
      this.cache.unreadCounts[type]++;
    }
    this.cache.totalUnread++;
    this.cache.unreadCounts.account = this.cache.totalUnread;

    setTimeout(() => {
      updateAllBadges(buyerId);
    }, 100);

    return inserted;
  },

  // Create a cart notification with standardized payload
  createCartNotification: async function(buyerId, productName) {
    if (!buyerId || !productName) {
      console.warn('⚠️ createCartNotification missing buyerId or productName');
      return null;
    }

    console.log('🔔 Creating cart notification for product:', productName);

    return this.createNotification(buyerId, {
      title: 'Product Added to Cart',
      message: `${productName} added to cart`,
      type: 'cart',
      link: '/buyers/cart.html'
    });
  },

  // Create a wishlist notification with standardized payload using direct Supabase insert
  createWishlistNotification: async function(buyerId, productName) {
    if (!buyerId || !productName) {
      console.warn('⚠️ createWishlistNotification missing buyerId or productName');
      return null;
    }

    console.log('🔔 Creating wishlist notification for product:', productName);

    return this.createNotificationViaSupabase(buyerId, {
      title: 'Product Added to Wishlist',
      message: `${productName} added to wishlist`,
      type: 'wishlist',
      link: '/buyers/buyers%20wishlist.html'
    });
  },

  // Mark type as read (update cache, will be synced on next fetch)
  markTypeAsRead: async function(buyerId, type) {
    try {
      // Note: Backend doesn't have bulk mark-by-type endpoint
      // Update cache locally - next sync will refresh from server
      const previousCount = this.cache.unreadCounts[type] || 0;
      this.cache.unreadCounts[type] = 0;
      this.cache.totalUnread -= previousCount;
      if (this.cache.totalUnread < 0) this.cache.totalUnread = 0;
      this.cache.unreadCounts.account = this.cache.totalUnread;

      console.log(`✅ Marked ${type} notifications as read (cache updated)`);

      // Update badges
      updateAllBadges(buyerId);
    } catch (e) {
      console.error(`❌ Exception marking ${type} as read:`, e);
    }
  },

  // Mark all unread notifications of a specific type as read via backend
  markNotificationsReadByType: async function(buyerId, type) {
    try {
      if (!buyerId || !type) return;
      console.log(`🔔 Marking unread ${type} notifications as read for user:`, buyerId);
      const response = await apiCall('/notifications?unread=true');
      if (response.error) {
        console.error('❌ Error fetching unread notifications:', response.error);
        return;
      }

      const notifications = response.notifications || [];
      const itemsToMark = notifications.filter(n => n.type === type);
      if (!itemsToMark.length) {
        console.log(`🔔 No unread ${type} notifications found to mark as read.`);
        return;
      }

      for (const notif of itemsToMark) {
        console.log('🔔 Marking notification read:', notif.id, notif.title);
        const markResponse = await apiCall(`/notifications/${notif.id}/read`, { method: 'PUT' });
        if (markResponse.error) {
          console.error('❌ Error marking notification as read:', notif.id, markResponse.error);
        }
      }

      const previousCount = this.cache.unreadCounts[type] || 0;
      this.cache.totalUnread -= previousCount;
      if (this.cache.totalUnread < 0) this.cache.totalUnread = 0;
      this.cache.unreadCounts[type] = 0;
      this.cache.unreadCounts.account = this.cache.totalUnread;

      updateAllBadges(buyerId);
      console.log(`✅ Marked ${itemsToMark.length} ${type} notification(s) as read`);
    } catch (e) {
      console.error(`❌ Exception marking ${type} notifications as read:`, e);
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

function initializeBadgeUpdates(buyerId) {
  updateAllBadges(buyerId);
}

console.log('✅ Notification Manager loaded successfully');
