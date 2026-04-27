// API Base URL
const API_BASE = 'https://marketmix-backend.onrender.com/api';

document.addEventListener('DOMContentLoaded', function() {
  // ===== CART SYSTEM =====
  // Load existing cart or create new
  let cart = JSON.parse(localStorage.getItem('cart')) || [];

  // Function to update cart count in bottom nav
  function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
      cartCount.textContent = count;
      cartCount.style.display = count > 0 ? 'inline-block' : 'none';
    }
  }

  // Save cart to localStorage
  function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
  }

  // Sync cart from localStorage (useful when returning via back button or other pages)
  function syncCartFromStorage() {
    try {
      const stored = JSON.parse(localStorage.getItem('cart')) || [];
      // only assign if different to avoid unnecessary updates
      const changed = JSON.stringify(stored) !== JSON.stringify(cart);
      if (changed) {
        cart = stored;
        updateCartCount();
      }
    } catch (e) {
      console.warn('syncCartFromStorage failed', e);
      cart = [];
      updateCartCount();
    }
  }

  // Function to add item to backend API
  async function addToBackendCart(product) {
    try {
      // Check if user is logged in
      const token = Auth.getToken();
      if (!token) {
        showToast('Please login to add items to cart');
        setTimeout(() => {
          window.location.href = 'login for buyers.html';
        }, 1500);
        return false;
      }

      // Prefer a real product id when provided by the markup; otherwise create a temporary id
      const tempProductId = btoa(product.name).substring(0, 36);
      const productIdToSend = product.productId || tempProductId;
      const API_BASE = 'https://marketmix-backend.onrender.com/api';

      const response = await fetch(`${API_BASE}/cart/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          product_id: productIdToSend,
          quantity: 1,
          metadata: { name: product.name, image: product.image }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Backend error:', data.message);
        showToast(`Error: ${data.message}`);
        return false;
      }

      console.log('✅ Item added to backend:', data);
      return true;
    } catch (error) {
      console.error('Error adding to backend cart:', error);
      showToast('Error adding to cart. Check console.');
      return false;
    }
  }

  // Add item to cart (with quantity handling)
  async function addToCart(product) {
    if (!product || !product.name) return;

    // First, try to add to backend if logged in
    const token = Auth.getToken();
    if (token) {
      const backendSuccess = await addToBackendCart(product);
      if (!backendSuccess) {
        // If backend fails, still save locally
        showToast('Saved locally (backend sync failed)');
      }
    }

    // Always save to localStorage for offline support
    const existing = cart.find(item => item.name === product.name);
    if (existing) {
      existing.quantity = (existing.quantity || 1) + 1;
    } else {
      product.quantity = 1;
      cart.push(product);
    }
    saveCart();
    
    if (!token) {
      showToast(`${product.name} added to cart (login to save)`);
    } else {
      showToast(`${product.name} added to cart`);
    }
    
    // Small delay to ensure UI updates properly
    return new Promise(resolve => setTimeout(resolve, 100));
  }

  // Initial cart count update on page load
  updateCartCount();

  // Sync cart from localStorage (useful when returning via back button or other pages)
  window.addEventListener('pageshow', () => {
    syncCartFromStorage();
  });
  window.addEventListener('focus', () => {
    syncCartFromStorage();
  });
  // Listen to storage events from other tabs/windows
  window.addEventListener('storage', (e) => {
    if (e.key === 'cart') syncCartFromStorage();
  });
  // Setup autocomplete for desktop search
  const topInput = document.getElementById('searchInput');
  const topAutocomplete = document.getElementById('searchAutocomplete');
  if (topInput && topAutocomplete) {
    setupAutocomplete(topInput, topAutocomplete, (suggestion) => {
      if (suggestion.type === 'product') {
        window.location.href = `product.html?id=${suggestion.id}`;
      } else if (suggestion.type === 'category') {
        window.location.href = `buyers-category.html?id=${suggestion.id}`;
      }
    });
  }

  // Setup autocomplete for mobile search
  const mobileInput = document.getElementById('searchInputMobile');
  const mobileAutocomplete = document.getElementById('searchAutocompleteMobile');
  if (mobileInput && mobileAutocomplete) {
    setupAutocomplete(mobileInput, mobileAutocomplete, (suggestion) => {
      if (suggestion.type === 'product') {
        window.location.href = `product.html?id=${suggestion.id}`;
      } else if (suggestion.type === 'category') {
        window.location.href = `buyers-category.html?id=${suggestion.id}`;
      }
    });
  }

  // Get category ID from URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const categoryId = urlParams.get('id');

  if (!categoryId) {
    document.getElementById('categoryTitle').textContent = 'Category Not Found';
    document.getElementById('noResults').style.display = 'block';
    return;
  }

  // Fetch products for this category
  fetchCategoryProducts(categoryId);

  async function fetchCategoryProducts(categoryId) {
    try {
      const API_BASE = 'https://marketmix-backend.onrender.com/api';
      // Fetch category details
      const categoryRes = await fetch(`${API_BASE}/categories/${categoryId}`);
      if (!categoryRes.ok) throw new Error('Category not found');
      const categoryData = await categoryRes.json();
      const categoryName = categoryData.data.name;

      // Update page title and heading
      document.title = `${categoryName} — MarketMix`;
      document.getElementById('categoryTitle').textContent = `${categoryName}`;

      // Fetch products for this category
      const productsRes = await fetch(`${API_BASE}/categories/${categoryId}/products?limit=100`);
      if (!productsRes.ok) throw new Error('Failed to fetch products');
      const productsData = await productsRes.json();
      const products = productsData.data || [];

      const grid = document.getElementById('categoryProductsGrid');
      const noResults = document.getElementById('noResults');
      const resultsInfo = document.getElementById('resultsInfo');

      if (products.length === 0) {
        noResults.style.display = 'block';
        grid.innerHTML = '';
        resultsInfo.textContent = '';
      } else {
        noResults.style.display = 'none';
        resultsInfo.textContent = `Showing ${products.length} product(s)`;

        grid.innerHTML = products.map(product => `
          <div class="product-card" data-product-id="${product.id}" data-category="${categoryName.toLowerCase()}" data-name="${product.name}" data-price="${product.price}">
            <img src="${product.main_image_url || product.image || 'https://via.placeholder.com/300'}" alt="${product.name}">
            <div class="product-info">
              <div class="product-name">${product.name}</div>
              <div class="meta">
                <div class="price">$${parseFloat(product.price).toFixed(2)}</div>
              </div>
            </div>
            <button class="add-to-cart">Add to Cart</button>
          </div>
        `).join('');

        // Re-attach click handlers to new product cards
        attachProductCardHandlers();
        attachCartListeners();
      }
    } catch (error) {
      console.error('Error fetching category products:', error);
      document.getElementById('categoryTitle').textContent = 'Error Loading Category';
      document.getElementById('noResults').style.display = 'block';
      document.getElementById('noResults').textContent = 'Failed to load products. Please try again.';
    }
  }

  function attachProductCardHandlers() {
    document.querySelectorAll('#categoryProductsGrid .product-card').forEach((card) => {
      const productId = card.getAttribute('data-product-id');
      card.style.cursor = 'pointer';

      card.addEventListener('click', (e) => {
        if (e.target.closest('.add-to-cart')) return;
        window.location.href = `product.html?id=${productId}`;
      });
    });
  }

  // Attach listeners to all "Add to Cart" buttons (guarded) - can be called after dynamic rendering
  function attachCartListeners() {
    const addButtons = document.querySelectorAll('.add-to-cart') || [];
    addButtons.forEach(button => {
      // Check if listener already attached to avoid duplicates
      if (button.dataset.listenerAttached === 'true') return;
      
      button.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent event bubbling
        
        // Prevent double-click by disabling button temporarily
        if (button.disabled) return;
        button.disabled = true;
        
        const card = button.closest('.product-card');
        if (!card) {
          button.disabled = false;
          return;
        }
        
        const titleEl = card.querySelector('.product-name');
        const priceEl = card.querySelector('.price');
        const imgEl = card.querySelector('img');

        const name = titleEl ? titleEl.textContent.trim() : 'Product';
        let price = 0;
        if (priceEl) {
          const priceText = priceEl.textContent.replace(/[^0-9.,-]/g, '').replace(',', '.').trim();
          price = parseFloat(priceText) || 0;
        }
        const image = imgEl ? (imgEl.src || '') : '';

        // Prefer a real product_id if present on the card
        const productId = card.dataset && card.dataset.productId ? card.dataset.productId : null;
        const product = { name, price, image, quantity: 1, productId };
        
        // Store original button text
        const originalText = button.textContent;
        
        // Call addToCart and wait for completion
        await addToCart(product);
        
        // Update button state to "Added"
        button.textContent = 'Added';
        button.classList.add('added');
        
        // Re-enable button after 2 seconds and reset text/class
        setTimeout(() => {
          button.textContent = originalText;
          button.classList.remove('added');
          button.disabled = false;
        }, 2000);
      });
      
      // Mark that listener has been attached
      button.dataset.listenerAttached = 'true';
    });
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
      z-index: 10000;
      font-weight: 600;
      font-size: 14px;
      animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // ===== LOAD BEST-SELLING PRODUCTS =====
  async function loadBestSellingProducts() {
    try {
      const API_BASE = 'https://marketmix-backend.onrender.com/api';
      const response = await fetch(`${API_BASE}/products?limit=20`);
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      const products = data.data || [];

      if (products.length === 0) {
        const grid = document.getElementById('bestSellingGrid');
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #999;">No products available</div>';
        return;
      }

      renderBestSellingProducts(products);
    } catch (error) {
      console.error('Error loading best-selling products:', error);
    }
  }

  function renderBestSellingProducts(products) {
    const grid = document.getElementById('bestSellingGrid');
    grid.innerHTML = products.map(p => `
      <div class="product-card" data-product-id="${p.id}" data-name="${p.name}" data-price="${p.price}" data-category="${(p.category || p.category_name || 'all').toLowerCase().trim()}">
        <img src="${p.image || p.main_image_url || 'https://via.placeholder.com/300'}" alt="${p.name}">
        <div class="product-info">
          <div class="product-name">${p.name}</div>
          <div class="meta">
            <div class="price">$${parseFloat(p.price).toFixed(2)}</div>
          </div>
        </div>
        <button class="add-to-cart">Add to Cart</button>
      </div>
    `).join('');

    attachBestSellingHandlers(products);
  }

  function attachBestSellingHandlers(products) {
    const cards = document.querySelectorAll('#bestSellingGrid .product-card');
    cards.forEach((card, idx) => {
      const productId = card.getAttribute('data-product-id');
      card.style.cursor = 'pointer';

      card.addEventListener('click', (e) => {
        if (e.target.closest('.add-to-cart')) return;
        window.location.href = `product.html?id=${productId}`;
      });
    });

    attachCartListeners();
  }

  // Load best-selling on page load
  loadBestSellingProducts();

  // ===== HELPER FUNCTION FOR CATEGORY NORMALIZATION =====
  function normalizeCategoryRaw(input) {
    if (!input) return '';
    return String(input)
      .toLowerCase()
      .replace(/&nbsp;/g, ' ')
      .replace(/\s*&\s*/g, ' & ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ===== ATTACH FILTER BUTTON LISTENERS (defined early so it can be called later) =====
  function attachFilterButtonListeners() {
      const filterButtons = document.querySelectorAll('.filter-btn');

      filterButtons.forEach(btn => {
        btn.addEventListener('click', async function() {
          const rawCategory = this.dataset.category || '';
          const category = normalizeCategoryRaw(rawCategory);
          const section = this.dataset.section;

          document.querySelectorAll(`.${section}-filter .filter-btn`).forEach(b => b.classList.remove('active'));
          this.classList.add('active');

          const products = document.querySelectorAll(`.${section}-grid .product-card`);

          // Try to match existing products in the section first
          const matched = Array.from(products).filter(product => {
            const pcat = normalizeCategoryRaw(product.dataset.category || '');
            return category === 'all' || pcat === category;
          });

          // If no existing products match and a specific category was selected,
          // fetch more products from the API
          if (matched.length === 0 && category !== 'all') {
            try {
              const API_BASE = 'https://marketmix-backend.onrender.com/api';
              const resp = await fetch(`${API_BASE}/products?limit=200`);
              if (resp.ok) {
                const json = await resp.json();
                const items = json.data || [];
                const filtered = items.filter(it => normalizeCategoryRaw(it.category || it.category_name || '') === category);
                const grid = document.querySelector(`.${section}-grid`);
                if (grid) {
                  grid.innerHTML = filtered.length > 0 ? filtered.map(p => `
                    <div class="product-card" data-product-id="${p.id}" data-name="${p.name}" data-price="${p.price}" data-category="${category}">
                      <img src="${p.image || p.main_image_url || 'https://via.placeholder.com/300'}" alt="${p.name}">
                      <div class="product-info">
                        <div class="product-name">${p.name}</div>
                        <div class="meta">
                          <div class="price">$${parseFloat(p.price).toFixed(2)}</div>
                        </div>
                      </div>
                      <button class="add-to-cart">Add to Cart</button>
                    </div>
                  `).join('') : '<div style="grid-column: 1/-1; padding: 20px; color: #334155; text-align: center;">No products in this category</div>';
                  attachBestSellingHandlers(filtered);
                }
              }
            } catch (err) {
              console.error('Error fetching category products', err);
            }
            return;
          }

          // Otherwise show/hide existing DOM products
          products.forEach(product => {
            const productCategory = normalizeCategoryRaw(product.dataset.category || '');
            const shouldShow = category === 'all' || productCategory === category;
            if (shouldShow) {
              product.style.display = '';
              product.style.visibility = 'visible';
            } else {
              product.style.display = 'none';
              product.style.visibility = 'hidden';
            }
          });
        });
      });
    }

  // ===== DYNAMICALLY LOAD FILTER BUTTONS FROM SUPABASE =====
  (function() {
    const filterContainer = document.getElementById('bestSellingFilterContainer');
    if (!filterContainer) return;

    async function fetchAndPopulateFilterButtons() {
      try {
        const API_BASE = 'https://marketmix-backend.onrender.com/api';
        const response = await fetch(`${API_BASE}/categories`);
        if (!response.ok) throw new Error('Failed to fetch categories');
        
        const result = await response.json();
        const categories = result.data || [];

        if (categories.length === 0) {
          // Keep only "All" button if no categories
          return;
        }

        // Generate filter buttons from categories
        const categoryButtons = categories.map(category => {
          return `<button class="filter-btn" data-category="${category.name.toLowerCase()}" data-section="best-selling">${category.name}</button>`;
        }).join('');

        // Append new buttons after the "All" button
        const allButton = filterContainer.querySelector('[data-category="all"]');
        if (allButton && allButton.nextSibling) {
          // Insert after the "All" button
          allButton.insertAdjacentHTML('afterend', categoryButtons);
        } else if (allButton) {
          // If "All" is the last element, append
          allButton.insertAdjacentHTML('afterend', categoryButtons);
        }

        // Re-attach filter button listeners to include new buttons
        attachFilterButtonListeners();
      } catch (error) {
        console.error('Error fetching categories for filter buttons:', error);
      }
    }

    fetchAndPopulateFilterButtons();
  })();
});