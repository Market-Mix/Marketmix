// ...existing code...

// Wrap initialization in DOMContentLoaded to avoid null element errors
window.addEventListener('DOMContentLoaded', () => {

  // Interval handle for the flash sale summed countdown
  let flashCountdownInterval = null;
  // Interval handle for the original demo countdown (kept for fallback)
  let demoCountdownInterval = null;
  // Interval handle for periodic refresh that re-fetches flash products
  let flashRefreshInterval = null;
  // How often to re-fetch flash products (minutes)
  const FLASH_REFRESH_MINUTES = 1; // default: 1 minute

  // Helper: format milliseconds into human-friendly countdown string
  function formatMsAsCountdown(ms) {
    if (ms <= 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const two = (n) => String(n).padStart(2, '0');
    if (days > 0) {
      return `${days}d ${two(hours)}:${two(minutes)}:${two(seconds)}`;
    }
    return `${two(hours)}:${two(minutes)}:${two(seconds)}`;
  }
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

          // If "All" is clicked, reload all products for the section
          if (category === 'all' && section === 'best-selling') {
            loadBestSellingProducts();
            return;
          }

          if (category === 'all' && section === 'new-arrivals') {
            loadNewArrivalsProducts();
            return;
          }

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
                  attachCartListeners(); // Re-attach cart listeners
                }
              } else {
                console.warn('Buyers homepage: failed to fetch products for category filter', resp.status);
              }
            } catch (err) {
              console.error('Buyers homepage: error fetching category products', err);
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

  // ===== POPULAR CATEGORIES LOADER =====
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
            <a href="buyers-category.html?id=${category.id}" class="category-card" title="${category.name}">
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

    // ===== QUICK LINKS LOADER FROM SUPABASE =====
    (function() {
      const quickLinksContainer = document.getElementById('quickLinksContainer');
      if (!quickLinksContainer) return;

      async function fetchAndPopulateQuickLinks() {
        try {
          const API_BASE = 'https://marketmix-backend.onrender.com/api';
          const response = await fetch(`${API_BASE}/categories`);
          if (!response.ok) throw new Error('Failed to fetch categories');
        
          const result = await response.json();
          const categories = result.data || [];

          if (categories.length === 0) {
            quickLinksContainer.innerHTML = '<div class="category-skeleton">No categories available</div>';
            return;
          }

          // Generate quick link cards from categories
          const quickLinkCards = categories.map(category => {
            return `
              <a href="buyers-category.html?id=${category.id}" class="link-card" title="${category.name}">
                <img src="marketplace.png" alt="${category.name}">
                <p>${category.name}</p>
              </a>
            `;
          }).join('');

          quickLinksContainer.innerHTML = quickLinkCards;
        } catch (error) {
          console.error('Error fetching quick links categories:', error);
          quickLinksContainer.innerHTML = '<div class="category-skeleton">Unable to load categories</div>';
        }
      }

      fetchAndPopulateQuickLinks();
    })();

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

  // ===== DYNAMICALLY LOAD FILTER BUTTONS FOR NEW ARRIVALS FROM SUPABASE =====
  (function() {
    const filterContainer = document.getElementById('newArrivalsFilterContainer');
    if (!filterContainer) return;

    async function fetchAndPopulateNewArrivalsFilterButtons() {
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
          return `<button class="filter-btn" data-category="${category.name.toLowerCase()}" data-section="new-arrivals">${category.name}</button>`;
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
        console.error('Error fetching categories for new arrivals filter buttons:', error);
      }
    }

    fetchAndPopulateNewArrivalsFilterButtons();
  })();

  function renderProductCard(product) {
    const img = product.image || product.main_image_url || 'marketplace.png';
    const price = typeof product.price === 'number' ? product.price.toFixed(2) : product.price;
    const category = (product.category || product.category_name || 'all').toLowerCase().trim();
    
    return `
      <div class="product-card" data-product-id="${product.id}" data-name="${escapeHtml(product.name)}" data-price="${price}" data-category="${category}">
        <img src="${img}" alt="${escapeHtml(product.name)}">
        <div class="product-info">
          <div class="product-name">${escapeHtml(product.name)}</div>
          <!-- description removed to keep cards short -->
          <div class="meta">
            <div class="price">$${price}</div>
          </div>
        </div>
        <button class="add-to-cart">Add to Cart</button>
      </div>`;
  }

  function attachProductCardListeners(container) {
    if (!container) return;
    // Attach click listeners to product cards, flash cards and recommended items
    container.querySelectorAll('.product-card, .flash-card, .recommended-item').forEach((card) => {
      const productId = card.getAttribute('data-product-id');
      card.style.cursor = 'pointer';
      
      card.addEventListener('click', (e) => {
        if (e.target.closest('.add-to-cart')) return;
        if (!productId) return;
        window.location.href = `product.html?id=${productId}`;
      });
    });
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c];
    });
  }

  // Setup autocomplete for search input
  const searchInput = document.getElementById('searchInput');
  const searchAutocomplete = document.getElementById('searchAutocomplete');
  if (searchInput && searchAutocomplete) {
    setupAutocomplete(searchInput, searchAutocomplete, (suggestion) => {
      if (suggestion.type === 'product') {
        window.location.href = `product.html?id=${suggestion.id}`;
      } else if (suggestion.type === 'category') {
        window.location.href = `buyers-category.html?id=${suggestion.id}`;
      }
    });
  }

  // Setup autocomplete for mobile search input
  const searchInputMobile = document.getElementById('searchInputMobile');
  const searchAutocompleteMobile = document.getElementById('searchAutocompleteMobile');
  if (searchInputMobile && searchAutocompleteMobile) {
    setupAutocomplete(searchInputMobile, searchAutocompleteMobile, (suggestion) => {
      if (suggestion.type === 'product') {
        window.location.href = `product.html?id=${suggestion.id}`;
      } else if (suggestion.type === 'category') {
        window.location.href = `buyers-category.html?id=${suggestion.id}`;
      }
    });
  }

  // Load and render products from API
  async function loadFlashProducts() {
    try {
      const container = document.getElementById('flashProducts');
      if (!container) return;
      const API_BASE = 'https://marketmix-backend.onrender.com/api';
      // Fetch a wider set of products and filter locally for flash sales
      const response = await fetch(`${API_BASE}/products?limit=200`);
      const data = await response.json();

      if (!response.ok || !data.data) {
        container.innerHTML = '<p style="text-align:center; padding: 20px; color: #666;">No flash products available</p>';
        return;
      }

      const now = Date.now();
      const items = data.data || [];

      // Filter products that have flash_start and flash_end and are active now
      const flashItems = items.filter(p => {
        try {
          if (!p.flash_start || !p.flash_end) return false;
          const start = Date.parse(p.flash_start);
          const end = Date.parse(p.flash_end);
          if (Number.isNaN(start) || Number.isNaN(end)) return false;
          return now >= start && now <= end;
        } catch (e) {
          return false;
        }
      }).sort((a,b) => {
        // sort by earliest flash_start first
        const sa = Date.parse(a.flash_start) || 0;
        const sb = Date.parse(b.flash_start) || 0;
        return sa - sb;
      });

      // --- Start a summed countdown showing total remaining time for all flash items ---
      try {
        const countdownEl = document.getElementById('countdown');
        // Clear any previous interval
        if (flashCountdownInterval) {
          clearInterval(flashCountdownInterval);
          flashCountdownInterval = null;
        }

        // Sum remaining milliseconds for all active flash items
        const totalRemainingMs = flashItems.reduce((sum, p) => {
          try {
            const end = Date.parse(p.flash_end);
            const rem = Math.max(0, end - Date.now());
            return sum + rem;
          } catch (e) { return sum; }
        }, 0);

        if (countdownEl) {
          // If there's a demo interval running, stop it so flash timer has precedence
          if (demoCountdownInterval) {
            clearInterval(demoCountdownInterval);
            demoCountdownInterval = null;
          }
          if (totalRemainingMs <= 0) {
            countdownEl.textContent = '';
          } else {
            let remaining = totalRemainingMs;
            countdownEl.textContent = formatMsAsCountdown(remaining);
            flashCountdownInterval = setInterval(() => {
              remaining -= 1000;
              if (remaining <= 0) {
                clearInterval(flashCountdownInterval);
                flashCountdownInterval = null;
                countdownEl.textContent = '';
                // Optionally reload flash products when countdown finishes
                // so the UI reflects expired items
                loadFlashProducts();
                return;
              }
              countdownEl.textContent = formatMsAsCountdown(remaining);
            }, 1000);
          }
        }
      } catch (err) {
        console.warn('Flash countdown error', err);
      }

      if (flashItems.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding: 20px; color: #666;">No flash products currently running</p>';
        return;
      }

      // Render flash product cards
      container.innerHTML = flashItems.map(product => `
        <div class="flash-card" data-product-id="${product.id}">
          <img src="${product.main_image_url || product.image || 'marketplace.png'}" alt="${escapeHtml(product.name)}">
          <h4>${escapeHtml(product.name)}</h4>
          <p class="price">$${(typeof product.price === 'number') ? product.price.toFixed(2) : product.price}</p>
          <button class="add-to-cart">Add to Cart</button>
        </div>
      `).join('');

      // Re-attach event listeners to new buttons
      attachCartListeners();
      // Ensure recommended items open product pages like other cards
      attachProductCardListeners(container);
      // Ensure clicking a flash card opens the product page like regular cards
      attachProductCardListeners(container);
    } catch (error) {
      console.error('Error loading flash products:', error);
      const container = document.getElementById('flashProducts');
      if (container) {
        container.innerHTML = '<p style="text-align:center; padding: 20px; color: #666;">Error loading products</p>';
      }
    }
  }

  // Load and render best-selling products from API
  async function loadBestSellingProducts() {
    try {
      const container = document.querySelector('.best-selling-grid');
      if (!container) return;
      const API_BASE = 'https://marketmix-backend.onrender.com/api';

      const response = await fetch(`${API_BASE}/products?limit=8`);
      const data = await response.json();

      if (!response.ok || !data.data || data.data.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding: 20px; color: #666;">No products available</p>';
        return;
      }

      // Render best-selling product cards with category data-attribute
      container.innerHTML = data.data.map(product => {
        const category = (product.category || product.category_name || 'all').toLowerCase().trim();
        return `
          <div class="product-card" data-product-id="${product.id}" data-name="${escapeHtml(product.name)}" data-price="${product.price}" data-category="${category}">
            <img src="${product.main_image_url || product.image || 'marketplace.png'}" alt="${product.name}">
            <div class="product-info">
              <div class="product-name">${escapeHtml(product.name)}</div>
              <!-- description removed to keep cards compact -->
              <div class="meta">
                <div class="price">$${product.price}</div>
              </div>
            </div>
            <button class="add-to-cart">Add to Cart</button>
          </div>
        `;
      }).join('');

      // Re-attach event listeners to new buttons
      attachProductCardListeners(container);
      attachCartListeners();
    } catch (error) {
      console.error('Error loading best-selling products:', error);
      const container = document.querySelector('.best-selling-grid');
      if (container) {
        container.innerHTML = '<p style="text-align:center; padding: 20px; color: #666;">Error loading products</p>';
      }
    }
  }

  // Load and render recommended products from API
  async function loadRecommendedProducts() {
    try {
      const container = document.querySelector('.recommended-grid');
      if (!container) return;
      const API_BASE = 'https://marketmix-backend.onrender.com/api';

      const response = await fetch(`${API_BASE}/products?limit=6`);
      const data = await response.json();

      if (!response.ok || !data.data || data.data.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding: 20px; color: #666;">No products available</p>';
        return;
      }

      // Render recommended product cards
      container.innerHTML = data.data.map(product => `
        <div class="recommended-item" data-product-id="${product.id}">
          <img src="${product.main_image_url || product.image || 'marketplace.png'}" alt="${product.name}">
          <h4>${product.name}</h4>
          <p class="price">$${product.price}</p>
          <button class="add-to-cart">Add to Cart</button>
        </div>
      `).join('');

      // Re-attach event listeners to new buttons
      attachCartListeners();
      // Ensure recommended items open their product pages like other cards
      attachProductCardListeners(container);
    } catch (error) {
      console.error('Error loading recommended products:', error);
      const container = document.querySelector('.recommended-grid');
      if (container) {
        container.innerHTML = '<p style="text-align:center; padding: 20px; color: #666;">Error loading products</p>';
      }
    }
  }

  // Load and render new arrivals products from API
  async function loadNewArrivalsProducts() {
    try {
      const container = document.querySelector('.new-arrivals-grid');
      if (!container) return;
      const API_BASE = 'https://marketmix-backend.onrender.com/api';

      const response = await fetch(`${API_BASE}/products?limit=8`);
      const data = await response.json();

      if (!response.ok || !data.data || data.data.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding: 20px; color: #666;">No products available</p>';
        return;
      }

      // Render new arrivals product cards with category data-attribute
      container.innerHTML = data.data.map(product => {
        const category = (product.category || product.category_name || 'all').toLowerCase().trim();
        return `
          <div class="product-card" data-product-id="${product.id}" data-name="${escapeHtml(product.name)}" data-price="${product.price}" data-category="${category}">
            <img src="${product.main_image_url || product.image || 'marketplace.png'}" alt="${product.name}">
            <div class="product-info">
              <div class="product-name">${escapeHtml(product.name)}</div>
              <!-- description removed to keep cards compact -->
              <div class="meta">
                <div class="price">$${product.price}</div>
              </div>
            </div>
            <button class="add-to-cart">Add to Cart</button>
          </div>
        `;
      }).join('');

      // Re-attach event listeners to new buttons
      attachProductCardListeners(container);
      attachCartListeners();
    } catch (error) {
      console.error('Error loading new arrivals products:', error);
      const container = document.querySelector('.new-arrivals-grid');
      if (container) {
        container.innerHTML = '<p style="text-align:center; padding: 20px; color: #666;">Error loading products</p>';
      }
    }
  }

  // Load products early
  loadFlashProducts();
  // Periodically re-fetch flash products so the summed countdown stays in sync with DB
  try {
    if (flashRefreshInterval) clearInterval(flashRefreshInterval);
    flashRefreshInterval = setInterval(() => {
      loadFlashProducts();
    }, FLASH_REFRESH_MINUTES * 60 * 1000);
  } catch (e) {
    console.warn('Failed to start flash refresh interval', e);
  }
  loadBestSellingProducts();
  loadNewArrivalsProducts();
  loadRecommendedProducts();

  // Countdown Timer
  function startCountdown(duration, display) {
    let timer = duration, hours, minutes, seconds;
    if (!display) return;
    const intervalId = setInterval(function () {
      hours = parseInt(timer / 3600, 10);
      minutes = parseInt((timer % 3600) / 60, 10);
      seconds = parseInt(timer % 60, 10);

      hours = hours < 10 ? "0" + hours : hours;
      minutes = minutes < 10 ? "0" + minutes : minutes;
      seconds = seconds < 10 ? "0" + seconds : seconds;

      display.textContent = hours + ":" + minutes + ":" + seconds;

      if (--timer < 0) {
        timer = duration;
      }
    }, 1000);
    return intervalId;
  }

  const countdownDisplay = document.querySelector('#countdown');
  if (countdownDisplay) {
    let countdownDuration = 24 * 60 * 60; // 24 hours
    // Only start the demo countdown if a flash countdown is not active
    if (!flashCountdownInterval) {
      demoCountdownInterval = startCountdown(countdownDuration, countdownDisplay);
    }
  }

  // Hero Slider (simple rotating slides)
  let slideIndex = 0;
  function showSlides() {
    let slides = document.querySelectorAll(".slide");
    if (!slides || slides.length === 0) return; // guard
    slides.forEach(s => s.classList.remove("active"));
    slideIndex++;
    if (slideIndex > slides.length) slideIndex = 1;
    slides[slideIndex - 1].classList.add("active");
    setTimeout(showSlides, 3000);
  }
  showSlides();

  // Update cart count when returning to this page (back/forward cache) or when window gains focus
  window.addEventListener('pageshow', () => {
    syncCartFromStorage();
  });
  window.addEventListener('focus', () => {
    syncCartFromStorage();
  });
  // Sync cart when tab becomes visible (important for detecting changes from other tabs/pages)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      syncCartFromStorage();
    }
  });
  // Clear timers when leaving the page to avoid background intervals
  window.addEventListener('beforeunload', () => {
    if (flashCountdownInterval) clearInterval(flashCountdownInterval);
    if (demoCountdownInterval) clearInterval(demoCountdownInterval);
    if (flashRefreshInterval) clearInterval(flashRefreshInterval);
  });
  // Listen to storage events from other tabs/windows
  window.addEventListener('storage', (e) => {
    if (e.key === 'cart') syncCartFromStorage();
  });


  // for search input
  function doSearch() {
    const input = document.getElementById("searchInput");
    if (!input) return;
    let query = input.value;
    if (query.trim() !== "") {
      alert("You searched for: " + query);
      // Later, you can replace this alert with your real search function
    }
  }


  // Select all slides (hero-slider)
  const heroSlides = document.querySelectorAll(".hero-slider .slide");
  let currentIndex = 0;

  function showSlide(index) {
    if (!heroSlides || heroSlides.length === 0) return;
    heroSlides.forEach((slide, i) => {
      slide.classList.remove("active");
      if (i === index) slide.classList.add("active");
    });
  }

  if (heroSlides && heroSlides.length > 0) {
    setInterval(() => {
      currentIndex++;
      if (currentIndex >= heroSlides.length) currentIndex = 0;
      showSlide(currentIndex);
    }, 3000);
  }

  // scroll buttons for quick links
  const wrapper = document.querySelector(".links-wrapper");
  const leftBtn = document.querySelector(".left-btn");
  const rightBtn = document.querySelector(".right-btn");

  if (leftBtn && wrapper) {
    leftBtn.addEventListener("click", () => {
      wrapper.scrollBy({ left: -200, behavior: "smooth" });
    });
  }
  if (rightBtn && wrapper) {
    rightBtn.addEventListener("click", () => {
      wrapper.scrollBy({ left: 200, behavior: "smooth" });
    });
  }


  // for flash sales
  const flashContainer = document.querySelector(".flash-container");
  const prevBtn = document.querySelector(".flash-btn.prev");
  const nextBtn = document.querySelector(".flash-btn.next");

  if (nextBtn && flashContainer) {
    nextBtn.addEventListener("click", () => {
      flashContainer.scrollBy({ left: 200, behavior: "smooth" });
    });
  }
  if (prevBtn && flashContainer) {
    prevBtn.addEventListener("click", () => {
      flashContainer.scrollBy({ left: -200, behavior: "smooth" });
    });
  }


  // <!-- JS for Auto Sliding (blog cards) -->
  (function initBlogSlider() {
    const blogSlider = document.querySelector('.blog-cards');
    const blogCards = Array.from(document.querySelectorAll('.blog-card'));
    const cardGap = 20; // gap between cards in px
    let index = 0;
    let isTransitioning = false;
    if (!blogSlider || blogCards.length === 0) return;

    // Clone first few cards for smooth infinite loop
    const clones = blogCards.map(card => card.cloneNode(true));
    clones.forEach(clone => blogSlider.appendChild(clone));

    const cardWidth = blogCards[0].offsetWidth + cardGap;

    // Auto-slide with mutable interval id so we can clear & restart
    let autoSlideId = setInterval(slideNext, 4000);

    function slideNext() {
      if (isTransitioning) return;
      isTransitioning = true;
      index++;
      blogSlider.style.transition = 'transform 0.5s ease-in-out';
      blogSlider.style.transform = `translateX(-${index * cardWidth}px)`;

      if (index >= blogCards.length) {
        setTimeout(() => {
          blogSlider.style.transition = 'none';
          blogSlider.style.transform = 'translateX(0)';
          index = 0;
          isTransitioning = false;
        }, 200);
      } else {
        setTimeout(() => isTransitioning = false, 200);
      }
    }

    // === Drag/Swipe Support ===
    let startX = 0;
    let prevTranslate = 0;
    let dragging = false;

    const getPositionX = e => e.type.includes('mouse') ? e.pageX : (e.touches && e.touches[0] && e.touches[0].clientX) || 0;

    const touchStart = e => {
      clearInterval(autoSlideId); // stop auto-slide when dragging
      startX = getPositionX(e);
      dragging = true;
      blogSlider.style.transition = 'none';
    };

    const touchMove = e => {
      if (!dragging) return;
      const currentX = getPositionX(e);
      const delta = currentX - startX;
      blogSlider.style.transform = `translateX(${prevTranslate + delta}px)`;
    };

    const touchEnd = e => {
      if (!dragging) return;
      dragging = false;
      // parse current transform safely
      const transform = (blogSlider.style.transform || '').match(/-?\d+/g);
      const currentTranslate = transform ? parseInt(transform[0], 10) : prevTranslate;
      const movedBy = currentTranslate - prevTranslate;

      if (movedBy < -50 && index < blogCards.length) {
        index++;
      } else if (movedBy > 50 && index > 0) {
        index--;
      }
      blogSlider.style.transition = 'transform 0.5s ease-in-out';
      blogSlider.style.transform = `translateX(-${index * cardWidth}px)`;
      prevTranslate = -index * cardWidth;

      setTimeout(() => {
        if (index >= blogCards.length) {
          blogSlider.style.transition = 'none';
          blogSlider.style.transform = 'translateX(0)';
          index = 0;
          prevTranslate = 0;
        }
      }, 200);

      // restart auto-slide (clear any existing then set)
      clearInterval(autoSlideId);
      autoSlideId = setInterval(slideNext, 4000);
    };

    // Events
    blogSlider.addEventListener('mousedown', touchStart);
    blogSlider.addEventListener('mousemove', touchMove);
    blogSlider.addEventListener('mouseup', touchEnd);
    blogSlider.addEventListener('mouseleave', () => dragging && touchEnd());
    blogSlider.addEventListener('touchstart', touchStart, {passive: true});
    blogSlider.addEventListener('touchmove', touchMove, {passive: true});
    blogSlider.addEventListener('touchend', touchEnd);
  })();


  // === CART SYSTEM ===

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
      const token = localStorage.getItem('token');
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
    const token = localStorage.getItem('token');
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

  // Attach listeners to all "Add to Cart" buttons (guarded) - can be called after dynamic rendering
  function attachCartListeners() {
    const addButtons = document.querySelectorAll('.add-to-cart, .flash-card button, .recommended-section button') || [];
    addButtons.forEach(button => {
      // Check if listener already attached to avoid duplicates
      if (button.dataset.listenerAttached === 'true') return;
      
      button.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent event bubbling
        
        // Prevent double-click by disabling button temporarily
        if (button.disabled) return;
        button.disabled = true;
        
        const card = button.closest('.product-card, .flash-card, .recommended-item');
        if (!card) {
          button.disabled = false;
          return;
        }
        
        const titleEl = card.querySelector('h3, h4');
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

  // Attach listeners initially
  attachCartListeners();

  // Initial cart count update on page load
  updateCartCount();

  // If user is authenticated, fetch server wishlist and replace local wishlist (non-destructive)
  (async function syncWishlistFromServer() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return; // not logged in
      const API_BASE = 'https://marketmix-backend.onrender.com/api';

      const res = await fetch(`${API_BASE}/wishlist`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        console.warn('Could not fetch server wishlist', res.status);
        return;
      }

      const payload = await res.json().catch(() => ({}));
      const items = payload && payload.data && Array.isArray(payload.data.items) ? payload.data.items : [];
      if (items.length === 0) return; // nothing to replace

      // Map server items to local storage shape
      const mapped = items.map(i => ({
        id: i.product_id || i.id,
        name: i.name || i.product_name || '',
        price: i.price || 0,
        image: i.main_image_url || i.image || ''
      }));

      // Replace local wishlist with server canonical state
      try {
        localStorage.setItem('wishlist', JSON.stringify(mapped));
        localStorage.removeItem('guest_wishlist_id');
        console.log('✅ Wishlist synced from server (canonical)');
      } catch (e) {
        console.warn('Failed to write wishlist to localStorage', e);
      }
    } catch (error) {
      console.error('syncWishlistFromServer error:', error);
    }
  })();

  // === Toast Notification ===
  function showToast(message) {
    let toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // Initialize count on load
  updateCartCount();

}); // end DOMContentLoaded wrapper

// ...existing code...