/**
 * MarketMix Seller Earnings Integration
 */

const API_BASE = 'https://marketmix-backend.onrender.com/api';
let earningsChartInstance = null;
let _prevEarningsSummary = null;

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
    loadWithdrawalHistory();
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

async function loadWithdrawalHistory() {
    try {
        const data = await apiFetch('/withdrawals');
        const withdrawals = data?.data?.withdrawals || [];
        const container = document.getElementById('transactions-list');
        if (!container) return;

        container.querySelectorAll('.withdrawal-entry').forEach(el => el.remove());

        const withdrawalItems = withdrawals.map(w => {
            const statusColor = {
                success: '#28a745', pending: '#ffc107',
                processing: '#17a2b8', failed: '#dc3545'
            }[w.status] || '#6c757d';

            const div = document.createElement('div');
            div.classList.add('transaction', 'withdrawal-entry');
            div.innerHTML = `
                <span>${new Date(w.created_at).toLocaleDateString()}</span>
                <span>Withdrawal → ${w.bank_name || 'Bank'}</span>
                <span class="amount negative" style="color:${statusColor}">
                  – ₦${Number(w.amount).toFixed(2)}
                  <small>[${(w.status || '').toUpperCase()}]</small>
                </span>
            `;
            return div;
        });

        withdrawalItems.forEach(el => container.prepend(el));
    } catch (err) {
        console.error('Error loading withdrawal history:', err);
    }
}

function renderEarnings(data) {
    const { summary, transactions, productEarnings } = data;

    // Compare with previous summary and create notifications for meaningful changes
    try {
        if (_prevEarningsSummary) {
            // Total Earnings changed
            if (Number(summary.totalEarnings) !== Number(_prevEarningsSummary.totalEarnings)) {
                const diff = Number(summary.totalEarnings) - Number(_prevEarningsSummary.totalEarnings);
                const title = 'Total Earnings updated';
                const message = diff > 0
                    ? `Your total earnings increased by ₦${Math.abs(diff).toFixed(2)}`
                    : `Your total earnings changed by ₦${Math.abs(diff).toFixed(2)}`;
                createSellerNotification({ title, message, type: 'earnings', link: '/sellers/sellers%20earning.html' });
            }

            // Available Balance changed
            if (Number(summary.availableBalance) !== Number(_prevEarningsSummary.availableBalance)) {
                const diff = Number(summary.availableBalance) - Number(_prevEarningsSummary.availableBalance);
                const title = 'Available balance updated';
                const message = diff > 0
                    ? `Your available balance increased by ₦${Math.abs(diff).toFixed(2)}.`
                    : `Your available balance changed by ₦${Math.abs(diff).toFixed(2)}.`;
                createSellerNotification({ title, message, type: 'earnings', link: '/sellers/sellers%20earning.html' });
            }

            // Pending Earnings changed
            if (Number(summary.pendingEarnings) !== Number(_prevEarningsSummary.pendingEarnings)) {
                const diff = Number(summary.pendingEarnings) - Number(_prevEarningsSummary.pendingEarnings);
                const title = 'Pending earnings updated';
                const message = diff > 0
                    ? `Your pending earnings increased by ₦${Math.abs(diff).toFixed(2)}.`
                    : `Your pending earnings changed by ₦${Math.abs(diff).toFixed(2)}.`;
                createSellerNotification({ title, message, type: 'earnings', link: '/sellers/sellers%20earning.html' });
            }
        }
    } catch (e) {
        console.warn('Notification comparison failed:', e);
    }

    // Update Summary Cards
    if (document.getElementById("total-earnings"))
        document.getElementById("total-earnings").textContent = `₦${summary.totalEarnings.toFixed(2)}`;
    if (document.getElementById("available-balance"))
        document.getElementById("available-balance").textContent = `₦${summary.availableBalance.toFixed(2)}`;
    if (document.getElementById("pending"))
        document.getElementById("pending").textContent = `₦${summary.pendingEarnings.toFixed(2)}`;
    if (document.getElementById("withdrawals"))
        document.getElementById("withdrawals").textContent = `₦${summary.totalWithdrawn.toFixed(2)}`;
    
    // Update Projected (Placeholder or calculated)
    const projected = summary.totalEarnings + summary.pendingEarnings;
    if (document.getElementById("projected"))
        document.getElementById("projected").textContent = `Projected earnings: ₦${projected.toFixed(2)}`;

    // Render Chart
    renderChart(transactions);

    // Render Transactions
    const list = document.getElementById("transactions-list");
    if (list) {
        list.innerHTML = '';
        
        if (transactions.length === 0) {
            list.innerHTML = '<div class="transaction"><span>No transactions found</span></div>';
        } else {
            transactions.forEach(tx => {
                const date = new Date(tx.date).toLocaleDateString();
                const div = document.createElement("div");
                div.classList.add("transaction");
                div.innerHTML = `
                    <span>${date}</span>
                    <span>${tx.type}: ${tx.productName || "Order #" + (tx.orderId ? tx.orderId.substring(0,8) : 'N/A')}</span>
                    <span class="amount ${tx.amount < 0 ? "negative" : ""}">${tx.amount < 0 ? "–" : "+"} ₦${Math.abs(tx.amount).toFixed(2)}</span>
                `;
                div.addEventListener("click", () => showTransactionModal(tx));
                list.appendChild(div);
            });
        }
    }

    // Render Product Table
    const tableBody = document.getElementById("product-table-body");
    if (tableBody) {
        tableBody.innerHTML = '';
        
        if (productEarnings.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="3">No product data available</td></tr>';
        } else {
            productEarnings.forEach(p => {
                const row = `<tr><td>${p.name}</td><td>${p.qty}</td><td>₦${p.revenue.toFixed(2)}</td></tr>`;
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
        <p><strong>Amount:</strong> ₦${Math.abs(tx.amount).toFixed(2)}</p>
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
    ['step-set-pin','step-add-bank','step-withdraw'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = id === stepId ? 'block' : 'none';
    });
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

async function submitBankAccount() {
    const body = {
        bank_account_name: document.getElementById('bank-acct-name')?.value,
        bank_account_number: document.getElementById('bank-acct-number')?.value,
        bank_name: document.getElementById('bank-name-input')?.value,
    };

    if (!body.bank_account_name || !body.bank_account_number || !body.bank_name) {
        return showToast('Fill all bank fields', false);
    }

    try {
        await apiFetch('/withdrawals/bank-account', { method: 'POST', body: JSON.stringify(body) });
        showToast('Bank account saved!');
        withdrawalState = { ...withdrawalState, ...body };
        showStep('step-withdraw');
        const bankInfo = document.getElementById('withdraw-bank-info');
        if (bankInfo) {
            bankInfo.textContent =
                `Withdrawing to: ${body.bank_name} — ${body.bank_account_number} (${body.bank_account_name})`;
        }
        // Notify seller that bank account was added
        try { createSellerNotification({ title: 'Bank account added', message: `Bank account ${body.bank_account_number} (${body.bank_name}) saved for withdrawals.`, type: 'account', link: '/sellers/sellers earning.html' }); } catch (e) { console.warn('Bank account notification failed', e); }
    } catch (err) {
        showToast(err.message || 'Error saving bank', false);
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

        showToast(`₦${amount.toFixed(2)} withdrawal submitted!`);
        const withdrawModal = document.getElementById('withdrawModal');
        if (withdrawModal) withdrawModal.style.display = 'none';

        // Refresh earnings data
        await fetchEarningsData();
        await loadWithdrawalHistory();

        document.getElementById('withdraw-amount').value = '';
        document.getElementById('withdraw-pin').value = '';
        // Notify seller of successful withdrawal submission
        try { createSellerNotification({ title: 'Withdrawal submitted', message: `₦${amount.toFixed(2)} withdrawal submitted.`, type: 'withdrawal', link: '/sellers/sellers earning.html' }); } catch(e){console.warn('Withdrawal success notification failed',e)}
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
