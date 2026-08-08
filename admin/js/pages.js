// Dashboard Page
let adminRefundCases = [];
let refundFetchRetryTimer = null;
let refundFetchRetryCount = 0;
const ADMIN_API_BASE = window.ADMIN_API_BASE || (window.location.protocol === 'file:' ? 'http://localhost:5000/api' : 'https://marketmix-backend.onrender.com/api');

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

async function loadDashboardCounts() {
  const ids = [
    'totalBuyersCount',
    'totalSellersCount',
    'totalProductsCount',
    'totalOrdersCount'
  ];

  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '—';
  });

  try {
    const response = await fetch(`${ADMIN_API_BASE}/admin/dashboard-stats`, {
      headers: getAdminAuthHeaders()
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      console.error('Admin dashboard stats request failed:', body?.message || response.statusText);
      return;
    }

    const data = body?.data || {};
    const totalBuyers = Number(data.totalBuyers) || 0;
    const totalSellers = Number(data.totalSellers) || 0;
    const totalProducts = Number(data.totalProducts) || 0;
    const totalOrders = Number(data.totalOrders) || 0;

    const mapping = {
      totalBuyersCount: totalBuyers,
      totalSellersCount: totalSellers,
      totalProductsCount: totalProducts,
      totalOrdersCount: totalOrders
    };

    Object.entries(mapping).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value.toLocaleString('en-NG');
    });
  } catch (err) {
    console.error('Error loading admin dashboard counts:', err);
  }
}

function renderDashboard() {
  const content = document.getElementById('content');
  if (!content) return;

  content.innerHTML = `
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">Dashboard</h1>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200" onclick="loadPage('buyers'); return false;">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 dark:text-gray-400 text-sm">Total Buyers</p>
              <p id="totalBuyersCount" class="text-3xl font-bold text-gray-900 dark:text-white mt-2">—</p>
            </div>
            <div class="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg p-3 text-2xl">
              <i class="fas fa-users"></i>
            </div>
          </div>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200" onclick="loadPage('sellers'); return false;">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 dark:text-gray-400 text-sm">Total Sellers</p>
              <p id="totalSellersCount" class="text-3xl font-bold text-gray-900 dark:text-white mt-2">—</p>
            </div>
            <div class="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-lg p-3 text-2xl">
              <i class="fas fa-store"></i>
            </div>
          </div>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200" onclick="loadPage('products'); return false;">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 dark:text-gray-400 text-sm">Total Products</p>
              <p id="totalProductsCount" class="text-3xl font-bold text-gray-900 dark:text-white mt-2">—</p>
            </div>
            <div class="bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 rounded-lg p-3 text-2xl">
              <i class="fas fa-box"></i>
            </div>
          </div>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200" onclick="loadPage('orders'); return false;">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 dark:text-gray-400 text-sm">Total Orders</p>
              <p id="totalOrdersCount" class="text-3xl font-bold text-gray-900 dark:text-white mt-2">—</p>
            </div>
            <div class="bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 rounded-lg p-3 text-2xl">
              <i class="fas fa-receipt"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  loadDashboardCounts();
}

function renderBuyers() {
  const content = document.getElementById('content');
  if (!content) return;

  content.innerHTML = `
    <div class="space-y-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Buyers</h1>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Manage registered buyers and review account statuses.</p>
        </div>
      </div>
      <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table class="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
          <thead class="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th class="px-4 py-3">ID</th>
              <th class="px-4 py-3">Name</th>
              <th class="px-4 py-3">Email</th>
              <th class="px-4 py-3">Phone</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 bg-white">
            ${dummyData.buyers.map(buyer => `
              <tr>
                <td class="px-4 py-3 font-medium text-slate-900">${buyer.id}</td>
                <td class="px-4 py-3">${buyer.name}</td>
                <td class="px-4 py-3">${buyer.email}</td>
                <td class="px-4 py-3">${buyer.phone}</td>
                <td class="px-4 py-3">${buyer.status}</td>
                <td class="px-4 py-3">${buyer.joinDate}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderSellers() {
  const content = document.getElementById('content');
  if (!content) return;

  content.innerHTML = `
    <div class="space-y-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Sellers</n          </h1>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Review sellers, shops, and verification status.</p>
        </div>
      </div>
      <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table class="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
          <thead class="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th class="px-4 py-3">ID</th>
              <th class="px-4 py-3">Store</th>
              <th class="px-4 py-3">Seller</th>
              <th class="px-4 py-3">Email</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 bg-white">
            ${dummyData.sellers.map(seller => `
              <tr>
                <td class="px-4 py-3 font-medium text-slate-900">${seller.id}</td>
                <td class="px-4 py-3">${seller.shopName}</td>
                <td class="px-4 py-3">${seller.sellerName}</td>
                <td class="px-4 py-3">${seller.email}</td>
                <td class="px-4 py-3">${seller.status}</td>
                <td class="px-4 py-3">${seller.joinDate}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderProducts() {
  const content = document.getElementById('content');
  if (!content) return;

  content.innerHTML = `
    <div class="space-y-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Products</h1>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Browse the current product catalog and stock status.</p>
        </div>
      </div>
      <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table class="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
          <thead class="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th class="px-4 py-3">ID</th>
              <th class="px-4 py-3">Name</th>
              <th class="px-4 py-3">Category</th>
              <th class="px-4 py-3">Seller</th>
              <th class="px-4 py-3">Price</th>
              <th class="px-4 py-3">Stock</th>
              <th class="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 bg-white">
            ${dummyData.products.map(product => `
              <tr>
                <td class="px-4 py-3 font-medium text-slate-900">${product.id}</td>
                <td class="px-4 py-3">${product.name}</td>
                <td class="px-4 py-3">${product.category}</td>
                <td class="px-4 py-3">${product.seller}</td>
                <td class="px-4 py-3">₦${product.price.toFixed(2)}</td>
                <td class="px-4 py-3">${product.stock}</td>
                <td class="px-4 py-3">${product.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderOrders() {
  const content = document.getElementById('content');
  if (!content) return;

  content.innerHTML = `
    <div class="space-y-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Orders</h1>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Review recent orders and track fulfillment status.</p>
        </div>
      </div>
      <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table class="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
          <thead class="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th class="px-4 py-3">Order ID</th>
              <th class="px-4 py-3">Buyer</th>
              <th class="px-4 py-3">Seller</th>
              <th class="px-4 py-3">Amount</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 bg-white">
            ${dummyData.orders.map(order => `
              <tr>
                <td class="px-4 py-3 font-medium text-slate-900">${order.id}</td>
                <td class="px-4 py-3">${order.buyer}</td>
                <td class="px-4 py-3">${order.seller}</td>
                <td class="px-4 py-3">₦${order.amount.toFixed(2)}</td>
                <td class="px-4 py-3">${order.status}</td>
                <td class="px-4 py-3">${order.date}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderCategories() {
  const content = document.getElementById('content');
  if (!content) return;

  content.innerHTML = `
    <div class="space-y-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Categories</h1>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Manage product categories and visibility.</p>
        </div>
      </div>
      <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table class="min-w-full divide-y divide-slate-200 text-sm text-slate-700">
          <thead class="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th class="px-4 py-3">Category ID</th>
              <th class="px-4 py-3">Name</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Products</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 bg-white">
            ${dummyData.categories.map(category => `
              <tr>
                <td class="px-4 py-3 font-medium text-slate-900">${category.id}</td>
                <td class="px-4 py-3">${category.name}</td>
                <td class="px-4 py-3">${category.status}</td>
                <td class="px-4 py-3">${category.products}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderReports() {
  const content = document.getElementById('content');
  if (!content) return;

  content.innerHTML = `
    <div class="space-y-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">View marketplace reports and analytics summaries.</p>
        </div>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm text-slate-600">Reports page stub loaded successfully.</p>
      </div>
    </div>
  `;
}

function renderReturns() {
  const content = document.getElementById('content');
  if (!content) return;

  content.innerHTML = `
    <div class="space-y-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Returns & Refunds</h1>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Manage return requests and refund cases.</p>
        </div>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm text-slate-600">Returns page stub loaded successfully.</p>
      </div>
    </div>
  `;
}

function renderAdminUsers() {
  const content = document.getElementById('content');
  if (!content) return;

  content.innerHTML = `
    <div class="space-y-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Admin Users</h1>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Manage admin users and permissions.</p>
        </div>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm text-slate-600">Admin users page stub loaded successfully.</p>
      </div>
    </div>
  `;
}

function renderSettings() {
  const content = document.getElementById('content');
  if (!content) return;

  content.innerHTML = `
    <div class="space-y-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Configure admin preferences and application settings.</p>
        </div>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm text-slate-600">Settings page stub loaded successfully.</p>
      </div>
    </div>
  `;
}

function renderProfile() {
  const content = document.getElementById('content');
  if (!content) return;

  content.innerHTML = `
    <div class="space-y-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Profile</h1>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">View and update your admin profile.</p>
        </div>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p class="text-sm text-slate-600">Profile page stub loaded successfully.</p>
      </div>
    </div>
  `;
}
