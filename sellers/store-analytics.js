const storeAnalyticsDemoData = {
  metrics: {
    audience: [
      { key: "store-followers", title: "Total Store Followers", value: "Loading...", icon: "fa-users", description: "Followers of your active store", comparison: "Loading live follower count..." },
      { title: "Total Store Views", value: "8,462", icon: "fa-store", description: "Visits to the store page", comparison: "Demo comparison: +5.4%" },
      { title: "Total Product Views", value: "12,730", icon: "fa-eye", description: "Views across store products", comparison: "Demo comparison: +11.6%" }
    ],
    salesReputation: [
      { title: "Total Reviews", value: "86", icon: "fa-star", description: "Reviews received", comparison: "Demo comparison: +6.1%" },
      { title: "Monthly Sales", value: "₦1,840,000", icon: "fa-naira-sign", description: "Demo revenue for the latest month", comparison: "Demo comparison: +12.5%" },
      { title: "Monthly Orders/Sales Count", value: "116", icon: "fa-bag-shopping", description: "Orders in the latest demo month", comparison: "Demo comparison: +9.4%" },
      { title: "Refund Reports Received", value: "7", icon: "fa-rotate-left", description: "Reports received in this demo", comparison: "Demo comparison: 1 fewer" }
    ],
    exposure: [
      { title: "Featured Stores Appearances", value: "3,420", icon: "fa-star", description: "Featured Stores impressions", comparison: "Demo comparison: +7.8%" },
      { title: "Product Hero Slider Appearances", value: "5,160", icon: "fa-images", description: "Product hero slider impressions", comparison: "Demo comparison: +10.2%" }
    ]
  },
  monthlySales: {
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    revenue: [1120000, 1280000, 1190000, 1510000, 1635000, 1840000],
    orders: [74, 82, 79, 96, 106, 116],
    previousMonthRevenue: 1635000,
    previousMonthOrders: 106
  },
  visibility: [
    { title: "Featured Stores appearances", value: "3,420", icon: "fa-star", description: "Homepage impressions only; not store visits." },
    { title: "Product hero slider appearances", value: "5,160", icon: "fa-images", description: "Homepage impressions only; not product views." },
    { title: "Total store views", value: "8,462", icon: "fa-store", description: "Visits to the store page." },
    { title: "Total product views", value: "12,730", icon: "fa-eye", description: "Views of products in this store." }
  ],
  reviews: { total: "86", rating: "4.6" },
  refunds: { total: "7" }
};

let salesPerformanceChart = null;
let setupProgressRequest = 0;

function renderMetricCards(containerId, metrics) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = metrics.map((metric) => {
    const isLive = metric.key === "store-followers";
    return `
    <article class="metric-card">
      <div class="metric-card-top">
        <span class="metric-icon" aria-hidden="true"><i class="fas ${metric.icon}"></i></span>
        <span class="metric-demo">${isLive ? "LIVE" : "DEMO"}</span>
      </div>
      <h3>${metric.title}</h3>
      <p class="metric-value"${isLive ? ' id="store-follower-value" aria-live="polite"' : ""}>${metric.value}</p>
      <p class="metric-description"${isLive ? ' id="store-follower-description"' : ""}>${metric.description}</p>
      <p class="metric-comparison"${isLive ? ' id="store-follower-status" aria-live="polite"' : ""}>${metric.comparison}</p>
    </article>
    `;
  }).join("");
}

async function loadStoreFollowerCount() {
  const value = document.getElementById("store-follower-value");
  const description = document.getElementById("store-follower-description");
  const status = document.getElementById("store-follower-status");
  if (!value || !description || !status) return;

  try {
    if (!window.StoreManager) throw new Error("Store services are unavailable.");

    const activeStore = await window.StoreManager.requireActiveStore();
    const storeId = activeStore?.id || window.StoreManager.getActiveStoreId();
    if (!storeId) throw new Error("No active store is selected.");

    const response = await window.StoreManager.apiFetch(
      `/seller/stores/${encodeURIComponent(storeId)}/followers`
    );
    const followerCount = response?.data?.followerCount;

    if (response?.status !== "success" || !Number.isSafeInteger(followerCount) || followerCount < 0) {
      throw new Error(response?.message || "The follower count could not be loaded.");
    }

    value.textContent = followerCount.toLocaleString("en-NG");
    description.textContent = "People following your active store";
    status.textContent = "Live count for the active store";
  } catch (error) {
    console.error("Unable to load store follower count:", error);
    value.textContent = "Unavailable";
    description.textContent = "The live follower count could not be loaded.";
    status.textContent = "Try refreshing the page to load this count.";
  }
}

function formatNaira(amount) {
  return `₦${Number(amount).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

function renderSalesSummary() {
  const container = document.getElementById("sales-summary");
  if (!container) return;

  const { revenue, orders, previousMonthRevenue, previousMonthOrders } = storeAnalyticsDemoData.monthlySales;
  const latestRevenue = revenue[revenue.length - 1];
  const latestOrders = orders[orders.length - 1];
  const revenueChange = ((latestRevenue - previousMonthRevenue) / previousMonthRevenue) * 100;
  const ordersChange = ((latestOrders - previousMonthOrders) / previousMonthOrders) * 100;

  container.innerHTML = `
    <div class="sales-summary-card">
      <span>Latest demo month revenue</span>
      <strong>${formatNaira(latestRevenue)}</strong>
      <small>Demo comparison: ${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(1)}% vs previous month</small>
    </div>
    <div class="sales-summary-card">
      <span>Latest demo month orders</span>
      <strong>${latestOrders.toLocaleString("en-NG")}</strong>
      <small>Demo comparison: ${ordersChange >= 0 ? "+" : ""}${ordersChange.toFixed(1)}% vs previous month</small>
    </div>
  `;
}

function renderSalesChart() {
  const canvas = document.getElementById("sales-performance-chart");
  if (!canvas || typeof Chart === "undefined") return;

  if (salesPerformanceChart) {
    salesPerformanceChart.destroy();
  }

  const { months, revenue, orders } = storeAnalyticsDemoData.monthlySales;
  salesPerformanceChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: months,
      datasets: [
        {
          type: "bar",
          label: "Sales revenue (₦)",
          data: revenue,
          backgroundColor: "rgba(37, 99, 235, 0.78)",
          borderRadius: 6,
          yAxisID: "revenue"
        },
        {
          type: "line",
          label: "Orders",
          data: orders,
          borderColor: "#f97316",
          backgroundColor: "#f97316",
          pointRadius: 4,
          tension: 0.3,
          yAxisID: "orders"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label(context) {
              const value = Number(context.raw);
              return context.dataset.yAxisID === "revenue"
                ? `${context.dataset.label}: ${formatNaira(value)}`
                : `${context.dataset.label}: ${value.toLocaleString("en-NG")}`;
            }
          }
        }
      },
      scales: {
        revenue: {
          type: "linear",
          position: "left",
          beginAtZero: true,
          ticks: { callback: (value) => formatNaira(value) }
        },
        orders: {
          type: "linear",
          position: "right",
          beginAtZero: true,
          grid: { drawOnChartArea: false },
          ticks: { precision: 0 }
        }
      }
    }
  });
}

function renderVisibilityCards() {
  const container = document.getElementById("visibility-metrics");
  if (!container) return;

  container.innerHTML = storeAnalyticsDemoData.visibility.map((metric) => `
    <article class="visibility-card">
      <i class="fas ${metric.icon}" aria-hidden="true"></i>
      <h3>${metric.title}</h3>
      <strong>${metric.value}</strong>
      <p>${metric.description}</p>
    </article>
  `).join("");
}

function renderSetupProgress(progressState) {
  const progressBar = document.getElementById("setup-progress-bar");
  const progressContainer = document.querySelector(".setup-progress-tracker .progress-bar-container");
  const progressLabel = document.getElementById("setup-progress-label");
  const currentMilestone = document.getElementById("setup-current-milestone");
  const nextAction = document.getElementById("setup-next-action");
  const kycStatus = document.getElementById("setup-kyc-status");
  const steps = document.getElementById("setup-steps");
  const verificationNote = document.getElementById("setup-verification-note");

  if (progressBar) {
    progressBar.style.width = `${progressState.progress}%`;
    progressBar.style.backgroundColor = progressState.color;
  }
  if (progressContainer) progressContainer.setAttribute("aria-valuenow", String(progressState.progress));
  if (progressLabel) progressLabel.textContent = `Seller setup progress: ${progressState.progress}%.`;
  if (currentMilestone) currentMilestone.textContent = `Current Homepage milestone: ${progressState.currentMilestone}.`;
  if (nextAction) nextAction.innerHTML = `Next action: ${progressState.trackerHtml || "No next action is currently available."}`;

  if (kycStatus) {
    const statusLabels = {
      pending: "KYC Under Review",
      approved: "KYC Verified",
      rejected: "KYC Rejected",
      not_submitted: "KYC Not Submitted"
    };
    kycStatus.textContent = statusLabels[progressState.kycStatus] || "KYC Status Unavailable";
    kycStatus.className = `progress-badge ${progressState.kycStatus === "approved" ? "green" : progressState.kycStatus === "rejected" ? "red" : "yellow"}`;
  }
  if (verificationNote) {
    verificationNote.textContent = "The progress percentage, current milestone, next action, and KYC state use the Seller Homepage's existing rules.";
  }
  if (!steps) return;

  steps.innerHTML = progressState.milestones.map((stage, index) => {
    const statusLabel = stage.status === "complete" ? "Completed" : stage.status === "current" ? "Current Stage" : "Pending";
    const currentAttribute = stage.status === "current" ? ' aria-current="step"' : "";
    const icon = stage.status === "complete" ? '<i class="fas fa-check" aria-hidden="true"></i>' : String(index + 1);
    return `
      <li class="setup-step setup-step--${stage.status}"${currentAttribute}>
        <span class="setup-step-marker">${icon}</span>
        <h3>${stage.title}</h3>
        <p>${statusLabel}</p>
      </li>
    `;
  }).join("");
}

function showSetupProgressError() {
  const progressLabel = document.getElementById("setup-progress-label");
  const currentMilestone = document.getElementById("setup-current-milestone");
  const nextAction = document.getElementById("setup-next-action");
  const kycStatus = document.getElementById("setup-kyc-status");
  const progressBar = document.getElementById("setup-progress-bar");
  const progressContainer = document.querySelector(".setup-progress-tracker .progress-bar-container");
  const steps = document.getElementById("setup-steps");

  if (progressLabel) progressLabel.textContent = "Unable to load current Seller Homepage progress.";
  if (currentMilestone) currentMilestone.textContent = "Current milestone is unavailable.";
  if (nextAction) nextAction.textContent = "Refresh the page to try again.";
  if (kycStatus) {
    kycStatus.textContent = "Status unavailable";
    kycStatus.className = "progress-badge";
  }
  if (progressBar) progressBar.style.width = "0%";
  if (progressContainer) progressContainer.setAttribute("aria-valuenow", "0");
  if (steps) steps.replaceChildren();
}

async function loadSellerSetupProgress() {
  const requestId = ++setupProgressRequest;
  const progressLabel = document.getElementById("setup-progress-label");
  if (progressLabel) progressLabel.textContent = "Loading current Seller Homepage progress…";

  try {
    if (!window.StoreManager || !window.SellerProgress) {
      throw new Error("Seller progress services are unavailable.");
    }

    const activeStore = await window.StoreManager.requireActiveStore();
    if (!activeStore?.id) throw new Error("No active store is selected.");
    let store = { ...activeStore };

    const stores = await window.StoreManager.loadStores();
    const freshStore = Array.isArray(stores) ? stores.find(item => item?.id === activeStore.id) : null;
    if (freshStore) store = { ...freshStore };

    const [profileResult, userResult, statsResult] = await Promise.allSettled([
      window.StoreManager.apiFetch("/seller/profile"),
      window.StoreManager.apiFetch("/auth/me"),
      window.StoreManager.apiFetch("/seller/dashboard-stats")
    ]);

    if ([profileResult, userResult, statsResult].some(result => result.status !== "fulfilled")) {
      throw new Error("Seller progress data could not be fetched.");
    }

    const profileResponse = profileResult.value;
    const userResponse = userResult.value;
    const statsResponse = statsResult.value;
    const profile = profileResponse?.data?.seller;
    const user = userResponse?.data?.user;
    const stats = statsResponse?.data?.stats;
    if (!profile || !user || !stats ||
        profileResponse?.status !== "success" ||
        userResponse?.status !== "success" ||
        statsResponse?.status !== "success") {
      throw new Error("Seller progress data was incomplete.");
    }

    const existingProductCount = Number(store.productCount || store.product_count || 0);
    const existingTotalSales = Number(store.total_sales || store.totalSales || 0);
    store.productCount = stats.product_count ?? stats.productCount ?? existingProductCount;
    store.total_sales = stats.total_sales ?? stats.totalSales ?? stats.totalOrders ?? existingTotalSales;

    const progressState = window.SellerProgress.calculate(
      profile,
      store,
      user,
      window.sellerDashboardState?.kycStatus || "not_submitted"
    );
    if (requestId === setupProgressRequest) renderSetupProgress(progressState);
  } catch (error) {
    console.error("Unable to load Seller Homepage progress:", error);
    if (requestId === setupProgressRequest) showSetupProgressError();
  }
}

function renderActivitySummaries() {
  const reviews = document.getElementById("reviews-summary");
  const refunds = document.getElementById("refunds-summary");

  if (reviews) {
    reviews.innerHTML = `
      <div class="activity-summary"><strong>${storeAnalyticsDemoData.reviews.total}</strong><span>demo reviews received</span></div>
      <p class="metric-description">Average demo rating: <strong>${storeAnalyticsDemoData.reviews.rating} / 5</strong> <span class="rating-stars" aria-label="${storeAnalyticsDemoData.reviews.rating} out of 5 stars">★★★★★</span></p>
    `;
  }
  if (refunds) {
    refunds.innerHTML = `
      <div class="activity-summary"><strong>${storeAnalyticsDemoData.refunds.total}</strong><span>demo refund reports received</span></div>
      <p class="metric-description">Report counts are illustrative; no live refund records or statuses are loaded.</p>
    `;
  }
}

function updateDateRangeLabel() {
  const filter = document.getElementById("date-filter");
  const status = document.getElementById("range-status");
  if (!filter || !status) return;
  const selectedLabel = filter.options[filter.selectedIndex].text;
  status.textContent = `Showing demo data for ${selectedLabel}. Changing this filter updates the selected UI state only.`;
}

function toggleProfileDropdown() {
  const dropdown = document.getElementById("profileDropdown");
  if (!dropdown) return;
  dropdown.style.display = dropdown.style.display === "flex" ? "none" : "flex";
}

function renderProfileImage(profile) {
  const images = document.querySelectorAll("#sellerProfileImage, #sellerProfileImageMobile, .navbar-toggler-icon");
  const store = window.StoreManager?.getActiveStore?.();
  const imageUrl = store?.store_logo_url || profile?.profile?.storeLogo || profile?.avatarUrl || "";
  if (!imageUrl) return;

  images.forEach((image) => {
    if (image.src === imageUrl) return;
    image.onerror = () => {
      image.removeAttribute("src");
      image.style.backgroundColor = "#e2e8f0";
    };
    image.src = imageUrl;
  });
}

async function loadProfileImage() {
  if (!window.StoreManager?.getToken?.()) return;

  try {
    const response = await window.StoreManager.apiFetch("/seller/profile");
    const profile = response?.data?.seller;
    if (profile) renderProfileImage(profile);
  } catch (error) {
    console.error("Unable to load seller profile image:", error);
  }
}

window.toggleProfileDropdown = toggleProfileDropdown;

document.addEventListener("DOMContentLoaded", () => {
  const toggler = document.getElementById("navbar-toggler");
  const menu = document.getElementById("offcanvasMenu");
  const closeButton = document.getElementById("offcanvasClose");
  const profileDropdown = document.getElementById("profileDropdown");

  renderProfileImage();
  loadProfileImage();
  loadSellerSetupProgress();
  window.addEventListener("storeChanged", () => {
    renderProfileImage();
    loadProfileImage();
    loadSellerSetupProgress();
  });
  window.addEventListener("focus", loadSellerSetupProgress);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") loadSellerSetupProgress();
  });
  window.setInterval(loadSellerSetupProgress, 15 * 60_000);

  function closeMenu() {
    if (!menu || !toggler) return;
    menu.classList.remove("show");
    menu.setAttribute("aria-hidden", "true");
    toggler.setAttribute("aria-expanded", "false");
  }

  if (toggler && menu) {
    toggler.addEventListener("click", () => {
      menu.classList.add("show");
      menu.setAttribute("aria-hidden", "false");
      toggler.setAttribute("aria-expanded", "true");
    });
    closeButton?.addEventListener("click", closeMenu);
    menu.addEventListener("click", (event) => {
      if (event.target === menu) closeMenu();
    });
    menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
    document.addEventListener("click", (event) => {
      if (!menu.contains(event.target) && !toggler.contains(event.target)) closeMenu();
    });
  }

  document.addEventListener("click", (event) => {
    if (profileDropdown && !profileDropdown.contains(event.target) && !event.target.closest("#sellerProfileImage")) {
      profileDropdown.style.display = "none";
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
      if (profileDropdown) profileDropdown.style.display = "none";
    }
  });

  renderMetricCards("audience-metrics", storeAnalyticsDemoData.metrics.audience);
  renderMetricCards("sales-reputation-metrics", storeAnalyticsDemoData.metrics.salesReputation);
  renderMetricCards("exposure-metrics", storeAnalyticsDemoData.metrics.exposure);
  loadStoreFollowerCount();
  renderSalesSummary();
  renderVisibilityCards();
  renderActivitySummaries();

  const dateFilter = document.getElementById("date-filter");
  dateFilter?.addEventListener("change", updateDateRangeLabel);
  updateDateRangeLabel(dateFilter?.value || "30days");

  if (typeof Chart === "undefined") {
    const chartNote = document.querySelector(".chart-note");
    if (chartNote) chartNote.textContent = "The chart library did not load. Demo revenue and order summaries are still shown above.";
  } else {
    renderSalesChart();
  }
});
