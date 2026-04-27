/* ============================================================
   sellers layout.js  —  MarketMix Seller Dashboard
   Backend: https://marketmix-backend.onrender.com/api
   ============================================================ */

const API_BASE = "https://marketmix-backend.onrender.com/api";

// ─── Auth helpers ────────────────────────────────────────────
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

// ─── Logout ──────────────────────────────────────────────────
async function handleLogout() {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: authHeaders(),
    });
  } catch (_) {
    /* ignore network errors on logout */
  }
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

// ─── DOM Ready ───────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  initNavToggle();
  initMobilePanel();
  initProfileDropdownClose();
  initTips();
  initActivityModal();
  initModals();

  // Parallel data loads
  const [profileData, statsData, earningsData] = await Promise.allSettled([
    apiFetch("/seller/profile"),
    apiFetch("/seller/orders/stats"),
    apiFetch("/earnings"),
  ]);

  const profile =
    profileData.status === "fulfilled" ? profileData.value?.data?.seller : null;
  const stats =
    statsData.status === "fulfilled" ? statsData.value?.data?.stats : null;
  const earnings =
    earningsData.status === "fulfilled"
      ? earningsData.value?.data?.summary
      : null;

  renderWelcome(profile);
  renderProfileImage(profile);
  renderOverviewCards(stats, earnings, profile);
  renderProgressTracker(profile);
  await renderActivityLog();
});

// ─── Nav Toggle ──────────────────────────────────────────────
function initNavToggle() {
  const toggler = document.getElementById("navbar-toggler");
  const menu = document.getElementById("offcanvasMenu");
  const close = document.getElementById("offcanvasClose");
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

// ─── Mobile Panel ────────────────────────────────────────────
function initMobilePanel() {
  const toggle = document.getElementById("mobileLogoToggle");
  const panel = document.getElementById("mobileLogoPanel");
  const closeBtn = document.getElementById("mobileLogoPanelClose");
  if (!toggle || !panel) return;

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    panel.classList.add("show");
  });
  closeBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    panel.classList.remove("show");
  });
  document.addEventListener("click", (e) => {
    if (!panel.contains(e.target) && !toggle.contains(e.target))
      panel.classList.remove("show");
  });
  panel.addEventListener("click", (e) => e.stopPropagation());

  document.querySelectorAll(".mobile-logo-nav-links a").forEach((l) =>
    l.addEventListener("click", () => panel.classList.remove("show"))
  );
}

// ─── Profile Dropdown ────────────────────────────────────────
function toggleProfileDropdown() {
  const dd = document.getElementById("profileDropdown");
  if (!dd) return;
  dd.style.display = dd.style.display === "flex" ? "none" : "flex";
}
window.toggleProfileDropdown = toggleProfileDropdown;

function initProfileDropdownClose() {
  document.addEventListener("click", (e) => {
    const dd = document.getElementById("profileDropdown");
    const icon = document.querySelector(".profile-icon");
    if (dd && icon && !dd.contains(e.target) && !icon.contains(e.target)) {
      dd.style.display = "none";
    }
  });
}

// ─── Welcome Text ────────────────────────────────────────────
function renderWelcome(profile) {
  const el = document.getElementById("welcomeText");
  if (!el) return;
  const name =
    profile?.firstName ||
    profile?.profile?.businessName ||
    "Seller";
  el.textContent = `Welcome, ${name}!`;
}

// ─── Profile Image ───────────────────────────────────────────
function renderProfileImage(profile) {
  const img = document.getElementById("sellerProfileImage");
  if (!img) return;
  const logo = profile?.profile?.storeLogo;
  if (logo) {
    img.src = logo;
    img.onerror = () => {
      img.src = "";
    };
  }
}

// ─── Overview Cards ──────────────────────────────────────────
function renderOverviewCards(stats, earnings, profile) {
  // Orders
  const orderCard = document.querySelector(
    ".overview-card:nth-child(1) h3"
  );
  if (orderCard && stats) {
    orderCard.textContent = stats.totalOrders ?? "0";
  }

  // Products
  const productCard = document.querySelector(
    ".overview-card:nth-child(2) h3"
  );
  if (productCard && profile) {
    productCard.textContent = profile.productCount ?? "0";
  }

  // Earnings
  const earningsCard = document.querySelector(
    ".overview-card:nth-child(3) h3"
  );
  if (earningsCard && earnings) {
    const total = earnings.totalEarnings ?? 0;
    earningsCard.textContent =
      "$" +
      Number(total).toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
  }

  // Returns — no dedicated endpoint yet; show placeholder
  const returnsCard = document.querySelector(
    ".overview-card:nth-child(4) h3"
  );
  if (returnsCard) {
    returnsCard.textContent = "—";
  }
}

// ─── Progress Tracker ────────────────────────────────────────
function renderProgressTracker(profile) {
  const bar = document.getElementById("progressBar");
  const text = document.getElementById("progress-text");
  if (!bar || !text) return;

  const p = profile?.profile;

  const storeSetupDone = !!(
    p?.businessName &&
    p?.storeLogo &&
    p?.businessAddress
  );

  const kycUrls = p?.kycDocumentUrls || {};
  const kycStatus = kycUrls.kyc_status || null;
  const kycSubmitted = !!kycUrls.kyc_submitted_at;
  const kycApproved = p?.isVerified && kycStatus === "approved";

  const productCount = profile?.productCount ?? 0;
  const totalSales = p?.totalSales ?? 0;

  let progress, color, html;

  if (!storeSetupDone) {
    progress = 20;
    color = "#ef4444";
    html = `<a href="setup-store.html" style="color:#1e293b;text-decoration:underline">Complete your store setup</a>`;
  } else if (kycStatus === "under_review" || (kycStatus === "pending" && kycSubmitted)) {
    progress = 40;
    color = "#f97316";
    html = `<span style="color:#1e293b">Your KYC is under review. We'll notify you once approved.</span>`;
  } else if (!kycApproved) {
    progress = 40;
    color = "#f97316";
    html = `<a href="kyc-verification.html" style="color:#1e293b;text-decoration:underline">Complete KYC verification</a>`;
  } else if (productCount < 1) {
    progress = 60;
    color = "#eab308";
    html = `<a href="sellers product.html" style="color:#1e293b;text-decoration:underline">Add your first product</a>`;
  } else if (totalSales < 1) {
    progress = 75;
    color = "#86efac";
    html = `Make your first sale`;
  } else if (totalSales < 10) {
    progress = 90;
    color = "#22c55e";
    html = `Reach 10 sales`;
  } else {
    progress = 100;
    color = "#3b82f6";
    html = `Verified Seller ✓`;
  }

  bar.style.width = progress + "%";
  bar.style.backgroundColor = color;
  text.innerHTML = html;
}

// ─── Activity Log ────────────────────────────────────────────
async function renderActivityLog() {
  try {
    const data = await apiFetch("/seller/orders?limit=10");
    const orders = data?.data?.orders || [];
    if (!orders.length) return;

    const tickerList = document.getElementById("tickerList");
    const fullLog = document.querySelector(".full-log");
    if (!tickerList) return;

    // Build ticker items from recent orders
    const items = orders.slice(0, 10).map((o) => {
      const label = o.status.charAt(0).toUpperCase() + o.status.slice(1);
      const short = String(o.orderId).substring(0, 8);
      return `Order #${short} — ${label}`;
    });

    tickerList.innerHTML = items
      .map((i) => `<li>${i}</li>`)
      .join("");

    if (fullLog) {
      fullLog.innerHTML = orders
        .slice(0, 20)
        .map((o) => {
          const d = new Date(o.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          const label =
            o.status.charAt(0).toUpperCase() + o.status.slice(1);
          const short = String(o.orderId).substring(0, 8);
          const amt = Number(o.totalAmount).toFixed(2);
          return `<li>Order #${short} — ${label} — $${amt} — ${d}</li>`;
        })
        .join("");
    }
  } catch (_) {
    /* keep static fallback in HTML if API fails */
  }
}

// ─── Seller Tips ─────────────────────────────────────────────
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

// ─── Activity Modal ──────────────────────────────────────────
function initActivityModal() {
  const ticker = document.getElementById("activityTicker");
  const modal = document.getElementById("activityModal");
  const close = document.getElementById("closeModal");

  ticker?.addEventListener("click", () => {
    if (modal) modal.style.display = "block";
  });
  close?.addEventListener("click", () => {
    if (modal) modal.style.display = "none";
  });
  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });
}

// ─── Tool Modals (Coupons + Sales Chart) ─────────────────────
function initModals() {
  const couponsModal = document.getElementById("coupons-modal");
  const salesModal = document.getElementById("sales-modal");

  document.getElementById("marketing-coupons-card")?.addEventListener("click", () => {
    if (couponsModal) couponsModal.style.display = "block";
    loadSellerProductsForCoupon();
  });

  document.getElementById("sales-chart-card")?.addEventListener("click", () => {
    if (salesModal) salesModal.style.display = "block";
    renderSalesChart();
  });

  document.getElementById("close-coupons")?.addEventListener("click", () => {
    if (couponsModal) couponsModal.style.display = "none";
  });
  document.getElementById("close-sales")?.addEventListener("click", () => {
    if (salesModal) salesModal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target?.classList?.contains("modal")) e.target.style.display = "none";
  });

  // Coupon form submit
  document.getElementById("coupon-form")?.addEventListener("submit", handleCouponSubmit);
}

// ─── Load Seller Products for Coupon Dropdown ────────────────
async function loadSellerProductsForCoupon() {
  const dropdown = document.getElementById("couponProduct");
  if (!dropdown) return;
  dropdown.innerHTML = `<option value="">Loading...</option>`;
  dropdown.disabled = true;

  try {
    const data = await apiFetch("/seller/products?limit=100");
    const products = data?.data?.products || [];

    dropdown.innerHTML = `<option value="">-- Choose a product --</option>`;
    if (!products.length) {
      dropdown.innerHTML = `<option value="">No products available</option>`;
      return;
    }
    products.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name;
      dropdown.appendChild(opt);
    });
    dropdown.disabled = false;
  } catch (err) {
    dropdown.innerHTML = `<option value="">Failed to load products</option>`;
    console.error("loadSellerProductsForCoupon:", err);
  }
}

// ─── Coupon Submit ───────────────────────────────────────────
async function handleCouponSubmit(e) {
  e.preventDefault();

  const code = document.getElementById("coupon-code")?.value.trim().toUpperCase();
  const discount = parseInt(document.getElementById("discount")?.value);
  const productId = document.getElementById("couponProduct")?.value;
  const expiryDate = document.getElementById("couponExpiry")?.value;
  const usageLimit = parseInt(document.getElementById("couponLimit")?.value) || 0;

  if (!code) return alert("Please enter a coupon code.");
  if (discount < 1 || discount > 100) return alert("Discount must be 1–100%.");
  if (!productId) return alert("Please select a product.");

  // NOTE: The backend doesn't have a /coupons endpoint yet.
  // When it's added, swap the block below for an apiFetch call.
  // For now we store locally and show success so the UI works.
  try {
    const coupons = JSON.parse(localStorage.getItem("mm_coupons") || "[]");
    coupons.push({ code, discount, productId, expiryDate, usageLimit, createdAt: new Date().toISOString() });
    localStorage.setItem("mm_coupons", JSON.stringify(coupons));

    alert(`✅ Coupon created!\nCode: ${code}  |  Discount: ${discount}%`);
    e.target.reset();
    document.getElementById("coupons-modal").style.display = "none";
  } catch (err) {
    alert("❌ Error saving coupon: " + err.message);
  }
}

// ─── Sales Chart ─────────────────────────────────────────────
async function renderSalesChart() {
  if (typeof Chart === "undefined") {
    alert("Chart library not loaded.");
    return;
  }

  const ctx = document.getElementById("salesChart")?.getContext("2d");
  if (!ctx) return;

  // Destroy previous instance
  if (window._salesChartInstance) {
    window._salesChartInstance.destroy();
    window._salesChartInstance = null;
  }

  let monthlySales = new Array(12).fill(0);

  try {
    // Fetch ALL seller orders (up to 200 for charting)
    const data = await apiFetch("/seller/orders?limit=200");
    const orders = data?.data?.orders || [];

    orders.forEach((o) => {
      if (o.createdAt && o.totalAmount) {
        const month = new Date(o.createdAt).getMonth(); // 0–11
        monthlySales[month] += Number(o.totalAmount);
      }
    });
  } catch (err) {
    console.warn("Sales chart: could not fetch orders, using zeros.", err);
  }

  const labels = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  window._salesChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Monthly Sales ($)",
          data: monthlySales,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59,130,246,0.1)",
          fill: true,
          tension: 0.35,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: "#3b82f6",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: true, position: "top" },
        title: {
          display: true,
          text: "Your Monthly Sales Performance",
        },
        tooltip: {
          callbacks: {
            label: (ctx) => " $" + Number(ctx.parsed.y).toLocaleString(),
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) => "$" + Number(v).toLocaleString(),
          },
          title: { display: true, text: "Sales ($)" },
        },
        x: { title: { display: true, text: "Month" } },
      },
    },
  });
}