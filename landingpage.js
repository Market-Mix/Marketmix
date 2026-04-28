
    document.addEventListener('DOMContentLoaded', function() {
      
      // ===== HERO SLIDER =====
      (function() {
        const slides = document.querySelectorAll('.hero-slide');
        if (!slides || slides.length === 0) return;
        
        let currentIndex = 0;
        const interval = 4000;
        let isPaused = false;
        
        function showSlide(index) {
          slides.forEach(slide => slide.classList.remove('active'));
          slides[index].classList.add('active');
        }
        
        function nextSlide() {
          if (isPaused) return;
          currentIndex = (currentIndex + 1) % slides.length;
          showSlide(currentIndex);
        }
        
        let timer = setInterval(nextSlide, interval);
        
        const heroRight = document.querySelector('.hero-right');
        if (heroRight) {
          heroRight.addEventListener('mouseenter', () => isPaused = true);
          heroRight.addEventListener('mouseleave', () => isPaused = false);
        }
      })();

      // ===== SEARCH FUNCTIONALITY =====
      (function() {
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        const searchResults = document.getElementById('searchResults');
        
        if (!searchInput || !searchResults) return;
        
        const allProducts = [];
        document.querySelectorAll('.product-card').forEach(card => {
          const name = card.dataset.name || card.querySelector('.product-name')?.textContent || '';
          const price = card.dataset.price || '';
          const category = card.dataset.category || '';
          if (name) {
            allProducts.push({ name, price, category, element: card });
          }
        });
        
        function performSearch(query) {
          if (!query.trim()) {
            searchResults.classList.remove('show');
            return;
          }
          
          const lowQuery = query.toLowerCase();
          const matches = allProducts.filter(p => 
            p.name.toLowerCase().includes(lowQuery) ||
            p.category.toLowerCase().includes(lowQuery)
          ).slice(0, 5);
          
          if (matches.length === 0) {
            searchResults.innerHTML = '<div class="no-results">No products found</div>';
          } else {
            searchResults.innerHTML = matches.map(p => 
              `<div class="search-result-item" data-name="${p.name}">
                <strong>${p.name}</strong> - ${p.price}
              </div>`
            ).join('');
          }
          
          searchResults.classList.add('show');
        }
        
        searchInput.addEventListener('input', (e) => {
          performSearch(e.target.value);
        });
        
        searchBtn.addEventListener('click', () => {
          performSearch(searchInput.value);
        });
        
        searchInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            performSearch(searchInput.value);
          }
        });
        
        document.addEventListener('click', (e) => {
          if (!e.target.closest('.search-wrap')) {
            searchResults.classList.remove('show');
          }
        });
        
        searchResults.addEventListener('click', (e) => {
          const item = e.target.closest('.search-result-item');
          if (item) {
            const productName = item.dataset.name;
            const product = allProducts.find(p => p.name === productName);
            if (product && product.element) {
              product.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            searchResults.classList.remove('show');
            searchInput.value = '';
          }
        });
      })();

      // ===== FILTER BUTTONS =====
      (function() {
        // Normalize category strings for consistent comparisons
        function normalizeCategoryRaw(input) {
          if (!input) return '';
          return String(input)
            .toLowerCase()
            .replace(/&nbsp;/g, ' ')
            .replace(/\s*&\s*/g, ' & ')
            .replace(/\s+/g, ' ')
            .trim();
        }

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
            // fetch more products from the API (larger limit) and render matches into the section.
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
                    grid.innerHTML = filtered.length > 0 ? filtered.map(renderProductCard).join('') : '<div class="no-results" style="grid-column:1/-1; padding:20px; color:#334155;">No products in this category</div>';
                    attachProductCardListeners(grid);
                  }
                } else {
                  console.warn('Landing: failed to fetch products for category filter', resp.status);
                }
              } catch (err) {
                console.error('Landing: error fetching category products', err);
              }

              return; // we've replaced the section content, done
            }

            // Otherwise show/hide existing DOM products
            products.forEach(product => {
              const productCategory = normalizeCategoryRaw(product.dataset.category || '');
              const shouldShow = category === 'all' || productCategory === category;
              product.style.display = shouldShow ? 'flex' : 'none';
            });
          });
        });
      })();


      // ===== NEWSLETTER SUBSCRIPTION =====
      (function() {
        const form = document.getElementById('newsletterForm');
        const input = document.getElementById('newsletterInput');
        const message = document.getElementById('newsletterMessage');
        
        if (!form || !input || !message) return;
        
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          
          const email = input.value.trim();
          
          if (!email || !email.includes('@')) {
            message.textContent = 'Please enter a valid email';
            message.style.color = '#f87171';
            return;
          }
          
          message.textContent = 'Subscribing...';
          message.style.color = '#94a3b8';
          
          setTimeout(() => {
            message.textContent = '✓ Subscribed successfully!';
            message.style.color = '#34d399';
            input.value = '';
            
            setTimeout(() => {
              message.textContent = '';
            }, 5000);
          }, 1000);
        });
      })();

      // ===== ADD TO CART FUNCTIONALITY =====
    
  // Centralized cart state (local) and helper to update UI
  const cartCount = document.getElementById('mm-cart-count');
  let cart = JSON.parse(localStorage.getItem('cart')) || [];

  function updateCartCount() {
    if (!cartCount) return;
    cartCount.textContent = cart.reduce((total, item) => total + (item.quantity || 0), 0);
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

  // Delegated click handler for Add to Cart buttons (works for dynamic content)
  document.addEventListener('click', (e) => {
    const button = e.target.closest('.add-to-cart');
    if (!button) return;
    e.preventDefault();

    const card = button.closest('.product-card, .you-card');
    if (!card) return;

    let name = '';
    let price = 0;
    let image = '';

    if (card.classList.contains('product-card')) {
      name = card.querySelector('.product-name')?.textContent.trim() || card.dataset.name || '';
      price = parseFloat(card.querySelector('.price')?.textContent.replace(/[^0-9.]/g, '')) || parseFloat(card.dataset.price) || 0;
      image = card.querySelector('img')?.src || card.dataset.image || '';
    } else if (card.classList.contains('you-card')) {
      name = card.querySelector('h3')?.textContent.trim() || '';
      price = parseFloat(card.querySelector('.price')?.textContent.replace(/[^0-9.]/g, '')) || 0;
      image = card.querySelector('img')?.src || '';
    }

    const productId = card.dataset && card.dataset.productId ? card.dataset.productId : null;
    const productObj = { name, price, image, quantity: 1, productId };

    // Try backend sync if logged in and productId is valid
    (async () => {
      try {
        const token = (window.Auth && typeof Auth.getToken === 'function') ? Auth.getToken() : localStorage.getItem('token');
        const API_BASE = 'https://marketmix-backend.onrender.com/api';
        if (token && productObj.productId) {
          const resp = await fetch(`${API_BASE}/cart/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ product_id: productObj.productId, quantity: 1 })
          });
          if (!resp.ok) {
            const d = await resp.json().catch(() => null);
            console.warn('Landing: backend add-to-cart failed', resp.status, d);
          } else {
            console.log('Landing: added to backend cart');
          }
        }
      } catch (err) {
        console.error('Landing page: error adding to backend cart', err);
      }
    })();

    const existing = cart.find(item => item.name === name);
    if (existing) existing.quantity = (existing.quantity || 0) + 1;
    else cart.push(productObj);

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();

    button.textContent = 'Added!';
    setTimeout(() => (button.textContent = 'Add to Cart'), 1000);
    showToast('Product added to cart!');
  });

  // Initial cart count
  updateCartCount();

  // Load products from backend and render into the grids
  async function loadLandingProducts(limit = 8) {
    try {
      const API_BASE = 'https://marketmix-backend.onrender.com/api';
      const res = await fetch(`${API_BASE}/products?limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch products');
      const json = await res.json();
      const items = json.data || [];

      if (!items || items.length === 0) {
        console.warn('Landing: no products returned from API');
        return;
      }

      console.log(`Landing: fetched ${items.length} products`);

      const bestGrid = document.querySelector('.best-selling-grid');
      const newGrid = document.querySelector('.new-arrivals-grid');

      // Render into best selling (first half) and new arrivals (second half)
      const half = Math.ceil(items.length / 2);
      if (bestGrid) {
        bestGrid.innerHTML = items.slice(0, half).map(renderProductCard).join('');
        // Reattach click handlers for newly rendered product cards
        attachProductCardListeners(bestGrid);
      }
      if (newGrid) {
        newGrid.innerHTML = items.slice(half).map(renderProductCard).join('');
        // Reattach click handlers for newly rendered product cards
        attachProductCardListeners(newGrid);
      }

      // Only populate "You Might Like" carousel (hero is for banners only, not products)
      let youLikeItems = items.slice(0, 9);
      if (!youLikeItems || youLikeItems.length === 0) {
        youLikeItems = items;
      }
      renderYouMightLike(youLikeItems);
    } catch (err) {
      console.error('Error loading landing products:', err);
    }
  }

  // Helper function to attach click listeners to product cards
  function attachProductCardListeners(container) {
    if (!container) return;
    container.querySelectorAll('.product-card').forEach((card) => {
      const productId = card.getAttribute('data-product-id');
      card.style.cursor = 'pointer';
      
      card.addEventListener('click', (e) => {
        if (e.target.closest('.add-to-cart')) return;
        window.location.href = `./buyers/product.html?id=${productId}`;
      });
    });
  }

  // Render hero slides into #heroSlides
  function renderHeroSlides(items) {
    const container = document.getElementById('heroSlides');
    if (!container || !items || items.length === 0) return;

    // Keep an overlay hero-card but replace slides
    const heroCard = container.querySelector('.hero-card') ? container.querySelector('.hero-card').outerHTML : '';
    const slidesHtml = items.map((p, i) => `
      <div class="hero-slide${i === 0 ? ' active' : ''}" style="background-image:url('${p.image || p.main_image_url || ''}')" role="img" aria-label="${escapeHtml(p.name)}"></div>
    `).join('');

    container.innerHTML = slidesHtml + heroCard;
  }

  // Render "You Might Like" carousel into #youLikeTrack
  function renderYouMightLike(items) {
    const track = document.getElementById('youLikeTrack');
    if (!track || !items) return;
    track.innerHTML = items.map(p => `
      <div class="you-card" data-product-id="${p.id}" data-name="${escapeHtml(p.name)}" data-price="${p.price}">
        <img src="${p.image || p.main_image_url || ''}" alt="${escapeHtml(p.name)}" />
        <h3>${escapeHtml(p.name)}</h3>
        <p class="price">₦${typeof p.price === 'number' ? p.price.toFixed(2) : p.price}</p>
        <button class="add-to-cart">Add to Cart</button>
      </div>
    `).join('');
    
    // Reattach click handlers for "You Might Like" cards
    attachYouLikeCardListeners(track);
  }

  function renderProductCard(product) {
    const img = product.image || product.main_image_url || 'marketplace.png';
    const price = typeof product.price === 'number' ? product.price.toFixed(2) : product.price;
    // Use product's category if available, otherwise default to "all"
    // The category should be lowercase from the API for proper filter matching
    const category = (product.category || product.category_name || 'all').toLowerCase().trim();
    
    // Debug log to help troubleshoot
    if (!product._logged) {
      console.log(`Product: ${product.name}, Category from API: "${product.category}", Final category: "${category}"`);
      product._logged = true;
    }
    
    return `
      <div class="product-card" data-product-id="${product.id}" data-name="${escapeHtml(product.name)}" data-price="${price}" data-category="${category}">
        <img src="${img}" alt="${escapeHtml(product.name)}">
        <div class="product-info">
          <div class="product-name">${escapeHtml(product.name)}</div>
          <div class="product-desc">${escapeHtml(product.description || '')}</div>
          <div class="meta">
            <div class="price">₦${price}</div>
          </div>
        </div>
        <button class="add-to-cart">Add to Cart</button>
      </div>`;
  }

  // Helper function to attach click listeners to product cards
  function attachProductCardListeners(container) {
    if (!container) return;
    container.querySelectorAll('.product-card').forEach((card) => {
      const productId = card.getAttribute('data-product-id');
      card.style.cursor = 'pointer';
      
      card.addEventListener('click', (e) => {
        if (e.target.closest('.add-to-cart')) return;
        window.location.href = `./buyers/product.html?id=${productId}`;
      });
    });
  }

  // Helper function to attach click listeners to "You Might Like" cards
  function attachYouLikeCardListeners(container) {
    if (!container) return;
    container.querySelectorAll('.you-card').forEach((card) => {
      const productId = card.getAttribute('data-product-id');
      card.style.cursor = 'pointer';
      
      card.addEventListener('click', (e) => {
        if (e.target.closest('.add-to-cart')) return;
        window.location.href = `./buyers/product.html?id=${productId}`;
      });
    });
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c];
    });
  }



  // Kick off loading products for landing
  loadLandingProducts(12);

      // ===== BACK TO TOP BUTTON =====
      (function() {
        const btn = document.getElementById('backToTop');
        if (!btn) return;
        
        window.addEventListener('scroll', () => {
          if (window.scrollY > 400) {
            btn.classList.add('visible');
          } else {
            btn.classList.remove('visible');
          }
        });
        
        btn.addEventListener('click', () => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      })();

      // ===== KEYBOARD ACCESSIBILITY =====
        (function() {
          // user-dropdown: keyboard + click + hover handling
          const dropdown = document.querySelector('.user-dropdown');
          if (dropdown) {
            const btn = dropdown.querySelector('.icon-btn');
            const menu = dropdown.querySelector('.menu');
            const menuItems = menu ? menu.querySelectorAll('a') : [];

            function closeDropdown() {
              dropdown.classList.remove('open');
              btn.setAttribute('aria-expanded', 'false');
              if (menu) menu.setAttribute('aria-hidden', 'true');
            }

            function openDropdown() {
              dropdown.classList.add('open');
              btn.setAttribute('aria-expanded', 'true');
              if (menu) menu.setAttribute('aria-hidden', 'false');
            }

            // Click toggles (useful for touch/mobile)
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              const isOpen = dropdown.classList.toggle('open');
              btn.setAttribute('aria-expanded', String(isOpen));
              if (menu) menu.setAttribute('aria-hidden', String(!isOpen));
              if (isOpen) menuItems[0]?.focus();
            });

            // Keyboard support
            btn.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const isExpanded = btn.getAttribute('aria-expanded') === 'true';
                if (isExpanded) { closeDropdown(); }
                else { openDropdown(); menuItems[0]?.focus(); }
              } else if (e.key === 'Escape') {
                closeDropdown();
                btn.focus();
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                openDropdown();
                menuItems[0]?.focus();
              }
            });

            // Close when clicking outside
            document.addEventListener('click', (e) => {
              if (!e.target.closest('.user-dropdown')) {
                closeDropdown();
              }
            });

            // Close on Escape anywhere
            document.addEventListener('keydown', (e) => {
              if (e.key === 'Escape') closeDropdown();
            });

            // Close when a menu item is chosen
            menuItems.forEach(mi => mi.addEventListener('click', () => closeDropdown()));
          }

          // new navbar toggle accessibility
          const mmToggle = document.querySelector('.mm-toggle');
          const mmMenu = document.getElementById('mm-menu');
          if (mmToggle && mmMenu) {
            mmToggle.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const isOpen = mmMenu.classList.toggle('open');
                mmToggle.setAttribute('aria-expanded', String(isOpen));
                mmMenu.setAttribute('aria-hidden', String(!isOpen));
              }
            });
          }
        })();
    });

    // ===== ADD ANIMATION KEYFRAMES =====
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  
  // ===== NAVBAR TOGGLE SCRIPT =====
  (function () {
  const toggle   = document.getElementById('mm-toggle');
  const mobileNav = document.getElementById('mm-mobile-nav');
  const userWrap  = document.querySelector('.mm-user-wrap');
  const userBtn   = document.getElementById('mm-user-btn');

  // Hamburger open / close
  function setMenu(open) {
    toggle.classList.toggle('open', open);
    mobileNav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    mobileNav.setAttribute('aria-hidden', String(!open));
  }

  if (toggle && mobileNav) {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      setMenu(!mobileNav.classList.contains('open'));
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setMenu(false);
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.mm-navbar') && !e.target.closest('.mm-mobile-nav')) {
        setMenu(false);
      }
    });
  }

  // Desktop account dropdown (click toggle for accessibility)
  if (userBtn && userWrap) {
    userBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = userWrap.classList.toggle('open');
      userBtn.setAttribute('aria-expanded', String(isOpen));
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.mm-user-wrap')) {
        userWrap.classList.remove('open');
        userBtn.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        userWrap.classList.remove('open');
        userBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }
})();

  // ===== PRODUCT CARD NAVIGATION (NOW HANDLED BY attachProductCardListeners AND attachYouLikeCardListeners) =====
  // This is now handled by the helper functions that attach listeners after products are loaded
  // The old code below is kept only for demo cards that exist in HTML before API load
  (function() {
    // Only wire demo product cards that exist in the initial HTML (before API load)
    // These will be replaced once API products load, so we use event delegation
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.product-card, .you-card');
      if (!card) return;
      
      // Don't navigate if user clicked "Add to Cart" button
      if (e.target.closest('.add-to-cart')) return;
      
      const productId = card.getAttribute('data-product-id');
      if (productId) {
        window.location.href = `./buyers/product.html?id=${productId}`;
      }
    });
  })();

  // ===== POPULAR CATEGORIES =====
  (function() {
    const categoriesContainer = document.getElementById('categoriesContainer');
    if (!categoriesContainer) return;

    async function fetchAndPopulateCategories() {
      try {
        const API_BASE = 'https://marketmix-backend.onrender.com/api';
        const response = await fetch(`${API_BASE}/categories`);
        if (!response.ok) throw new Error('Failed to fetch categories');
        
        const result = await response.json();
        const categories = result.data || [];

        if (categories.length === 0) {
          categoriesContainer.innerHTML = '<div class="category-skeleton">No categories available</div>';
          return;
        }

        // Generate category cards with icons/emojis
        const categoryIcons = {
          'Electronics': '📱',
          'Fashion': '👕',
          'Home & Garden': '🏠',
          'Sports & Outdoors': '⚽',
          'Books & Media': '📚',
          'Toys & Games': '🎮',
          'Health & Beauty': '💄',
          'Automotive': '🚗',
          'Jewelry': '💍',
          'Pet Supplies': '🐾',
        };

        const categoryCards = categories.map(category => {
          const icon = categoryIcons[category.name] || '📦';
          return `
            <a href="./buyers/category.html?id=${category.id}" class="category-card" title="${category.name}">
              <div class="category-icon">${icon}</div>
              <div class="category-name">${category.name}</div>
            </a>
          `;
        }).join('');

        categoriesContainer.innerHTML = categoryCards;
      } catch (error) {
        console.error('Error fetching categories:', error);
        categoriesContainer.innerHTML = '<div class="category-skeleton" style="grid-column: 1/-1;">Unable to load categories</div>';
      }
    }

    fetchAndPopulateCategories();
  })();