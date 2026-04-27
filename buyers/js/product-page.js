// Product Page Handler
// Fetches product data and initializes all components

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Get product ID from URL
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
      showError('Product ID not found');
      return;
    }

    // Fetch product data
    const product = await fetchProduct(productId);
    
    if (!product) {
      showError('Product not found');
      return;
    }

    // Track product view (increment views in Supabase)
    trackProductView(productId);

    // Render all components
    renderProduct(product);
    setupEventListeners(product);

  } catch (error) {
    console.error('Error loading product:', error);
    showError('Error loading product details');
  }
});

// Fetch product from API or mock data
async function fetchProduct(productId) {
  try {
    // Try API first
    const token = localStorage.getItem('token');
    const API_BASE = 'https://marketmix-backend.onrender.com/api';
    const url = `${API_BASE}/products/${productId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });

    if (response.ok) {
      const result = await response.json();
      const product = result.data;

      // Fetch reviews for this product
      try {
        const API_BASE = 'https://marketmix-backend.onrender.com/api';
        const reviewsUrl = `${API_BASE}/reviews/product/${productId}`;
        const reviewsResponse = await fetch(reviewsUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        });

        if (reviewsResponse.ok) {
          const reviewsResult = await reviewsResponse.json();
          if (reviewsResult.status === 'success' && reviewsResult.data) {
            product.reviews = reviewsResult.data.reviews || [];
            product.review_count = reviewsResult.data.count || product.reviews.length;
            product.rating = reviewsResult.data.averageRating || 0;
          }
        }
      } catch (reviewError) {
        console.warn('Could not fetch reviews:', reviewError);
        product.reviews = product.reviews || [];
      }

      return product;
    }
  } catch (apiError) {
    console.warn('API fetch failed, using mock data:', apiError);
  }

  // Mock data fallback for testing
  return getMockProduct(productId);
}

// Mock product data for testing
function getMockProduct(productId) {
  const mockProducts = {
    '1': {
      id: '1',
      name: 'Premium Wireless Headphones',
      description: 'High-quality wireless headphones with noise cancellation and 30-hour battery life',
      price: 159.99,
      category: 'electronics',
      main_image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
      stock_quantity: 25,
      rating: 4.8,
      review_count: 234,
      seller_id: 'seller-1',
      flash_sale_active: true,
      flash_sale_discount: 20,
      seller: {
        id: 'seller-1',
        shop_name: 'TechPro Store',
        rating: 4.7,
        shop_avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'
      },
      reviews: [
        { id: '1', rating: 5, comment: 'Excellent sound quality and very comfortable!', created_at: '2025-11-20' },
        { id: '2', rating: 4, comment: 'Great product, battery lasts long', created_at: '2025-11-15' }
      ],
      relatedProducts: [
        { id: '2', name: 'Earbuds Pro', price: 129.99, main_image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200', rating: 4.3, review_count: 156 },
        { id: '3', name: 'Wireless Speaker', price: 79.99, main_image_url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=200', rating: 4.1, review_count: 89 }
      ],
      sellerProducts: [
        { id: '2', name: 'USB-C Charger', price: 24.99, main_image_url: 'https://images.unsplash.com/photo-1591290621749-2a133cd9ae63?w=200', rating: 4.5, review_count: 203 },
        { id: '3', name: 'Screen Protector', price: 9.99, main_image_url: 'https://images.unsplash.com/photo-1586253408031-67b61cfbc3d1?w=200', rating: 4.2, review_count: 412 }
      ]
    },
    '2': {
      id: '2',
      name: 'USB-C Fast Charger',
      description: 'Fast-charging USB-C charger compatible with all devices',
      price: 24.99,
      category: 'electronics',
      main_image_url: 'https://images.unsplash.com/photo-1591290621749-2a133cd9ae63?w=500',
      stock_quantity: 50,
      rating: 4.5,
      review_count: 203,
      seller_id: 'seller-1',
      flash_sale_active: false,
      flash_sale_discount: 0,
      seller: {
        id: 'seller-1',
        shop_name: 'TechPro Store',
        rating: 4.7,
        shop_avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'
      },
      reviews: [
        { id: '1', rating: 5, comment: 'Very fast charging!', created_at: '2025-11-18' }
      ],
      relatedProducts: [],
      sellerProducts: []
    },
    '3': {
      id: '3',
      name: 'Screen Protector Pack',
      description: 'Pack of 2 tempered glass screen protectors',
      price: 9.99,
      category: 'electronics',
      main_image_url: 'https://images.unsplash.com/photo-1586253408031-67b61cfbc3d1?w=500',
      stock_quantity: 100,
      rating: 4.2,
      review_count: 412,
      seller_id: 'seller-1',
      flash_sale_active: true,
      flash_sale_discount: 15,
      seller: {
        id: 'seller-1',
        shop_name: 'TechPro Store',
        rating: 4.7,
        shop_avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'
      },
      reviews: [],
      relatedProducts: [],
      sellerProducts: []
    },
    '4': {
      id: '4',
      name: 'Smartphone X Pro',
      description: 'High-performance smartphone with advanced camera system',
      price: 899.99,
      category: 'phones',
      main_image_url: 'https://images.unsplash.com/photo-1511707267537-b85faf00021e?w=500',
      stock_quantity: 10,
      rating: 4.9,
      review_count: 567,
      seller_id: 'seller-1',
      flash_sale_active: true,
      flash_sale_discount: 10,
      seller: {
        id: 'seller-1',
        shop_name: 'TechPro Store',
        rating: 4.7,
        shop_avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'
      },
      reviews: [
        { id: '1', rating: 5, comment: 'Amazing phone! Best camera ever!', created_at: '2025-11-10' }
      ],
      relatedProducts: [],
      sellerProducts: []
    }
  };

  return mockProducts[String(productId)] || null;
}

// Render product details
function renderProduct(product) {
  // Set page title
  document.title = `${product.name} - MarketMix`;

  // Update breadcrumb (guard elements before use)
  const breadcrumbCategoryEl = document.getElementById('breadcrumb-category');
  if (breadcrumbCategoryEl) breadcrumbCategoryEl.textContent = getCategoryRules(product.category).displayName;
  const breadcrumbProductEl = document.getElementById('breadcrumb-product');
  if (breadcrumbProductEl) breadcrumbProductEl.textContent = product.name;

  // Product header
  const productTitleEl = document.getElementById('product-title');
  if (productTitleEl) productTitleEl.textContent = product.name;
  const productCategoryEl = document.getElementById('product-category');
  if (productCategoryEl) productCategoryEl.textContent = getCategoryRules(product.category).displayName;
  
  // Shop info (guarded to avoid runtime errors if elements missing)
  if (product.seller) {
    const shopAvatarEl = document.getElementById('shop-avatar');
    if (shopAvatarEl) shopAvatarEl.src = product.seller.shop_avatar_url || 'https://via.placeholder.com/32';
    const shopLinkEl = document.getElementById('shop-link');
    if (shopLinkEl) {
      shopLinkEl.textContent = product.seller.shop_name;
      // Prefer seller.id but fall back to seller_id if present
      shopLinkEl.href = `./store-id.html?id=${product.seller.id || product.seller_id || ''}`;
    }
    const shopRatingEl = document.getElementById('shop-rating');
    if (shopRatingEl) shopRatingEl.textContent = `⭐ ${(product.seller.rating || 0).toFixed(1)} rating`;
  }

  // Price (normalized to 2 decimals)
  const displayPriceNum = Number(product.price);
  const displayPrice = (product.flash_sale_active && product.flash_sale_discount) 
    ? (displayPriceNum * (100 - Number(product.flash_sale_discount)) / 100).toFixed(2)
    : displayPriceNum.toFixed(2);
  const productPriceEl = document.getElementById('product-price');
  if (productPriceEl) productPriceEl.textContent = `$${displayPrice}`;
  
  if (product.flash_sale_active && product.flash_sale_discount) {
    const originalPriceEl = document.getElementById('original-price');
    if (originalPriceEl) {
      originalPriceEl.textContent = `$${Number(product.price).toFixed(2)}`;
      originalPriceEl.style.display = 'inline';
    }
  }

  // Stock status (avoid direct innerHTML with interpolated values to reduce XSS risk)
  const stockStatus = document.getElementById('stock-status');
  if (stockStatus) {
    stockStatus.innerHTML = '';
    if (Number(product.stock_quantity) > 0) {
      const inStockSpan = document.createElement('span');
      inStockSpan.style.color = '#22c55e';
      inStockSpan.textContent = `✓ In Stock (${Number(product.stock_quantity)} available)`;
      stockStatus.appendChild(inStockSpan);
    } else {
      const outSpan = document.createElement('span');
      outSpan.style.color = '#ef4444';
      outSpan.textContent = '✗ Out of Stock';
      stockStatus.appendChild(outSpan);

      // Guard add-to-cart modifications
      const addToCartBtn = document.getElementById('product-add-to-cart');
      if (addToCartBtn) {
        addToCartBtn.disabled = true;
        addToCartBtn.style.opacity = '0.5';
      }
    }
  }

  // Display view count
  const viewCountEl = document.getElementById('view-count');
  if (viewCountEl && product.views) {
    viewCountEl.textContent = product.views;
  }

  // Description
  const descriptionEl = document.getElementById('product-description');
  if (descriptionEl) {
    descriptionEl.textContent = product.description || 'No description available';
  }

  // Initialize components
  createImageGallery(product);
  createFlashSale(product);
  createCategoryOptions(product);
  createReviews(product);
  createShopMore(product);
  createRelatedProducts(product);
}

// Setup event listeners
function setupEventListeners(product) {
  // Add to cart (guard element existence)
  const addToCartBtn = document.getElementById('product-add-to-cart');
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => addToCart(product));
  }

  // Add to wishlist
  const wishlistBtn = document.getElementById('product-add-to-wishlist');
  if (wishlistBtn) {
    wishlistBtn.addEventListener('click', () => toggleWishlist(product));
  }

  // Checkout
  const checkoutBtn = document.getElementById('product-checkout');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => proceedToCheckout(product));
  }

  // Quantity
  const qtyInput = document.getElementById('product-quantity');
  const decreaseBtn = document.getElementById('qty-decrease');
  const increaseBtn = document.getElementById('qty-increase');

  if (decreaseBtn) {
    decreaseBtn.addEventListener('click', () => {
      if (!qtyInput) return;
      let qty = parseInt(qtyInput.value) || 1;
      if (qty > 1) qtyInput.value = qty - 1;
    });
  }

  if (increaseBtn) {
    increaseBtn.addEventListener('click', () => {
      if (!qtyInput) return;
      let qty = parseInt(qtyInput.value) || 1;
      if (qty < product.stock_quantity) qtyInput.value = qty + 1;
    });
  }
}

// Track product view - increment views count in database
async function trackProductView(productId) {
  try {
    const token = localStorage.getItem('token');
    const API_BASE = 'https://marketmix-backend.onrender.com/api';
    const url = `${API_BASE}/products/${productId}/view`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify({ timestamp: new Date().toISOString() })
    });

    if (response.ok) {
      console.log('Product view tracked successfully');
    }
  } catch (error) {
    // Silently fail - view tracking is not critical
    console.warn('Could not track product view:', error);
  }
}

// Add to cart
async function addToCart(product) {
  // Safe retrieval of quantity and sellerId
  const qtyInputEl = document.getElementById('product-quantity');
  const quantity = qtyInputEl ? (parseInt(qtyInputEl.value) || 1) : 1;
  const color = window.productOptions?.color?.() || null;
  const size = window.productOptions?.size?.() || null;
  const sellerId = product.seller?.id || product.seller_id || null;

  const cartItem = {
    id: product.id,
    name: product.name,
    price: product.price,
    image: product.main_image_url,
    quantity,
    color,
    size,
    sellerId
  }; 

  // Save to localStorage
  let cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const existingItem = cart.find(item => 
    item.id === cartItem.id && 
    item.color === cartItem.color && 
    item.size === cartItem.size
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push(cartItem);
  }

  localStorage.setItem('cart', JSON.stringify(cart));

  // Sync to Supabase if available
  if (window.SupabaseCart) {
    try {
      await SupabaseCart.addItem(cartItem);
    } catch (e) {
      console.warn('Supabase sync failed:', e);
    }
  }

  // Also sync to backend cart API if user is authenticated (keeps cart_items in DB in sync)
  try {
    const token = localStorage.getItem('token');
    const API_BASE = 'https://marketmix-backend.onrender.com/api';
    if (token) {
      // Backend expects product_id and quantity
      const res = await fetch(`${API_BASE}/cart/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ product_id: product.id, quantity })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn('Backend cart sync failed', res.status, err.message || err);
      } else {
        console.log('Backend cart synced successfully');
      }
    }
  } catch (e) {
    console.warn('Error syncing cart to backend:', e);
  }

  // Show success message
  const btn = document.getElementById('product-add-to-cart');
  const originalText = btn.textContent;
  btn.textContent = '✓ Added to Cart!';
  btn.style.backgroundColor = '#f97316';
  setTimeout(() => {
    btn.textContent = originalText;
    btn.style.backgroundColor = '#f97316';
  }, 2000);

  // Update cart count
  updateCartCount();
}

// Toggle wishlist
// Replace your existing toggleWishlist function with this:

async function toggleWishlist(product) {
  const btn = document.getElementById('product-add-to-wishlist');
  
  // Disable button during request
  if (btn) {
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = 'Adding...';
  }

  // Call the utility function
  const success = await addToWishlist(product.id);

  // Re-enable button and update UI
  if (btn) {
    btn.disabled = false;
    if (success) {
      btn.textContent = '❤️ Added to Wishlist';
      btn.style.color = '#fff';
      btn.style.background = '#f97316';
      
      // Reset after 2 seconds
      setTimeout(() => {
        btn.textContent = '❤️ Add to Wishlist';
        btn.style.color = '#f97316';
        btn.style.background = '#fafafa';
      }, 2000);
    } else {
      btn.textContent = '❤️ Add to Wishlist';
    }
  }
}

  

// Proceed to checkout
function proceedToCheckout(product) {
  // Safe retrieval of quantity and sellerId
  const qtyInputEl = document.getElementById('product-quantity');
  const quantity = qtyInputEl ? (parseInt(qtyInputEl.value) || 1) : 1;
  const color = window.productOptions?.color?.() || null;
  const size = window.productOptions?.size?.() || null;
  const sellerId = product.seller?.id || product.seller_id || null;

  const cartItem = {
    id: product.id,
    name: product.name,
    price: product.price,
    image: product.main_image_url,
    quantity,
    color,
    size,
    sellerId
  }; 

  // Save to localStorage
  let cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const existingItem = cart.find(item => 
    item.id === cartItem.id && 
    item.color === cartItem.color && 
    item.size === cartItem.size
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push(cartItem);
  }

  localStorage.setItem('cart', JSON.stringify(cart));

  // Sync to Supabase if available
  if (window.SupabaseCart) {
    try {
      SupabaseCart.addItem(cartItem);
    } catch (e) {
      console.warn('Supabase sync failed:', e);
    }
  }

  // Update cart count
  updateCartCount();

  // If user is authenticated, go to checkout. Otherwise save intent and redirect to login.
  const token = localStorage.getItem('token');
  if (token) {
    window.location.href = './checkout.html';
  } else {
    try {
      // Store both keys to remain backward compatible with older pages
      localStorage.setItem('after_login_redirect', './checkout.html');
      localStorage.setItem('post_login_redirect', './checkout.html');
    } catch (e) {
      console.warn('Could not set after_login_redirect/post_login_redirect', e);
    }
    window.location.href = 'login for buyers.html';
  }
}

// Update cart count in navbar
function updateCartCount() {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const count = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const cartCountEl = document.querySelector('#mm-cart-count');
  if (cartCountEl) {
    cartCountEl.textContent = count;
  }
}

// Show error message
function showError(message) {
  document.body.innerHTML = `
    <div style="padding:40px;text-align:center;font-family:Inter, sans-serif">
      <h1 style="color:#ef4444">${message}</h1>
      <a href="../index.html" style="
        display:inline-block;
        margin-top:20px;
        padding:10px 20px;
        background:#f97316;
        color:#fff;
        text-decoration:none;
        border-radius:8px
      ">← Back to Home</a>
    </div>
  `;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', updateCartCount);
