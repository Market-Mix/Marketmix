// Category Options Component
// Displays color and size options based on category rules
// Disables Add to Cart until required options are selected

function createCategoryOptions(product) {
  const container = document.getElementById('category-options');
  if (!container) return;

  // Helper function to parse color/size data from various formats
  function parseOptions(data) {
    if (!data) return [];

    if (Array.isArray(data)) return data.filter(Boolean);

    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch (e) {
        return data.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    return [];
    
  }

  // Options come from product data when available
  let colors = parseOptions(product.color);
  let sizes = parseOptions(product.size);

  // Determine final show flags by combining category rules with actual product data
  const rules = getCategoryRules(product.category);
  const showColors = colors.length > 0 || !!rules.showColors;
  const showSizes = sizes.length > 0 || !!rules.showSizes;

  // Debug info (safe to remove in production)
  console.log('Product data:', {
    id: product.id,
    name: product.name,
    category: product.category,
    color_raw: product.color,
    color_parsed: colors,
    size_raw: product.size,
    size_parsed: sizes,
    categoryRules: { showColors: rules.showColors, showSizes: rules.showSizes },
    finalShowColors: showColors,
    finalShowSizes: showSizes
  });

  // Fallback defaults if we need to show options but product has none
  if (colors.length === 0 && showColors) colors = ['Black', 'White', 'Red', 'Blue', 'Green'];
  if (sizes.length === 0 && showSizes) sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  let selectedColor = null;
  let selectedSize = null;

  const html = `
    <div style="padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#fafafa">
      ${showColors ? `
        <div style="margin-bottom:16px">
          <label style="display:block;font-weight:600;margin-bottom:8px;color:#334155">Color</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap" id="color-options">
            ${colors.map(color => `
              <button class="color-btn" data-color="${color}" style="padding:8px 12px;border:2px solid #d1d5db;border-radius:8px;background:#fff;cursor:pointer;font-size:14px;font-weight:500;transition:all 0.2s ease;color:#475569">${color}</button>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${showSizes ? `
        <div style="margin-bottom:16px">
          <label style="display:block;font-weight:600;margin-bottom:8px;color:#334155">Size</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap" id="size-options">
            ${sizes.map(size => `
              <button class="size-btn" data-size="${size}" style="padding:8px 12px;border:2px solid #d1d5db;border-radius:8px;background:#fff;cursor:pointer;font-size:14px;font-weight:500;transition:all 0.2s ease;color:#475569;min-width:40px;text-align:center">${size}</button>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div id="options-status" style="font-size:12px;color:#f97316;margin-top:8px;display:none">⚠️ Please select all options above before adding to cart</div>
    </div>
  `;

  container.innerHTML = html;

  // Color handlers
  if (showColors) {
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.color-btn').forEach(b => { b.style.borderColor = '#d1d5db'; b.style.backgroundColor = '#fff'; b.style.color = '#475569'; });
        e.currentTarget.style.borderColor = '#f97316';
        e.currentTarget.style.backgroundColor = '#f97316';
        e.currentTarget.style.color = '#fff';
        selectedColor = e.currentTarget.getAttribute('data-color');
        checkCanAddToCart();
      });
    });
  }

  // Size handlers
  if (showSizes) {
    document.querySelectorAll('.size-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.size-btn').forEach(b => { b.style.borderColor = '#d1d5db'; b.style.backgroundColor = '#fff'; b.style.color = '#475569'; });
        e.currentTarget.style.borderColor = '#f97316';
        e.currentTarget.style.backgroundColor = '#f97316';
        e.currentTarget.style.color = '#fff';
        selectedSize = e.currentTarget.getAttribute('data-size');
        checkCanAddToCart();
      });
    });
  }

  function renderCategoryMeta(product, container) {
  const meta = product.category_meta;
  if (!meta || typeof meta !== 'object' || !Object.keys(meta).length) return;

  const labels = {
    type: 'Type', brand: 'Brand', model: 'Model', gender: 'Gender',
    size: 'Size', color: 'Color', material: 'Material', condition: 'Condition',
    author: 'Author', sport: 'Sport Type', age: 'Age Range', volume: 'Volume'
  };

  const items = Object.entries(meta)
    .filter(([, v]) => v)
    .map(([k, v]) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f1f5f9;">
        <span style="font-size:13px;color:#64748b;font-weight:500">${labels[k] || k}</span>
        <span style="font-size:13px;color:#1e293b;font-weight:600">${v}</span>
      </div>
    `).join('');

  if (!items) return;

  const metaDiv = document.createElement('div');
  metaDiv.style.cssText = 'margin-top:12px;padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;';
  metaDiv.innerHTML = `
    <p style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin:0 0 8px">Product Details</p>
    ${items}
  `;
  container.appendChild(metaDiv);
}

  function checkCanAddToCart() {
    const addToCartBtn = document.getElementById('product-add-to-cart');
    const wishlistBtn = document.getElementById('product-add-to-wishlist');
    const checkoutBtn = document.getElementById('product-checkout');
    const statusDiv = document.getElementById('options-status');
    const colorRequired = showColors && !selectedColor;
    const sizeRequired = showSizes && !selectedSize;

    if (colorRequired || sizeRequired) {
      if (addToCartBtn) {
        addToCartBtn.disabled = true;
        addToCartBtn.style.opacity = '0.5';
        addToCartBtn.style.cursor = 'not-allowed';
      }
      if (wishlistBtn) {
        wishlistBtn.disabled = true;
        wishlistBtn.style.opacity = '0.5';
        wishlistBtn.style.cursor = 'not-allowed';
      }
      if (checkoutBtn) {
        checkoutBtn.disabled = true;
        checkoutBtn.style.opacity = '0.5';
        checkoutBtn.style.cursor = 'not-allowed';
      }
      statusDiv.style.display = 'block';
    } else {
      if (addToCartBtn) {
        addToCartBtn.disabled = false;
        addToCartBtn.style.opacity = '1';
        addToCartBtn.style.cursor = 'pointer';
      }
      if (wishlistBtn) {
        wishlistBtn.disabled = false;
        wishlistBtn.style.opacity = '1';
        wishlistBtn.style.cursor = 'pointer';
      }
      if (checkoutBtn) {
        checkoutBtn.disabled = false;
        checkoutBtn.style.opacity = '1';
        checkoutBtn.style.cursor = 'pointer';
      }
      statusDiv.style.display = 'none';
    }
  }

  // Ensure initial enable/disable state is applied
  setTimeout(checkCanAddToCart, 50);

  // Show category meta details from seller
  renderCategoryMeta(product, container);

  // Expose selections
  window.productOptions = { color: () => selectedColor, size: () => selectedSize };
}
