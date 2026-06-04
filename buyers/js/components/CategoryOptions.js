function createCategoryOptions(product) {
  const container = document.getElementById('category-options');
  if (!container) return;

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

  let variants = [];
  try {
    const raw = product.variants;
    if (raw) variants = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(variants)) variants = [];
    variants = variants.filter(v => v && v.name);
  } catch (_) { variants = []; }

  let specs = {};
  try {
    const rawMeta = product.category_meta;
    if (rawMeta) specs = typeof rawMeta === 'string' ? JSON.parse(rawMeta) : rawMeta;
  } catch (_) { specs = {}; }

  const dynFields = product.dynamic_fields || {};
  const allSpecs = { ...specs, ...dynFields };

  const showColors = colors.length > 0;
  const showSizes = sizes.length > 0;
  const showVariants = variants.length > 0;
  const showSpecs = Object.keys(allSpecs).length > 0;

  let selectedColor = null;
  let selectedSize = null;
  let selectedVariant = null;

  let html = '';

  if (showSpecs) {
    const specLabels = {
      type:'Type', brand:'Brand', model:'Model', gender:'Gender',
      size:'Size', color:'Color', material:'Material', condition:'Condition',
      author:'Author', sport:'Sport', age:'Age Range', volume:'Volume',
      storage:'Storage', ram:'RAM', processor:'Processor', battery:'Battery',
      os:'Operating System', screen_size:'Screen Size', connectivity:'Connectivity',
      weight:'Weight', strap_material:'Strap', power_rating:'Power',
      set_size:'Set Size', num_pieces:'Pieces', age_range:'Age Range',
      hair_type:'Hair Type', length:'Length', texture:'Texture'
    };
    html += `<div class="spec-section">
      <div class="spec-title">Product Specifications</div>
      <div class="spec-grid">`;
    Object.entries(allSpecs).forEach(([k, v]) => {
      if (!v) return;
      const val = Array.isArray(v) ? v.join(', ') : v;
      const label = specLabels[k] || k.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
      html += `<div class="spec-row"><span class="spec-key">${label}</span><span class="spec-val">${escapeHtml(val)}</span></div>`;
    });
    html += `</div></div>`;
  }

  if (showVariants) {
    html += `<div class="opt-section">
      <div class="opt-label">Select Variant</div>
      <div class="opt-chips" id="variant-chips">`;
    variants.forEach((v,i) => {
      const extra = v.price ? ` · ₦${parseFloat(v.price).toLocaleString()}` : '';
      html += `<button type="button" class="opt-chip" data-variant="${i}">${escapeHtml(v.name)}${escapeHtml(extra)}</button>`;
    });
    html += `</div></div>`;
  }

  if (showColors) {
    html += `<div class="opt-section">
      <div class="opt-label">Color: <span id="color-label" style="font-weight:600;color:#f97316"></span></div>
      <div class="opt-chips" id="color-chips">`;
    colors.forEach(c => {
      html += `<button type="button" class="opt-chip" data-color="${escapeHtml(c)}">${escapeHtml(c)}</button>`;
    });
    html += `</div></div>`;
  }

  if (showSizes) {
    html += `<div class="opt-section">
      <div class="opt-label">Size</div>
      <div class="opt-chips" id="size-chips">`;
    sizes.forEach(s => {
      html += `<button type="button" class="opt-chip" data-size="${escapeHtml(s)}">${escapeHtml(s)}</button>`;
    });
    html += `</div></div>`;
  }

  if (showColors || showSizes || showVariants) {
    html += `<div id="opts-warn" style="display:none;font-size:12px;color:#f97316;margin-top:6px">⚠️ Please select all options before adding to cart</div>`;
  }

  container.innerHTML = html;

  if (!document.getElementById('cat-opt-styles')) {
    const style = document.createElement('style');
    style.id = 'cat-opt-styles';
    style.textContent = `
      .spec-section{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:14px}
      .spec-title{font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px}
      .spec-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0}
      .spec-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f1f5f9;font-size:13px;gap:8px}
      .spec-row:last-child{border-bottom:none}
      .spec-key{color:#64748b;flex-shrink:0}
      .spec-val{color:#1e293b;font-weight:500;text-align:right;word-break:break-word}
      .opt-section{margin-bottom:14px}
      .opt-label{font-size:13px;font-weight:600;color:#334155;margin-bottom:8px}
      .opt-chips{display:flex;flex-wrap:wrap;gap:8px}
      .opt-chip{padding:7px 14px;border:1.5px solid #e2e8f0;border-radius:8px;background:#fff;cursor:pointer;font-size:13px;color:#475569;transition:all .15s}
      .opt-chip:hover{border-color:#f97316;color:#f97316}
      .opt-chip.selected{border-color:#f97316;background:#f97316;color:#fff}
    `;
    document.head.appendChild(style);
  }

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

  wireChips('color-chips', 'color', (v) => { selectedColor = v; const l = document.getElementById('color-label'); if (l) l.textContent = v; });
  wireChips('size-chips', 'size', (v) => { selectedSize = v; });
  wireChips('variant-chips', 'variant', (i) => {
    selectedVariant = variants[parseInt(i, 10)];
    if (selectedVariant?.price) {
      const priceEl = document.getElementById('product-price');
      if (priceEl) priceEl.textContent = `₦${parseFloat(selectedVariant.price).toLocaleString()}`;
    }
  });

  function checkCanAdd() {
    const needColor = showColors && !selectedColor;
    const needSize = showSizes && !selectedSize;
    const needVariant = showVariants && !selectedVariant;
    const blocked = needColor || needSize || needVariant;
    const warn = document.getElementById('opts-warn');
    if (warn) warn.style.display = blocked ? 'block' : 'none';
    ['product-add-to-cart','product-add-to-wishlist','product-checkout'].forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.disabled = blocked;
      btn.style.opacity = blocked ? '0.5' : '1';
      btn.style.cursor = blocked ? 'not-allowed' : 'pointer';
    });
  }

  checkCanAdd();

  window.productOptions = {
    color: () => selectedColor,
    size: () => selectedSize,
    variant: () => selectedVariant
  };
}
