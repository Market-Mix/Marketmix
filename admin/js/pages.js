// Dashboard Page
let adminRefundCases = [];
let refundFetchRetryTimer = null;
let refundFetchRetryCount = 0;
const ADMIN_API_BASE = window.ADMIN_API_BASE || 'https://marketmix-backend.onrender.com/api';

function getAdminAuthToken() {
  if (window.ADMIN_AUTH_TOKEN) return window.ADMIN_AUTH_TOKEN;

  const storedToken = localStorage.getItem('adminToken');
  if (storedToken) return storedToken;

  const sessionValue = localStorage.getItem('adminSession');
  if (sessionValue) {
    try {
      const session = JSON.parse(sessionValue);
      return session?.token || session?.accessToken || session?.authToken || session?.jwt || session?.user?.token || '';
    } catch (err) {
      return '';
    }
  }

  return localStorage.getItem('token') || '';
}

function getAdminAuthHeaders() {
  const token = getAdminAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function normalizeRefundCase(refundCase) {
  const hasDecision = refundCase.marketmix_decision === 'approved' || refundCase.marketmix_decision === 'rejected';
  const status = hasDecision
    ? (refundCase.marketmix_decision === 'approved' ? 'Approved' : 'Denied')
    : (refundCase.resolution_status === 'escalated' ? 'Pending' : 'Pending');

  const createdAt = refundCase.created_at || refundCase.createdAt || refundCase.date || null;
  const createdDate = createdAt ? new Date(createdAt).toLocaleDateString() : '';

  return {
    id: String(refundCase.id || refundCase.refund_id || refundCase.case_id || ''),
    orderId: String(refundCase.order_id || refundCase.orderId || ''),
    buyer: refundCase.buyer_name || refundCase.buyer || refundCase.buyer_id || 'Unknown',
    seller: refundCase.store_name || refundCase.seller_name || refundCase.seller || refundCase.seller_id || 'Unknown',
    amount: refundCase.amount || refundCase.total_amount || refundCase.refund_amount || '',
    status,
    date: createdDate,
    returnDate: createdDate,
    productName: refundCase.product_name || refundCase.productName || 'Unknown product',
    productImage: refundCase.product_image || refundCase.productImage || '',
    reason: refundCase.complaint_text || refundCase.reason || '',
    notes: refundCase.notes || '',
    rawResolutionStatus: refundCase.resolution_status || '',
    rawStatus: refundCase.status || ''
  };
}

async function fetchAdminRefundCases() {
  const container = document.getElementById('returnTableContainer');
  if (!container) return;

  const token = getAdminAuthToken();
  if (!token) {
    if (refundFetchRetryCount < 5) {
      refundFetchRetryCount += 1;
      container.innerHTML = `<div class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow"><p class="text-sm text-gray-600 dark:text-gray-400">Waiting for admin authentication...</p></div>`;
      if (refundFetchRetryTimer) clearTimeout(refundFetchRetryTimer);
      refundFetchRetryTimer = setTimeout(() => {
        refundFetchRetryTimer = null;
        fetchAdminRefundCases();
      }, 750);
      return;
    }

    container.innerHTML = `<div class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow"><p class="text-sm text-red-600 dark:text-red-400">Admin auth token missing. Please provide a valid admin JWT in localStorage.adminToken or window.ADMIN_AUTH_TOKEN.</p></div>`;
    return;
  }

  if (refundFetchRetryTimer) {
    clearTimeout(refundFetchRetryTimer);
    refundFetchRetryTimer = null;
  }
  refundFetchRetryCount = 0;

  container.innerHTML = `<div class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow"><p class="text-sm text-gray-600 dark:text-gray-400">Loading return requests...</p></div>`;

  const headers = getAdminAuthHeaders();
  if (!headers.Authorization) {
    container.innerHTML = `<div class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow"><p class="text-sm text-red-600 dark:text-red-400">Admin auth token missing. Please provide a valid admin JWT in localStorage.adminToken or window.ADMIN_AUTH_TOKEN.</p></div>`;
    return;
  }

  try {
    const response = await fetch(`${ADMIN_API_BASE}/admin/refunds`, { headers });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      const message = body?.message || 'Unable to fetch refund cases from backend.';
      container.innerHTML = `<div class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow"><p class="text-sm text-red-600 dark:text-red-400">${message}</p></div>`;
      return;
    }

    const refundCases = Array.isArray(body?.data?.refundCases) ? body.data.refundCases : [];
    adminRefundCases = refundCases.map(normalizeRefundCase);
    applyReturnFilters();
  } catch (err) {
    container.innerHTML = `<div class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow"><p class="text-sm text-red-600 dark:text-red-400">Error loading refund cases: ${err.message || 'Unknown error'}</p></div>`;
  }
}

function applyReturnFilters() {
  const searchInput = document.getElementById('returnSearch');
  const statusSelect = document.getElementById('returnStatusFilter');
  if (!searchInput || !statusSelect) return;

  const query = searchInput.value.toLowerCase().trim();
  const statusFilter = statusSelect.value;

  const filtered = adminRefundCases.filter(refund => {
    const matchesQuery = !query || [refund.orderId, refund.buyer, refund.seller, refund.productName]
      .some(value => String(value || '').toLowerCase().includes(query));

    const normalizedStatus = String(refund.status || '').toLowerCase();
    const normalizedResolutionStatus = String(refund.rawResolutionStatus || '').toLowerCase();
    const matchesStatus = statusFilter === 'all' || normalizedStatus === statusFilter.toLowerCase() || normalizedResolutionStatus === statusFilter.toLowerCase();

    return matchesQuery && matchesStatus;
  });

  const container = document.getElementById('returnTableContainer');
  if (!container) return;

  if (!filtered.length) {
    container.innerHTML = `<div class="p-6 bg-white dark:bg-gray-800 rounded-lg shadow"><p class="text-sm text-gray-600 dark:text-gray-400">No returns found matching your search or filter.</p></div>`;
    return;
  }

  container.innerHTML = renderTable(['ID', 'Buyer', 'Seller', 'Amount', 'Status', 'Date'], filtered, [
    { label: 'View', callback: 'viewReturn' }
  ]);
}

function createRefundErrorToast(message) {
  showToast(message, 'error');
}

function getAdminReturnActionHeaders() {
  const authHeaders = getAdminAuthHeaders();
  return {
    ...authHeaders,
    'Content-Type': 'application/json'
  };
}

function renderDashboard() {
  const html = `
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Dashboard</h1>
      
      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        ${renderCard('Total Buyers', '12,453', 'users', 'blue')}
        ${renderCard('Total Sellers', '823', 'store', 'green')}
        ${renderCard('Total Products', '4,567', 'box', 'orange')}
        ${renderCard('Total Orders', '8,934', 'receipt', 'red')}
      </div>

      <!-- Revenue & Approvals -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue Overview</h2>
          <div style="position: relative; height: 280px;">
            <canvas id="revenueChart"></canvas>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-4">Monthly revenue trend (Last 6 months)</p>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pending Approvals</h2>
          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900 rounded">
              <div>
                <p class="font-semibold text-gray-900 dark:text-white">Pending Sellers</p>
                <p class="text-sm text-gray-600 dark:text-gray-300">12 sellers awaiting approval</p>
              </div>
              <button onclick="loadPage('sellers')" class="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">Review</button>
            </div>
            <div class="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900 rounded">
              <div>
                <p class="font-semibold text-gray-900 dark:text-white">Pending Products</p>
                <p class="text-sm text-gray-600 dark:text-gray-300">8 products awaiting review</p>
              </div>
              <button onclick="loadPage('products')" class="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">Review</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Orders</h2>
          <div class="space-y-4">
            ${dummyData.orders.slice(0, 3).map(order => `
              <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <p class="font-semibold text-gray-900 dark:text-white">${order.id}</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">${order.buyer} → ${order.seller}</p>
                </div>
                <div class="text-right">
                  <p class="font-semibold text-gray-900 dark:text-white">$${order.amount}</p>
                  <span class="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">${order.status}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Products</h2>
          <div class="space-y-4">
            ${dummyData.products.slice(0, 3).map(product => `
              <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <p class="font-semibold text-gray-900 dark:text-white">${product.name}</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">${product.seller}</p>
                </div>
                <div class="text-right">
                  <p class="font-semibold text-gray-900 dark:text-white">$${product.price}</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">Stock: ${product.stock}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('content').innerHTML = html;

  // Initialize revenue chart
  setTimeout(() => {
    generateRevenueChart();
  }, 50);
}

// Buyers Management
function renderBuyers() {
  const html = `
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Buyers Management</h1>
      
      <div class="mb-6 flex gap-4">
        <input type="text" id="buyerSearch" placeholder="Search buyers..." class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white">
        <button class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Export</button>
      </div>

      ${renderTable(['ID', 'Name', 'Email', 'Phone', 'Status', 'Join Date'], dummyData.buyers, [
        { label: 'View', callback: 'viewBuyer' }
      ])}
    </div>
  `;
  document.getElementById('content').innerHTML = html;
  
  document.getElementById('buyerSearch').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = dummyData.buyers.filter(b => 
      b.name.toLowerCase().includes(query) || b.email.toLowerCase().includes(query)
    );
    const tableHtml = renderTable(['ID', 'Name', 'Email', 'Phone', 'Status', 'Join Date'], filtered, [
      { label: 'View', callback: 'viewBuyer' }
    ]);
    document.querySelector('.overflow-x-auto').outerHTML = tableHtml;
  });
}

function viewBuyer(id) {
  const buyer = dummyData.buyers.find(b => b.id === id);
  const html = `
    <div>
      <button onclick="loadPage('buyers')" class="mb-6 text-blue-600 dark:text-blue-400 hover:underline">← Back to Buyers</button>
      
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">${buyer.name}</h2>
        
        <div class="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p class="text-gray-600 dark:text-gray-400">Email</p>
            <p class="font-semibold text-gray-900 dark:text-white">${buyer.email}</p>
          </div>
          <div>
            <p class="text-gray-600 dark:text-gray-400">Phone</p>
            <p class="font-semibold text-gray-900 dark:text-white">${buyer.phone}</p>
          </div>
          <div>
            <p class="text-gray-600 dark:text-gray-400">Joined</p>
            <p class="font-semibold text-gray-900 dark:text-white">${buyer.joinDate}</p>
          </div>
        </div>

        <div class="flex gap-3">
          <button onclick="toggleBuyerStatus('${buyer.id}')" class="px-6 py-2 ${buyer.status === 'Active' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg">
            ${buyer.status === 'Active' ? 'Suspend' : 'Activate'} Buyer
          </button>
          <button onclick="openModal('Delete Buyer', 'Are you sure you want to delete this buyer?', () => { deleteBuyer('${buyer.id}'); })" class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Delete Buyer
          </button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('content').innerHTML = html;
}

// Sellers Management
function renderSellers() {
  const html = `
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Sellers Management</h1>
      
      <div class="mb-6 flex gap-4">
        <input type="text" id="sellerSearch" placeholder="Search sellers..." class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white">
        <button class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Export</button>
      </div>

      ${renderTable(['ID', 'Shop Name', 'Seller Name', 'Email', 'Phone', 'Status', 'Join Date'], dummyData.sellers, [
        { label: 'View', callback: 'viewSeller' }
      ])}
    </div>
  `;
  document.getElementById('content').innerHTML = html;
  
  document.getElementById('sellerSearch').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = dummyData.sellers.filter(s => 
      s.shopName.toLowerCase().includes(query) || s.sellerName.toLowerCase().includes(query)
    );
    const tableHtml = renderTable(['ID', 'Shop Name', 'Seller Name', 'Email', 'Phone', 'Status', 'Join Date'], filtered, [
      { label: 'View', callback: 'viewSeller' }
    ]);
    document.querySelector('.overflow-x-auto').outerHTML = tableHtml;
  });
}

function viewSeller(id) {
  const seller = dummyData.sellers.find(s => s.id === id);
  const html = `
    <div>
      <button onclick="loadPage('sellers')" class="mb-6 text-blue-600 dark:text-blue-400 hover:underline">← Back to Sellers</button>
      
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Seller KYC Verification - ${seller.shopName}</h2>
        <p class="text-gray-600 dark:text-gray-400 mb-6">Submitted KYC Information Review</p>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <!-- KYC Information Display (Read-Only) -->
          <div class="space-y-4">
            <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p class="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase mb-1">Full Name</p>
              <p class="font-semibold text-gray-900 dark:text-white text-lg">${seller.fullName || seller.sellerName}</p>
            </div>
            
            <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p class="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase mb-1">Date of Birth</p>
              <p class="font-semibold text-gray-900 dark:text-white text-lg">${seller.dateOfBirth || 'Not provided'}</p>
            </div>
            
            <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p class="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase mb-1">Country</p>
              <p class="font-semibold text-gray-900 dark:text-white text-lg">${seller.country || 'Not provided'}</p>
            </div>
            
            <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p class="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase mb-1">ID Type</p>
              <p class="font-semibold text-gray-900 dark:text-white text-lg">${seller.idType || 'Not provided'}</p>
            </div>
            
            <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p class="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase mb-1">ID Number</p>
              <p class="font-semibold text-gray-900 dark:text-white text-lg">${seller.idNumber || 'Not provided'}</p>
            </div>
            
            <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p class="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase mb-1">Residential Address</p>
              <p class="font-semibold text-gray-900 dark:text-white text-lg">${seller.residentialAddress || 'Not provided'}</p>
            </div>
          </div>
          
          <!-- Document Previews Section -->
          <div class="space-y-4">
            <div>
              <label class="block text-gray-700 dark:text-gray-300 font-semibold mb-3">ID Document</label>
              <div class="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700 h-80 flex items-center justify-center overflow-hidden">
                ${seller.idDocumentUrl ? `<img src="${seller.idDocumentUrl}" alt="ID Document" class="max-h-full max-w-full object-contain">` : `<div class="text-center"><i class="fas fa-image text-4xl text-gray-400 mb-2"></i><p class="text-gray-600 dark:text-gray-400 text-sm">No document uploaded</p></div>`}
              </div>
            </div>
            
            <div>
              <label class="block text-gray-700 dark:text-gray-300 font-semibold mb-3">Proof of Address</label>
              <div class="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700 h-80 flex items-center justify-center overflow-hidden">
                ${seller.proofOfAddressUrl ? `<img src="${seller.proofOfAddressUrl}" alt="Proof of Address" class="max-h-full max-w-full object-contain">` : `<div class="text-center"><i class="fas fa-image text-4xl text-gray-400 mb-2"></i><p class="text-gray-600 dark:text-gray-400 text-sm">No document uploaded</p></div>`}
              </div>
            </div>
            
            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p class="text-sm text-blue-900 dark:text-blue-200 font-semibold mb-3">Seller Information</p>
              <p class="text-sm text-blue-800 dark:text-blue-300 mb-2"><span class="font-semibold">Status:</span> ${seller.status}</p>
              <p class="text-sm text-blue-800 dark:text-blue-300 mb-2"><span class="font-semibold">Email:</span> ${seller.email}</p>
              <p class="text-sm text-blue-800 dark:text-blue-300 mb-2"><span class="font-semibold">Phone:</span> ${seller.phone}</p>
              <p class="text-sm text-blue-800 dark:text-blue-300"><span class="font-semibold">Joined:</span> ${seller.joinDate || 'N/A'}</p>
            </div>
          </div>
        </div>
        
        <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
          <div class="flex gap-3 flex-wrap">
            ${seller.status === 'Pending' ? `<button onclick="approveSeller('${seller.id}')" class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center gap-2"><i class="fas fa-check"></i> Approve Seller</button>` : ''}
            <button onclick="toggleSellerStatus('${seller.id}')" class="px-6 py-2 ${seller.status === 'Approved' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg font-semibold flex items-center gap-2">
              <i class="fas ${seller.status === 'Approved' ? 'fa-ban' : 'fa-check-circle'}"></i>
              ${seller.status === 'Approved' ? 'Suspend' : 'Activate'} Seller
            </button>
            <button onclick="openModal('Delete Seller', 'Are you sure? This will delete all associated data.', () => { deleteSeller('${seller.id}'); })" class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold flex items-center gap-2">
              <i class="fas fa-trash"></i> Delete Seller
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('content').innerHTML = html;
}

// Products Management
function renderProducts() {
  const html = `
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Products Management</h1>
      
      <div class="mb-6 flex gap-4">
        <input type="text" id="productSearch" placeholder="Search products..." class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white">
        <select class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white">
          <option>All Categories</option>
          <option>Electronics</option>
          <option>Fashion</option>
          <option>Home</option>
          <option>Sports</option>
        </select>
        <button class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Export</button>
      </div>

      ${renderTable(['ID', 'Name', 'Category', 'Seller', 'Price', 'Stock', 'Status'], dummyData.products, [
        { label: 'View', callback: 'viewProduct' }
      ])}
    </div>
  `;
  document.getElementById('content').innerHTML = html;
}

function viewProduct(id) {
  const product = dummyData.products.find(p => p.id === id);
  const html = `
    <div>
      <button onclick="loadPage('products')" class="mb-6 text-blue-600 dark:text-blue-400 hover:underline">← Back to Products</button>
      
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">${product.name}</h2>
        
        <div class="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p class="text-gray-600 dark:text-gray-400">Category</p>
            <p class="font-semibold text-gray-900 dark:text-white">${product.category}</p>
          </div>
          <div>
            <p class="text-gray-600 dark:text-gray-400">Seller</p>
            <p class="font-semibold text-gray-900 dark:text-white">${product.seller}</p>
          </div>
          <div>
            <p class="text-gray-600 dark:text-gray-400">Price</p>
            <p class="font-semibold text-gray-900 dark:text-white">$${product.price}</p>
          </div>
          <div>
            <p class="text-gray-600 dark:text-gray-400">Stock</p>
            <p class="font-semibold text-gray-900 dark:text-white">${product.stock}</p>
          </div>
          <div>
            <p class="text-gray-600 dark:text-gray-400">Status</p>
            <p class="font-semibold text-gray-900 dark:text-white">${product.status}</p>
          </div>
        </div>

        <div class="flex gap-3">
          <button onclick="toggleProductStatus('${product.id}')" class="px-6 py-2 ${product.status === 'Active' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg">
            ${product.status === 'Active' ? 'Deactivate' : 'Activate'} Product
          </button>
          <button onclick="openModal('Delete Product','Are you sure you want to delete this product?', () => { deleteProduct('${product.id}'); })" class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            Delete Product
          </button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('content').innerHTML = html;
}

// Orders Management
function renderOrders() {
  const html = `
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Orders Management</h1>
      
      <div class="mb-6 flex gap-4">
        <input type="text" id="orderSearch" placeholder="Search orders..." class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white">
        <select class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white">
          <option>All Status</option>
          <option>Pending</option>
          <option>Processing</option>
          <option>Shipped</option>
          <option>Delivered</option>
        </select>
        <button class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Export</button>
      </div>

      ${renderTable(['ID', 'Buyer', 'Seller', 'Amount', 'Status', 'Date'], dummyData.orders, [
        { label: 'View', callback: 'viewOrder' }
      ])}
    </div>
  `;
  document.getElementById('content').innerHTML = html;
}

function viewOrder(id) {
  const order = dummyData.orders.find(o => o.id === id);
  const html = `
    <div>
      <button onclick="loadPage('orders')" class="mb-6 text-blue-600 dark:text-blue-400 hover:underline">← Back to Orders</button>
      
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">${order.id}</h2>
        
        <div class="grid grid-cols-2 gap-6 mb-6">
          <div>
            <p class="text-gray-600 dark:text-gray-400">Buyer</p>
            <p class="font-semibold text-gray-900 dark:text-white">${order.buyer}</p>
          </div>
          <div>
            <p class="text-gray-600 dark:text-gray-400">Seller</p>
            <p class="font-semibold text-gray-900 dark:text-white">${order.seller}</p>
          </div>
          <div>
            <p class="text-gray-600 dark:text-gray-400">Amount</p>
            <p class="font-semibold text-gray-900 dark:text-white">$${order.amount}</p>
          </div>
          <div>
            <p class="text-gray-600 dark:text-gray-400">Date</p>
            <p class="font-semibold text-gray-900 dark:text-white">${order.date}</p>
          </div>
        </div>

        <div class="mb-6">
          <h3 class="font-semibold text-gray-900 dark:text-white mb-3">Order Timeline</h3>
          <div class="flex gap-4">
            <div class="flex flex-col items-center">
              <div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white"><i class="fas fa-check"></i></div>
              <p class="text-xs mt-2">Pending</p>
            </div>
            <div class="flex-1 h-px bg-green-500 mt-4"></div>
            <div class="flex flex-col items-center">
              <div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white"><i class="fas fa-check"></i></div>
              <p class="text-xs mt-2">Processing</p>
            </div>
            <div class="flex-1 h-px bg-blue-500 mt-4"></div>
            <div class="flex flex-col items-center">
              <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white"><i class="fas fa-box"></i></div>
              <p class="text-xs mt-2">Shipped</p>
            </div>
            <div class="flex-1 h-px bg-gray-300 mt-4"></div>
            <div class="flex flex-col items-center">
              <div class="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white"><i class="fas fa-truck"></i></div>
              <p class="text-xs mt-2">Delivered</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('content').innerHTML = html;
}

// Categories Management
function renderCategories() {
  const html = `
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Categories Management</h1>
      
      <button onclick="addCategory()" class="mb-6 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">+ Add Category</button>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${dummyData.categories.map(cat => `
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 class="font-bold text-gray-900 dark:text-white mb-2">${cat.name}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">${cat.products} products</p>
            <div class="flex gap-2">
              <button onclick="toggleCategoryStatus('${cat.id}')" class="flex-1 px-3 py-2 text-sm ${cat.status === 'Active' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'} rounded hover:opacity-80">
                ${cat.status === 'Active' ? 'Deactivate' : 'Activate'}
              </button>
              <button onclick="openModal('Delete Category', 'Are you sure you want to delete ${cat.name}?', () => { deleteCategory('${cat.id}'); })" class="px-3 py-2 text-sm bg-red-100 text-red-600 rounded hover:opacity-80">Delete</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  document.getElementById('content').innerHTML = html;
}

function addCategory() {
  const name = prompt('Category name:');
  if (name) {
    dummyData.categories.push({ id: 'CAT' + (dummyData.categories.length + 1), name, status: 'Active', products: 0 });
    renderCategories();
    showToast('Category added successfully');
  }
}

// Reports & Analytics
let salesChart = null;

function renderReports() {
  const html = `
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Reports & Analytics</h1>
      
      <div class="mb-6 flex gap-4 items-center">
        <input id="reportStart" type="date" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white">
        <span class="px-4 py-2">to</span>
        <input id="reportEnd" type="date" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white">
        <select id="reportInterval" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white">
          <option value="day">Day</option>
          <option value="month">Month</option>
        </select>
        <button id="generateReportBtn" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Generate</button>
        <button id="exportCsv" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">CSV</button>
        <button id="exportPdf" class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">PDF</button>
      </div>
  
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sales Reports</h2>
            <div class="h-64">
              <canvas id="salesChart" width="400" height="200"></canvas>
            </div>
          </div>

          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Selling Categories</h2>
            <div class="space-y-4">
              ${['Electronics', 'Fashion', 'Home & Garden', 'Sports'].map((cat, idx) => {
                const pct = 100 - idx * 15;
                return `
                <div class="flex items-center justify-between">
                  <p class="text-gray-700 dark:text-gray-300 w-32">${cat}</p>
                  <div class="w-40 h-6 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden relative">
                    <div class="h-full bg-blue-500" style="width: ${pct}%"></div>
                    <span class="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-900 dark:text-white">${pct}%</span>
                  </div>
                </div>
              `;
              }).join('')}
            </div>
          </div>
        </div>
    </div>
  `;
  document.getElementById('content').innerHTML = html;

  // wire up generate button and initialize
  setTimeout(() => {
    const gen = document.getElementById('generateReportBtn');
    if (gen) gen.addEventListener('click', () => generateReport());

    const csv = document.getElementById('exportCsv');
    if (csv) csv.addEventListener('click', () => exportReportCSV());

    const pdf = document.getElementById('exportPdf');
    if (pdf) pdf.addEventListener('click', () => exportReportPDF());

    const startInput = document.getElementById('reportStart');
    const endInput = document.getElementById('reportEnd');
    const today = new Date();
    const prior = new Date(); prior.setDate(today.getDate() - 30);
    if (startInput && endInput) {
      startInput.value = prior.toISOString().split('T')[0];
      endInput.value = today.toISOString().split('T')[0];
    }

    generateReport();
  }, 50);
}

// Build / update the sales chart using orders in dummyData
function generateReport() {
  const startStr = document.getElementById('reportStart')?.value;
  const endStr = document.getElementById('reportEnd')?.value;
  const interval = document.getElementById('reportInterval')?.value || 'day';

  const start = startStr ? new Date(startStr) : null;
  const end = endStr ? new Date(endStr) : null;

  const agg = aggregateSales(start, end, interval);
  const labels = agg.labels;
  const data = agg.values;

  const canvas = document.getElementById('salesChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // register datalabels plugin if available
  if (window.Chart && window.Chart.register && window.ChartDataLabels) {
    try { Chart.register(ChartDataLabels); } catch (e) { /* ignore */ }
  }

  if (salesChart) {
    salesChart.data.labels = labels;
    salesChart.data.datasets[0].data = data;
    salesChart.update();
    return;
  }

  const total = data.reduce((s, v) => s + v, 0) || 1;

  salesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{ label: 'Sales', data: data, backgroundColor: '#3b82f6' }]
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const v = context.raw || 0;
              const pct = total ? (v / total * 100).toFixed(1) : '0.0';
              return `₦${v.toFixed(2)} (${pct}%)`;
            }
          }
        },
        datalabels: {
          color: '#111827',
          anchor: 'end',
          align: 'start',
          formatter: function(value) {
            const pct = total ? (value / total * 100).toFixed(1) : '0.0';
            return pct + '%';
          },
          font: { weight: '600' }
        }
      },
      scales: { y: { beginAtZero: true } }
    }
  });
}

// Aggregate orders by day or month between start and end inclusive
function aggregateSales(start, end, interval) {
  const orders = (window.dummyData && window.dummyData.orders) || [];
  const map = new Map();

  orders.forEach(o => {
    if (!o.date) return;
    const d = new Date(o.date);
    // normalize to local midnight for comparisons
    d.setHours(0,0,0,0);
    if (start) { const s = new Date(start); s.setHours(0,0,0,0); if (d < s) return; }
    if (end) { const e = new Date(end); e.setHours(23,59,59,999); if (d > e) return; }

    let key;
    if (interval === 'month') {
      const m = d.getMonth() + 1; const y = d.getFullYear();
      key = `${y}-${String(m).padStart(2,'0')}`;
    } else {
      key = d.toISOString().split('T')[0];
    }

    const prev = map.get(key) || 0;
    map.set(key, prev + (parseFloat(o.amount) || 0));
  });

  const keys = Array.from(map.keys()).sort();
  const values = keys.map(k => map.get(k));
  if (keys.length === 0) return { labels: ['No data'], values: [0] };
  return { labels: keys, values };
}

// Generate and render the revenue chart for dashboard
function generateRevenueChart() {
  const data = getMonthlyRevenue();
  const labels = data.labels;
  const values = data.values;
  
  const canvas = document.getElementById('revenueChart');
  if (!canvas || !window.Chart) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // Register datalabels plugin if available
  if (window.Chart && window.Chart.register && window.ChartDataLabels) {
    try { Chart.register(ChartDataLabels); } catch (e) { /* ignore */ }
  }
  
  // Destroy existing chart if any
  if (window.revenueChart && typeof window.revenueChart.destroy === 'function') {
    window.revenueChart.destroy();
  }
  window.revenueChart = null;
  
  const total = values.reduce((s, v) => s + v, 0) || 1;
  
  window.revenueChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{ label: 'Revenue', data: values, backgroundColor: '#3b82f6' }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const v = context.raw || 0;
              const pct = total ? (v / total * 100).toFixed(1) : '0.0';
              return `₦${v.toFixed(2)} (${pct}%)`;
            }
          }
        },
        datalabels: {
          color: '#111827',
          anchor: 'end',
          align: 'start',
          formatter: function(value) {
            const pct = total ? (value / total * 100).toFixed(1) : '0.0';
            return pct + '%';
          },
          font: { weight: '600' }
        }
      },
      scales: { 
        y: { beginAtZero: true }
      }
    }
  });
}

// Get monthly revenue for last 6 months (for dashboard)
function getMonthlyRevenue() {
  const orders = (window.dummyData && window.dummyData.orders) || [];
  const map = new Map();
  
  // Generate last 6 months
  const months = [];
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const key = `${y}-${String(m).padStart(2,'0')}`;
    months.push(key);
    map.set(key, 0);
  }
  
  // Aggregate orders by month
  orders.forEach(o => {
    if (!o.date) return;
    const d = new Date(o.date);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const key = `${y}-${String(m).padStart(2,'0')}`;
    if (map.has(key)) {
      map.set(key, map.get(key) + (parseFloat(o.amount) || 0));
    }
  });
  
  const values = months.map(k => map.get(k));
  const labels = months.map(k => {
    const [y, m] = k.split('-');
    const monthName = new Date(y, m - 1).toLocaleDateString('en-US', { month: 'short' });
    return `${monthName} ${y}`;
  });
  
  return { labels, values };
}

// Export report data as CSV
function exportReportCSV() {
  const startStr = document.getElementById('reportStart')?.value;
  const endStr = document.getElementById('reportEnd')?.value;
  const interval = document.getElementById('reportInterval')?.value || 'day';

  const start = startStr ? new Date(startStr) : null;
  const end = endStr ? new Date(endStr) : null;

  const agg = aggregateSales(start, end, interval);
  const labels = agg.labels;
  const values = agg.values;

  const total = values.reduce((s, v) => s + v, 0) || 1;

  // Build CSV
  let csv = 'Date/Period,Sales Amount,Percentage\n';
  labels.forEach((label, idx) => {
    const val = values[idx];
    const pct = ((val / total) * 100).toFixed(2);
    csv += `"${label}","${val.toFixed(2)}","${pct}%"\n`;
  });
  csv += `\nTotal,"${total.toFixed(2)}","100%"\n`;

  // Download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sales_report_${startStr}_to_${endStr}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported successfully', 'success');
}

// Export report data as PDF
function exportReportPDF() {
  const startStr = document.getElementById('reportStart')?.value;
  const endStr = document.getElementById('reportEnd')?.value;
  const interval = document.getElementById('reportInterval')?.value || 'day';

  const start = startStr ? new Date(startStr) : null;
  const end = endStr ? new Date(endStr) : null;

  const agg = aggregateSales(start, end, interval);
  const labels = agg.labels;
  const values = agg.values;

  const total = values.reduce((s, v) => s + v, 0) || 1;

  // Simple PDF generation using basic HTML (no external lib needed for simple PDFs)
  let html = '<html><head><style>';
  html += 'body { font-family: Arial, sans-serif; margin: 20px; } ';
  html += 'h1 { color: #1f2937; } ';
  html += 'table { width: 100%; border-collapse: collapse; margin: 20px 0; } ';
  html += 'th, td { padding: 10px; text-align: left; border: 1px solid #ddd; } ';
  html += 'th { background-color: #3b82f6; color: white; } ';
  html += 'tr:nth-child(even) { background-color: #f3f4f6; } ';
  html += '</style></head><body>';
  html += '<h1>MarketMix Sales Report</h1>';
  html += `<p><strong>Date Range:</strong> ${startStr} to ${endStr}</p>`;
  html += `<p><strong>Interval:</strong> ${interval.charAt(0).toUpperCase() + interval.slice(1)}</p>`;
  html += '<table><thead><tr><th>Date/Period</th><th>Sales Amount</th><th>Percentage</th></tr></thead><tbody>';

  labels.forEach((label, idx) => {
    const val = values[idx];
    const pct = ((val / total) * 100).toFixed(2);
    html += `<tr><td>${label}</td><td>₦${val.toFixed(2)}</td><td>${pct}%</td></tr>`;
  });

  html += `<tr style="background-color: #dbeafe; font-weight: bold;"><td>TOTAL</td><td>₦${total.toFixed(2)}</td><td>100%</td></tr>`;
  html += '</tbody></table></body></html>';

  // Convert to PDF using browser's print-to-PDF
  const printWindow = window.open('', '', 'height=600,width=800');
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
  showToast('PDF generated - check your print dialog', 'success');
}

// Transactions
function renderTransactions() {
  const html = `
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Transactions</h1>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        ${renderCard('Wallet Balance', '₦45,230.50', 'wallet', 'blue')}
        ${renderCard('Monthly Earnings', '₦12,500.00', 'dollar-sign', 'green')}
        ${renderCard('Pending Payouts', '₦3,200.00', 'clock', 'orange')}
        ${renderCard('Withdrawal Requests', '5', 'arrow-right', 'red')}
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Withdrawal Requests</h2>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200">ID</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200">Seller</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200">Amount</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200">Status</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${dummyData.withdrawals.map(wr => `
                <tr class="border-b border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-600">
                  <td class="px-6 py-4 text-gray-700 dark:text-gray-300">${wr.id}</td>
                  <td class="px-6 py-4 text-gray-700 dark:text-gray-300">${wr.seller}</td>
                  <td class="px-6 py-4 font-semibold text-gray-900 dark:text-white">₦${wr.amount.toFixed(2)}</td>
                  <td class="px-6 py-4">
                    <span class="px-3 py-1 rounded-full text-xs font-semibold ${
                      wr.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      wr.status === 'Approved' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }">${wr.status}</span>
                  </td>
                  <td class="px-6 py-4">
                    ${wr.status === 'Pending' ? `<button onclick="approveWithdrawal('${wr.id}')" class="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Approve</button>` : '<span class="text-gray-500 text-xs">-</span>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  document.getElementById('content').innerHTML = html;
}

// Admin Users
function renderAdminUsers() {
  const html = `
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Admin Users</h1>
      
      <button onclick="openAddAdminUserModal()" class="mb-6 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">+ Add Admin User</button>

      <div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200">Name</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200">Email</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200">Role</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200">Status</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${dummyData.adminUsers.map(admin => `
              <tr class="border-b border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-600">
                <td class="px-6 py-4 text-gray-700 dark:text-gray-300">${admin.name}</td>
                <td class="px-6 py-4 text-gray-700 dark:text-gray-300">${admin.email}</td>
                <td class="px-6 py-4 text-gray-700 dark:text-gray-300">${admin.role}</td>
                <td class="px-6 py-4"><span class="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">${admin.status}</span></td>
                <td class="px-6 py-4"><button onclick="openEditAdminUserModal('${admin.id}')" class="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Edit</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
  document.getElementById('content').innerHTML = html;
}

// Profile
function renderProfile() {
  const html = `
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">My Profile</h1>
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 max-w-3xl">
        <div class="flex items-center gap-6 mb-6">
          <img src="https://via.placeholder.com/96" alt="Admin avatar" class="w-24 h-24 rounded-full">
          <div>
            <p class="text-lg font-semibold text-gray-900 dark:text-white">Admin User</p>
            <p class="text-sm text-gray-600 dark:text-gray-300">admin@marketmix.com</p>
            <p class="text-sm text-gray-600 dark:text-gray-300">+1 (555) 123-4567</p>
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-gray-700 dark:text-gray-300 mb-1">Full name</label>
            <input class="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white" value="Admin User">
          </div>
          <div>
            <label class="block text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input class="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white" value="admin@marketmix.com">
          </div>
          <div class="flex gap-3">
            <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
            <button onclick="openPasswordModal()" class="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600">Change password</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('content').innerHTML = html;
}

// Settings
function renderSettings() {
  const html = `
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>
      
      <div class="space-y-6">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">General Settings</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-gray-700 dark:text-gray-300 mb-2">Site Name</label>
              <input type="text" value="MarketMix" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
            </div>
            <div>
              <label class="block text-gray-700 dark:text-gray-300 mb-2">Site Logo URL</label>
              <input type="text" value="https://marketmix.com/logo.png" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
            </div>
            <button onclick="showToast('Settings saved')" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Email Settings</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-gray-700 dark:text-gray-300 mb-2">SMTP Server</label>
              <input type="text" value="smtp.gmail.com" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
            </div>
            <div>
              <label class="block text-gray-700 dark:text-gray-300 mb-2">SMTP Port</label>
              <input type="text" value="587" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
            </div>
            <button onclick="showToast('Email settings saved')" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Gateway</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-gray-700 dark:text-gray-300 mb-2">Stripe Secret Key</label>
              <input type="password" value="sk_test_****" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
            </div>
            <button onclick="showToast('Payment settings saved')" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('content').innerHTML = html;
}

// Returns & Refunds Management
function renderReturns() {
  const html = `
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Returns & Refunds</h1>
      
      <div class="mb-6 flex gap-4">
        <input type="text" id="returnSearch" placeholder="Search returns by Order ID or Buyer..." class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white">
        <select id="returnStatusFilter" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white">
          <option value="all">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Denied">Denied</option>
        </select>
        <button class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Export</button>
      </div>

      <div id="returnTableContainer">
        ${renderTable(['ID', 'Buyer', 'Seller', 'Amount', 'Status', 'Date'], [], [
          { label: 'View', callback: 'viewReturn' }
        ])}
      </div>
    </div>
  `;
  document.getElementById('content').innerHTML = html;

  document.getElementById('returnSearch').addEventListener('input', () => {
    applyReturnFilters();
  });

  document.getElementById('returnStatusFilter').addEventListener('change', () => {
    applyReturnFilters();
  });

  fetchAdminRefundCases();
}

function viewReturn(id) {
  const returnRequest = adminRefundCases.find(r => r.id === id);
  if (!returnRequest) {
    showToast('Return request not found. Please refresh the list.', 'error');
    loadPage('returns');
    return;
  }
  const html = `
    <div>
      <button onclick="loadPage('returns')" class="mb-6 text-blue-600 dark:text-blue-400 hover:underline">← Back to Returns & Refunds</button>
      
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Return Request #${returnRequest.id}</h2>
        <p class="text-gray-600 dark:text-gray-400 mb-6">Order #${returnRequest.orderId}</p>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <!-- Return Information (Left) -->
          <div class="space-y-4">
            <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p class="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase mb-1">Product Name / Order ID</p>
              <p class="font-semibold text-gray-900 dark:text-white text-lg">${returnRequest.productName}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Order ID: ${returnRequest.orderId}</p>
            </div>
            
            <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p class="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase mb-1">Reason for Return</p>
              <p class="font-semibold text-gray-900 dark:text-white text-base">${returnRequest.reason}</p>
            </div>
            
            <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p class="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase mb-1">Additional Notes</p>
              <p class="text-gray-900 dark:text-white text-base">${returnRequest.notes}</p>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p class="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase mb-1">Buyer</p>
                <p class="font-semibold text-gray-900 dark:text-white">${returnRequest.buyer}</p>
              </div>
              <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p class="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase mb-1">Seller</p>
                <p class="font-semibold text-gray-900 dark:text-white">${returnRequest.seller}</p>
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p class="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase mb-1">Refund Amount</p>
                <p class="font-semibold text-gray-900 dark:text-white text-lg">$${returnRequest.amount}</p>
              </div>
              <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p class="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase mb-1">Status</p>
                <p class="font-semibold text-lg">${returnRequest.status === 'Approved' ? '<span class="text-green-600">Approved</span>' : returnRequest.status === 'Denied' ? '<span class="text-red-600">Denied</span>' : '<span class="text-yellow-600">Pending</span>'}</p>
              </div>
            </div>
          </div>
          
          <!-- Product Image (Right) -->
          <div class="space-y-4">
            <div>
              <label class="block text-gray-700 dark:text-gray-300 font-semibold mb-3">Product Image</label>
              <div class="border border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-700 h-80 flex items-center justify-center overflow-hidden">
                ${returnRequest.productImage ? `<img src="${returnRequest.productImage}" alt="${returnRequest.productName}" class="max-h-full max-w-full object-contain">` : `<div class="text-center"><i class="fas fa-image text-4xl text-gray-400 mb-2"></i><p class="text-gray-600 dark:text-gray-400 text-sm">No image available</p></div>`}
              </div>
            </div>
            
            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p class="text-sm text-blue-900 dark:text-blue-200 font-semibold mb-3">Return Details</p>
              <p class="text-sm text-blue-800 dark:text-blue-300 mb-2"><span class="font-semibold">Return Date:</span> ${returnRequest.returnDate}</p>
              <p class="text-sm text-blue-800 dark:text-blue-300 mb-2"><span class="font-semibold">Request Date:</span> ${returnRequest.date}</p>
              <p class="text-sm text-blue-800 dark:text-blue-300"><span class="font-semibold">Status:</span> ${returnRequest.status}</p>
            </div>
          </div>
        </div>
        
        <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
          <div class="flex gap-3 flex-wrap">
            ${returnRequest.status === 'Pending' ? `
              <button onclick="approveReturn('${returnRequest.id}')" class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center gap-2">
                <i class="fas fa-check"></i> Approve Refund
              </button>
              <button onclick="denyReturn('${returnRequest.id}')" class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold flex items-center gap-2">
                <i class="fas fa-times"></i> Deny Refund
              </button>
            ` : ''}
            <button onclick="openModal('Delete Return Request', 'Are you sure? This will delete the return request permanently.', () => { deleteReturn('${returnRequest.id}'); })" class="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold flex items-center gap-2">
              <i class="fas fa-trash"></i> Delete Request
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('content').innerHTML = html;
}
