/**
 * MarketMix Seller Earnings Integration
 */

const API_BASE = 'https://marketmix-backend.onrender.com/api';

// Auth helpers
const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');
const getUserId = () => {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user.id;
    } catch (_) {
        return 'unknown';
    }
};

const authHeaders = () => ({
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json'
});

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

document.addEventListener("DOMContentLoaded", function () {
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
    const withdrawModal = document.getElementById("withdrawModal");
    if (withdrawBtn && withdrawModal) {
        withdrawBtn.addEventListener("click", () => {
            withdrawModal.style.display = "flex";
        });
    }

    // Load earnings data
    loadProfile();
    fetchEarningsData();
    setupWithdrawalForm();
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
        const response = await fetch(`${API_BASE}/earnings`, {
            headers: authHeaders()
        });
        
        const data = await response.json();
        
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

function renderEarnings(data) {
    const { summary, transactions, productEarnings } = data;

    // Update Summary Cards
    if (document.getElementById("total-earnings"))
        document.getElementById("total-earnings").textContent = `$${summary.totalEarnings.toFixed(2)}`;
    if (document.getElementById("available-balance"))
        document.getElementById("available-balance").textContent = `$${summary.availableBalance.toFixed(2)}`;
    if (document.getElementById("pending"))
        document.getElementById("pending").textContent = `$${summary.pendingEarnings.toFixed(2)}`;
    if (document.getElementById("withdrawals"))
        document.getElementById("withdrawals").textContent = `$${summary.totalWithdrawn.toFixed(2)}`;
    
    // Update Projected (Placeholder or calculated)
    const projected = summary.totalEarnings + summary.pendingEarnings;
    if (document.getElementById("projected"))
        document.getElementById("projected").textContent = `Projected earnings: $${projected.toFixed(2)}`;

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
                    <span class="amount ${tx.amount < 0 ? "negative" : ""}">${tx.amount < 0 ? "–" : "+"} $${Math.abs(tx.amount).toFixed(2)}</span>
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
                const row = `<tr><td>${p.name}</td><td>${p.qty}</td><td>$${p.revenue.toFixed(2)}</td></tr>`;
                tableBody.innerHTML += row;
            });
        }
    }
}

function renderChart(transactions) {
    const chartCanvas = document.getElementById("earningsChart");
    if (!chartCanvas) return;
    const ctx = chartCanvas.getContext("2d");
    
    // Process transactions for chart (group by month)
    const monthlyData = {};
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Last 6 months
    const labels = [];
    const now = new Date();
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

    new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
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
        <p><strong>Amount:</strong> $${Math.abs(tx.amount).toFixed(2)}</p>
    `;
    modal.style.display = "flex";
}

function setupWithdrawalForm() {
    const form = document.getElementById("withdrawForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const amount = parseFloat(form.amount.value);
        const method = form.method.value;

        if (!amount || amount <= 0) {
            showToast("Please enter a valid amount.", false);
            return;
        }

        try {
            showToast("Processing withdrawal...", true);
            
            const response = await fetch(`${API_BASE}/withdrawals`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ amount, method })
            });

            const data = await response.json();

            if (data.status === 'success') {
                showToast(`Withdrawal of $${amount.toFixed(2)} processed successfully!`);
                const withdrawModal = document.getElementById("withdrawModal");
                if (withdrawModal) withdrawModal.style.display = "none";
                form.reset();
                // Refresh data
                fetchEarningsData();
            } else {
                showToast(data.message || 'Withdrawal failed', false);
            }
        } catch (error) {
            console.error('Withdrawal error:', error);
            showToast('Network error during withdrawal', false);
        }
    });
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
