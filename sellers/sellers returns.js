// Sample return data
const returnsData = [
  {
    id: 1,
    buyerName: 'John Doe',
    productName: 'Wireless Headphones',
    orderId: 'ORD-12345',
    reason: 'Received Damaged',
    notes: 'The left earphone is not working and there are visible cracks on the charging case.',
    productImage: 'https://via.placeholder.com/200?text=Wireless+Headphones',
    amount: 89.99,
    status: 'Pending',
    date: '2024-06-15'
  },
  {
    id: 2,
    buyerName: 'Jane Smith',
    productName: 'Bluetooth Speaker',
    orderId: 'ORD-12346',
    reason: 'Wrong Item Delivered',
    notes: 'Ordered black speaker but received silver color.',
    productImage: 'https://via.placeholder.com/200?text=Bluetooth+Speaker',
    amount: 49.99,
    status: 'Approved',
    date: '2024-06-18'
  },
  {
    id: 3,
    buyerName: 'Bob Wilson',
    productName: 'USB-C Cable',
    orderId: 'ORD-12347',
    reason: 'Changed My Mind',
    notes: 'Item is unused and in original packaging. Request denied as per return policy.',
    productImage: 'https://via.placeholder.com/200?text=USB-C+Cable',
    amount: 15.99,
    status: 'Denied',
    date: '2024-06-20'
  },
  {
    id: 4,
    buyerName: 'Alice Brown',
    productName: 'Phone Case',
    orderId: 'ORD-12348',
    reason: 'Item Not as Described',
    notes: 'The product quality is much lower than shown in the product image.',
    productImage: 'https://via.placeholder.com/200?text=Phone+Case',
    amount: 24.99,
    status: 'Pending',
    date: '2024-06-22'
  }
];

// API Constants
const API_BASE = 'https://marketmix-backend.onrender.com/api';

// Auth helpers
function getToken() {
  return localStorage.getItem('token') || '';
}

function authHeaders() {
  return {
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json'
  };
}

// API Fetch
async function apiFetch(path, opts = {}) {
  opts.headers = { ...authHeaders(), ...(opts.headers || {}) };
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (res.status === 401) {
    handleLogout();
    throw new Error('Unauthorized');
  }
  return res.json();
}

// Profile Image
function renderProfileImage(profile) {
  const img = document.getElementById('sellerProfileImage');
  if (!img) return;
  const logo = profile?.profile?.storeLogo;
  if (logo) {
    img.src = logo;
    img.onerror = () => {
      img.src = '';
    };
  }
}

// Logout
async function handleLogout() {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: authHeaders(),
    });
  } catch (_) {
    /* ignore network errors on logout */
  }
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

// Load Profile
async function loadProfile() {
  try {
    const data = await apiFetch('/seller/profile');
    const profile = data?.data?.seller;
    if (profile) {
      renderProfileImage(profile);
    }
  } catch (err) {
    console.error('Error loading profile:', err);
  }
}

let currentReturnId = null;

// DOM Elements
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const returnsTableBody = document.getElementById('returnsTableBody');
const modalBackdrop = document.getElementById('modalBackdrop');
const returnModal = document.getElementById('returnModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const navbarToggler = document.getElementById('navbar-toggler');
const offcanvasMenu = document.getElementById('offcanvasMenu');
const offcanvasClose = document.getElementById('offcanvasClose');

// Profile Dropdown
function toggleProfileDropdown() {
  const dropdown = document.getElementById('profileDropdown');
  if (dropdown) {
    dropdown.style.display = dropdown.style.display === 'flex' ? 'none' : 'flex';
  }
}

window.toggleProfileDropdown = toggleProfileDropdown;

// Navbar Toggle
if (navbarToggler) {
  navbarToggler.addEventListener('click', () => {
    offcanvasMenu.style.right = '0';
  });
}

if (offcanvasClose) {
  offcanvasClose.addEventListener('click', () => {
    offcanvasMenu.style.right = '-300px';
  });
}

// Render Table
function renderTable(data = returnsData) {
  returnsTableBody.innerHTML = '';
  
  data.forEach(item => {
    const row = document.createElement('div');
    row.className = 'table-row';
    
    const statusClass = item.status.toLowerCase();
    
    row.innerHTML = `
      <div class="col-buyer">${item.buyerName}</div>
      <div class="col-product">${item.productName}</div>
      <div class="col-order">${item.orderId}</div>
      <div class="col-amount">$${item.amount.toFixed(2)}</div>
      <div class="col-status"><span class="status-badge ${statusClass}">${item.status}</span></div>
      <div class="col-date">${item.date}</div>
      <div class="col-action"><button class="btn-action" onclick="openModal(${item.id})">View</button></div>
    `;
    
    returnsTableBody.appendChild(row);
  });
}

// Open Modal
function openModal(returnId) {
  const returnItem = returnsData.find(r => r.id === returnId);
  if (!returnItem) return;

  currentReturnId = returnId;

  // Populate modal
  document.getElementById('modalBuyerName').textContent = returnItem.buyerName;
  document.getElementById('modalProductName').textContent = returnItem.productName;
  document.getElementById('modalOrderId').textContent = returnItem.orderId;
  document.getElementById('modalAmount').textContent = `$${returnItem.amount.toFixed(2)}`;
  document.getElementById('modalReason').textContent = returnItem.reason;
  document.getElementById('modalNotes').textContent = returnItem.notes || 'No additional notes';
  document.getElementById('modalProductImage').src = returnItem.productImage;
  
  const statusElement = document.getElementById('modalStatus');
  statusElement.textContent = returnItem.status;
  statusElement.className = `status-badge ${returnItem.status.toLowerCase()}`;

  // Show admin decision status
  const adminDecisionElement = document.getElementById('adminDecision');
  adminDecisionElement.textContent = returnItem.status;
  adminDecisionElement.className = `status-badge ${returnItem.status.toLowerCase()}`;

  // Show modal
  modalBackdrop.classList.add('active');
  returnModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Close Modal
function closeModal() {
  modalBackdrop.classList.remove('active');
  returnModal.classList.remove('active');
  document.body.style.overflow = 'auto';
  currentReturnId = null;
}

// Close modal when clicking backdrop
modalBackdrop.addEventListener('click', closeModal);

// Close button click
closeModalBtn.addEventListener('click', closeModal);

// Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
  }
});

// Filter and Search
function filterTable() {
  const searchTerm = searchInput.value.toLowerCase();
  const statusTerm = statusFilter.value.toLowerCase();

  const filtered = returnsData.filter(item => {
    const matchesSearch = item.buyerName.toLowerCase().includes(searchTerm) || 
                         item.orderId.toLowerCase().includes(searchTerm);
    const matchesStatus = statusTerm === 'all' || item.status.toLowerCase() === statusTerm;
    
    return matchesSearch && matchesStatus;
  });

  renderTable(filtered);
}

searchInput.addEventListener('input', filterTable);
statusFilter.addEventListener('change', filterTable);

// Notification
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()">&times;</button>
  `;
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    background: ${type === 'success' ? '#28a745' : '#17a2b8'};
    color: white;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadProfile();
  renderTable();
});
