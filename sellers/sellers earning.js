/**
 * MarketMix Seller Earnings Integration
 */

const API_BASE = 'https://marketmix-backend.onrender.com/api';
let earningsChartInstance = null;
let _prevEarningsSummary = null;
let txPage = 1;
let txLimit = 20;

// Auth helpers
function getToken() {
    // Prefer seller-scoped token to avoid buyer session overwrite
    return localStorage.getItem('seller_token') || localStorage.getItem('token') || '';
}
const getActiveStoreId = () => (
    window.StoreManager?.getActiveStoreId?.()
    || window.StoreManager?.getActiveStore?.()?.id
    || ''
);
const requireActiveStore = async () => {
    if (window.StoreManager?.requireActiveStore) {
        return window.StoreManager.requireActiveStore();
    }
    return window.StoreManager?.getActiveStore?.() || null;
};
const getUserId = () => {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user.id;
    } catch (_) {
        return 'unknown';
    }
};

const authHeaders = () => {
    const storeId = getActiveStoreId();
    return {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
        ...(storeId ? { 'X-Store-Id': storeId } : {})
    };
};

// Format Naira helper
function fmtNaira(n) {
    return '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


// sellers earning.js — new helpers
let _resolvedBank = null;

function toggleBankList(show) {
  const list = document.getElementById('bank-list');
  if (!list) return;
  list.style.display = show ? 'block' : 'none';
}

function setBankValue(name, code) {
  const search = document.getElementById('bank-search');
  const hidden = document.getElementById('bank-code-value');
  if (search) search.value = name;
  if (hidden) hidden.value = code;
  toggleBankList(false);
}

function filterBankList() {
  const query = document.getElementById('bank-search')?.value.toLowerCase() || '';
  document.querySelectorAll('#bank-list .bank-list-item').forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(query) ? 'block' : 'none';
  });
}

async function loadBankList() {
  const list = document.getElementById('bank-list');
  if (!list || list.dataset.loaded) return;
  try {
    const data = await apiFetch('/withdrawals/banks');
    const banks = data.data.banks || [];
    list.innerHTML = banks.map(b => `
      <div class="bank-list-item" onclick="setBankValue('${b.name.replace(/'/g, "\\'")}', '${b.code}')">${b.name}</div>
    `).join('');
    list.dataset.loaded = 'true';
  } catch (e) {
    if (list) list.innerHTML = '<div class="bank-list-item">Failed to load banks</div>';
  }
}

async function resolveBankAccount() {
  const bank_code = document.getElementById('bank-code-value')?.value;
  const account_number = document.getElementById('bank-acct-number')?.value;
  if (!bank_code || !account_number) return showToast('Select bank and enter account number', false);

  try {
    const data = await apiFetch('/withdrawals/resolve-account', {
      method: 'POST', body: JSON.stringify({ account_number, bank_code })
    });
    _resolvedBank = {
      bank_account_name: data.data.account_name,
      bank_account_number: data.data.account_number,
      bank_name: document.getElementById('bank-search').value,
      bank_code
    };
    document.getElementById('resolved-account-name').innerHTML = `<i class="fas fa-check"></i> ${_resolvedBank.bank_account_name}`;
    document.getElementById('saveBankBtn').disabled = false;
  } catch (e) {
    showToast(e.message || 'Could not verify account', false);
  }
}

async function requestPinReset() {
  try {
    await apiFetch('/withdrawals/forgot-pin', { method: 'POST' });
    showToast('Reset code sent to your email');
    const fields = document.getElementById('pin-reset-fields');
    if (fields) fields.style.display = 'block';
  } catch (e) { showToast(e.message || 'Could not send code', false); }
}

async function confirmPinReset() {
  const otp = document.getElementById('pin-reset-otp')?.value;
  const newPin = document.getElementById('pin-reset-newpin')?.value;
  if (!otp || !newPin) return showToast('Enter code and new PIN', false);
  try {
    await apiFetch('/withdrawals/reset-pin', { method: 'POST', body: JSON.stringify({ otp, newPin }) });
    showToast('PIN reset successfully!');
    withdrawalState.withdrawal_pin_set = true;
    showStep(withdrawalState.bank_account_number ? 'step-withdraw' : 'step-add-bank');
  } catch (e) { showToast(e.message || 'Reset failed', false); }
}

async function submitBankAccount() {
  if (!_resolvedBank) return showToast('Verify your account first', false);
  try {
    await apiFetch('/withdrawals/bank-account', { method: 'POST', body: JSON.stringify(_resolvedBank) });
    showToast('Bank account saved!');
    withdrawalState = { ...withdrawalState, ..._resolvedBank };
    showStep('step-withdraw');
    document.getElementById('withdraw-bank-info').textContent =
      `Withdrawing to: ${_resolvedBank.bank_name} — ${_resolvedBank.bank_account_number} (${_resolvedBank.bank_account_name})`;
  } catch (err) {
    showToast(err.message || 'Error saving bank', false); // now actually fires on failure
  }
}

// API Fetch
// sellers earning.js — replace apiFetch
async function apiFetch(path, opts = {}) {
    opts.headers = { ...authHeaders(), ...(opts.headers || {}) };
    const res = await fetch(`${API_BASE}${path}`, opts);
    if (res.status === 401) { handleLogout(); throw new Error('Unauthorized'); }
    const data = await res.json();
    if (!res.ok || data.status === 'error') throw new Error(data.message || 'Request failed');
    return data;
}

// Profile Image
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
    sessionStorage.removeItem('token');
    window.location.href = 'login.html';
}

// UI Helpers
function showToast(message, success = true) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.style.backgroundColor = success ? "#28a745" : "#dc3545";
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}

document.addEventListener("DOMContentLoaded", async function () {
    // Navbar/Sidebar logic
    const toggler = document.getElementById("navbar-toggler");
    const offcanvasMenu = document.getElementById("offcanvasMenu");
    const offcanvasClose = document.getElementById("offcanvasClose");

    if (toggler && offcanvasMenu) {
        toggler.addEventListener("click", () => offcanvasMenu.classList.add("show"));
        offcanvasClose.addEventListener("click", () => offcanvasMenu.classList.remove("show"));
        
        document.addEventListener("click", (event) => {
            if (!offcanvasMenu.contains(event.target) && !toggler.contains(event.target)) {
                offcanvasMenu.classList.remove("show");
            }
        });
    }

    // Auth check
    if (!getToken()) {
        window.location.href = '../login.html';
        return;
    }

    // Withdrawal Modal Trigger
    const withdrawBtn = document.getElementById("withdrawBtn");
    if (withdrawBtn) {
        withdrawBtn.addEventListener("click", openWithdrawModal);
    }

    const activeStore = await requireActiveStore();
    if (!activeStore) return;

    // Load earnings data
    loadProfile();
    fetchEarningsData();
    loadTransactionHistory();

    document.getElementById('load-more-tx')?.addEventListener('click', () => {
        txPage++;
        loadTransactionHistory(false);
    });

        // Export buttons
        document.getElementById('export-csv')?.addEventListener('click', () => {
            if (!window._lastEarningsData) return showToast('No data to export', false);
            const { transactions } = window._lastEarningsData;
            const rows = [['Date','Type','Product/Order','Status','Amount'],
                ...transactions.map(t => [
                    new Date(t.date).toLocaleDateString(),
                    t.type, t.productName || t.orderId || '', t.status, t.amount
                ])];
            const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g,'""') + '"').join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `marketmix-earnings-${Date.now()}.csv`;
            a.click();
        });

        document.getElementById('export-pdf')?.addEventListener('click', () => {
            if (!window._lastEarningsData) return showToast('No data to export', false);
            const { jsPDF } = window.jspdf || {};
            if (!jsPDF) return showToast('PDF export not available', false);
            const doc = new jsPDF();
            const { summary, transactions } = window._lastEarningsData;

            doc.setFontSize(16); doc.text('MarketMix Earnings Report', 14, 16);
            doc.setFontSize(10);
            doc.text(`Total Earnings: ${fmtNaira(summary.totalEarnings)}`, 14, 26);
            doc.text(`Available Balance: ${fmtNaira(summary.availableBalance)}`, 14, 32);
            doc.text(`Pending: ${fmtNaira(summary.pendingEarnings)}`, 14, 38);

            let y = 50;
            doc.setFontSize(11); doc.text('Recent Transactions', 14, y); y += 6;
            doc.setFontSize(9);
            transactions.slice(0, 30).forEach(t => {
                doc.text(`${new Date(t.date).toLocaleDateString()}  ${t.type}  ${fmtNaira(t.amount)}  [${t.status}]`, 14, y);
                y += 6;
                if (y > 280) { doc.addPage(); y = 20; }
            });

            doc.save(`marketmix-earnings-${Date.now()}.pdf`);
        });
});

window.addEventListener('storeChanged', () => {
    fetchEarningsData();
});

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

function toggleProfileDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'flex' ? 'none' : 'flex';
    }
}

window.toggleProfileDropdown = toggleProfileDropdown;

async function fetchEarningsData() {
    try {
        const data = await apiFetch('/earnings');

        if (data.status === 'success') {
            renderEarnings(data.data);
        } else {
            showToast(data.message || 'Error fetching earnings', false);
        }
    } catch (error) {
        console.error('Fetch earnings error:', error);
        showToast('Network error while fetching earnings', false);
    }
}

async function loadTransactionHistory(reset = true) {
    if (reset) txPage = 1;

    const params = new URLSearchParams(window.location.search);
    const query = new URLSearchParams({
        page: String(txPage),
        limit: String(txLimit),
        ...(params.get('type') ? { type: params.get('type') } : {}),
        ...(params.get('status') ? { status: params.get('status') } : {}),
        ...(params.get('from') ? { from: params.get('from') } : {}),
        ...(params.get('to') ? { to: params.get('to') } : {})
    }).toString();

    try {
        const data = await apiFetch(`/earnings/transactions?${query}`);
        const { transactions = [], total = 0 } = data?.data || {};
        const container = document.getElementById('transactions-list');
        if (!container) return;

        if (reset) container.innerHTML = '';

        if (!transactions.length && reset) {
            container.innerHTML = '<div class="transaction"><span>No transactions found</span></div>';
            const loadMoreBtn = document.getElementById('load-more-tx');
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }

        const typeLabel = { sale: 'Sale', escrow: 'Escrow', withdrawal: 'Withdrawal' };
        transactions.forEach(tx => {
            const div = document.createElement('div');
            div.classList.add('transaction');
            const negative = Number(tx.amount) < 0;
            const description = tx.description || tx.productName || tx.orderId || '';
            div.innerHTML = `
                <span>${new Date(tx.date).toLocaleDateString()}</span>
                <span>${typeLabel[tx.type] || tx.type}: ${description}</span>
                <span class="amount ${negative ? 'negative' : ''}">
                    ${negative ? '–' : '+'} ${fmtNaira(Math.abs(tx.amount))}
                    <small>[${(tx.status || '').toUpperCase()}]</small>
                </span>`;
            container.appendChild(div);
        });

        const loadMoreBtn = document.getElementById('load-more-tx');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = txPage * txLimit < total ? 'block' : 'none';
        }
    } catch (err) {
        console.error('Error loading transaction history:', err);
        showToast('Unable to load transaction history', false);
    }
}

function renderEarnings(data) {
    // store for export features
    window._lastEarningsData = data;
    const { summary, transactions, productEarnings } = data;

    // Compare with previous summary and create notifications for meaningful changes
    try {
        if (_prevEarningsSummary) {
            // Total Earnings changed
            if (Number(summary.totalEarnings) !== Number(_prevEarningsSummary.totalEarnings)) {
                const diff = Number(summary.totalEarnings) - Number(_prevEarningsSummary.totalEarnings);
                const title = 'Total Earnings updated';
                const message = diff > 0
                    ? `Your total earnings increased by ${fmtNaira(Math.abs(diff))}`
                    : `Your total earnings changed by ${fmtNaira(Math.abs(diff))}`;
                createSellerNotification({ title, message, type: 'earnings', link: '/sellers/sellers%20earning.html' });
            }

            // Available Balance changed
            if (Number(summary.availableBalance) !== Number(_prevEarningsSummary.availableBalance)) {
                const diff = Number(summary.availableBalance) - Number(_prevEarningsSummary.availableBalance);
                const title = 'Available balance updated';
                const message = diff > 0
                    ? `Your available balance increased by ${fmtNaira(Math.abs(diff))}.`
                    : `Your available balance changed by ${fmtNaira(Math.abs(diff))}.`;
                createSellerNotification({ title, message, type: 'earnings', link: '/sellers/sellers%20earning.html' });
            }

            // Pending Earnings changed
            if (Number(summary.pendingEarnings) !== Number(_prevEarningsSummary.pendingEarnings)) {
                const diff = Number(summary.pendingEarnings) - Number(_prevEarningsSummary.pendingEarnings);
                const title = 'Pending earnings updated';
                const message = diff > 0
                    ? `Your pending earnings increased by ${fmtNaira(Math.abs(diff))}.`
                    : `Your pending earnings changed by ${fmtNaira(Math.abs(diff))}.`;
                createSellerNotification({ title, message, type: 'earnings', link: '/sellers/sellers%20earning.html' });
            }
        }
    } catch (e) {
        console.warn('Notification comparison failed:', e);
    }

    // Update Summary Cards
    if (document.getElementById("total-earnings"))
       document.getElementById("total-earnings").textContent = fmtNaira(summary.totalEarnings);
    
    if (document.getElementById("available-balance"))
        document.getElementById("available-balance").textContent = fmtNaira(summary.availableBalance);
    if (document.getElementById("pending"))
        document.getElementById("pending").textContent = fmtNaira(summary.pendingEarnings);
    if (document.getElementById("withdrawals"))
        document.getElementById("withdrawals").textContent = fmtNaira(summary.totalWithdrawn);
    
    // Update Projected (Placeholder or calculated)
    const projected = summary.totalEarnings + summary.pendingEarnings;
    if (document.getElementById("projected"))
        document.getElementById("projected").textContent = `Projected earnings: ${fmtNaira(projected)}`;

    // Badge stamp
    try { renderBadgeStamp(summary.totalEarnings); } catch(e) { /* ignore */ }

    // Render Chart
    renderChart(transactions);

    // Render Product Table
    const tableBody = document.getElementById("product-table-body");
    if (tableBody) {
        tableBody.innerHTML = '';
        
        if (productEarnings.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="3">No product data available</td></tr>';
        } else {
            productEarnings.forEach(p => {
                const row = `<tr><td>${p.name}</td><td>${p.qty}</td><td>${fmtNaira(p.revenue)}</td></tr>`;
                tableBody.innerHTML += row;
            });
        }
    }

    // store current summary for next comparison
    try {
        _prevEarningsSummary = {
            totalEarnings: Number(summary.totalEarnings || 0),
            availableBalance: Number(summary.availableBalance || 0),
            pendingEarnings: Number(summary.pendingEarnings || 0),
            totalWithdrawn: Number(summary.totalWithdrawn || 0)
        };
    } catch (e) {
        console.warn('Could not set prev earnings summary:', e);
    }
}

// badge helper
function renderBadgeStamp(totalEarnings) {
    const el = document.getElementById('badge-stamp');
    if (!el) return;
    let tier = 'New Seller', emoji = '🆕';
    if (totalEarnings >= 200000)      { tier = 'Gold';   emoji = '🥇'; }
    else if (totalEarnings >= 30000)  { tier = 'Silver'; emoji = '🥈'; }
    else if (totalEarnings >= 1000)   { tier = 'Bronze'; emoji = '🥉'; }
    el.textContent = `${emoji} ${tier}`;
}

function renderChart(transactions) {
    const chartCanvas = document.getElementById("earningsChart");
    if (!chartCanvas) return;
    
    if (earningsChartInstance) {
        earningsChartInstance.destroy();
        earningsChartInstance = null;
    }
    
    const ctx = chartCanvas.getContext("2d");
    
    const monthlyData = {};
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const now = new Date();
    const labels = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = months[d.getMonth()];
        labels.push(label);
        monthlyData[label] = 0;
    }

    transactions.forEach(tx => {
        const d = new Date(tx.date);
        const label = months[d.getMonth()];
        if (monthlyData.hasOwnProperty(label)) {
            monthlyData[label] += tx.amount;
        }
    });

    const values = labels.map(l => monthlyData[l]);

    earningsChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: 'Monthly Earnings',
                data: values,
                backgroundColor: "rgba(255, 99, 0, 0.2)",
                borderColor: "#ff6600",
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function showTransactionModal(tx) {
    const modal = document.getElementById("transaction-modal");
    const modalBody = document.getElementById("modal-body");
    if (!modal || !modalBody) return;

    const date = new Date(tx.date).toLocaleString();
    
    modalBody.innerHTML = `
        <p><strong>Transaction ID:</strong> ${tx.id}</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Type:</strong> ${tx.type}</p>
        <p><strong>Product:</strong> ${tx.productName || "N/A"}</p>
        <p><strong>Order ID:</strong> ${tx.orderId || "N/A"}</p>
        <p><strong>Status:</strong> <span class="status-badge ${tx.status}">${tx.status}</span></p>
        <p><strong>Amount:</strong> ${fmtNaira(Math.abs(tx.amount))}</p>
    `;
    modal.style.display = "flex";
}

async function createSellerNotification({ title, message, type = 'withdrawal', link = '/sellers/sellers earning.html' }) {
    const userId = getUserId();
    if (!userId) return;

    try {
        await fetch(`${API_BASE}/notifications`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
                user_id: userId,
                title,
                message,
                type,
                link
            })
        });
    } catch (err) {
        console.warn('Unable to create withdrawal notification:', err);
    }
}

let withdrawalState = {};

async function openWithdrawModal() {
    const withdrawModal = document.getElementById('withdrawModal');
    if (!withdrawModal) return;
    withdrawModal.style.display = 'flex';

    try {
        const data = await apiFetch('/withdrawals/bank-account');
        const info = data.data;
        withdrawalState = info || {};

        if (!withdrawalState.withdrawal_pin_set) {
            showStep('step-set-pin');
        } else if (!withdrawalState.bank_account_number) {
            showStep('step-add-bank');
            loadBankList()
        } else {
            showStep('step-withdraw');
            const bankInfo = document.getElementById('withdraw-bank-info');
            if (bankInfo) {
                bankInfo.textContent =
                    `Withdrawing to: ${withdrawalState.bank_name} — ${withdrawalState.bank_account_number} (${withdrawalState.bank_account_name})`;
            }
        }
    } catch (err) {
        showToast('Error loading withdrawal info', false);
    }
}

function showStep(stepId) {
    ['step-set-pin','step-add-bank','step-withdraw','step-forgot-pin'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = id === stepId ? 'block' : 'none';
    });

    const resetFields = document.getElementById('pin-reset-fields');
    if (resetFields && stepId !== 'step-forgot-pin') {
        resetFields.style.display = 'none';
    }

    if (stepId === 'step-add-bank') {
        loadBankList();
    } else {
        toggleBankList(false);
    }
}

async function submitSetPin() {
    const pin = document.getElementById('new-pin')?.value;
    const confirmPin = document.getElementById('confirm-pin')?.value;
    if (pin !== confirmPin) return showToast('PINs do not match', false);
    if (!/^[0-9]{4,6}$/.test(pin)) return showToast('PIN must be 4-6 digits', false);

    try {
        await apiFetch('/withdrawals/set-pin', { method: 'POST', body: JSON.stringify({ pin }) });
        showToast('PIN set successfully!');
        withdrawalState.withdrawal_pin_set = true;
        showStep(withdrawalState.bank_account_number ? 'step-withdraw' : 'step-add-bank');
        // Notify seller that PIN was set
        try { createSellerNotification({ title: 'Withdrawal PIN set', message: 'You have successfully set your withdrawal PIN.', type: 'account', link: '/sellers/sellers earning.html' }); } catch(e){console.warn('PIN notification failed',e)}
    } catch (err) {
        showToast(err.message || 'Error setting PIN', false);
    }
}



async function submitWithdrawal() {
    const amount = parseFloat(document.getElementById('withdraw-amount')?.value || '0');
    const pin = document.getElementById('withdraw-pin')?.value;

    if (!amount || amount <= 0) return showToast('Enter a valid amount', false);
    if (!pin) return showToast('Enter your PIN', false);

    try {
        const res = await fetch(`${API_BASE}/withdrawals`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ amount, pin })
        });

        const rawText = await res.text();
        console.log('=== WITHDRAWAL RESPONSE ===');
        console.log('Status:', res.status);
        console.log('Body:', rawText);

        let data;
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            return showToast('Invalid server response', false);
        }

        if (!res.ok) {
            // Create a notification for failed withdrawal attempt
            try { createSellerNotification({ title: 'Withdrawal failed', message: data.message || `Withdrawal failed: ${res.status}`, type: 'withdrawal', link: '/sellers/sellers earning.html' }); } catch(e){console.warn('Withdrawal fail notification failed',e)}
            return showToast(data.message || `Error: ${res.status}`, false);
        }

        showToast(`${fmtNaira(amount)} withdrawal submitted!`);
        const withdrawModal = document.getElementById('withdrawModal');
        if (withdrawModal) withdrawModal.style.display = 'none';

        // Refresh earnings data
        await fetchEarningsData();
        await loadWithdrawalHistory();

        document.getElementById('withdraw-amount').value = '';
        document.getElementById('withdraw-pin').value = '';
        // Notify seller of successful withdrawal submission
        try { createSellerNotification({ title: 'Withdrawal submitted', message: `${fmtNaira(amount)} withdrawal submitted.`, type: 'withdrawal', link: '/sellers/sellers earning.html' }); } catch(e){console.warn('Withdrawal success notification failed',e)}
    } catch (err) {
        console.error('Withdrawal error:', err);
        showToast(err.message || 'Withdrawal failed', false);
    }
}

// Global UI handlers
window.toggleProfileDropdown = function() {
    const dropdown = document.getElementById("profileDropdown");
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === "flex" ? "none" : "flex";
    }
};

window.onclick = (e) => {
    const transModal = document.getElementById("transaction-modal");
    if (e.target === transModal) transModal.style.display = "none";
    
    const withdrawModal = document.getElementById("withdrawModal");
    if (e.target === withdrawModal) withdrawModal.style.display = "none";
};

// Close buttons for all modals
document.querySelectorAll(".close-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const transModal = document.getElementById("transaction-modal");
        const withdrawModal = document.getElementById("withdrawModal");
        if (transModal) transModal.style.display = "none";
        if (withdrawModal) withdrawModal.style.display = "none";
    });
});
