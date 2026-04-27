document.addEventListener('DOMContentLoaded', function(){
  // Setup autocomplete
  const topInput = document.getElementById('searchInput');
  const topAutocomplete = document.getElementById('searchAutocomplete');
  if (topInput && topAutocomplete) {
    setupAutocomplete(topInput, topAutocomplete, (suggestion) => {
      if (suggestion.type === 'product') {
        window.location.href = `product.html?id=${suggestion.id}`;
      } else if (suggestion.type === 'category') {
        window.location.href = `search-results.html?category=${suggestion.id}`;
      }
    });
  }

  const mobileInput = document.getElementById('searchInputMobile');
  const mobileAutocomplete = document.getElementById('searchAutocompleteMobile');
  if (mobileInput && mobileAutocomplete) {
    setupAutocomplete(mobileInput, mobileAutocomplete, (suggestion) => {
      if (suggestion.type === 'product') {
        window.location.href = `product.html?id=${suggestion.id}`;
      } else if (suggestion.type === 'category') {
        window.location.href = `search-results.html?category=${suggestion.id}`;
      }
    });
  }

  function getQueryParam(name){
    const params = new URLSearchParams(window.location.search);
    return params.get(name) || '';
  }

  const q = getQueryParam('q').trim();
  const categoryId = getQueryParam('category').trim();
  const resultsTitle = document.getElementById('resultsTitle');
  const resultsInfo = document.getElementById('resultsInfo');
  const resultsGrid = document.getElementById('resultsGrid');
  const noResults = document.getElementById('noResults');

  if (categoryId) {
    resultsTitle.textContent = 'Category Results';
    resultsInfo.textContent = 'Browsing category...';
  } else if (q) {
    resultsTitle.textContent = `Results for "${q}"`;
    resultsInfo.textContent = `Showing products matching "${q}"`;
  } else {
    resultsTitle.textContent = 'Search results';
  }

  // Search products and categories from API
  let filtered = [];
  
  async function searchProducts() {
    try {
      let apiUrl;
      if (categoryId) {
        // Fetch products for a specific category using the same endpoint as category.html
        const API_BASE = 'https://marketmix-backend.onrender.com/api';
        apiUrl = `${API_BASE}/categories/${encodeURIComponent(categoryId)}/products?limit=100`;
      } else if (q) {
        const API_BASE = 'https://marketmix-backend.onrender.com/api';
        apiUrl = `${API_BASE}/products/search/query?q=${encodeURIComponent(q)}`;
      } else {
        const API_BASE = 'https://marketmix-backend.onrender.com/api';
        apiUrl = `${API_BASE}/products?limit=50`;
      }
      
      console.log('Fetching products from:', apiUrl);
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Products API Response:', data);
      
      const products = Array.isArray(data.data) ? data.data : [];
      console.log('Found:', products.length, 'products');
      
      // Also search categories if no categoryId specified
      if (!categoryId) {
        await searchCategories(products);
      } else {
        filtered = products;
        render();
      }
    } catch (error) {
      console.error('Error searching products:', error.message);
      filtered = [];
      render();
    }
  }

  async function searchCategories(products) {
    try {
      if (!q) {
        filtered = products;
        render();
        return;
      }

      const API_BASE = 'https://marketmix-backend.onrender.com/api';
      const apiUrl = `${API_BASE}/categories/search/query?q=${encodeURIComponent(q)}`;
      console.log('Fetching categories from:', apiUrl);
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        console.warn('Category search failed:', response.status);
        filtered = products;
        render();
        return;
      }
      
      const data = await response.json();
      console.log('Categories API Response:', data);
      
      const categories = Array.isArray(data.data) ? data.data : [];
      console.log('Found:', categories.length, 'categories');
      
      // Convert categories to product-like format for display
      const categoryCards = categories.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description || `Browse ${c.name}`,
        price: null,
        main_image_url: null,
        isCategory: true,
        product_count: c.product_count || 0
      }));
      
      // Combine products and categories
      filtered = [...products, ...categoryCards];
      console.log('Total results:', filtered.length, '(products + categories)');
      render();
    } catch (error) {
      console.error('Error searching categories:', error.message);
      filtered = products;
      render();
    }
  }
  
  // Start search immediately
  searchProducts();

  function createCard(p){
    const div = document.createElement('div');
    div.className = 'product-card';
    
    // Handle categories differently from products
    if (p.isCategory) {
      div.innerHTML = `
        <div style="height: 200px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 48px;">
          🏷️
        </div>
        <div class="product-info">
          <div class="product-name">${p.name}</div>
          <div class="product-desc">${p.description}</div>
          <div class="meta"><span style="color: #666;">${p.product_count} product(s)</span></div>
        </div>
        <button class="add-to-cart" style="background: #667eea;" data-category-id="${p.id}">View Category</button>
      `;
      
      // Add click handler to navigate to category page
      const btn = div.querySelector('.add-to-cart');
      btn.addEventListener('click', () => {
        window.location.href = `search-results.html?category=${p.id}`;
      });
    } else {
      // Regular product card
      const price = parseFloat(p.price) || 0;
      div.innerHTML = `
        <img src="${p.main_image_url || p.image || 'https://via.placeholder.com/300'}" alt="${p.name}" style="height: 200px; object-fit: cover;">
        <div class="product-info">
          <div class="product-name">${p.name}</div>
          ${p.description ? `<div class="product-desc">${p.description}</div>` : ''}
          <div class="meta"><div class="price">$${price.toFixed(2)}</div></div>
        </div>
        <button class="add-to-cart" data-product-id="${p.id}">Add to Cart</button>
      `;
    }
    
    return div;
  }

  function render(){
    resultsGrid.innerHTML = '';
    if(filtered.length === 0){
      noResults.style.display = 'block';
      resultsInfo.textContent = q ? `No results for "${q}"` : (categoryId ? 'No products in this category.' : 'No results available.');
      return;
    }
    noResults.style.display = 'none';
    resultsInfo.textContent = `Showing ${filtered.length} result(s)`;
    
    filtered.forEach((p, idx) => resultsGrid.appendChild(createCard(p)));

    // Attach product card click handlers (for non-category products)
    const productCards = resultsGrid.querySelectorAll('.product-card');
    productCards.forEach((card, idx) => {
      const product = filtered[idx];
      
      // Click on card to go to product page (unless it's a category)
      if (!product.isCategory) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
          if (e.target.closest('.add-to-cart')) return;
          window.location.href = `product.html?id=${product.id}`;
        });
      }
      
      // Add to cart button behavior (only for products)
      const addBtn = card.querySelector('.add-to-cart');
      if (addBtn && !product.isCategory) {
        addBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          // Add to cart (similar to buyers homepage)
          let cart = JSON.parse(localStorage.getItem('cart')) || [];
          const existing = cart.find(item => item.name === product.name);
          if (existing) {
            existing.quantity = (existing.quantity || 1) + 1;
          } else {
            cart.push({
              name: product.name,
              price: product.price,
              image: product.main_image_url || product.image,
              quantity: 1,
              productId: product.id
            });
          }
          localStorage.setItem('cart', JSON.stringify(cart));
          showToast(`${product.name} added to cart`);
        });
      }
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

  // Populate search input in navbar with query
  if(topInput && q) topInput.value = q;

});
