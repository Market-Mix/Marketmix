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

  // Category change → load subcategories
  document.getElementById('newProductCategory')?.addEventListener('change', async function() {
    variants = [];
    if (!this.value) {
      document.getElementById('newProductSubcategory').innerHTML = '<option value="">— Select Subcategory —</option>';
      document.getElementById('addDynamicFields2').innerHTML = '';
      return;
    }
    await loadSubcategories(this.value, 'newProductSubcategory');
    renderVariantsSection('addVariantsSection');
  });

  document.getElementById('newProductSubcategory')?.addEventListener('change', function() {
    const opt = this.options[this.selectedIndex];
    const fields = opt.dataset.fields ? JSON.parse(opt.dataset.fields) : [];
    renderSubcategoryFields(fields, 'addDynamicFields2');
  });

  // Video preview
  document.getElementById('newProductVideo')?.addEventListener('change', function() {
    const file = this.files[0];
    const preview = document.getElementById('videoPreviewAdd');
    if (file && preview) {
      const url = URL.createObjectURL(file);
      preview.innerHTML = `<video src="${url}" controls style="width:100%;max-height:120px;border-radius:6px"></video>`;
    }
  });

  document.getElementById('editProductVideo')?.addEventListener('change', function() {
    const file = this.files[0];
    const preview = document.getElementById('videoPreviewEdit');
    if (file && preview) {
      const url = URL.createObjectURL(file);
      preview.innerHTML = `<video src="${url}" controls style="width:100%;max-height:120px;border-radius:6px"></video>`;
    }
  });

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
    const store = window.StoreManager?.getActiveStore?.();
    const storeCategoryId = store?.category_id || '';
    const storeCategoryName = store?.category || '';

    const res = await fetch(`${API_BASE}/categories`);
    const data = await res.json();
    allCategories = data?.data || [];

    const storeCategory = allCategories.find(c =>
      String(c.id) === String(storeCategoryId) ||
      c.name.toLowerCase() === storeCategoryName.toLowerCase()
    );

    const selects = ['newProductCategory', 'editCategory'];
    selects.forEach(id => {
      const select = document.getElementById(id);
      if (!select) return;
      while (select.options.length > 1) select.remove(1);

      allCategories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name;
        select.appendChild(opt);
      });

      if (storeCategory) {
        select.value = storeCategory.id;
        select.disabled = true;
        select.style.cssText = 'background:#f1f5f9;color:#64748b;cursor:not-allowed;border-color:#e2e8f0;';
        select.title = 'Category is locked to your store. Change in Shop Settings.';

        const hint = document.getElementById(`${id}_hint`) || document.createElement('small');
        hint.id = `${id}_hint`;
        hint.style.cssText = 'display:block;color:#94a3b8;font-size:11px;margin-top:3px;';
        hint.innerHTML = `<i class="fas fa-lock"></i> Locked to store category. <a href="sellers setting.html" style="color:#2563eb;">Change in Settings</a>`;
        if (!document.getElementById(`${id}_hint`)) {
          select.parentNode.insertBefore(hint, select.nextSibling);
        }

        const subcatId = id === 'newProductCategory' ? 'newProductSubcategory' : 'editSubcategory';
        loadSubcategories(storeCategory.id, subcatId);
      }
    });
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
  if (addCat) addCat.addEventListener('change', async () => {
    await loadSubcategories(addCat.value, 'newProductSubcategory');
    renderDynamicFields(addCat.value, 'addDynamicFields');
  });
  if (editCat) editCat.addEventListener('change', async () => {
    await loadSubcategories(editCat.value, 'editSubcategory');
    renderDynamicFields(editCat.value, 'editDynamicFields');
  });
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
        <img src="${imgSrc}" alt="${escapeHtml(product.name)}" loading="lazy"
             decoding="async" width="60" height="60"
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
  const catEl       = document.getElementById('newProductCategory');
  const categoryId  = catEl?.value || catEl?.options?.[catEl.selectedIndex]?.value || '';

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

    const subcategoryId = document.getElementById('newProductSubcategory')?.value;
    if (subcategoryId) formData.append('subcategory_id', subcategoryId);

    const weight = document.getElementById('newProductWeight').value;
    if (weight) formData.append('weight_kg', weight);

    const addDynamic = collectDynamicFields('#addProductForm');
    if (addDynamic) formData.append('category_meta', JSON.stringify(addDynamic));

    const dynFields = collectDynamicFields2('#addProductModal');
    if (Object.keys(dynFields).length) formData.append('dynamic_fields', JSON.stringify(dynFields));

    if (variants.length) formData.append('variants', JSON.stringify(variants));

    const discountPrice = document.getElementById('newDiscountPrice')?.value;
    if (discountPrice) formData.append('discount_price', parsePriceInput(discountPrice));

    const sku = document.getElementById('newProductSku')?.value?.trim();
    if (sku) formData.append('sku', sku);

    const vendorLoc = document.getElementById('newVendorLocation')?.value?.trim();
    if (vendorLoc) formData.append('vendor_location', vendorLoc);

    formData.append('delivery_available', document.getElementById('newDeliveryAvailable')?.checked ? 'true' : 'false');
    formData.append('return_accepted', document.getElementById('newReturnAccepted')?.checked ? 'true' : 'false');

    const imageFiles = Array.from(document.getElementById('newProductImages').files).slice(0, 5);
    const compressedFiles = await Promise.all(
      imageFiles.map(f => compressImage(f, 800, 0.75))
    );
    compressedFiles.forEach(f => formData.append('images', f));

    const videoFile = document.getElementById('newProductVideo')?.files[0];
    if (videoFile) formData.append('images', videoFile);

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

    // Notify dashboard to refresh progress tracker immediately
    try {
      window.dispatchEvent(new CustomEvent('seller-dashboard-updated'));
    } catch (e) { console.warn('Could not dispatch seller-dashboard-updated', e); }
    try { window.dispatchEvent(new CustomEvent('sellerNotificationsUpdated')); } catch (e) {}

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
async function openEditModal(id) {
  const product = allProducts.find(p => p.id === id);
  if (!product) return;

  editingProductId = id;

  document.getElementById('editId').value          = id;
  document.getElementById('editName').value         = product.name;
  document.getElementById('editPrice').value        = parseFloat(product.price).toLocaleString('en-US');
  document.getElementById('editStock').value        = product.stock_quantity;
  document.getElementById('editDescription').value  = product.description || '';
  document.getElementById('editDiscountPrice').value = product.discount_price || '';
  document.getElementById('editSku').value               = product.sku || '';
  document.getElementById('editVendorLocation').value    = product.vendor_location || '';
  document.getElementById('editDeliveryAvailable').checked = product.delivery_available !== false;
  document.getElementById('editReturnAccepted').checked    = product.return_accepted !== false;

  // Set category select — works even if categories loaded after products
  const editCat = document.getElementById('editCategory');
  if (editCat) editCat.value = product.category_id || '';

  // Set weight
  document.getElementById('editWeight').value = product.weight_kg || '';

  // Restore dynamic fields when editing
  if (product.category_id) {
    await loadSubcategories(product.category_id, 'editSubcategory');
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
        <img src="${src}" loading="lazy" decoding="async" width="60" height="60" style="width:60px;height:60px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0">
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

    const editDiscount = document.getElementById('editDiscountPrice')?.value;
    if (editDiscount) formData.append('discount_price', parsePriceInput(editDiscount));

    const editSku = document.getElementById('editSku')?.value?.trim();
    if (editSku) formData.append('sku', editSku);

    const editVendorLoc = document.getElementById('editVendorLocation')?.value?.trim();
    if (editVendorLoc) formData.append('vendor_location', editVendorLoc);

    formData.append('delivery_available', document.getElementById('editDeliveryAvailable')?.checked ? 'true' : 'false');
    formData.append('return_accepted', document.getElementById('editReturnAccepted')?.checked ? 'true' : 'false');

    const editVideoFile = document.getElementById('editProductVideo')?.files[0];
    if (editVideoFile) formData.append('images', editVideoFile);

    // Keep existing images from editingProductId's data
    const existing = allProducts.find(p => p.id === editingProductId);
    if (existing?.images?.length) formData.append('existing_images', JSON.stringify(existing.images));

    const imageInput = document.getElementById('editProductImages');
    const imageFiles = imageInput ? Array.from(imageInput.files).slice(0, 5) : [];
    const compressedFiles = await Promise.all(
      imageFiles.map(f => compressImage(f, 800, 0.75))
    );
    compressedFiles.forEach(f => formData.append('images', f));

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

async function loadSubcategories(categoryId, selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = '<option>Loading...</option>';
  select.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/categories/${categoryId}/subcategories`);
    const data = await res.json();
    const subs = data.data || [];

    select.innerHTML = '<option value="">— Select Subcategory —</option>';
    subs.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      if (s.fields) opt.dataset.fields = JSON.stringify(s.fields);
      select.appendChild(opt);
    });
    select.disabled = false;
  } catch (e) {
    select.innerHTML = '<option value="">Failed to load</option>';
    select.disabled = true;
    console.error('loadSubcategories:', e);
  }
}

function renderDynamicFields(categoryId, containerId, existingValues = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const categoryName = getCategoryNameById(categoryId);
  const staticFields = (categoryName && CATEGORY_FIELDS[categoryName]) ? CATEGORY_FIELDS[categoryName] : '';
  container.innerHTML = staticFields;

  const subcategorySelectId = containerId === 'addDynamicFields' ? 'newProductSubcategory' : 'editSubcategory';
  const subSelect = document.getElementById(subcategorySelectId);
  if (subSelect && subSelect.dataset.fields) {
    try {
      const fields = JSON.parse(subSelect.dataset.fields);
      renderSubcategoryFields(fields, containerId, existingValues);
    } catch (e) {
      console.error('renderDynamicFields: invalid subcategory schema', e);
    }
  }
}

function renderSubcategoryFields(fields, containerId, existingValues = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!fields || !fields.length) {
    container.innerHTML = '';
    return;
  }

  const html = fields.map(field => {
    const requiredMark = field.required ? '*' : ' (optional)';
    const value = existingValues[field.key] || '';
    const escapedLabel = escapeHtml(field.label || field.key);
    const nameAttr = `dyn_${escapeHtml(field.key)}`;

    if (field.type === 'select') {
      const options = field.options.map(option => `\n          <option value="${escapeHtml(option)}"${option === value ? ' selected' : ''}>${escapeHtml(option)}</option>`).join('');
      return `
        <label>${escapedLabel}${requiredMark}</label>
        <select name="${nameAttr}">
          <option value="">Select ${escapedLabel}</option>${options}
        </select>
      `;
    }

    if (field.type === 'multiselect') {
      const selected = Array.isArray(value) ? value : (value ? [value] : []);
      const options = field.options.map(option => `
          <label style="display:block;margin:4px 0;">
            <input type="checkbox" name="${nameAttr}[]" value="${escapeHtml(option)}"${selected.includes(option) ? ' checked' : ''}>
            ${escapeHtml(option)}
          </label>`).join('');
      return `
        <div>
          <span>${escapedLabel}${requiredMark}</span>
          ${options}
        </div>
      `;
    }

    if (field.type === 'tags') {
      const tagValue = Array.isArray(value) ? value.join(', ') : value;
      return `
        <label>${escapedLabel}${requiredMark} (comma separated)</label>
        <input type="text" name="${nameAttr}" value="${escapeHtml(tagValue)}" placeholder="Enter comma separated values">
      `;
    }

    if (field.type === 'date') {
      return `
        <label>${escapedLabel}${requiredMark}</label>
        <input type="date" name="${nameAttr}" value="${escapeHtml(value)}">
      `;
    }

    return `
      <label>${escapedLabel}${requiredMark}</label>
      <input type="text" name="${nameAttr}" value="${escapeHtml(value)}" placeholder="Enter ${escapedLabel}">
    `;
  }).join('');

  container.innerHTML = html;
}

function collectDynamicFields(formSelector) {
  const fields = {};
  const form = document.querySelector(formSelector);
  if (!form) return fields;

  form.querySelectorAll('[name^="cat_"]').forEach(el => {
    const name = el.name.replace(/^cat_/, '');
    if (!name) return;

    if (el.type === 'checkbox') {
      if (!el.checked) return;
      if (!fields[name]) fields[name] = [];
      fields[name].push(el.value);
      return;
    }

    if (el.name.endsWith('[]')) {
      if (!fields[name]) fields[name] = [];
      if (el.checked) fields[name].push(el.value);
      return;
    }

    if (el.tagName === 'SELECT' || el.type === 'date' || el.type === 'text' || el.type === 'number' || el.type === 'email' || el.tagName === 'TEXTAREA') {
      const value = el.value.trim();
      if (!value) return;
      if (el.type === 'text' && value.includes(',')) {
        fields[name] = value.split(',').map(item => item.trim()).filter(Boolean);
      } else {
        fields[name] = value;
      }
    }
  });

  return fields;
}

function collectDynamicFields2(formSelector) {
  const fields = {};
  const form = document.querySelector(formSelector);
  if (!form) return fields;

  form.querySelectorAll('[name^="dyn_"]').forEach(el => {
    if (el.name.endsWith('[]')) return;
    const key = el.name.replace('dyn_', '');
    if (el.tagName === 'SELECT' || el.type === 'date' || el.type === 'text') {
      const value = el.value.trim();
      if (!value) return;
      if (el.type === 'text' && value.includes(',')) {
        fields[key] = value.split(',').map(item => item.trim()).filter(Boolean);
      } else {
        fields[key] = value;
      }
    }
  });

  const checkGroups = {};
  form.querySelectorAll('[name$="[]"]:checked').forEach(el => {
    const key = el.name.replace('dyn_', '').replace('[]', '');
    if (!checkGroups[key]) checkGroups[key] = [];
    checkGroups[key].push(el.value);
  });
  Object.assign(fields, checkGroups);

  return fields;
}

let variants = [];

function renderVariantsSection(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <div style="font-weight:600;">Product Variants</div>
      <button type="button" onclick="addVariant('${containerId}')" style="padding:8px 12px;border:none;background:#2563eb;color:#fff;border-radius:6px;cursor:pointer;">+ Add Variant</button>
    </div>
    <div id="${containerId}_list"></div>
  `;

  variants.forEach((variant, index) => renderVariantRow(containerId, variant, index));
}

function addVariant(containerId) {
  variants.push({ name: '', price: '', stock: '', sku: '' });
  renderVariantsSection(containerId);
}

function removeVariant(containerId, index) {
  variants.splice(index, 1);
  renderVariantsSection(containerId);
}

function renderVariantRow(containerId, variant, index) {
  const list = document.getElementById(`${containerId}_list`);
  if (!list) return;

  const row = document.createElement('div');
  row.style.cssText = 'display:grid;grid-template-columns:1fr 80px 80px 80px 30px;gap:8px;align-items:center;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px;background:#f8fafc;';
  row.innerHTML = `
    <input type="text" placeholder="Variant name" value="${escapeHtml(variant.name)}" onchange="variants[${index}].name = this.value" style="padding:8px;border:1px solid #cbd5e1;border-radius:6px;">
    <input type="text" placeholder="Price" value="${escapeHtml(variant.price)}" onchange="variants[${index}].price = this.value" style="padding:8px;border:1px solid #cbd5e1;border-radius:6px;">
    <input type="text" placeholder="Stock" value="${escapeHtml(variant.stock)}" onchange="variants[${index}].stock = this.value" style="padding:8px;border:1px solid #cbd5e1;border-radius:6px;">
    <input type="text" placeholder="SKU" value="${escapeHtml(variant.sku)}" onchange="variants[${index}].sku = this.value" style="padding:8px;border:1px solid #cbd5e1;border-radius:6px;">
    <button type="button" onclick="removeVariant('${containerId}', ${index})" style="background:#ef4444;color:#fff;border:none;border-radius:6px;cursor:pointer;">×</button>
  `;

  list.appendChild(row);
}
