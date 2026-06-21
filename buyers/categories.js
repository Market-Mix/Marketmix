const API_BASE = 'https://marketmix-backend.onrender.com/api';

function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/[&<>'"]/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

async function loadCategories() {
  const grid = document.getElementById('allCategoriesGrid');
  if (!grid) return;

  try {
    const [catRes, prodRes] = await Promise.all([
      fetch(`${API_BASE}/categories/with-count`),
      fetch(`${API_BASE}/products?limit=200`)
    ]);

    if (!catRes.ok) throw new Error('Failed to load categories');
    if (!prodRes.ok) throw new Error('Failed to load products');

    const catData = await catRes.json();
    const prodData = await prodRes.json();
    const cats = catData.data || [];
    const products = prodData.data || [];

    const catImageMap = {};
    products.forEach((p) => {
      if (p.category_id && p.main_image_url && !catImageMap[p.category_id]) {
        catImageMap[p.category_id] = p.main_image_url;
      }
    });

    if (!cats.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;padding:20px;color:#666;text-align:center">No categories found.</div>';
      return;
    }

    grid.innerHTML = cats.map((c) => {
      const img = catImageMap[c.id] || 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=300';
      return `
        <div class="cat-card" data-id="${escapeHtml(c.id)}" data-name="${escapeHtml(c.name)}" onclick="openCategory(this)">
          <div class="cat-img-wrap">
            <img src="${escapeHtml(img)}" alt="${escapeHtml(c.name)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=300'">
          </div>
          <div class="cat-info">
            <div class="cat-name">${escapeHtml(c.name)}</div>
            <div class="cat-count">${c.product_count || 0} products</div>
          </div>
          <div class="cat-arrow"><i class="fas fa-chevron-right"></i></div>
        </div>`; 
    }).join('');
  } catch (err) {
    console.error('Error loading categories:', err);
    // Fallback: show a few mock categories so the UI remains usable when backend is unreachable
    const fallback = [
      { id: 'c1', name: 'Electronics', product_count: 12 },
      { id: 'c2', name: 'Fashion', product_count: 8 },
      { id: 'c3', name: 'Home & Garden', product_count: 6 },
      { id: 'c4', name: 'Sports & Outdoors', product_count: 4 }
    ];
    grid.innerHTML = fallback.map((c) => `
      <div class="cat-card" data-id="${escapeHtml(c.id)}" data-name="${escapeHtml(c.name)}" onclick="openCategory(this)">
        <div class="cat-img-wrap">
          <img src="https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=300" alt="${escapeHtml(c.name)}" loading="lazy">
        </div>
        <div class="cat-info">
          <div class="cat-name">${escapeHtml(c.name)}</div>
          <div class="cat-count">${c.product_count} products</div>
        </div>
        <div class="cat-arrow"><i class="fas fa-chevron-right"></i></div>
      </div>`).join('');
  }
}

async function openCategory(el) {
  if (!el) return;
  const id = el.dataset?.id;
  const name = el.dataset?.name || '';
  if (!id) return;

  const panel = document.getElementById('subcatPanel');
  const panelTitle = document.getElementById('subcatTitle');
  const subcatGrid = document.getElementById('subcatGrid');

  if (!panel || !panelTitle || !subcatGrid) {
    window.location.href = `buyers-category.html?id=${encodeURIComponent(id)}`;
    return;
  }

  panelTitle.textContent = name;
  subcatGrid.innerHTML = '<div style="padding:16px;color:#888;text-align:center">Loading...</div>';
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  try {
    const [subRes, prodRes] = await Promise.all([
      fetch(`${API_BASE}/categories/${encodeURIComponent(id)}/subcategories`),
      fetch(`${API_BASE}/products?limit=200`)
    ]);

    if (!subRes.ok) throw new Error('Failed to load subcategories');
    if (!prodRes.ok) throw new Error('Failed to load products');

    const subs = (await subRes.json()).data || [];
    const products = ((await prodRes.json()).data || []).filter(
      (p) => String(p.category_id) === String(id)
    );

    const subImageMap = {};
    products.forEach((p) => {
      if (p.subcategory_id && p.main_image_url && !subImageMap[p.subcategory_id]) {
        subImageMap[p.subcategory_id] = p.main_image_url;
      }
    });

    const defaultImg = products[0]?.main_image_url || 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=300';

    let html = `
      <div class="subcat-item" onclick="window.location.href='buyers-category.html?id=${encodeURIComponent(id)}'" style="cursor:pointer">
        <div class="subcat-icon" style="background:#fff7ed"><i class="fas fa-th" style="color:#f97316"></i></div>
        <span>All ${escapeHtml(name)}</span>
      </div>`;

    subs.forEach((s) => {
      const img = subImageMap[s.id] || defaultImg;
      html += `
        <div class="subcat-item" onclick="window.location.href='buyers-category.html?id=${encodeURIComponent(id)}&sub=${encodeURIComponent(s.id)}'" style="cursor:pointer">
          <div class="subcat-icon"><img src="${escapeHtml(img)}" alt="${escapeHtml(s.name)}" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-tag\\' style=\\'color:#f97316\\'></i>'"></div>
          <span>${escapeHtml(s.name)}</span>
        </div>`;
    });

    if (!subs.length) {
      html += '<div style="padding:12px;color:#888;font-size:13px">No subcategories available. Browse all products.</div>';
    }

    subcatGrid.innerHTML = html;
  } catch (e) {
    console.error('Error loading subcategories:', e);
    subcatGrid.innerHTML = '<div style="padding:16px;color:#e53e3e">Error loading subcategories.</div>';
  }
}

document.addEventListener('DOMContentLoaded', loadCategories);
