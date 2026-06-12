/**
 * Autocomplete Utility for MarketMix
 * Provides search suggestions for products and categories with caching
 */

class MarketMixAutocomplete {
  constructor() {
    this.productCache = null;
    this.categoryCache = null;
    this.cacheTimestamp = null;
    this.CACHE_DURATION = 5 * 60 * 1000; // Cache for 5 minutes
    this.debounceTimer = null;
    this.debounceDelay = 500; // ms
  }

  /**
   * Fetch all products and categories (cached)
   */
  async fetchAllData() {
    const now = Date.now();
    
    // Return cached data if still fresh
    if (this.productCache && this.categoryCache && (now - this.cacheTimestamp < this.CACHE_DURATION)) {
      return {
        products: this.productCache,
        categories: this.categoryCache
      };
    }

    try {
      // Fetch both products and categories in parallel
      const API_BASE = 'https://marketmix-backend.onrender.com/api';
      const [productsRes, categoriesRes] = await Promise.all([
        fetch(`${API_BASE}/products`).catch(() => null),
        fetch(`${API_BASE}/categories`).catch(() => null)
      ]);

      let products = [];
      let categories = [];

      if (productsRes?.ok) {
        const productsData = await productsRes.json();
        products = Array.isArray(productsData.data) ? productsData.data : [];
      }

      if (categoriesRes?.ok) {
        const categoriesData = await categoriesRes.json();
        categories = Array.isArray(categoriesData.data) ? categoriesData.data : [];
      }

      // Cache the results
      this.productCache = products;
      this.categoryCache = categories;
      this.cacheTimestamp = now;

      return { products, categories };
    } catch (error) {
      console.error('Error fetching autocomplete data:', error);
      return { products: [], categories: [] };
    }
  }

  /**
   * Search products by query (uses backend search endpoint)
   */
  async searchProducts(query) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    try {
      const API_BASE = 'https://marketmix-backend.onrender.com/api';
      const url = `${API_BASE}/products/search/query?q=${encodeURIComponent(query)}`;
      console.log('Searching products:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn(`Product search failed: HTTP ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      const results = Array.isArray(data.data) ? data.data : [];
      console.log(`Product search found ${results.length} results`);
      return results;
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }

  /**
   * Search categories by query (uses backend search endpoint)
   */
  async searchCategories(query) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    try {
      const API_BASE = 'https://marketmix-backend.onrender.com/api';
      const url = `${API_BASE}/categories/search/query?q=${encodeURIComponent(query)}`;
      console.log('Searching categories:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn(`Category search failed: HTTP ${response.status}`);
        return [];
      }
      
      const data = await response.json();
      const results = Array.isArray(data.data) ? data.data : [];
      console.log(`Category search found ${results.length} results`);
      return results;
    } catch (error) {
      console.error('Error searching categories:', error);
      return [];
    }
  }

  /**
   * Get suggestions based on search query
   * @param {string} query - Search query
   * @param {number} limit - Max suggestions to return
   * @returns {Promise<Array>} Array of suggestions (products and categories)
   */
  async getSuggestions(query, limit = 8) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    try {
      // Use backend search endpoints for real-time search
      const [products, categories] = await Promise.all([
        this.searchProducts(query),
        this.searchCategories(query)
      ]);

      console.log(`Autocomplete search for "${query}": ${products.length} products, ${categories.length} categories`);

      // Convert products to suggestion format
      const productSuggestions = (products || [])
        .slice(0, Math.ceil(limit * 0.7))
        .map(p => ({
          type: 'product',
          id: p.id,
          name: p.name,
          icon: '📦',
          image: p.main_image_url
        }));

      // Convert categories to suggestion format
      const categorySuggestions = (categories || [])
        .slice(0, Math.ceil(limit * 0.3))
        .map(c => ({
          type: 'category',
          id: c.id,
          name: c.name,
          icon: '🏷️',
          count: c.product_count || 0
        }));

      // Combine and limit total results
      const suggestions = [...productSuggestions, ...categorySuggestions].slice(0, limit);
      console.log(`Returning ${suggestions.length} total suggestions`);
      return suggestions;
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  }

  /**
   * Debounced version of getSuggestions for input event handling
   */
  debouncedGetSuggestions(query, limit = 8) {
    return new Promise((resolve) => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(async () => {
        const suggestions = await this.getSuggestions(query, limit);
        resolve(suggestions);
      }, this.debounceDelay);
    });
  }

  /**
   * Clear cache manually
   */
  clearCache() {
    this.productCache = null;
    this.categoryCache = null;
    this.cacheTimestamp = null;
  }
}

// Create global instance
const autocompleteEngine = new MarketMixAutocomplete();

/**
 * Setup autocomplete for a search input field
 * @param {HTMLInputElement} inputElement - The search input element
 * @param {HTMLElement} containerElement - The container for suggestions dropdown
 * @param {Function} onSelect - Callback when user selects a suggestion
 */
function setupAutocomplete(inputElement, containerElement, onSelect) {
  if (!inputElement || !containerElement) {
    console.warn('Autocomplete: Missing input or container element');
    return;
  }

  // Handle input event with debouncing
  inputElement.addEventListener('input', async (e) => {
    const query = e.target.value;

    if (!query || query.trim().length < 2) {
      containerElement.style.display = 'none';
      return;
    }

    try {
      const suggestions = await autocompleteEngine.debouncedGetSuggestions(query, 10);

      if (suggestions.length === 0) {
        // NOTE: This innerHTML is rendering controlled suggestions. If suggestions may contain user-supplied HTML,
        // sanitize or escape them first to avoid XSS. For now suggestions are treated as plain text.
        containerElement.innerHTML = '<div class="autocomplete-no-results">No results found</div>';
        containerElement.style.display = 'block';
        return;
      }

      // Render suggestions
      containerElement.innerHTML = suggestions.map((suggestion, index) => `
        <div class="autocomplete-item" data-index="${index}" data-type="${suggestion.type}" data-id="${suggestion.id}">
          <span class="autocomplete-icon">${suggestion.icon}</span>
          <div class="autocomplete-content">
            <div class="autocomplete-title">${escapeHtml(suggestion.name)}</div>
            ${suggestion.type === 'category' ? `<div class="autocomplete-meta">${suggestion.count || 0} product(s)</div>` : ''}
          </div>
        </div>
      `).join('');

      containerElement.style.display = 'block';

      // Attach click handlers to suggestion items
      containerElement.querySelectorAll('.autocomplete-item').forEach((item) => {
        item.addEventListener('click', () => {
          const suggestion = suggestions[parseInt(item.dataset.index)];
          if (onSelect) {
            onSelect(suggestion);
          }
          containerElement.style.display = 'none';
        });
      });
    } catch (error) {
      console.error('Autocomplete error:', error);
      containerElement.style.display = 'none';
    }
  });

  // Hide dropdown when clicking outside
  document.addEventListener('click', (e) => {
    // Check if click is not on input or container
    if (inputElement && containerElement) {
      const isClickInsideInput = inputElement.contains(e.target);
      const isClickInsideContainer = containerElement.contains(e.target);
      if (!isClickInsideInput && !isClickInsideContainer) {
        containerElement.style.display = 'none';
      }
    }
  });

  // Show dropdown on focus if input has value
  inputElement.addEventListener('focus', async () => {
    const query = inputElement.value.trim();
    if (query.length >= 2) {
      const suggestions = await autocompleteEngine.getSuggestions(query, 10);
      if (suggestions.length > 0) {
        containerElement.innerHTML = suggestions.map((suggestion, index) => `
          <div class="autocomplete-item" data-index="${index}" data-type="${suggestion.type}" data-id="${suggestion.id}">
            <span class="autocomplete-icon">${suggestion.icon}</span>
            <div class="autocomplete-content">
              <div class="autocomplete-title">${escapeHtml(suggestion.name)}</div>
              ${suggestion.type === 'category' ? `<div class="autocomplete-meta">${suggestion.count || 0} product(s)</div>` : ''}
            </div>
          </div>
        `).join('');
        containerElement.style.display = 'block';
      }
    }
  });
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
