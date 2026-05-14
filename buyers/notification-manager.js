// ============================================
// CENTRALIZED NOTIFICATION MANAGER
// ============================================
// Manages all notifications from Supabase
// Auto-syncs every 30 seconds
// Updates all badge elements across pages

const SUPABASE_URL = 'https://zfyoxmwwuwgvaevwlgzn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeW94bXd3dXdndmFldhdsZ3puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDkyNzc2MzksImV4cCI6MTk5NTA1MzYzOX0.a1_-jLQu5NXhKYr5pQvCJvCB0BEfxCqw8DvL5P5qEHs';

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

// Initialize Supabase client
function getSupabaseClient() {
  if (window.supabase) {
    return window.supabase;
  }
  console.error('❌ Supabase not loaded');
  return null;
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

  // Fetch unread count for specific type
  getUnreadCount: async function(buyerId, type) {
    try {
      const client = getSupabaseClient();
      if (!client) return 0;

      const { count, error } = await client
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', buyerId)
        .eq('type', type)
        .eq('is_read', false)
        .eq('is_deleted', false);

      if (error) {
        console.error(`❌ Error fetching ${type} count:`, error);
        return 0;
      }
      return count || 0;
    } catch (e) {
      console.error(`❌ Exception fetching ${type} count:`, e);
      return 0;
    }
  },

  // Fetch total unread across all types
  getTotalUnreadCount: async function(buyerId) {
    try {
      const client = getSupabaseClient();
      if (!client) return 0;

      const { count, error } = await client
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', buyerId)
        .eq('is_read', false)
        .eq('is_deleted', false);

      if (error) {
        console.error('❌ Error fetching total unread:', error);
        return 0;
      }
      return count || 0;
    } catch (e) {
      console.error('❌ Exception fetching total unread:', e);
      return 0;
    }
  },

  // Sync all counts from Supabase
  syncUnreadCounts: async function(buyerId) {
    try {
      const client = getSupabaseClient();
      if (!client) return;

      // Fetch each type
      const [refund, cart, wishlist, order, total] = await Promise.all([
        this.getUnreadCount(buyerId, 'refund'),
        this.getUnreadCount(buyerId, 'cart'),
        this.getUnreadCount(buyerId, 'wishlist'),
        this.getUnreadCount(buyerId, 'order'),
        this.getTotalUnreadCount(buyerId)
      ]);

      // Update cache
      this.cache.unreadCounts = {
        refund,
        cart,
        wishlist,
        order,
        account: total
      };
      this.cache.totalUnread = total;
      this.cache.lastFetch = Date.now();

      console.log('✅ Synced unread counts:', this.cache.unreadCounts);

      // Update all badges
      updateAllBadges(buyerId);
    } catch (e) {
      console.error('❌ Error syncing counts:', e);
    }
  },

  // Create notification
  createNotification: async function(buyerId, notification) {
    try {
      const client = getSupabaseClient();
      if (!client) {
        console.error('❌ Supabase not available');
        return null;
      }

      const { title, message, type, link } = notification;

      const { data, error } = await client
        .from('notifications')
        .insert([{
          user_id: buyerId,
          title: title || 'Notification',
          message: message || '',
          type: type || 'account',
          link: link || '',
          is_read: false,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select();

      if (error) {
        console.error('❌ Error creating notification:', error);
        return null;
      }

      console.log('✅ Notification created:', data);

      // Update cache immediately
      if (type && this.cache.unreadCounts[type] !== undefined) {
        this.cache.unreadCounts[type]++;
      }
      this.cache.totalUnread++;
      this.cache.unreadCounts.account = this.cache.totalUnread;

      // Update badges immediately
      updateAllBadges(buyerId);

      return data ? data[0] : null;
    } catch (e) {
      console.error('❌ Exception creating notification:', e);
      return null;
    }
  },

  // Mark type as read
  markTypeAsRead: async function(buyerId, type) {
    try {
      const client = getSupabaseClient();
      if (!client) return;

      const { error } = await client
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('user_id', buyerId)
        .eq('type', type)
        .eq('is_read', false)
        .eq('is_deleted', false);

      if (error) {
        console.error(`❌ Error marking ${type} as read:`, error);
        return;
      }

      console.log(`✅ Marked ${type} notifications as read`);

      // Update cache
      this.cache.unreadCounts[type] = 0;
      this.cache.totalUnread -= this.cache.unreadCounts[type];
      this.cache.unreadCounts.account = this.cache.totalUnread;

      // Update badges
      updateAllBadges(buyerId);
    } catch (e) {
      console.error(`❌ Exception marking ${type} as read:`, e);
    }
  },

  // Mark all as read
  markAllAsRead: async function(buyerId) {
    try {
      const client = getSupabaseClient();
      if (!client) return;

      const { error } = await client
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('user_id', buyerId)
        .eq('is_read', false)
        .eq('is_deleted', false);

      if (error) {
        console.error('❌ Error marking all as read:', error);
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
