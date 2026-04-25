/**
 * sellers product.js  — MarketMix Seller Products Page
 * Connects to: https://marketmix-backend.onrender.com/api/seller/products
 */

const API_BASE = 'https://marketmix-backend.onrender.com/api';

// ─── Auth helpers ──────────────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem('token') || '';
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

// ─── State ─────────────────────────────────────────────────────────────────────
let allProducts = [];
let editingProductId = null;

// ─── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Navbar toggler
  const toggler = document.getElementById('navbar-toggler');
  const offcanvasMenu = document.getElementById('offcanvasMenu');
  const offcanvasClose = document.getElementById('offcanvasClose');

  toggler.addEventListener('click', () => offcanvasMenu.classList.add('show'));
  offcanvasClose.addEventListener('click', () => offcanvasMenu.classList.remove('show'));
  document.addEventListener('click', e => {
    if (!offcanvasMenu.contains(e.target) && !toggler.contains(e.target)) {
      offcanvasMenu.classList.remove('show');
    }
  });
  offcanvasMenu.addEventListener('click', e => e.stopPropagation());
  document.querySelectorAll('.offcanvas-body a').forEach(link => {
    link.addEventListener('click', () => offcanvasMenu.classList.remove('show'));
  });

  // Profile dropdown
  document.addEventListener('click', e => {
    const dropdown = document.getElementById('profileDropdown');
    const profile = document.querySelector('.profile-icon');
    if (dropdown && profile && !dropdown.contains(e.target) && !profile.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });

  // Search + filter listeners
  document.getElementById('searchInput').addEventListener('input', renderProducts);
  document.getElementById('statusFilter').addEventListener('change', renderProducts);

  // Edit form submit
  document.getElementById('editForm').addEventListener('submit', handleEditSubmit);

  // Image preview listeners
  setupImagePreview('newProductImage', 'addImagePreview');
  setupImagePreview('editProductImage', 'editImagePreview');

  // Load products from API
  loadProducts();
});

function toggleProfileDropdown() {
  const dropdown = document.getElementById('profileDropdown');
  if (dropdown) dropdown.style.display = dropdown.style.display === 'flex' ? 'none' : 'flex';
}

// ─── Image preview ─────────────────────────────────────────────────────────────
function setupImagePreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('change', () => {
    const file = input.files[0];
    const preview = document.getElementById(previewId);
    if (!preview) return;
    if (file) {
      const reader = new FileReader();
      reader.onload = e => {
        preview.src = e.target.result;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    } else {
      preview.style.display = 'none';
    }
  });
}

// ─── API: Load products ────────────────────────────────────────────────────────
async function loadProducts() {
  showLoading(true);
  try {
    const res = await fetch(`${API_BASE}/seller/products`, {
      headers: authHeaders(),
    });

    if (res.status === 401) {
      showToast('Session expired. Please log in again.', 'error');
      setTimeout(() => { window.location.href = 'login.html'; }, 1500);
      return;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Error ${res.status}`);
    }

    const data = await res.json();
    allProducts = data.data.products || [];
    renderProducts();
  } catch (err) {
    console.error('loadProducts:', err);
    showToast('Failed to load products: ' + err.message, 'error');
    // Show empty state
    allProducts = [];
    renderProducts();
  } finally {
    showLoading(false);
  }
}

// ─── Render ────────────────────────────────────────────────────────────────────
function renderProducts() {
  const productGrid = document.getElementById('productGrid');
  const searchQuery = document.getElementById('searchInput').value.toLowerCase();
  const statusFilter = document.getElementById('statusFilter').value;

  productGrid.innerHTML = '';

  let total = 0, inStock = 0, lowStock = 0, outStock = 0;

  const filtered = allProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery);
    const ss = p.stockStatus || getStockStatus(p.stock_quantity);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'in-stock'     && ss === 'In Stock') ||
      (statusFilter === 'low-stock'    && ss === 'Low Stock') ||
      (statusFilter === 'out-of-stock' && ss === 'Out of Stock');
    return matchesSearch && matchesStatus;
  });

  allProducts.forEach(p => {
    total++;
    const ss = p.stockStatus || getStockStatus(p.stock_quantity);
    if (ss === 'In Stock')     inStock++;
    if (ss === 'Low Stock')    lowStock++;
    if (ss === 'Out of Stock') outStock++;
  });

  document.getElementById('total-products').textContent = total;
  document.getElementById('in-stock-count').textContent = inStock;
  document.getElementById('low-stock-count').textContent = lowStock;
  document.getElementById('out-of-stock-count').textContent = outStock;

  if (filtered.length === 0) {
    productGrid.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:40px; color:#666;">
        ${allProducts.length === 0
          ? 'No products yet. Click <strong>Add Product</strong> to get started.'
          : 'No products match your search.'}
      </div>`;
    return;
  }

  filtered.forEach(product => {
    const ss = product.stockStatus || getStockStatus(product.stock_quantity);
    const statusClass = ss.toLowerCase().replace(/\s+/g, '-');
    const imgSrc = product.main_image_url || 'https://via.placeholder.com/60x60?text=No+Image';
    const price = typeof product.price === 'number' ? product.price.toFixed(2) : parseFloat(product.price || 0).toFixed(2);

    const row = document.createElement('div');
    row.className = 'product-row';
    row.innerHTML = `
      <div>
        <img src="${imgSrc}" alt="${escapeHtml(product.name)}"
             onerror="this.src='https://via.placeholder.com/60x60?text=No+Img'"
             style="width:60px;height:60px;object-fit:cover;border-radius:6px;">
      </div>
      <div style="font-weight:600;">${escapeHtml(product.name)}</div>
      <div><span class="status ${statusClass}">${ss}</span></div>
      <div>$${price}</div>
      <div class="actions">
        <button class="edit-btn" onclick="openEditModal('${product.id}')">Edit</button>
        <button class="delete-btn" onclick="deleteProduct('${product.id}', '${escapeHtml(product.name)}')">Delete</button>
      </div>
    `;
    productGrid.appendChild(row);
  });
}

function getStockStatus(qty) {
  const q = parseInt(qty) || 0;
  if (q === 0) return 'Out of Stock';
  if (q <= 10)  return 'Low Stock';
  return 'In Stock';
}

// ─── Add Product ───────────────────────────────────────────────────────────────
function openAddModal() {
  document.getElementById('addProductModal').style.display = 'block';
}

function closeAddModal() {
  document.getElementById('addProductModal').style.display = 'none';
  document.getElementById('addProductForm').reset();
  const preview = document.getElementById('addImagePreview');
  if (preview) preview.style.display = 'none';
}

async function addProduct() {
  const name         = document.getElementById('newProductName').value.trim();
  const price        = document.getElementById('newProductPrice').value.trim();
  const stock        = document.getElementById('newProductStock').value.trim();
  const description  = document.getElementById('newProductDescription').value.trim();
  const imageFile    = document.getElementById('newProductImage').files[0];

  if (!name || !price) {
    showToast('Product name and price are required.', 'error');
    return;
  }

  const btn = document.querySelector('#addProductForm .shop-now-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('price', price);
    formData.append('stock_quantity', stock || '0');
    formData.append('description', description);
    if (imageFile) formData.append('image', imageFile);

    const res = await fetch(`${API_BASE}/seller/products`, {
      method: 'POST',
      headers: authHeaders(),   // No Content-Type — browser sets multipart boundary
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create product');

    allProducts.unshift(data.data.product);
    renderProducts();
    closeAddModal();
    showToast('Product added successfully!', 'success');
  } catch (err) {
    console.error('addProduct:', err);
    showToast('Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add Product';
  }
}

// ─── Edit Product ──────────────────────────────────────────────────────────────
function openEditModal(id) {
  const product = allProducts.find(p => p.id === id);
  if (!product) return;

  editingProductId = id;

  document.getElementById('editId').value = id;
  document.getElementById('editName').value = product.name;
  document.getElementById('editPrice').value = product.price;
  document.getElementById('editStock').value = product.stock_quantity;
  document.getElementById('editDescription').value = product.description || '';

  const editStatus = document.getElementById('editStatus');
  const ss = product.stockStatus || getStockStatus(product.stock_quantity);
  editStatus.value = ss;

  // Show current image
  const currentImg = document.getElementById('editCurrentImage');
  if (currentImg) {
    currentImg.src = product.main_image_url || 'https://via.placeholder.com/80?text=No+Image';
    currentImg.style.display = 'block';
  }
  const editPreview = document.getElementById('editImagePreview');
  if (editPreview) editPreview.style.display = 'none';

  document.getElementById('editModal').style.display = 'block';
}

function closeModal() {
  document.getElementById('editModal').style.display = 'none';
  editingProductId = null;
  const editPreview = document.getElementById('editImagePreview');
  if (editPreview) editPreview.style.display = 'none';
}

async function handleEditSubmit(e) {
  e.preventDefault();
  if (!editingProductId) return;

  const name        = document.getElementById('editName').value.trim();
  const price       = document.getElementById('editPrice').value.trim();
  const stock       = document.getElementById('editStock').value.trim();
  const description = document.getElementById('editDescription').value.trim();
  const imageFile   = document.getElementById('editProductImage').files[0];

  if (!name || !price) {
    showToast('Name and price are required.', 'error');
    return;
  }

  const btn = document.querySelector('#editForm .shop-now-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('price', price);
    formData.append('stock_quantity', stock || '0');
    formData.append('description', description);
    if (imageFile) formData.append('image', imageFile);

    const res = await fetch(`${API_BASE}/seller/products/${editingProductId}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update product');

    const idx = allProducts.findIndex(p => p.id === editingProductId);
    if (idx !== -1) allProducts[idx] = { ...allProducts[idx], ...data.data.product };

    renderProducts();
    closeModal();
    showToast('Product updated!', 'success');
  } catch (err) {
    console.error('handleEditSubmit:', err);
    showToast('Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Changes';
  }
}

// ─── Delete Product ────────────────────────────────────────────────────────────
async function deleteProduct(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

  try {
    const res = await fetch(`${API_BASE}/seller/products/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to delete product');

    allProducts = allProducts.filter(p => p.id !== id);
    renderProducts();
    showToast('Product deleted.', 'success');
  } catch (err) {
    console.error('deleteProduct:', err);
    showToast('Error: ' + err.message, 'error');
  }
}

// ─── UI helpers ────────────────────────────────────────────────────────────────
function showLoading(show) {
  let loader = document.getElementById('productsLoader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'productsLoader';
    loader.style.cssText = `
      text-align:center; padding:40px; color:#555; font-size:1rem;
      grid-column: 1/-1;
    `;
    loader.textContent = 'Loading products…';
  }
  const grid = document.getElementById('productGrid');
  if (show) {
    grid.innerHTML = '';
    grid.appendChild(loader);
  } else {
    if (loader.parentNode) loader.parentNode.removeChild(loader);
  }
}

function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = `
      position:fixed; bottom:24px; right:24px; z-index:9999;
      display:flex; flex-direction:column; gap:10px;
    `;
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const colors = { success: '#2f855a', error: '#c53030', info: '#2b6cb0', warning: '#b7791f' };
  toast.style.cssText = `
    background:${colors[type] || colors.info}; color:#fff;
    padding:12px 20px; border-radius:8px;
    box-shadow:0 4px 12px rgba(0,0,0,0.15);
    font-size:0.95rem; min-width:240px;
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;

  // Add animation keyframes if not present
  if (!document.getElementById('toastStyle')) {
    const style = document.createElement('style');
    style.id = 'toastStyle';
    style.textContent = `
      @keyframes slideIn { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
    `;
    document.head.appendChild(style);
  }

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}