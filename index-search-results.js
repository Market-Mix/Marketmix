document.addEventListener('DOMContentLoaded', function(){
  // Setup autocomplete
  const topInput = document.getElementById('mm-search-top-input');
  const topAutocomplete = document.getElementById('mm-search-top-autocomplete');
  if (topInput && topAutocomplete) {
    setupAutocomplete(topInput, topAutocomplete, (suggestion) => {
      if (suggestion.type === 'product') {
        window.location.href = `product.html?id=${suggestion.id}`;
      } else if (suggestion.type === 'category') {
        window.location.href = `buyers/category.html?id=${suggestion.id}`;
      }
    });
  }

  const mobileInput = document.getElementById('mm-search-mobile-input');
  const mobileAutocomplete = document.getElementById('mm-search-mobile-autocomplete');
  if (mobileInput && mobileAutocomplete) {
    setupAutocomplete(mobileInput, mobileAutocomplete, (suggestion) => {
      if (suggestion.type === 'product') {
        window.location.href = `product.html?id=${suggestion.id}`;
      } else if (suggestion.type === 'category') {
        window.location.href = `buyers/category.html?id=${suggestion.id}`;
      }
    });
  }

  function getQueryParam(name){
    const params = new URLSearchParams(window.location.search);
    return params.get(name) || '';
  }

  const q = getQueryParam('q').trim();
  const resultsTitle = document.getElementById('resultsTitle');
  const resultsInfo = document.getElementById('resultsInfo');
  const resultsGrid = document.getElementById('resultsGrid');
  const noResults = document.getElementById('noResults');

  resultsTitle.textContent = q ? `Results for "${q}"` : 'Search results';
  if(q) resultsInfo.textContent = `Showing products matching "${q}"`;

  // Search products from API
  let filtered = [];
  
  async function searchProducts() {
    try {
      const API_BASE = 'https://marketmix-backend.onrender.com/api';
      const apiUrl = q 
        ? `${API_BASE}/products/search/query?q=${encodeURIComponent(q)}`
        : `${API_BASE}/products?limit=50`;
      
      console.log('Fetching products from:', apiUrl);
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Products API Response:', data);
      
      const products = Array.isArray(data.data) ? data.data : [];
      console.log('Found:', products.length, 'products');
      
      // Also search categories
      await searchCategories(products);
    } catch (error) {
      console.error('Error searching products:', error.message);
      console.error('Full error:', error);
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
        window.location.href = `buyers/category.html?id=${p.id}`;
      });
    } else {
      // Regular product card
      const price = parseFloat(p.price) || 0;
      div.innerHTML = `
        <img src="${p.main_image_url || p.image || 'https://via.placeholder.com/300'}" alt="${p.name}" style="height: 200px; object-fit: cover;">
        <div class="product-info">
          <div class="product-name">${p.name}</div>
          ${p.description ? `<div class="product-desc">${p.description}</div>` : ''}
          <div class="meta"><div class="price">₦${price.toFixed(2)}</div></div>
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
      resultsInfo.textContent = q ? `No results for "${q}"` : 'No results available.';
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
          window.location.href = `buyers/product.html?id=${product.id}`;
        });
      }
      
      // Add to cart button behavior (only for products)
      const addBtn = card.querySelector('.add-to-cart');
      if (addBtn && !product.isCategory) {
        addBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if(window.showToast) {
            window.showToast(`${product.name} added to cart`);
          } else {
            const t = document.createElement('div'); 
            t.className='toast'; 
            t.textContent = `${product.name} added to cart`;
            document.body.appendChild(t);
            setTimeout(()=> t.classList.add('show'), 100);
            setTimeout(()=> { t.classList.remove('show'); setTimeout(()=> t.remove(),300); }, 2000);
          }
        });
      }
    });
  }

  // Populate top search input with current query
  if(topInput) topInput.value = q;
});