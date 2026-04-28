// API Base URL - prefer global CONFIG when available to support development mode
const API_BASE_URL = 'https://marketmix-backend.onrender.com/api';

// NOTE: stray slash removed (it caused an unterminated regex / syntax error)

// Fetch wishlist from backend
async function fetchWishlist() {
  try {
    const response = await fetch(`${API_BASE_URL}/wishlist`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch wishlist');
    }

    return data.data.items || [];
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    alert('Failed to load wishlist. Please try again.');
    return [];
  }
}

// Remove item from wishlist
async function removeFromWishlist(itemId) {
  try {
    const response = await fetch(`${API_BASE_URL}/wishlist/remove/${itemId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to remove item');
    }

    return true;
  } catch (error) {
    console.error('Error removing item:', error);
    alert('Failed to remove item. Please try again.');
    return false;
  }
}

// Move item to cart (you'll need to implement this endpoint on backend)
async function moveToCart(productId, itemData) {
  try {
    // This assumes you have a cart endpoint - adjust as needed
    const response = await fetch(`${API_BASE_URL}/cart/add`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ product_id: productId, quantity: 1 })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to add to cart');
    }

    // Also update localStorage cart for immediate sync across tabs
    try {
      let cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const existing = cart.find(item => item.productId === productId);
      if (existing) {
        existing.quantity = (existing.quantity || 1) + 1;
      } else {
        cart.push({
          name: itemData.name || 'Product',
          price: itemData.price || 0,
          image: itemData.image || '',
          quantity: 1,
          productId: productId
        });
      }
      localStorage.setItem('cart', JSON.stringify(cart));
      // Dispatch storage event to notify other tabs
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'cart',
        newValue: JSON.stringify(cart),
        oldValue: JSON.stringify(cart.slice(0, -1))
      }));
    } catch (e) {
      console.warn('Failed to update localStorage cart', e);
    }

    return true;
  } catch (error) {
    console.error('Error moving to cart:', error);
    alert('Failed to move item to cart. Please try again.');
    return false;
  }
}

const wishlistContainer = document.getElementById("wishlist-container");

// Function to render wishlist
function renderWishlist(items) {
  wishlistContainer.innerHTML = "";

  if (items.length === 0) {
    wishlistContainer.innerHTML = `<p class="wishlist-empty">Your wishlist is empty.</p>`;
    return;
  }

  items.forEach(item => {
    const itemHTML = `
      <div class="wishlist-item" data-id="${item.id}" data-product-id="${item.product_id}">
        <img src="${item.main_image_url || 'placeholder.jpg'}" alt="${item.name}" />
        <h4>${item.name}</h4>
        <p>₦${parseFloat(item.price).toFixed(2)}</p>
        <div class="wishlist-actions">
          <button class="move" data-product-id="${item.product_id}">Move to Cart</button>
          <button class="remove" data-item-id="${item.id}">Remove</button>
        </div>
      </div>
    `;
    wishlistContainer.insertAdjacentHTML("beforeend", itemHTML);
  });

  addEventListeners();
}

// Event Listeners for buttons
function addEventListeners() {
  document.querySelectorAll(".remove").forEach(btn => {
    btn.addEventListener("click", async function () {
      const itemId = this.dataset.itemId;
      const confirmed = confirm('Are you sure you want to remove this item from your wishlist?');
      
      if (confirmed) {
        const success = await removeFromWishlist(itemId);
        if (success) {
          // Reload wishlist after removal
          loadWishlist();
        }
      }
    });
  });

  document.querySelectorAll(".move").forEach(btn => {
    btn.addEventListener("click", async function () {
      const productId = this.dataset.productId;
      const itemId = this.closest('.wishlist-item').querySelector('.remove').dataset.itemId;
      const wishlistItem = this.closest('.wishlist-item');
      
      // Get item data for localStorage
      const itemData = {
        name: wishlistItem.querySelector('h4').textContent,
        price: parseFloat(wishlistItem.querySelector('p').textContent.replace('$', '')),
        image: wishlistItem.querySelector('img').src
      };
      
      const success = await moveToCart(productId, itemData);
      if (success) {
        alert("Item moved to cart!");
        // Remove from wishlist after moving to cart
        await removeFromWishlist(itemId);
        loadWishlist();
      }
    });
  });
}

// Load and render wishlist
async function loadWishlist() {
  // Show loading state
  wishlistContainer.innerHTML = '<p class="loading">Loading your wishlist...</p>';
  
  const items = await fetchWishlist();
  renderWishlist(items);
}

// Initial load
loadWishlist();