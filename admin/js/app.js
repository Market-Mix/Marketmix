// Global state and utility functions
let currentPage = 'dashboard';
let currentAction = null;
let sidebarOpen = false;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  loadPage('dashboard');
  setupEventListeners();
  setupMobileSidebar();
});

function setupMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const navLinks = document.querySelectorAll('.nav-link');
  
  // Close sidebar when clicking overlay
  if (overlay) {
    overlay.addEventListener('click', closeSidebar);
  }
  
  // Close sidebar when clicking nav link
  navLinks.forEach(link => {
    link.addEventListener('click', closeSidebar);
  });
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  
  if (sidebarOpen) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

function openSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  
  sidebar.classList.add('open');
  if (overlay) overlay.classList.add('active');
  document.body.classList.add('sidebar-open');
  sidebarOpen = true;
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  
  sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
  document.body.classList.remove('sidebar-open');
  sidebarOpen = false;
}

function toggleProfileDropdown() {
  document.getElementById('profileDropdown').classList.toggle('hidden');
}

function handleLogout() {
  // Clear session
  localStorage.removeItem('adminSession');
  localStorage.removeItem('adminUsername');
  
  // Show logout message
  showToast('Logged out successfully', 'success');
  
  // Redirect to login page after a short delay
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 500);
}

function loadPage(page) {
  currentPage = page;
  
  // Update active nav link
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('bg-blue-50', 'dark:bg-gray-700', 'border-blue-600', 'text-blue-600', 'dark:text-blue-400');
    link.classList.add('text-gray-700', 'dark:text-gray-200');
  });
  
  // Find and highlight the active link
  const activeLink = Array.from(document.querySelectorAll('.nav-link')).find(link => 
    link.textContent.toLowerCase().includes(page.replace('-', ' '))
  );
  if (activeLink) {
    activeLink.classList.add('bg-blue-50', 'dark:bg-gray-700', 'border-blue-600', 'text-blue-600', 'dark:text-blue-400');
  }
  
  // Load page content
  const pages = {
    'dashboard': renderDashboard,
    'buyers': renderBuyers,
    'sellers': renderSellers,
    'products': renderProducts,
    'orders': renderOrders,
    'categories': renderCategories,
    'reports': renderReports,
    'transactions': renderTransactions,
    'returns': renderReturns,
    'admin-users': renderAdminUsers,
    'settings': renderSettings,
    'profile': renderProfile
  };
  
  if (pages[page]) {
    pages[page]();
  } else {
    console.error('Page not found:', page);
    document.getElementById('content').innerHTML = '<p>Page not found</p>';
  }
}

function setupEventListeners() {
  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.relative')) {
      document.getElementById('profileDropdown').classList.add('hidden');
    }
  });
}

function openModal(title, message, callback) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalMessage').textContent = message;
    document.getElementById('confirmModal').classList.remove('hidden');
  currentAction = callback;
}

function closeModal() {
  document.getElementById('confirmModal').classList.remove('active');
    document.getElementById('confirmModal').classList.add('hidden');
  currentAction = null;
}

function confirmAction() {
  if (currentAction) {
    currentAction();
  }
  closeModal();
}

function showToast(message, type = 'success') {
  const bg = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  const toast = document.createElement('div');
  toast.className = `toast fixed bottom-6 right-6 ${bg} text-white px-6 py-3 rounded shadow-lg`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.remove(), 3000);
}

// Data management
const dummyData = {
  buyers: [
    { id: 'B001', name: 'John Doe', email: 'john@example.com', phone: '+1234567890', status: 'Active', joinDate: '2024-01-15' },
    { id: 'B002', name: 'Jane Smith', email: 'jane@example.com', phone: '+0987654321', status: 'Active', joinDate: '2024-02-20' },
    { id: 'B003', name: 'Bob Wilson', email: 'bob@example.com', phone: '+1112223333', status: 'Suspended', joinDate: '2024-03-10' },
    { id: 'B004', name: 'Alice Brown', email: 'alice@example.com', phone: '+4445556666', status: 'Active', joinDate: '2024-04-05' },
    { id: 'B005', name: 'Charlie Davis', email: 'charlie@example.com', phone: '+7778889999', status: 'Active', joinDate: '2024-05-12' }
  ],
  
  sellers: [
    { id: 'S001', shopName: 'TechHub', sellerName: 'Mike Johnson', email: 'mike@example.com', phone: '+1234567890', status: 'Approved', joinDate: '2024-01-20', fullName: 'Mike Johnson', dateOfBirth: '1990-05-15', country: 'United States', idType: 'Passport', idNumber: 'P123456789', residentialAddress: '123 Main Street, New York, NY 10001, USA', idDocumentUrl: 'https://via.placeholder.com/300x400?text=ID+Document', proofOfAddressUrl: 'https://via.placeholder.com/300x400?text=Proof+of+Address' },
    { id: 'S002', shopName: 'Fashion Pro', sellerName: 'Emma Wilson', email: 'emma@example.com', phone: '+0987654321', status: 'Pending', joinDate: '2024-02-15', fullName: 'Emma Wilson', dateOfBirth: '1992-08-22', country: 'Canada', idType: 'Driver\'s License', idNumber: 'DL987654321', residentialAddress: '456 Oak Avenue, Toronto, ON M5H 2R2, Canada', idDocumentUrl: 'https://via.placeholder.com/300x400?text=ID+Document', proofOfAddressUrl: 'https://via.placeholder.com/300x400?text=Proof+of+Address' },
    { id: 'S003', shopName: 'Home Essentials', sellerName: 'David Lee', email: 'david@example.com', phone: '+1112223333', status: 'Approved', joinDate: '2024-03-10', fullName: 'David Lee', dateOfBirth: '1988-11-30', country: 'United States', idType: 'Passport', idNumber: 'P456789012', residentialAddress: '789 Pine Road, Los Angeles, CA 90001, USA', idDocumentUrl: 'https://via.placeholder.com/300x400?text=ID+Document', proofOfAddressUrl: 'https://via.placeholder.com/300x400?text=Proof+of+Address' },
    { id: 'S004', shopName: 'Sports Store', sellerName: 'Sarah Ahmed', email: 'sarah@example.com', phone: '+4445556666', status: 'Approved', joinDate: '2024-04-22', fullName: 'Sarah Ahmed', dateOfBirth: '1995-03-10', country: 'United Kingdom', idType: 'National ID', idNumber: 'NID345678901', residentialAddress: '321 Park Lane, London, UK SW1A 1AA', idDocumentUrl: 'https://via.placeholder.com/300x400?text=ID+Document', proofOfAddressUrl: 'https://via.placeholder.com/300x400?text=Proof+of+Address' }
  ],
  
  products: [
    { id: 'P001', name: 'Wireless Headphones', category: 'Electronics', seller: 'TechHub', price: 79.99, stock: 45, status: 'Active' },
    { id: 'P002', name: 'Summer T-Shirt', category: 'Fashion', seller: 'Fashion Pro', price: 24.99, stock: 120, status: 'Active' },
    { id: 'P003', name: 'Coffee Maker', category: 'Home', seller: 'Home Essentials', price: 89.99, stock: 12, status: 'Active' },
    { id: 'P004', name: 'Running Shoes', category: 'Sports', seller: 'Sports Store', price: 129.99, stock: 3, status: 'Low Stock' },
    { id: 'P005', name: 'Desk Lamp', category: 'Home', seller: 'Home Essentials', price: 34.99, stock: 0, status: 'Out of Stock' }
  ],
  
  orders: [
    { id: 'ORD001', buyer: 'John Doe', seller: 'TechHub', amount: 79.99, status: 'Delivered', date: '2024-06-01' },
    { id: 'ORD002', buyer: 'Jane Smith', seller: 'Fashion Pro', amount: 74.97, status: 'Shipped', date: '2024-06-05' },
    { id: 'ORD003', buyer: 'Bob Wilson', seller: 'Home Essentials', amount: 124.98, status: 'Processing', date: '2024-06-10' },
    { id: 'ORD004', buyer: 'Alice Brown', seller: 'Sports Store', amount: 129.99, status: 'Pending', date: '2024-06-12' }
  ],
  
  categories: [
    { id: 'CAT001', name: 'Electronics', status: 'Active', products: 45 },
    { id: 'CAT002', name: 'Fashion', status: 'Active', products: 230 },
    { id: 'CAT003', name: 'Home & Garden', status: 'Active', products: 180 },
    { id: 'CAT004', name: 'Sports', status: 'Inactive', products: 65 }
  ],
  
  returns: [
    { id: 'RET001', orderId: 'ORD001', buyer: 'John Doe', seller: 'TechHub', amount: 79.99, status: 'Pending', date: '2024-06-15', productName: 'Wireless Headphones', productImage: 'https://via.placeholder.com/150x150?text=Headphones', reason: 'Product defective after 3 days of use', notes: 'Left ear not functioning, tried resetting multiple times', returnDate: '2024-06-15' },
    { id: 'RET002', orderId: 'ORD002', buyer: 'Jane Smith', seller: 'Fashion Pro', amount: 24.99, status: 'Approved', date: '2024-06-18', productName: 'Summer T-Shirt', productImage: 'https://via.placeholder.com/150x150?text=T-Shirt', reason: 'Wrong size received', notes: 'Ordered Medium but received Small', returnDate: '2024-06-18' },
    { id: 'RET003', orderId: 'ORD003', buyer: 'Bob Wilson', seller: 'Home Essentials', amount: 89.99, status: 'Pending', date: '2024-06-20', productName: 'Coffee Maker', productImage: 'https://via.placeholder.com/150x150?text=Coffee+Maker', reason: 'Not working as advertised', notes: 'Machine keeps leaking water from the bottom', returnDate: '2024-06-20' },
    { id: 'RET004', orderId: 'ORD004', buyer: 'Alice Brown', seller: 'Sports Store', amount: 129.99, status: 'Denied', date: '2024-06-22', productName: 'Running Shoes', productImage: 'https://via.placeholder.com/150x150?text=Running+Shoes', reason: 'Changed mind about color', notes: 'Shoes look different in person, want different color variant', returnDate: '2024-06-22' }
  ],
  
  withdrawals: [
    { id: 'WR001', seller: 'TechHub', amount: 1500.00, status: 'Pending', date: '2024-06-15', bank: 'Bank of America' },
    { id: 'WR002', seller: 'Fashion Pro', amount: 2300.50, status: 'Approved', date: '2024-06-10', bank: 'Chase Bank' },
    { id: 'WR003', seller: 'Home Essentials', amount: 890.00, status: 'Pending', date: '2024-06-18', bank: 'Wells Fargo' },
    { id: 'WR004', seller: 'Sports Store', amount: 3200.75, status: 'Pending', date: '2024-06-20', bank: 'Bank of America' },
    { id: 'WR005', seller: 'TechHub', amount: 1100.00, status: 'Rejected', date: '2024-06-05', bank: 'Chase Bank' }
  ],
  
  adminUsers: [
    { id: 'AU001', name: 'Super Admin', email: 'admin@marketmix.com', role: 'Super Admin', status: 'Active', joinDate: '2024-01-01' },
    { id: 'AU002', name: 'Support Manager', email: 'support@marketmix.com', role: 'Support', status: 'Active', joinDate: '2024-02-15' }
  ]
};

window.dummyData = dummyData;

// Table rendering helper
function renderTable(columns, data, actions = []) {
  // columns: array of display labels (e.g. ['ID','Name','Email'])
  // data: array of objects (may contain more fields)
  function mapLabelToKey(label, row) {
    const l = label.toLowerCase().replace(/\s+/g, '');
    const candidates = {
      id: ['id', 'ID'],
      name: ['name', 'fullName', 'fullname'],
      shopname: ['shopName', 'shopname', 'shop'],
      sellername: ['sellerName', 'sellername', 'seller'],
      email: ['email', 'emailAddress', 'emailaddress'],
      phone: ['phone', 'phoneNumber', 'phonenumber', 'contact'],
      status: ['status', 'state'],
      joindate: ['joinDate', 'joinDate', 'joined', 'createdAt', 'createdat'],
      category: ['category'],
      seller: ['seller'],
      price: ['price','amount'],
      stock: ['stock','inventory']
    };

    // direct mapping from label text
    if (candidates[l]) {
      for (const key of candidates[l]) if (key in row) return key;
    }

    // try simple heuristics
    for (const k of Object.keys(row)) {
      const kn = k.toLowerCase();
      if (kn === l || kn.includes(l) || l.includes(kn)) return k;
    }

    // fallback to first property
    return Object.keys(row)[0];
  }

  let html = `
    <div class="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
      <table class="w-full">
        <thead class="bg-gray-100 dark:bg-gray-700">
          <tr>
  `;

  columns.forEach(col => {
    html += `<th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase">${col}</th>`;
  });

  if (actions.length > 0) {
    html += `<th class="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase">Actions</th>`;
  }

  html += `</tr></thead><tbody>`;

  data.forEach((row, idx) => {
    const bgClass = idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700';
    html += `<tr class="${bgClass} border-b border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-600">`;

    // for each column, pick the most likely key from the row
    columns.forEach(col => {
      const key = mapLabelToKey(col, row);
      let val = row[key];
      let displayVal = val == null ? '' : val;

      // format status badges
      if (typeof displayVal === 'string') {
        if (['Active','Approved','Delivered'].includes(displayVal)) {
          displayVal = `<span class="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">${displayVal}</span>`;
        } else if (['Pending','Processing','Shipped'].includes(displayVal)) {
          displayVal = `<span class="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">${displayVal}</span>`;
        } else if (['Suspended','Inactive','Out of Stock'].includes(displayVal)) {
          displayVal = `<span class="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">${displayVal}</span>`;
        } else if (displayVal === 'Low Stock') {
          displayVal = `<span class="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">Low Stock</span>`;
        }
      }

      html += `<td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">${displayVal}</td>`;
    });

    if (actions.length > 0) {
      html += `<td class="px-6 py-4 text-sm"><div class="flex gap-2">`;
      actions.forEach(action => {
        html += `<button onclick="${action.callback}('${row.id}')" class="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">${action.label}</button>`;
      });
      html += `</div></td>`;
    }

    html += `</tr>`;
  });

  html += `</tbody></table></div>`;
  return html;
}

// Seller actions: approve, toggle status, delete
function approveSeller(id) {
  const s = dummyData.sellers.find(x => x.id === id);
  if (!s) return showToast('Seller not found', 'error');
  s.status = 'Approved';
  showToast('Seller approved');
  renderSellers();
}

function toggleSellerStatus(id) {
  const s = dummyData.sellers.find(x => x.id === id);
  if (!s) return showToast('Seller not found', 'error');
  s.status = s.status === 'Approved' ? 'Suspended' : 'Approved';
  showToast(`Seller ${s.status === 'Approved' ? 'activated' : 'suspended'}`);
  // if currently on details page for this seller, refresh
  if (currentPage === 'sellers') renderSellers(); else if (typeof viewSeller === 'function') try { viewSeller(id); } catch(e){}
}

function deleteSeller(id) {
  const idx = dummyData.sellers.findIndex(x => x.id === id);
  if (idx === -1) return showToast('Seller not found', 'error');
  dummyData.sellers.splice(idx, 1);
  showToast('Seller deleted');
  renderSellers();
}

// Buyer actions: toggle status, delete
function toggleBuyerStatus(id) {
  const b = dummyData.buyers.find(x => x.id === id);
  if (!b) return showToast('Buyer not found', 'error');
  b.status = b.status === 'Active' ? 'Suspended' : 'Active';
  showToast(`Buyer ${b.status === 'Active' ? 'activated' : 'suspended'}`);
  if (currentPage === 'buyers') renderBuyers(); else if (typeof viewBuyer === 'function') try { viewBuyer(id); } catch(e){}
}

function deleteBuyer(id) {
  const idx = dummyData.buyers.findIndex(x => x.id === id);
  if (idx === -1) return showToast('Buyer not found', 'error');
  dummyData.buyers.splice(idx, 1);
  showToast('Buyer deleted');
  renderBuyers();
}

// Card component
function renderCard(title, value, icon, color = 'blue') {
  const colors = {
    'blue': 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
    'green': 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400',
    'red': 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400',
    'orange': 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400'
  };
  
  return `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-gray-600 dark:text-gray-400 text-sm">${title}</p>
          <p class="text-3xl font-bold text-gray-900 dark:text-white mt-2">${value}</p>
        </div>
        <div class="${colors[color]} rounded-lg p-3 text-2xl">
          <i class="fas fa-${icon}"></i>
        </div>
      </div>
    </div>
  `;
}

// Password change modal functions
function openPasswordModal() {
  document.getElementById('passwordModal').classList.remove('hidden');
  document.getElementById('currentPass').value = '';
  document.getElementById('newPass').value = '';
  document.getElementById('confirmPass').value = '';
}

function closePasswordModal() {
  document.getElementById('passwordModal').classList.add('hidden');
}

function savePassword() {
  const currentPass = document.getElementById('currentPass').value;
  const newPass = document.getElementById('newPass').value;
  const confirmPass = document.getElementById('confirmPass').value;
  
  // Basic validation
  if (!currentPass || !newPass || !confirmPass) {
    showToast('Please fill in all fields', 'error');
    return;
  }
  
  if (newPass !== confirmPass) {
    showToast('New passwords do not match', 'error');
    return;
  }
  
  if (newPass.length < 6) {
    showToast('Password must be at least 6 characters', 'error');
    return;
  }
  
  // Simulate validation (in real app, verify with backend)
  if (currentPass !== 'admin123') {
    showToast('Current password is incorrect', 'error');
    return;
  }
  
  // Update password (in real app, send to backend)
  showToast('Password changed successfully', 'success');
  closePasswordModal();
}

// Returns & Refunds Functions
function getAdminReturnToken() {
  if (window.ADMIN_AUTH_TOKEN) return window.ADMIN_AUTH_TOKEN;

  const storedToken = localStorage.getItem('adminToken');
  if (storedToken) return storedToken;

  const sessionValue = localStorage.getItem('adminSession');
  if (sessionValue) {
    try {
      const session = JSON.parse(sessionValue);
      return session?.token || session?.accessToken || session?.authToken || session?.jwt || session?.user?.token || '';
    } catch (err) {
      // ignore invalid session value
    }
  }

  return localStorage.getItem('token') || '';
}

async function approveReturn(id) {
  const token = getAdminReturnToken();
  if (!token) {
    showToast('Admin auth token missing. Cannot approve refund.', 'error');
    return;
  }

  try {
    const response = await fetch(`${window.ADMIN_API_BASE || 'https://marketmix-backend.onrender.com/api'}/admin/refunds/${id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(body?.message || `Unable to approve refund ${id}`);
    }

    showToast('Return request approved successfully', 'success');
    loadPage('returns');
  } catch (err) {
    showToast(err.message || 'Failed to approve refund', 'error');
  }
}

async function denyReturn(id) {
  const token = getAdminReturnToken();
  if (!token) {
    showToast('Admin auth token missing. Cannot reject refund.', 'error');
    return;
  }

  try {
    const response = await fetch(`${window.ADMIN_API_BASE || 'https://marketmix-backend.onrender.com/api'}/admin/refunds/${id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(body?.message || `Unable to reject refund ${id}`);
    }

    showToast('Return request denied successfully', 'success');
    loadPage('returns');
  } catch (err) {
    showToast(err.message || 'Failed to reject refund', 'error');
  }
}

function deleteReturn(id) {
  showToast('Delete action is not supported for backend refund cases.', 'error');
}

// Category Functions
function toggleCategoryStatus(id) {
  const category = dummyData.categories.find(c => c.id === id);
  if (category) {
    category.status = category.status === 'Active' ? 'Inactive' : 'Active';
    showToast(`Category ${category.status === 'Active' ? 'activated' : 'deactivated'} successfully`, 'success');
    renderCategories();
  }
}

function deleteCategory(id) {
  const index = dummyData.categories.findIndex(c => c.id === id);
  if (index > -1) {
    dummyData.categories.splice(index, 1);
    showToast('Category deleted successfully', 'success');
    renderCategories();
  }
}

// Transaction Functions
function approveWithdrawal(id) {
  const withdrawal = dummyData.withdrawals.find(w => w.id === id);
  if (withdrawal) {
    withdrawal.status = 'Approved';
    showToast('Withdrawal request approved successfully', 'success');
    renderTransactions();
  }
}

// Admin Users Functions
let currentEditingAdminId = null;

function openAddAdminUserModal() {
  currentEditingAdminId = null;
  document.getElementById('adminUserTitle').textContent = 'Add Admin User';
  document.getElementById('adminUserBtn').textContent = 'Add';
  document.getElementById('adminUserName').value = '';
  document.getElementById('adminUserEmail').value = '';
  document.getElementById('adminUserRole').value = 'Super Admin';
  document.getElementById('adminUserModal').classList.remove('hidden');
}

function openEditAdminUserModal(id) {
  const admin = dummyData.adminUsers.find(a => a.id === id);
  if (admin) {
    currentEditingAdminId = id;
    document.getElementById('adminUserTitle').textContent = 'Edit Admin User';
    document.getElementById('adminUserBtn').textContent = 'Update';
    document.getElementById('adminUserName').value = admin.name;
    document.getElementById('adminUserEmail').value = admin.email;
    document.getElementById('adminUserRole').value = admin.role;
    document.getElementById('adminUserModal').classList.remove('hidden');
  }
}

function closeAdminUserModal() {
  document.getElementById('adminUserModal').classList.add('hidden');
  currentEditingAdminId = null;
}

function saveAdminUser() {
  const name = document.getElementById('adminUserName').value;
  const email = document.getElementById('adminUserEmail').value;
  const role = document.getElementById('adminUserRole').value;
  
  if (!name || !email || !role) {
    showToast('Please fill in all fields', 'error');
    return;
  }
  
  if (!email.includes('@')) {
    showToast('Please enter a valid email', 'error');
    return;
  }
  
  if (currentEditingAdminId) {
    // Edit existing admin
    const admin = dummyData.adminUsers.find(a => a.id === currentEditingAdminId);
    if (admin) {
      admin.name = name;
      admin.email = email;
      admin.role = role;
      showToast('Admin user updated successfully', 'success');
    }
  } else {
    // Add new admin
    const newId = 'AU' + (dummyData.adminUsers.length + 1).toString().padStart(3, '0');
    dummyData.adminUsers.push({
      id: newId,
      name: name,
      email: email,
      role: role,
      status: 'Active',
      joinDate: new Date().toISOString().split('T')[0]
    });
    showToast('Admin user added successfully', 'success');
  }
  
  closeAdminUserModal();
  renderAdminUsers();
}
