/**
 * Specification Utilities - Shared helpers for displaying product specs across order lifecycle
 * Used by: buyer/seller order details, refunds, notifications, fulfillment views
 */

/**
 * Render product specifications (color, size) from an order item
 * @param {Object} item - Order item containing color, size, product_snapshot
 * @param {Object} options - Configuration options
 * @returns {String} HTML markup with formatted specs
 */
function renderProductSpecifications(item, options = {}) {
  const {
    inline = false,
    showLabel = true,
    separator = ' · ',
    containerClass = '',
    textClass = ''
  } = options;

  if (!item) return '';

  // Try to get specs from item directly or from product_snapshot
  let color = item.color || null;
  let size = item.size || null;

  // Fallback to product_snapshot if available
  if ((!color || !size) && (item.product_snapshot || item.productSnapshot)) {
    let ps = item.product_snapshot || item.productSnapshot;
    if (typeof ps === 'string') {
      try {
        ps = JSON.parse(ps);
      } catch (e) {
        ps = {};
      }
    }
    if (!color) color = ps.color || null;
    if (!size) size = ps.size || null;
  }

  // Don't render if no specs exist
  if (!color && !size) return '';

  // Build spec parts
  const parts = [];
  if (color) parts.push(`Color: ${escapeHtmlSpec(color)}`);
  if (size) parts.push(`Size: ${escapeHtmlSpec(size)}`);

  const specText = parts.join(separator);

  // Inline format (for single-line displays like tables)
  if (inline) {
    return specText;
  }

  // Multi-line format (for detailed views)
  const cls = containerClass ? ` class="${containerClass}"` : '';
  const txtCls = textClass ? ` class="${textClass}"` : '';
  return `<div${cls} style="margin-top:6px;font-size:0.9rem;color:#64748b;">${parts.map(p => `<div${txtCls}>${p}</div>`).join('')}</div>`;
}

/**
 * Render specs as a compact badge/label (for use in notifications or compact views)
 * @param {Object} item - Order item
 * @returns {String} Compact specs text
 */
function renderSpecsBadge(item) {
  const inline = renderProductSpecifications(item, { inline: true });
  return inline || '—';
}

/**
 * Get color value from item (with fallback to product_snapshot)
 * @param {Object} item - Order item
 * @returns {String|null} Color value or null
 */
function getItemColor(item) {
  if (!item) return null;
  if (item.color) return item.color;
  
  let ps = item.product_snapshot || item.productSnapshot;
  if (typeof ps === 'string') {
    try {
      ps = JSON.parse(ps);
      return ps.color || null;
    } catch (e) {
      return null;
    }
  }
  return ps?.color || null;
}

/**
 * Get size value from item (with fallback to product_snapshot)
 * @param {Object} item - Order item
 * @returns {String|null} Size value or null
 */
function getItemSize(item) {
  if (!item) return null;
  if (item.size) return item.size;
  
  let ps = item.product_snapshot || item.productSnapshot;
  if (typeof ps === 'string') {
    try {
      ps = JSON.parse(ps);
      return ps.size || null;
    } catch (e) {
      return null;
    }
  }
  return ps?.size || null;
}

/**
 * Format product name with specs for display
 * @param {String} productName - Product name
 * @param {Object} item - Order item
 * @returns {String} HTML with product name and specs
 */
function formatProductWithSpecs(productName, item) {
  const color = getItemColor(item);
  const size = getItemSize(item);
  
  if (!color && !size) {
    return `<div style="font-weight:600">${escapeHtmlSpec(productName || '—')}</div>`;
  }
  
  let specs = [];
  if (color) specs.push(`Color: ${escapeHtmlSpec(color)}`);
  if (size) specs.push(`Size: ${escapeHtmlSpec(size)}`);
  
  return `<div><div style="font-weight:600">${escapeHtmlSpec(productName || '—')}</div><div style="font-size:0.85rem;color:#64748b;margin-top:3px">${specs.join(' · ')}</div></div>`;
}

/**
 * Safe HTML escape for specs
 * @param {String} text - Text to escape
 * @returns {String} Escaped text
 */
function escapeHtmlSpec(text) {
  if (!text && text !== 0) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Check if item has specifications
 * @param {Object} item - Order item
 * @returns {Boolean} True if item has color or size
 */
function hasSpecs(item) {
  if (!item) return false;
  
  if (item.color || item.size) return true;
  
  let ps = item.product_snapshot || item.productSnapshot;
  if (typeof ps === 'string') {
    try {
      ps = JSON.parse(ps);
      return !!(ps.color || ps.size);
    } catch (e) {
      return false;
    }
  }
  
  return !!(ps?.color || ps?.size);
}
