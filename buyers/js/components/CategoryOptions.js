function createCategoryOptions(product) {
  const container = document.getElementById('category-options');
  if (!container) return;

  function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
  }

  function parseOpts(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data.filter(Boolean);
    if (typeof data === 'string') {
      try { const p = JSON.parse(data); if (Array.isArray(p)) return p.filter(Boolean); } catch(_) {}
      return data.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  }

  const colors = parseOpts(product.color);
  const sizes = parseOpts(product.size);

  // Parse variants — each variant can have {name, price, stock, color, size, sku}
  let variants = [];
  try {
    const raw = product.variants;
    if (raw) variants = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(variants)) variants = [];
    variants = variants.filter(v => v && (v.name || v.color || v.size));
  } catch (_) { variants = []; }

  // Parse category_meta + dynamic_fields (seller-defined specs per subcategory)
  let specs = {};
  try {
    const rawMeta = product.category_meta;
    if (rawMeta) specs = typeof rawMeta === 'string' ? JSON.parse(rawMeta) : rawMeta;
  } catch (_) { specs = {}; }

  let dynFields = {};
  try {
    const rawDyn = product.dynamic_fields;
    if (rawDyn) dynFields = typeof rawDyn === 'string' ? JSON.parse(rawDyn) : rawDyn;
  } catch (_) { dynFields = {}; }

  const allSpecs = { ...specs, ...dynFields };

  // Remove fields already shown elsewhere
  const skipKeys = new Set(['name','price','description','stock','images','video','discount_price','sku']);
  Object.keys(allSpecs).forEach(k => { if(skipKeys.has(k)) delete allSpecs[k]; });

  // Allow specs to provide colors/sizes/gender/storage too
  if (!colors.length && allSpecs.color) {
    const parsed = parseOpts(allSpecs.color);
    if (parsed.length) colors.push(...parsed);
  }
  if (!sizes.length && allSpecs.size) {
    const parsed = parseOpts(allSpecs.size);
    if (parsed.length) sizes.push(...parsed);
  }

  const showColors   = colors.length > 0;
  const showSizes    = sizes.length > 0;
  const showVariants = variants.length > 0;
  const showSpecs    = Object.keys(allSpecs).length > 0;

  let selectedColor   = null;
  let selectedSize    = null;
  let selectedVariant = null;
  // Store all selected specifications here
  const selectedSpecifications = {};

  let html = '';

  // ── Specs section ──
  if (showSpecs) {
    const specLabels = {
      brand:'Brand', model:'Model', gender:'Gender', material:'Material',
      condition:'Condition', storage:'Storage', ram:'RAM', processor:'Processor',
      battery:'Battery', os:'Operating System', screen_size:'Screen Size',
      connectivity:'Connectivity', power_rating:'Power Rating', set_size:'Set Size',
      num_pieces:'No. of Pieces', age_range:'Age Range', hair_type:'Hair Type',
      length:'Length', texture:'Texture', strap_material:'Strap Material',
      pattern:'Pattern', style:'Style', volume:'Volume/Size', weight:'Weight',
      type:'Type', author:'Author', sport:'Sport',
      shoe_type:'Shoe Type', bag_type:'Bag Type', watch_type:'Watch Type',
      jewelry_type:'Jewelry Type', appliance_type:'Appliance Type',
      equipment_type:'Equipment Type', accessory_type:'Accessory Type',
      tool_type:'Tool Type', makeup_type:'Makeup Type', skin_type:'Skin Type',
      hair_color:'Hair Color', fragrance_type:'Fragrance Type',
      battery_life:'Battery Life', control_range:'Control Range',
      num_players:'No. of Players', game_type:'Game Type',
      delivery_available:'Delivery Available', return_accepted:'Returns Accepted',
      vendor_location:'Ships From', warranty:'Warranty',
    };

    const multiFields = new Set(['connectivity','size','color','compatible_devices']);

    html += `<div class="spec-section">
      <div class="spec-title">Product Specifications</div>
      <div class="spec-grid">`;

    Object.entries(allSpecs).forEach(([k, v]) => {
      if (!v && v !== 0) return;
      // Skip keys that will be rendered as selectable option groups
      if (['size','color','gender','storage'].includes(String(k).toLowerCase())) return;
      let displayVal = Array.isArray(v) ? v.join(', ') : String(v);
      if (typeof v === 'boolean') displayVal = v ? 'Yes' : 'No';
      const label = specLabels[k] || k.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());
      html += `<div class="spec-row">
        <span class="spec-key">${escapeHtml(label)}</span>
        <span class="spec-val">${escapeHtml(displayVal)}</span>
      </div>`;
    });

    html += `</div></div>`;
  }

  // ── Variants (full product variations with price/stock) ──
  if (showVariants) {
    html += `<div class="opt-section">
      <div class="opt-label">Select Variant</div>
      <div class="opt-chips" id="variant-chips">`;
    variants.forEach((v, i) => {
      const label = v.name || [v.color, v.size].filter(Boolean).join(' / ');
      const badge = v.price ? ` — ₦${parseFloat(v.price).toLocaleString()}` : '';
      const outOfStock = v.stock != null && Number(v.stock) === 0;
      html += `<button type="button" class="opt-chip${outOfStock ? ' opt-chip-oos' : ''}" 
        data-variant="${i}" ${outOfStock ? 'disabled' : ''}>
        ${escapeHtml(label)}${escapeHtml(badge)}
        ${outOfStock ? '<span style="font-size:10px;display:block;color:#ef4444">Out of stock</span>' : ''}
      </button>`;
    });
    html += `</div></div>`;
  }

  // ── Colors (with visual swatches if hex/rgb) ──
  if (showColors) {
    html += `<div class="opt-section">
      <div class="opt-label">Color: <span id="color-label" style="font-weight:600;color:#f97316"></span></div>
      <div class="opt-chips" id="color-chips">`;
    colors.forEach(c => {
      const isHex = /^#[0-9a-f]{3,8}$/i.test(c.trim()) || /^rgb/i.test(c.trim());
      const swatch = isHex
        ? `<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${c};border:1px solid #ccc;vertical-align:middle;margin-right:4px"></span>`
        : '';
      html += `<button type="button" class="opt-chip" data-color="${escapeHtml(c)}">${swatch}${escapeHtml(c)}</button>`;
    });
    html += `</div></div>`;
  }

  // ── Sizes ──
  if (showSizes) {
    html += `<div class="opt-section">
      <div class="opt-label">Size</div>
      <div class="opt-chips" id="size-chips">`;
    sizes.forEach(s => {
      html += `<button type="button" class="opt-chip" data-size="${escapeHtml(s)}">${escapeHtml(s)}</button>`;
    });
    html += `</div></div>`;
  }

  // ── Gender (from specs) ──
  const genderOpts = (() => {
    const raw = allSpecs.gender || allSpecs.Gender || allSpecs.gender_type || null;
    return parseOpts(raw);
  })();
  if (genderOpts.length) {
    html += `<div class="opt-section">
      <div class="opt-label">Gender</div>
      <div class="opt-chips" id="gender-chips">`;
    genderOpts.forEach(g => {
      html += `<button type="button" class="opt-chip" data-gender="${escapeHtml(g)}">${escapeHtml(g)}</button>`;
    });
    html += `</div></div>`;
  }

  // ── Storage (from specs) ──
  const storageOpts = (() => {
    const raw = allSpecs.storage || allSpecs.Storage || null;
    return parseOpts(raw);
  })();
  if (storageOpts.length) {
    html += `<div class="opt-section">
      <div class="opt-label">Storage</div>
      <div class="opt-chips" id="storage-chips">`;
    storageOpts.forEach(s => {
      html += `<button type="button" class="opt-chip" data-storage="${escapeHtml(s)}">${escapeHtml(s)}</button>`;
    });
    html += `</div></div>`;
  }

  // ── Seller preferences (delivery/returns/location) ──
  const prefs = [];
  if (product.vendor_location)  prefs.push(`📍 Ships from: ${product.vendor_location}`);
  if (product.delivery_available != null) prefs.push(product.delivery_available ? '🚚 Delivery available' : '🏪 Pickup only');
  if (product.return_accepted != null)    prefs.push(product.return_accepted    ? '↩️ Returns accepted' : '⚠️ No returns');
  if (product.sku)                        prefs.push(`SKU: ${product.sku}`);
  if (product.weight_kg)                  prefs.push(`⚖️ Weight: ${product.weight_kg}kg`);

  if (prefs.length) {
    html += `<div class="seller-prefs">
      ${prefs.map(p => `<span class="pref-tag">${escapeHtml(p)}</span>`).join('')}
    </div>`;
  }

  if (showColors || showSizes || showVariants) {
    html += `<div id="opts-warn" style="display:none;font-size:12px;color:#f97316;margin-top:6px">
      ⚠️ Please select all options before adding to cart
    </div>`;
  }

  container.innerHTML = html;

  // ── Styles ──
  if (!document.getElementById('cat-opt-styles')) {
    const style = document.createElement('style');
    style.id = 'cat-opt-styles';
    style.textContent = `
      .spec-section{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:14px}
      .spec-title{font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.6px;margin-bottom:10px}
      .spec-grid{display:grid;gap:0}
      .spec-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:13px;gap:12px}
      .spec-row:last-child{border-bottom:none}
      .spec-key{color:#64748b;flex-shrink:0;max-width:45%}
      .spec-val{color:#1e293b;font-weight:500;text-align:right;word-break:break-word}
      .opt-section{margin-bottom:14px}
      .opt-label{font-size:13px;font-weight:600;color:#334155;margin-bottom:8px}
      .opt-chips{display:flex;flex-wrap:wrap;gap:8px}
      .opt-chip{padding:7px 14px;border:1.5px solid #e2e8f0;border-radius:8px;background:#fff;cursor:pointer;font-size:13px;color:#475569;transition:all .15s;line-height:1.4}
      .opt-chip:hover:not(:disabled){border-color:#f97316;color:#f97316}
      .opt-chip.selected{border-color:#f97316;background:#f97316;color:#fff}
      .opt-chip-oos{opacity:.45;cursor:not-allowed!important}
      .seller-prefs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
      .pref-tag{background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;border-radius:20px;padding:4px 10px;font-size:12px;font-weight:500}
    `;
    document.head.appendChild(style);
  }

  // ── Wire interactions ──
  function wireChips(containerId, attr, onSelect) {
    document.querySelectorAll(`#${containerId} .opt-chip`).forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll(`#${containerId} .opt-chip`).forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        onSelect(btn.dataset[attr], btn);
        checkCanAdd();
      });
    });
  }

  wireChips('color-chips', 'color', (v) => {
    selectedColor = v;
    selectedSpecifications.color = v || null;
    const l = document.getElementById('color-label');
    if (l) l.textContent = v;
  });

  wireChips('size-chips', 'size', (v) => {
    selectedSize = v;
    selectedSpecifications.size = v || null;
  });

  wireChips('variant-chips', 'variant', (i) => {
    selectedVariant = variants[parseInt(i, 10)];
    selectedSpecifications.variant = selectedVariant ? (selectedVariant.sku || selectedVariant.name || String(i)) : null;
    // Update price display for this variant
    if (selectedVariant?.price) {
      const priceEl = document.getElementById('product-price');
      if (priceEl) priceEl.textContent = `₦${parseFloat(selectedVariant.price).toLocaleString('en-NG', {minimumFractionDigits:2})}`;
    }
    // Update stock status
    if (selectedVariant?.stock != null) {
      const stockEl = document.getElementById('stock-status');
      const qty = Number(selectedVariant.stock);
      if (stockEl) stockEl.innerHTML = qty > 0
        ? `<span style="color:#22c55e">✓ In Stock (${qty} available)</span>`
        : `<span style="color:#ef4444">✗ Out of Stock</span>`;
      if (qty <= 0) {
        disableBtn('product-add-to-cart', 'Out of stock');
        disableBtn('product-checkout', 'Out of stock');
      }
    }
  });

  // Wire gender/storage chips if present
  if (document.getElementById('gender-chips')) {
    wireChips('gender-chips', 'gender', (v) => { selectedSpecifications.gender = v || null; });
  }
  if (document.getElementById('storage-chips')) {
    wireChips('storage-chips', 'storage', (v) => { selectedSpecifications.storage = v || null; });
  }

  function checkCanAdd() {
    const needColor   = showColors   && !selectedColor   && !showVariants;
    const needSize    = showSizes    && !selectedSize    && !showVariants;
    const needVariant = showVariants && !selectedVariant;
    const blocked = needColor || needSize || needVariant;
    const warn = document.getElementById('opts-warn');
    if (warn) warn.style.display = blocked ? 'block' : 'none';
    ['product-add-to-cart','product-add-to-wishlist','product-checkout'].forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.disabled = blocked;
      btn.style.opacity = blocked ? '0.5' : '1';
      btn.style.cursor  = blocked ? 'not-allowed' : 'pointer';
    });
  }

  checkCanAdd();

  // Expose selected options to product-page.js addToCart
  window.productOptions = {
    color:   () => selectedColor,
    size:    () => selectedSize,
    variant: () => selectedVariant,
    // Full selected specifications object
    selectedSpecifications: () => ({ ...selectedSpecifications })
  };
}
