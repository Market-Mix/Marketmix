/* ============================================================
   sellers layout.js  —  MarketMix Seller Dashboard
   Backend: https://marketmix-backend.onrender.com/api
   ============================================================ */

const API_BASE = "https://marketmix-backend.onrender.com/api";

// ─── Auth helpers ─────────────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem("token") || "";
}

function authHeaders() {
  return {
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  };
}

async function apiFetch(path, opts = {}) {
  opts.headers = { ...authHeaders(), ...(opts.headers || {}) };
  const res = await fetch(`${API_BASE}${path}`, opts);
  if (res.status === 401) {
    handleLogout();
    throw new Error("Unauthorized");
  }
  return res.json();
}

// ─── Logout ───────────────────────────────────────────────────────────────────
async function handleLogout() {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: authHeaders(),
    });
  } catch (_) { /* ignore */ }
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

// Wire logout links
document.querySelectorAll('a[href="#"]').forEach((a) => {
  if (a.textContent.trim().toLowerCase() === "logout") {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      handleLogout();
    });
  }
});

// ─── DOM Ready ────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  initNavToggle();
  initMobilePanel();
  initProfileDropdownClose();
  initTips();
  initActivityModal();
  initModals();

  // Clear static demo content immediately so users never see hardcoded numbers
  clearOverviewCards();
  clearActivityTicker();

  // Initial data load
  await loadDashboardData();

  // Auto-refresh every 30 seconds — keeps ticker and cards live without a page reload
  setInterval(loadDashboardData, 30_000);
});

// ─── Clear placeholder content before data loads ──────────────────────────────
function clearOverviewCards() {
  // Set all 4 stat h3s to a loading dash immediately
  const cards = document.querySelectorAll(".overview-card h3");
  cards.forEach((h3) => {
    h3.textContent = "—";
  });
}

function clearActivityTicker() {
  const tickerList = document.getElementById("tickerList");
  if (tickerList) tickerList.innerHTML = "<li>Loading activity...</li>";

  const fullLog = document.querySelector(".full-log");
  if (fullLog) fullLog.innerHTML = "<li>Loading activity...</li>";
}

// ─── Central data loader (called on init + every 30s) ────────────────────────
async function loadDashboardData() {
  const [profileRes, statsRes, earningsRes, activityRes] = await Promise.allSettled([
    apiFetch("/seller/profile"),
    apiFetch("/seller/orders/stats"),
    apiFetch("/earnings"),
    apiFetch("/seller/activity?limit=50"),
  ]);

  const profile    = profileRes.status  === "fulfilled" ? profileRes.value?.data?.seller      : null;
  const stats      = statsRes.status    === "fulfilled" ? statsRes.value?.data?.stats          : null;
  const earnings   = earningsRes.status === "fulfilled" ? earningsRes.value?.data?.summary     : null;
  const activities = activityRes.status === "fulfilled"
    ? (activityRes.value?.data?.activities || [])
    : [];

  renderWelcome(profile);
  renderProfileImage(profile);
  renderOverviewCards(stats, earnings, profile);
  renderProgressTracker(profile);
  renderActivityLog(activities);
}

// ─── Nav Toggle ───────────────────────────────────────────────────────────────
function initNavToggle() {
  const toggler = document.getElementById("navbar-toggler");
  const menu    = document.getElementById("offcanvasMenu");
  const close   = document.getElementById("offcanvasClose");
  if (!toggler || !menu) return;

  toggler.addEventListener("click", () => menu.classList.add("show"));
  close?.addEventListener("click", () => menu.classList.remove("show"));
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !toggler.contains(e.target))
      menu.classList.remove("show");
  });
  menu.addEventListener("click", (e) => e.stopPropagation());
  document.querySelectorAll(".offcanvas-body a").forEach((l) =>
    l.addEventListener("click", () => menu.classList.remove("show"))
  );
}

// ─── Mobile Panel ─────────────────────────────────────────────────────────────
function initMobilePanel() {
  const toggle   = document.getElementById("mobileLogoToggle");
  const panel    = document.getElementById("mobileLogoPanel");
  const closeBtn = document.getElementById("mobileLogoPanelClose");
  if (!toggle || !panel) return;

  toggle.addEventListener("click", (e) => { e.stopPropagation(); panel.classList.add("show"); });
  closeBtn?.addEventListener("click", (e) => { e.stopPropagation(); panel.classList.remove("show"); });
  document.addEventListener("click", (e) => {
    if (!panel.contains(e.target) && !toggle.contains(e.target))
      panel.classList.remove("show");
  });
  panel.addEventListener("click", (e) => e.stopPropagation());
  document.querySelectorAll(".mobile-logo-nav-links a").forEach((l) =>
    l.addEventListener("click", () => panel.classList.remove("show"))
  );
}

// ─── Profile Dropdown ─────────────────────────────────────────────────────────
function toggleProfileDropdown() {
  const dd = document.getElementById("profileDropdown");
  if (!dd) return;
  dd.style.display = dd.style.display === "flex" ? "none" : "flex";
}
window.toggleProfileDropdown = toggleProfileDropdown;

function initProfileDropdownClose() {
  document.addEventListener("click", (e) => {
    const dd   = document.getElementById("profileDropdown");
    const icon = document.querySelector(".profile-icon");
    if (dd && icon && !dd.contains(e.target) && !icon.contains(e.target))
      dd.style.display = "none";
  });
}

// ─── Welcome Text ─────────────────────────────────────────────────────────────
function renderWelcome(profile) {
  const el = document.getElementById("welcomeText");
  if (!el) return;
  const name = profile?.firstName || profile?.profile?.businessName || "Seller";
  el.textContent = `Welcome, ${name}!`;
}

// ─── Profile Image ────────────────────────────────────────────────────────────
function renderProfileImage(profile) {
  const img = document.getElementById("sellerProfileImage");
  if (!img) return;
  const logo = profile?.profile?.storeLogo;
  if (logo) {
    img.src     = logo;
    img.onerror = () => { img.src = ""; };
  }
}

// ─── Overview Cards ───────────────────────────────────────────────────────────
/**
 * The HTML has 5 .overview-card elements (Orders, Products, Earnings, Returns,
 * Shop Settings). We target them by finding the card whose <p> text matches,
 * so the order in the HTML doesn't matter and won't break if cards are reordered.
 */
function renderOverviewCards(stats, earnings, profile) {
  function setCard(labelText, value) {
    const cards = document.querySelectorAll(".overview-card");
    for (const card of cards) {
      const p = card.querySelector("p");
      if (p && p.textContent.trim().toLowerCase() === labelText.toLowerCase()) {
        const h3 = card.querySelector("h3");
        if (h3) h3.textContent = value;
        return;
      }
    }
  }

  // Orders
  setCard("Orders", stats?.totalOrders ?? "—");

  // Products
  setCard("Products", profile?.productCount ?? "—");

  // Earnings — format as currency
  const total = earnings?.totalEarnings ?? null;
  setCard(
    "Earnings",
    total !== null
      ? "₦" + Number(total).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
      : "—"
  );

  // Returns — use cancelled as proxy until a dedicated returns endpoint exists
  setCard("Returns", stats?.cancelled ?? "—");
}

// ─── Progress Tracker ─────────────────────────────────────────────────────────
function renderProgressTracker(profile) {
  const bar  = document.getElementById("progressBar");
  const text = document.getElementById("progress-text");
  if (!bar || !text) return;

  const p       = profile?.profile;
  const kycUrls = p?.kycDocumentUrls || {};
  const kycStatus = kycUrls.kyc_status || null;

  const storeSetupDone = !!(p?.businessName && p?.storeLogo && p?.businessAddress);
  const kycSubmitted   = !!kycUrls.kyc_submitted_at;
  const kycApproved    = p?.isVerified && kycStatus === "approved";
  const productCount   = profile?.productCount ?? 0;
  const totalSales     = p?.totalSales ?? 0;

  let progress, color, html;

  if (!storeSetupDone) {
    progress = 20; color = "#ef4444";
    html = `<a href="setup-store.html" style="color:#1e293b;text-decoration:underline">Complete your store setup</a>`;
  } else if (kycStatus === "under_review" || (kycStatus === "pending" && kycSubmitted)) {
    progress = 40; color = "#f97316";
    html = `<span style="color:#1e293b">Your KYC is under review. We'll notify you once approved.</span>`;
  } else if (!kycApproved) {
    progress = 40; color = "#f97316";
    html = `<a href="kyc-verification.html" style="color:#1e293b;text-decoration:underline">Complete KYC verification</a>`;
  } else if (productCount < 1) {
    progress = 60; color = "#eab308";
    html = `<a href="sellers product.html" style="color:#1e293b;text-decoration:underline">Add your first product</a>`;
  } else if (totalSales < 1) {
    progress = 75; color = "#86efac";
    html = `Make your first sale`;
  } else if (totalSales < 10) {
    progress = 90; color = "#22c55e";
    html = `Reach 10 sales`;
  } else {
    progress = 100; color = "#3b82f6";
    html = `Verified Seller ✓`;
  }

  bar.style.width           = progress + "%";
  bar.style.backgroundColor = color;
  text.innerHTML            = html;
}

// ─── Activity Log ─────────────────────────────────────────────────────────────
const ACTIVITY_META = {
  product_added:        { icon: "📦", label: "Product added"       },
  product_updated:      { icon: "✏️",  label: "Product updated"     },
  product_deleted:      { icon: "🗑️",  label: "Product deleted"     },
  order_confirmed:      { icon: "✅",  label: "Order confirmed"     },
  order_processing:     { icon: "⚙️",  label: "Order processing"    },
  order_shipped:        { icon: "🚚",  label: "Order shipped"       },
  order_delivered:      { icon: "📬",  label: "Order delivered"     },
  order_cancelled:      { icon: "❌",  label: "Order cancelled"     },
  order_updated:        { icon: "🔄",  label: "Order updated"       },
  withdrawal_requested: { icon: "💰",  label: "Withdrawal requested"},
};

function activityMeta(type) {
  return ACTIVITY_META[type] || { icon: "🔔", label: type.replace(/_/g, " ") };
}

function formatRelativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs  / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function renderActivityLog(activities) {
  const tickerList = document.getElementById("tickerList");
  const fullLog    = document.querySelector(".full-log");

  // ── Ticker ────────────────────────────────────────────────
  if (tickerList) {
    if (!activities.length) {
      tickerList.innerHTML = "<li>No activity yet — start by adding a product!</li>";
    } else {
      tickerList.innerHTML = activities
        .slice(0, 15)
        .map((a) => {
          const { icon } = activityMeta(a.type);
          const time     = formatRelativeTime(a.createdAt);
          return `<li>${icon} ${a.title} <span style="opacity:.55;font-size:.85em">${time}</span></li>`;
        })
        .join("");
    }
  }

  // ── Full log (modal) ──────────────────────────────────────
  if (fullLog) {
    if (!activities.length) {
      fullLog.innerHTML = "<li>No activity yet.</li>";
    } else {
      fullLog.innerHTML = activities
        .map((a) => {
          const { icon, label } = activityMeta(a.type);
          const dateStr = new Date(a.createdAt).toLocaleString("en-US", {
            month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit",
          });
          const detail = a.detail
            ? `<br><span style="font-size:.85em;opacity:.65">${a.detail}</span>`
            : "";
          return `<li style="padding:.5rem 0;border-bottom:1px solid rgba(0,0,0,.06)">
            <span style="font-size:1.1em;margin-right:.4em">${icon}</span>
            <strong>${a.title}</strong>${detail}
            <span style="float:right;font-size:.8em;opacity:.5">${dateStr}</span>
          </li>`;
        })
        .join("");
    }
  }
}

// ─── Seller Tips ──────────────────────────────────────────────────────────────
function initTips() {
  const tips = [
    "Welcome to MarketMix!",
    "Keep your product descriptions clear and detailed.",
    "Offer promotions to boost your sales.",
    "Respond quickly to buyer inquiries for better ratings.",
    "Update your shop regularly to keep it fresh.",
    "Use high-quality images to attract more buyers.",
    "Check your earnings dashboard weekly.",
  ];
  let i = 0;
  const el = document.getElementById("tip-text");
  if (!el) return;
  setInterval(() => {
    i = (i + 1) % tips.length;
    el.textContent = tips[i];
  }, 3000);
}

// ─── Activity Modal ───────────────────────────────────────────────────────────
function initActivityModal() {
  const ticker = document.getElementById("activityTicker");
  const modal  = document.getElementById("activityModal");
  const close  = document.getElementById("closeModal");

  ticker?.addEventListener("click", () => { if (modal) modal.style.display = "block"; });
  close?.addEventListener("click",  () => { if (modal) modal.style.display = "none";  });
  window.addEventListener("click",  (e) => { if (e.target === modal) modal.style.display = "none"; });
}

// ─── Tool Modals (Coupons + Sales Chart) ──────────────────────────────────────
function initModals() {
  const couponsModal = document.getElementById("coupons-modal");
  const salesModal   = document.getElementById("sales-modal");

  document.getElementById("marketing-coupons-card")?.addEventListener("click", () => {
    if (couponsModal) couponsModal.style.display = "block";
    loadSellerProductsForCoupon();
  });

  document.getElementById("sales-chart-card")?.addEventListener("click", () => {
    if (salesModal) salesModal.style.display = "block";
    renderSalesChart();
  });

  document.getElementById("close-coupons")?.addEventListener("click", () => { if (couponsModal) couponsModal.style.display = "none"; });
  document.getElementById("close-sales")?.addEventListener("click",   () => { if (salesModal)   salesModal.style.display   = "none"; });

  window.addEventListener("click", (e) => {
    if (e.target?.classList?.contains("modal")) e.target.style.display = "none";
  });

  document.getElementById("coupon-form")?.addEventListener("submit", handleCouponSubmit);
}

// ─── Coupon product dropdown ──────────────────────────────────────────────────
async function loadSellerProductsForCoupon() {
  const dropdown = document.getElementById("couponProduct");
  if (!dropdown) return;
  dropdown.innerHTML = `<option value="">Loading...</option>`;
  dropdown.disabled  = true;

  try {
    const data     = await apiFetch("/seller/products?limit=100");
    const products = data?.data?.products || [];
    dropdown.innerHTML = `<option value="">-- Choose a product --</option>`;
    if (!products.length) {
      dropdown.innerHTML = `<option value="">No products available</option>`;
      return;
    }
    products.forEach((p) => {
      const opt = document.createElement("option");
      opt.value       = p.id;
      opt.textContent = p.name;
      dropdown.appendChild(opt);
    });
    dropdown.disabled = false;
  } catch (err) {
    dropdown.innerHTML = `<option value="">Failed to load products</option>`;
    console.error("loadSellerProductsForCoupon:", err);
  }
}

// ─── Coupon submit ────────────────────────────────────────────────────────────
async function handleCouponSubmit(e) {
  e.preventDefault();
  const code       = document.getElementById("coupon-code")?.value.trim().toUpperCase();
  const discount   = parseInt(document.getElementById("discount")?.value);
  const productId  = document.getElementById("couponProduct")?.value;
  const expiryDate = document.getElementById("couponExpiry")?.value;
  const usageLimit = parseInt(document.getElementById("couponLimit")?.value) || 0;

  if (!code)                           return alert("Please enter a coupon code.");
  if (discount < 1 || discount > 100)  return alert("Discount must be 1–100%.");
  if (!productId)                      return alert("Please select a product.");

  try {
    const coupons = JSON.parse(localStorage.getItem("mm_coupons") || "[]");
    coupons.push({ code, discount, productId, expiryDate, usageLimit, createdAt: new Date().toISOString() });
    localStorage.setItem("mm_coupons", JSON.stringify(coupons));
    alert(`Coupon created!\nCode: ${code}  |  Discount: ${discount}%`);
    e.target.reset();
    document.getElementById("coupons-modal").style.display = "none";
  } catch (err) {
    alert("Error saving coupon: " + err.message);
  }
}

// ─── Sales Chart ──────────────────────────────────────────────────────────────
async function renderSalesChart() {
  if (typeof Chart === "undefined") { alert("Chart library not loaded."); return; }

  const ctx = document.getElementById("salesChart")?.getContext("2d");
  if (!ctx) return;

  if (window._salesChartInstance) {
    window._salesChartInstance.destroy();
    window._salesChartInstance = null;
  }

  let monthlySales = new Array(12).fill(0);

  try {
    const data   = await apiFetch("/seller/orders?limit=200");
    const orders = data?.data?.orders || [];
    orders.forEach((o) => {
      if (o.createdAt && o.totalAmount) {
        const month = new Date(o.createdAt).getMonth();
        monthlySales[month] += Number(o.totalAmount);
      }
    });
  } catch (err) {
    console.warn("Sales chart: could not fetch orders, showing empty chart.", err);
  }

  const labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  window._salesChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Monthly Sales (₦)",
        data: monthlySales,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.1)",
        fill: true, tension: 0.35,
        pointRadius: 5, pointHoverRadius: 7,
        pointBackgroundColor: "#3b82f6", pointBorderColor: "#fff", pointBorderWidth: 2,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { display: true, position: "top" },
        title: { display: true, text: "Your Monthly Sales Performance" },
        tooltip: { callbacks: { label: (ctx) => " ₦" + Number(ctx.parsed.y).toLocaleString() } },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => "₦" + Number(v).toLocaleString() },
          title: { display: true, text: "Sales (₦)" },
        },
        x: { title: { display: true, text: "Month" } },
      },
    },
  });
}