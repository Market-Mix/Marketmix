// wishlist-util.js
// Reusable utility for wishlist operations

const API_BASE_URL = 'https://marketmix-backend.onrender.com/api';

/**
 * Add product to wishlist
 * @param {number} productId - The ID of the product to add
 */
async function addToWishlist(productId) {
  const token = localStorage.getItem('token');
  
  try {
    let response;
    
    // Check if user is authenticated
    if (token) {
      // Authenticated user
      response = await fetch(`${API_BASE_URL}/wishlist/add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ product_id: productId })
      });
    } else {
      // Guest user
      let guestWishlistId = localStorage.getItem('guest_wishlist_id');
      
      response = await fetch(`${API_BASE_URL}/wishlist/guest/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          product_id: productId,
          wishlist_id: guestWishlistId || null
        })
      });
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to add to wishlist');
    }

    // Save guest wishlist ID if it's a guest
    if (!token && data.data.wishlist_id) {
      localStorage.setItem('guest_wishlist_id', data.data.wishlist_id);
    }

    // Show success popup
    alert('Added to wishlist! ❤️');
    
    // Create notification for wishlist update (only for authenticated users)
    if (token && typeof NotificationManager !== 'undefined') {
      try {
        const buyerId = getBuyerId?.() || (JSON.parse(localStorage.getItem('user') || '{}').id);
        if (buyerId) {
          const productName = data.data?.product_name || `Product #${productId}`;
          await NotificationManager.createNotification(buyerId, {
            title: 'Item Added to Wishlist',
            message: `${productName} has been added to your wishlist`,
            type: 'wishlist',
            link: '/buyers/buyers wishlist.html'
          });
          updateWishlistBadge?.(buyerId);
        }
      } catch (err) {
        console.error('Error creating wishlist notification:', err);
      }
    }
    
    return true;

  } catch (error) {
    console.error('Error adding to wishlist:', error);
    alert('Failed to add to wishlist. Please try again.');
    return false;
  }
}