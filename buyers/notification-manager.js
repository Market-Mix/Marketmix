/**
 * Global Notification Manager
 * Centralized system for handling all notification operations across MarketMix
 * Works with Supabase notifications table
 */

// Supabase Configuration
window.MARKETMIX_SUPABASE_URL = 'https://zfyoxmwwuwgvaevwlgzn.supabase.co';
window.MARKETMIX_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeW94bXd3dXdndmFldndsZ3puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NzIxNzIsImV4cCI6MjA3OTI0ODE3Mn0.k35O8K2mQyoI8T2PCI5RhInlaSTDMpwJ8xRw5zITL_0';

/**
 * Get Supabase Client instance (cached)
 */
function getSupabaseClient() {
  if (window.marketmixSupabaseClient) {
    return window.marketmixSupabaseClient;
  }

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('Supabase client library is not loaded. Make sure to include the Supabase script.');
    throw new Error('Supabase client library is not loaded.');
  }

  window.marketmixSupabaseClient = window.supabase.createClient(
    window.MARKETMIX_SUPABASE_URL,
    window.MARKETMIX_SUPABASE_ANON_KEY
  );

  console.log('✅ Supabase client initialized');
  return window.marketmixSupabaseClient;
}

/**
 * Core Notification Manager
 */
const NotificationManager = {
  cache: {
    unreadCounts: {},
    totalUnread: 0,
    lastFetch: 0,
    fetchInterval: 30000 // 30 seconds
  },

  syncInterval: null,

  /**
   * Initialize notification system
   * Call this on page load for authenticated users
   */
  init: async function(buyerId) {
    console.log('🔔 Initializing NotificationManager for user:', buyerId);

    if (!buyerId) {
      console.warn('⚠️ No buyer ID provided to NotificationManager');
      return false;
    }

    try {
      // Load Supabase client
      getSupabaseClient();

      // Initial fetch
      await this.syncUnreadCounts(buyerId);

      // Start periodic sync (every 30 seconds)
      if (this.syncInterval) clearInterval(this.syncInterval);
      this.syncInterval = setInterval(() => {
        this.syncUnreadCounts(buyerId).catch(err => console.error('Sync error:', err));
      }, this.cache.fetchInterval);

      console.log('✅ NotificationManager initialized successfully');
      return true;
    } catch (err) {
      console.error('❌ Error initializing NotificationManager:', err);
      return false;
    }
  },

  /**
   * Cleanup on logout
   */
  destroy: function() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.cache = {
      unreadCounts: {},
      totalUnread: 0,
      lastFetch: 0,
      fetchInterval: 30000
    };
    console.log('🔔 NotificationManager destroyed');
  },

  /**
   * Fetch total unread count
   */
  getTotalUnreadCount: async function(buyerId) {
    try {
      const { count, error } = await getSupabaseClient()
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', buyerId)
        .eq('is_read', false)
        .eq('is_deleted', false);

      if (error) throw error;
      this.cache.totalUnread = count || 0;
      return this.cache.totalUnread;
    } catch (err) {
      console.error('❌ Error fetching total unread count:', err);
      return 0;
    }
  },

  /**
   * Fetch unread count for specific type
   */
  getUnreadCount: async function(buyerId, type = null) {
    try {
      let query = getSupabaseClient()
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', buyerId)
        .eq('is_read', false)
        .eq('is_deleted', false);

      if (type) {
        query = query.eq('type', type);
      }

      const { count, error } = await query;
      if (error) throw error;

      const countValue = count || 0;
      if (type) {
        this.cache.unreadCounts[type] = countValue;
      }
      return countValue;
    } catch (err) {
      console.error(`❌ Error fetching unread count for type ${type}:`, err);
      return 0;
    }
  },

  /**
   * Sync all unread counts by type
   */
  syncUnreadCounts: async function(buyerId) {
    try {
      const types = ['refund', 'cart', 'wishlist', 'order', 'account'];
      const counts = {};

      for (const type of types) {
        counts[type] = await this.getUnreadCount(buyerId, type);
      }

      this.cache.unreadCounts = counts;
      await this.getTotalUnreadCount(buyerId);

      console.log('✅ Unread counts synced:', counts);
      return counts;
    } catch (err) {
      console.error('❌ Error syncing unread counts:', err);
      return this.cache.unreadCounts;
    }
  },

  /**
   * Fetch unread notifications
   */
  fetchUnreadNotifications: async function(buyerId, limit = 10) {
    try {
      const { data, error } = await getSupabaseClient()
        .from('notifications')
        .select('*')
        .eq('user_id', buyerId)
        .eq('is_read', false)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      console.log('✅ Fetched unread notifications:', data);
      return data || [];
    } catch (err) {
      console.error('❌ Error fetching unread notifications:', err);
      return [];
    }
  },

  /**
   * Create a new notification
   */
  createNotification: async function(buyerId, notification) {
    try {
      const {
        title,
        message,
        type = 'account', // refund, cart, wishlist, order, account
        link = null
      } = notification;

      const { data, error } = await getSupabaseClient()
        .from('notifications')
        .insert([{
          user_id: buyerId,
          title: title,
          message: message,
          type: type,
          link: link,
          is_read: false,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;
      console.log('✅ Notification created:', data);

      // Update cache immediately
      await this.syncUnreadCounts(buyerId);

      return data ? data[0] : null;
    } catch (err) {
      console.error('❌ Error creating notification:', err);
      return null;
    }
  },

  /**
   * Mark single notification as read
   */
  markAsRead: async function(notificationId) {
    try {
      const { error } = await getSupabaseClient()
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
      console.log('✅ Notification marked as read:', notificationId);
      return true;
    } catch (err) {
      console.error('❌ Error marking notification as read:', err);
      return false;
    }
  },

  /**
   * Mark all notifications of specific type as read
   */
  markTypeAsRead: async function(buyerId, type) {
    try {
      const { error } = await getSupabaseClient()
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('user_id', buyerId)
        .eq('type', type)
        .eq('is_read', false)
        .eq('is_deleted', false);

      if (error) throw error;
      console.log(`✅ All ${type} notifications marked as read`);

      // Update cache
      this.cache.unreadCounts[type] = 0;
      return true;
    } catch (err) {
      console.error(`❌ Error marking ${type} notifications as read:`, err);
      return false;
    }
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async function(buyerId) {
    try {
      const { error } = await getSupabaseClient()
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('user_id', buyerId)
        .eq('is_read', false)
        .eq('is_deleted', false);

      if (error) throw error;
      console.log('✅ All notifications marked as read');

      // Update cache
      Object.keys(this.cache.unreadCounts).forEach(key => {
        this.cache.unreadCounts[key] = 0;
      });
      this.cache.totalUnread = 0;
      return true;
    } catch (err) {
      console.error('❌ Error marking all notifications as read:', err);
      return false;
    }
  },

  /**
   * Fetch cached unread count (no API call)
   */
  getCachedCount: function(type = null) {
    if (type) {
      return this.cache.unreadCounts[type] || 0;
    }
    return this.cache.totalUnread || 0;
  },

  /**
   * Fetch cached counts object
   */
  getCachedCounts: function() {
    return { ...this.cache.unreadCounts };
  }
};

/**
 * Badge Update Functions
 * These update the UI badge elements
 */

/**
 * Update navbar notification bell badge
 */
function updateNavbarNotificationBadge(buyerId) {
  const badge = document.querySelector('[data-notification-badge]');
  if (!badge) return;

  NotificationManager.getTotalUnreadCount(buyerId).then(count => {
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'inline-flex';
      badge.className = 'badge badge-danger'; // Bootstrap class for red badge
    } else {
      badge.style.display = 'none';
    }
  }).catch(err => console.error('Error updating navbar badge:', err));
}

/**
 * Update cart badge
 */
function updateCartBadge(buyerId) {
  const badge = document.querySelector('[data-cart-badge]');
  if (!badge) return;

  NotificationManager.getUnreadCount(buyerId, 'cart').then(count => {
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'inline-flex';
      badge.className = 'badge badge-danger';
    } else {
      badge.style.display = 'none';
    }
  }).catch(err => console.error('Error updating cart badge:', err));
}

/**
 * Update wishlist badge
 */
function updateWishlistBadge(buyerId) {
  const badge = document.querySelector('[data-wishlist-badge]');
  if (!badge) return;

  NotificationManager.getUnreadCount(buyerId, 'wishlist').then(count => {
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'inline-flex';
      badge.className = 'badge badge-danger';
    } else {
      badge.style.display = 'none';
    }
  }).catch(err => console.error('Error updating wishlist badge:', err));
}

/**
 * Update order/tracking badge
 */
function updateTrackingBadge(buyerId) {
  const badge = document.querySelector('[data-tracking-badge]');
  if (!badge) return;

  NotificationManager.getUnreadCount(buyerId, 'order').then(count => {
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'inline-flex';
      badge.className = 'badge badge-danger';
    } else {
      badge.style.display = 'none';
    }
  }).catch(err => console.error('Error updating tracking badge:', err));
}

/**
 * Update refund badge
 */
function updateRefundBadge(buyerId) {
  const badge = document.querySelector('[data-refund-badge]');
  if (!badge) return;

  NotificationManager.getUnreadCount(buyerId, 'refund').then(count => {
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'inline-flex';
      badge.className = 'badge badge-danger';
    } else {
      badge.style.display = 'none';
    }
  }).catch(err => console.error('Error updating refund badge:', err));
}

/**
 * Update account/profile badge (TOTAL unread)
 */
function updateAccountBadge(buyerId) {
  const badge = document.querySelector('[data-account-badge]');
  if (!badge) return;

  NotificationManager.getTotalUnreadCount(buyerId).then(count => {
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'inline-flex';
      badge.className = 'badge badge-danger';
    } else {
      badge.style.display = 'none';
    }
  }).catch(err => console.error('Error updating account badge:', err));
}

/**
 * Update all badges at once
 */
function updateAllBadges(buyerId) {
  updateNavbarNotificationBadge(buyerId);
  updateRefundBadge(buyerId);
  updateAccountBadge(buyerId);
  updateCartBadge(buyerId);
  updateWishlistBadge(buyerId);
  updateTrackingBadge(buyerId);
}

/**
 * Initialize badge updates on page load
 * Call this on every page with badges
 */
function initializeBadgeUpdates(buyerId) {
  if (!buyerId) {
    console.warn('⚠️ No buyer ID for badge initialization');
    return;
  }

  // Initial update
  updateAllBadges(buyerId);

  // Update every 30 seconds (sync with NotificationManager)
  if (window.badgeUpdateInterval) clearInterval(window.badgeUpdateInterval);
  window.badgeUpdateInterval = setInterval(() => {
    updateAllBadges(buyerId);
  }, 30000);
}

/**
 * Get buyer ID from localStorage
 */
function getBuyerId() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id || null;
  } catch (err) {
    console.error('Error getting buyer ID:', err);
    return null;
  }
}

console.log('✅ NotificationManager loaded successfully');
