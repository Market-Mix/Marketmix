/**
 * sellers product.js  — MarketMix Seller Products Page
 * Connects to: https://marketmix-backend.onrender.com/api/seller/products
 */

const API_BASE = 'https://marketmix-backend.onrender.com/api';

// ─── Auth helpers ──────────────────────────────────────────────────────────────
function getToken() {
  // Prefer seller-scoped token to avoid buyer session overwrite
  return localStorage.getItem('seller_token') || localStorage.getItem('token') || '';
}

function getActiveStoreId() {
  return window.StoreManager?.getActiveStoreId?.()
    || window.StoreManager?.getActiveStore?.()?.id
    || '';
}

async function requireActiveStore() {
  if (window.StoreManager?.requireActiveStore) {
    return window.StoreManager.requireActiveStore();
  }
  return window.StoreManager?.getActiveStore?.() || null;
}

function authHeaders() {
  const storeId = getActiveStoreId();
  return {
    Authorization: `Bearer ${getToken()}`,
    ...(storeId ? { 'X-Store-Id': storeId } : {}),
  };
}

// ─── API Fetch ─────────────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  opts.headers = { ...authHeaders(), ...(opts.headers || {}) };
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (res.status === 401) {
    handleLogout();
    throw new Error('Unauthorized');
  }
  return res.json();
}

// ─── Profile Image ─────────────────────────────────────────────────────────────
function renderProfileImage(profile) {
  const images = document.querySelectorAll('#sellerProfileImage, #sellerProfileImageMobile, .navbar-toggler-icon');
  if (!images.length) return;
  const store = window.StoreManager?.getActiveStore?.();
  const logo = store?.store_logo_url || profile?.profile?.storeLogo || profile?.avatarUrl || '';
  if (logo) {
    images.forEach((img) => {
      img.src = logo;
      img.onerror = () => { img.src = ''; };
    });
  }
}

// ─── Logout ────────────────────────────────────────────────────────────────────
async function handleLogout() {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: authHeaders(),
    });
  } catch (_) { /* ignore */ }
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

// ─── State ─────────────────────────────────────────────────────────────────────
let allProducts = [];
let allCategories = [];
let editingProductId = null;

// ─── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
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

  // Price input formatting
  document.getElementById('newProductPrice').addEventListener('input', function() {
    formatPriceInput(this);
  });
  document.getElementById('editPrice').addEventListener('input', function() {
    formatPriceInput(this);
  });

  // Edit form submit
  document.getElementById('editForm').addEventListener('submit', handleEditSubmit);

  // Image preview listeners
  setupMultiImagePreview('newProductImages', 'addImagesPreview', 'addUploadPlaceholder');
  setupMultiImagePreview('editProductImages', 'editImagesPreview');

  const activeStore = await requireActiveStore();
  if (!activeStore) return;

  // Load data
  loadProfile();
  loadCategories();
  loadProducts();
});

window.addEventListener('storeChanged', () => {
  loadProducts();
});

function toggleProfileDropdown() {
  const dropdown = document.getElementById('profileDropdown');
  if (dropdown) dropdown.style.display = dropdown.style.display === 'flex' ? 'none' : 'flex';
}

window.toggleProfileDropdown = toggleProfileDropdown;

// ─── Load Profile ──────────────────────────────────────────────────────────────
async function loadProfile() {
  try {
    const data = await apiFetch('/seller/profile');
    const profile = data?.data?.seller;
    if (profile) renderProfileImage(profile);
  } catch (err) {
    console.error('Error loading profile:', err);
  }
}

// ─── Load Categories ───────────────────────────────────────────────────────────
async function loadCategories() {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    const data = await res.json();
    allCategories = data?.data || [];
    populateCategorySelects();
  } catch (err) {
    console.error('Error loading categories:', err);
  }
}

function populateCategorySelects() {
  const selects = ['newProductCategory', 'editCategory'];
  selects.forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    // Keep the placeholder option, remove previous category options
    while (select.options.length > 1) select.remove(1);
    allCategories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      select.appendChild(opt);
    });
  });

  // Wire dynamic fields
  const addCat = document.getElementById('newProductCategory');
  const editCat = document.getElementById('editCategory');
  if (addCat) addCat.addEventListener('change', () => renderDynamicFields(addCat.value, 'addDynamicFields'));
  if (editCat) editCat.addEventListener('change', () => renderDynamicFields(editCat.value, 'editDynamicFields'));
}

// ─── Image preview ─────────────────────────────────────────────────────────────
function setupMultiImagePreview(inputId, previewId, placeholderId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('change', () => {
    const preview = document.getElementById(previewId);
    const placeholder = placeholderId ? document.getElementById(placeholderId) : null;
    if (!preview) return;
    preview.innerHTML = '';
    const files = Array.from(input.files).slice(0, 5);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.style.cssText = 'width:60px;height:60px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0';
        preview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
    if (placeholder) placeholder.style.display = files.length ? 'none' : 'block';
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
      (statusFilter === 'in-stock'      && ss === 'In Stock') ||
      (statusFilter === 'low-stock'     && ss === 'Low Stock') ||
      (statusFilter === 'out-of-stock'  && ss === 'Out of Stock');
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
    const price = parseFloat(product.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
      <div>₦${price}</div>
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
  const preview = document.getElementById('addImagesPreview');
  if (preview) preview.innerHTML = '';
}

async function addProduct() {
  const name        = document.getElementById('newProductName').value.trim();
  const price       = document.getElementById('newProductPrice').value.trim();
  const stock       = document.getElementById('newProductStock').value.trim();
  const description = document.getElementById('newProductDescription').value.trim();
  const categoryId  = document.getElementById('newProductCategory').value;

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
    formData.append('price', parsePriceInput(price));
    formData.append('stock_quantity', stock || '0');
    formData.append('description', description);
    if (categoryId) formData.append('category_id', categoryId);

    const weight = document.getElementById('newProductWeight').value;
    if (weight) formData.append('weight_kg', weight);

    const addDynamic = collectDynamicFields('#addProductForm');
    if (addDynamic) formData.append('category_meta', JSON.stringify(addDynamic));

    const imageFiles = Array.from(document.getElementById('newProductImages').files).slice(0, 5);
    imageFiles.forEach(f => formData.append('images', f));

    const res = await fetch(`${API_BASE}/seller/products`, {
      method: 'POST',
      headers: authHeaders(),   // No Content-Type — browser sets multipart boundary
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create product');

    const wasFirstProduct = allProducts.length === 0;
    allProducts.unshift(data.data.product);
    renderProducts();
    closeAddModal();
    showToast('Product added successfully!', 'success');

    (async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const userId = user?.id;
        // Prefer store name when composing notification messages
        const store = (typeof StoreManager !== 'undefined' && StoreManager.getActiveStore) ? StoreManager.getActiveStore() : null;
        const storeName = store?.business_name || 'your store';
        const notifPayload = {
          user_id: userId,
          title: wasFirstProduct ? 'First product added!' : 'New product added',
          message: wasFirstProduct
            ? `Congratulations! You just added your first product to ${storeName}.`
            : `New product added successfully to ${storeName}.`,
          type: 'account',
          link: '/sellers/sellers product.html'
        };

        if (userId && typeof NotificationManager !== 'undefined' && NotificationManager.createNotification) {
          try {
            await NotificationManager.createNotification(userId, {
              title: notifPayload.title,
              message: notifPayload.message,
              type: notifPayload.type,
              link: notifPayload.link
            });
          } catch (e) {
            console.warn('NotificationManager.createNotification failed', e);
          }
        } else if (userId) {
          try {
            await fetch(`${API_BASE}/notifications`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...authHeaders()
              },
              body: JSON.stringify(notifPayload)
            });
          } catch (e) {
            console.warn('Failed to create notification via API', e);
          }
        }
      } catch (e) {
        console.warn('Could not create product notification:', e);
      }
    })();
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

  document.getElementById('editId').value          = id;
  document.getElementById('editName').value         = product.name;
  document.getElementById('editPrice').value        = parseFloat(product.price).toLocaleString('en-US');
  document.getElementById('editStock').value        = product.stock_quantity;
  document.getElementById('editDescription').value  = product.description || '';

  // Set category select — works even if categories loaded after products
  const editCat = document.getElementById('editCategory');
  if (editCat) editCat.value = product.category_id || '';

  // Set weight
  document.getElementById('editWeight').value = product.weight_kg || '';

  // Restore dynamic fields when editing
  if (product.category_id) {
    renderDynamicFields(product.category_id, 'editDynamicFields');
    // Restore saved meta values if they exist
    if (product.category_meta) {
      const meta = typeof product.category_meta === 'string' 
        ? JSON.parse(product.category_meta) 
        : product.category_meta;
      setTimeout(() => {
        Object.entries(meta).forEach(([key, val]) => {
          const el = document.querySelector(`#editDynamicFields [name="cat_${key}"]`);
          if (el) el.value = val;
        });
      }, 50);
    }
  }

  // Show existing images
  const container = document.getElementById('editCurrentImages');
  if (container) {
    container.innerHTML = '';
    const imgs = product.images?.length ? product.images : (product.main_image_url ? [product.main_image_url] : []);
    imgs.forEach((src, i) => {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'position:relative;display:inline-block';
      wrap.innerHTML = `
        <img src="${src}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0">
        <button type="button" onclick="removeExistingImage('${editingProductId}',${i})" 
          style="position:absolute;top:-6px;right:-6px;background:#ef4444;color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:10px;cursor:pointer;line-height:18px">×</button>
      `;
      container.appendChild(wrap);
    });
  }

  document.getElementById('editModal').style.display = 'block';
}

function closeModal() {
  document.getElementById('editModal').style.display = 'none';
  editingProductId = null;
  const editPreview = document.getElementById('editImagesPreview');
  if (editPreview) editPreview.innerHTML = '';
}

async function handleEditSubmit(e) {
  e.preventDefault();
  if (!editingProductId) return;

  const name        = document.getElementById('editName').value.trim();
  const price       = document.getElementById('editPrice').value.trim();
  const stock       = document.getElementById('editStock').value.trim();
  const description = document.getElementById('editDescription').value.trim();
  const categoryId  = document.getElementById('editCategory').value;

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
    formData.append('price', parsePriceInput(price));
    formData.append('stock_quantity', stock || '0');
    formData.append('description', description);
    if (categoryId) formData.append('category_id', categoryId);

    const weightInput = document.getElementById('editWeight');
    if (weightInput && weightInput.value) formData.append('weight_kg', weightInput.value);

    const editDynamic = collectDynamicFields('#editForm');
    if (editDynamic) formData.append('category_meta', JSON.stringify(editDynamic));

    // Keep existing images from editingProductId's data
    const existing = allProducts.find(p => p.id === editingProductId);
    if (existing?.images?.length) formData.append('existing_images', JSON.stringify(existing.images));

    const imageInput = document.getElementById('editProductImages');
    const imageFiles = imageInput ? Array.from(imageInput.files).slice(0, 5) : [];
    imageFiles.forEach(f => formData.append('images', f));

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

// ─── Remove existing image ────────────────────────────────────────────────────
function removeExistingImage(productId, index) {
  const p = allProducts.find(x => x.id === productId);
  if (!p || !p.images) return;
  p.images.splice(index, 1);
  openEditModal(productId); // re-render modal
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

// ─── Price formatting ──────────────────────────────────────────────────────────
function formatPriceInput(input) {
  let raw = input.value.replace(/[^0-9]/g, '');
  if (raw) input.value = parseInt(raw, 10).toLocaleString('en-US');
}

function parsePriceInput(value) {
  return parseFloat(value.replace(/,/g, '')) || 0;
}

// ─── Dynamic Category Fields ───────────────────────────────────────────────────
const CATEGORY_FIELDS = {
  'Books & Media': `
    <div class="dynamic-fields">
      <label>Type</label>
      <select name="cat_type"><option value="">Select type</option><option>Textbook</option><option>Novel</option><option>Magazine</option><option>Educational Material</option></select>
      <label>Author (optional)</label>
      <input type="text" name="cat_author" placeholder="Author name">
      <label>Condition</label>
      <select name="cat_condition"><option value="">Select condition</option><option>New</option><option>Fairly Used</option></select>
    </div>`,
  'Electronics': `
    <div class="dynamic-fields">
      <label>Brand</label>
      <input type="text" name="cat_brand" placeholder="e.g. Samsung, Apple">
      <label>Type</label>
      <select name="cat_type"><option value="">Select type</option><option>Phone</option><option>Laptop</option><option>TV</option><option>Game Console</option><option>Accessory</option></select>
      <label>Model (optional)</label>
      <input type="text" name="cat_model" placeholder="e.g. iPhone 14">
    </div>`,
  'Fashion': `
    <div class="dynamic-fields">
      <label>Gender</label>
      <select name="cat_gender"><option value="">Select gender</option><option>Men</option><option>Women</option><option>Unisex</option></select>
      <label>Type</label>
      <select name="cat_type"><option value="">Select type</option><option>Shirt</option><option>Trouser</option><option>Shoe</option><option>Bag</option><option>Watch</option></select>
      <label>Size</label>
      <input type="text" name="cat_size" placeholder="e.g. M, L, 42">
      <label>Color</label>
      <input type="text" name="cat_color" placeholder="e.g. Red, Blue">
    </div>`,
  'Health & Beauty': `
    <div class="dynamic-fields">
      <label>Brand</label>
      <input type="text" name="cat_brand" placeholder="e.g. Nivea, L'Oreal">
      <label>Product Type</label>
      <select name="cat_type"><option value="">Select type</option><option>Skincare</option><option>Makeup</option><option>Haircare</option><option>Perfume</option></select>
      <label>Size/Volume</label>
      <input type="text" name="cat_size" placeholder="e.g. 200ml, 50g">
    </div>`,
  'Jewelry': `
    <div class="dynamic-fields">
      <label>Type</label>
      <select name="cat_type"><option value="">Select type</option><option>Ring</option><option>Necklace</option><option>Bracelet</option><option>Earrings</option></select>
      <label>Material</label>
      <select name="cat_material"><option value="">Select material</option><option>Gold</option><option>Silver</option><option>Stainless Steel</option><option>Beads</option></select>
      <label>Color</label>
      <input type="text" name="cat_color" placeholder="e.g. Gold, Rose Gold">
    </div>`,
  'Sports & Outdoors': `
    <div class="dynamic-fields">
      <label>Sport Type</label>
      <select name="cat_sport"><option value="">Select sport</option><option>Football</option><option>Gym</option><option>Basketball</option><option>Running</option></select>
      <label>Product Type</label>
      <input type="text" name="cat_type" placeholder="e.g. Jersey, Dumbbell">
      <label>Brand (optional)</label>
      <input type="text" name="cat_brand" placeholder="e.g. Nike, Adidas">
    </div>`,
  'Toys & Games': `
    <div class="dynamic-fields">
      <label>Product Type</label>
      <select name="cat_type"><option value="">Select type</option><option>Educational Toy</option><option>Action Figure</option><option>Board Game</option><option>Video Game</option></select>
      <label>Age Range</label>
      <select name="cat_age"><option value="">Select age range</option><option>0-3</option><option>4-7</option><option>8-12</option><option>13+</option></select>
    </div>`,
  'Home & Garden': ''
};

function getCategoryNameById(categoryId) {
  const cat = allCategories.find(c => String(c.id) === String(categoryId));
  return cat ? cat.name : null;
}

function renderDynamicFields(categoryId, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const name = getCategoryNameById(categoryId);
  container.innerHTML = (name && CATEGORY_FIELDS[name]) ? CATEGORY_FIELDS[name] : '';
}

function collectDynamicFields(formSelector) {
  const fields = {};
  document.querySelectorAll(`${formSelector} [name^="cat_"]`).forEach(el => {
    if (el.value.trim()) fields[el.name.replace('cat_', '')] = el.value.trim();
  });
  return Object.keys(fields).length ? fields : null;
}
