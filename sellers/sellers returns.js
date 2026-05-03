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
    purchase_date: new Date(Date.now() - 1.5*24*60*60*1000).toISOString(),
    evidence_submitted_at: new Date(Date.now() - 10*60*60*1000).toISOString(),
    messages: [
      { sender: 'buyer', text: 'I received the speaker with a broken casing.', timestamp: new Date(Date.now() - 10*60*60*1000).toISOString(), read: false, file: null },
      { sender: 'seller', text: 'I am sorry to hear that. Can you share a photo of the damage?', timestamp: new Date(Date.now() - 9*60*60*1000).toISOString(), read: true, file: null }
    ],
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
    purchase_date: new Date(Date.now() - 2*24*60*60*1000).toISOString(),
    evidence_submitted_at: new Date(Date.now() - 26*60*60*1000).toISOString(),
    messages: [
      { sender: 'buyer', text: 'The case looks cheap and not like the photos.', timestamp: new Date(Date.now() - 26*60*60*1000).toISOString(), read: false, file: null }
    ],
    date: '2024-06-22'
  },
  {
    id: 5,
    buyerName: 'Emma Gray',
    productName: 'Smartwatch Strap',
    orderId: 'ORD-12349',
    reason: 'Color Mismatch',
    notes: 'The strap color looks different from the product photo.',
    productImage: 'https://via.placeholder.com/200?text=Smartwatch+Strap',
    amount: 12.99,
    status: 'Pending',
    purchase_date: new Date(Date.now() - 3.5*24*60*60*1000).toISOString(),
    messages: [
      { sender: 'buyer', text: 'I received the wrong strap color.', timestamp: new Date(Date.now() - 3.5*24*60*60*1000).toISOString(), read: false, file: null }
    ],
    date: '2024-06-23'
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

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
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
    const now = Date.now();
    let chatBtnHtml = '';
    let chatDate = item.date;

    const pending = item.status.toLowerCase() === 'pending';
    const hasEvidence = !!item.evidence_submitted_at;

    if (pending && hasEvidence) {
      const evidenceTime = new Date(item.evidence_submitted_at).getTime();
      const expiryTime = evidenceTime + (2 * 24 * 60 * 60 * 1000);
      const timeLeft = expiryTime - now;
      const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      chatDate = formatDate(item.evidence_submitted_at);
      if (timeLeft > 0) {
        chatBtnHtml = `
          <button class="btn-chat" onclick="openChat(${item.id})">
            <i class="fas fa-comments"></i> Chat (${daysLeft}d ${hoursLeft}h)
          </button>
        `;
      } else {
        chatBtnHtml = `
          <button class="btn-chat" style="background: #ccc; cursor: not-allowed;" disabled>
            <i class="fas fa-comments"></i> Expired
          </button>
        `;
      }
    } else if (pending) {
      const purchaseTime = new Date(item.purchase_date).getTime();
      const expiryTime = purchaseTime + (5 * 24 * 60 * 60 * 1000);
      const timeLeft = expiryTime - now;
      const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      chatDate = formatDate(item.purchase_date);
      if (timeLeft > 0) {
        chatBtnHtml = `
          <button class="btn-chat" onclick="openChat(${item.id})">
            <i class="fas fa-comments"></i> Chat (${daysLeft}d ${hoursLeft}h)
          </button>
        `;
      } else {
        chatBtnHtml = `
          <button class="btn-chat" style="background: #ccc; cursor: not-allowed;" disabled>
            <i class="fas fa-comments"></i> Expired
          </button>
        `;
      }
    } else {
      chatBtnHtml = `
        <button class="btn-chat" style="background: #ccc; cursor: not-allowed;" disabled>
          <i class="fas fa-comments"></i> ${item.status}
        </button>
      `;
    }

    row.innerHTML = `
      <div class="col-buyer">${item.buyerName}</div>
      <div class="col-product">${item.productName}</div>
      <div class="col-order">${item.orderId}</div>
      <div class="col-amount">$${item.amount.toFixed(2)}</div>
      <div class="col-status"><span class="status-badge ${statusClass}">${item.status}</span></div>
      <div class="col-date">${chatDate}</div>
      <div class="col-action"><button class="btn-action" onclick="openModal(${item.id})">View</button></div>
      <div class="col-chat">${chatBtnHtml}</div>
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

// ──────────────────────────────────────────────────────────────────────
// CHAT FUNCTIONALITY
// ──────────────────────────────────────────────────────────────────────

let currentChatId = null;
let currentChatData = null;
let attachedFile = null;

// DOM Elements for Chat
const chatPanel = document.getElementById('chatPanel');
const chatOverlay = document.getElementById('chatOverlay');
const chatCloseBtn = document.getElementById('chatCloseBtn');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const chatFileInput = document.getElementById('chatFileInput');
const attachmentPreview = document.getElementById('attachmentPreview');

// Chat Storage Key
function getChatStorageKey(returnId) {
  return `mm_return_chat_${returnId}`;
}

// Open Chat Panel
function openChat(returnId) {
  const returnItem = returnsData.find(r => r.id === returnId);
  if (!returnItem) return;

  currentChatId = returnId;
  currentChatData = returnItem;

  // Update chat header
  document.getElementById('chatBuyerName').textContent = `Chat with ${returnItem.buyerName}`;
  document.getElementById('chatOrderId').textContent = `Order ID: ${returnItem.orderId}`;

  // Update resolution status
  const statusElement = document.getElementById('chatResolutionStatus');
  const statusClass = returnItem.status.toLowerCase();
  statusElement.className = `resolution-status ${statusClass}`;
  statusElement.innerHTML = `<i class="fas fa-circle"></i> ${returnItem.status}`;

  updateChatCountdown(returnItem);

  // Load and display chat history
  loadChatMessages(returnId);

  // Show chat panel with animation
  chatPanel.classList.add('active');
  chatOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Focus on input
  setTimeout(() => chatInput.focus(), 300);
}

// Close Chat Panel
function closeChat() {
  chatPanel.classList.remove('active');
  chatOverlay.classList.remove('active');
  document.body.style.overflow = 'auto';
  currentChatId = null;
  currentChatData = null;
  chatInput.value = '';
  removeAttachment();
}

// Load Chat Messages
function loadChatMessages(returnId) {
  const storageKey = getChatStorageKey(returnId);
  const savedMessages = JSON.parse(localStorage.getItem(storageKey) || '[]');
  const messages = savedMessages.length ? savedMessages : (currentChatData?.messages || []);

  chatMessages.innerHTML = '';

  if (messages.length === 0) {
    chatMessages.innerHTML = `
      <div class="chat-message system">
        <p><i class="fas fa-info-circle"></i> Chat opened for Order ${currentChatData.orderId}</p>
      </div>
    `;
    return;
  }

  messages.forEach((msg, idx) => {
    const msgEl = document.createElement('div');
    msgEl.className = `chat-message ${msg.sender === 'seller' ? 'seller' : msg.sender === 'buyer' ? 'buyer' : 'system'}`;

    const timestamp = new Date(msg.timestamp);
    const timeStr = timestamp.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });

    let content = `
      <div class="message-content">
        <p class="message-text">${escapeHtml(msg.text)}</p>
    `;

    if (msg.file) {
      if (msg.file.type === 'image') {
        content += `<img src="${msg.file.data}" class="message-image" alt="Uploaded image" />`;
      } else if (msg.file.type === 'video') {
        content += `<video controls class="message-video"><source src="${msg.file.data}" type="video/mp4">Your browser does not support this video.</video>`;
      } else {
        content += `<a href="${msg.file.data}" class="message-file" download><i class="fas fa-file"></i> ${escapeHtml(msg.file.name)}</a>`;
      }
    }

    content += `
        <span class="message-time">${timeStr}</span>
        <span class="read-status" title="${msg.read ? 'Read' : 'Sent'}">
          ${msg.read ? '<i class="fas fa-check-double"></i>' : '<i class="fas fa-check"></i>'}
        </span>
      </div>
    `;

    msgEl.innerHTML = content;
    chatMessages.appendChild(msgEl);
  });

  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Mark messages as read
  setTimeout(() => markMessagesAsRead(returnId), 500);
}

function updateChatCountdown(returnItem) {
  const countdownBanner = document.getElementById('chatCountdownBanner');
  if (!returnItem) {
    countdownBanner.classList.remove('active');
    return;
  }

  if (returnItem.evidence_submitted_at) {
    const evidenceTime = new Date(returnItem.evidence_submitted_at).getTime();
    const decisionTime = evidenceTime + (42 * 60 * 60 * 1000);
    const timeLeft = decisionTime - Date.now();

    if (timeLeft > 0) {
      const hLeft = Math.floor(timeLeft / (1000 * 60 * 60));
      const mLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      countdownBanner.textContent = `The seller and buyer have ${hLeft}h ${mLeft}m to resolve the issue before MarketMix takes a decision.`;
      countdownBanner.classList.add('active');
    } else {
      countdownBanner.textContent = `Time limit exceeded. MarketMix is reviewing this case.`;
      countdownBanner.classList.add('active');
    }
  } else {
    countdownBanner.textContent = 'Awaiting buyer evidence to start the 42-hour resolution countdown.';
    countdownBanner.classList.add('active');
  }
}

// Mark Messages as Read
function markMessagesAsRead(returnId) {
  const storageKey = getChatStorageKey(returnId);
  const messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
  let updated = false;

  messages.forEach(msg => {
    if (msg.sender === 'buyer' && !msg.read) {
      msg.read = true;
      updated = true;
    }
  });

  if (updated) {
    localStorage.setItem(storageKey, JSON.stringify(messages));
    loadChatMessages(returnId);
  }
}

// Send Chat Message
function sendChatMessage() {
  const text = chatInput.value.trim();
  if (!text && !attachedFile) return;
  if (!currentChatId) return;

  const storageKey = getChatStorageKey(currentChatId);
  const messages = JSON.parse(localStorage.getItem(storageKey) || '[]');

  const message = {
    id: Date.now(),
    sender: 'seller',
    text: text,
    timestamp: new Date().toISOString(),
    read: false,
    file: attachedFile ? { ...attachedFile } : null
  };

  messages.push(message);
  localStorage.setItem(storageKey, JSON.stringify(messages));

  // Clear input
  chatInput.value = '';
  removeAttachment();

  // Reload messages
  loadChatMessages(currentChatId);

  // Simulate buyer response after 3 seconds (for demo)
  if (Math.random() > 0.5) {
    setTimeout(() => {
      simulateBuyerResponse(currentChatId);
    }, 3000);
  }
}

// Simulate Buyer Response (for demo)
function simulateBuyerResponse(returnId) {
  if (currentChatId !== returnId) return; // Only if chat is still open

  const responses = [
    "Thanks for your help!",
    "When can I expect the replacement?",
    "I've uploaded the proof images.",
    "This issue needs to be resolved ASAP!",
    "Okay, I'll return the item.",
    "What's the return process?"
  ];

  const storageKey = getChatStorageKey(returnId);
  const messages = JSON.parse(localStorage.getItem(storageKey) || '[]');

  const message = {
    id: Date.now(),
    sender: 'buyer',
    text: responses[Math.floor(Math.random() * responses.length)],
    timestamp: new Date().toISOString(),
    read: false,
    file: null
  };

  messages.push(message);
  localStorage.setItem(storageKey, JSON.stringify(messages));
  loadChatMessages(returnId);
}

// Handle File Upload
chatFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    attachedFile = {
      name: file.name,
      type: isImage ? 'image' : isVideo ? 'video' : 'file',
      data: event.target.result
    };

    const previewContent = document.getElementById('previewContent');
    if (!previewContent) return;
    previewContent.innerHTML = '';

    if (isImage) {
      const img = document.createElement('img');
      img.id = 'previewImage';
      img.src = event.target.result;
      img.alt = 'Attachment preview';
      previewContent.appendChild(img);
    } else if (isVideo) {
      const video = document.createElement('video');
      video.id = 'previewVideo';
      video.src = event.target.result;
      video.controls = true;
      previewContent.appendChild(video);
    } else {
      const fileLabel = document.createElement('div');
      fileLabel.className = 'preview-file-label';
      fileLabel.textContent = file.name;
      previewContent.appendChild(fileLabel);
    }

    attachmentPreview.style.display = 'flex';
  };
  reader.readAsDataURL(file);
});

// Remove Attachment
function removeAttachment() {
  attachedFile = null;
  attachmentPreview.style.display = 'none';
  chatFileInput.value = '';
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Event Listeners
chatCloseBtn.addEventListener('click', closeChat);
chatOverlay.addEventListener('click', closeChat);
sendChatBtn.addEventListener('click', sendChatMessage);

// Enable send on Enter key
chatInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
});

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  loadProfile();
  renderTable();
});

// Send on Ctrl+Enter or Cmd+Enter
chatInput.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    sendChatMessage();
  }
}

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
