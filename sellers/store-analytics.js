const storeAnalyticsDemoData = {
  metrics: {
    audience: [
      { key: "store-followers", title: "Total Store Followers", value: "Loading...", icon: "fa-users", description: "Followers of your active store", comparison: "Loading live follower count..." },
      { title: "Total Store Views", value: "8,462", icon: "fa-store", description: "Visits to the store page", comparison: "Demo comparison: +5.4%" },
      { key: "product-views", title: "Total Product Views", value: "Loading...", icon: "fa-eye", description: "Views across active products in your store", comparison: "Loading live product view analytics..." }
    ],
    salesReputation: [
      { key: "total-reviews", title: "Total Customer Reviews", value: "Loading...", icon: "fa-star", description: "Reviews for products in your active store", comparison: "Loading live review analytics..." },
      { key: "monthly-sales", title: "Monthly Sales", value: "Loading...", icon: "fa-naira-sign", description: "Net sales for the current month", comparison: "Loading monthly analytics..." },
      { key: "monthly-orders", title: "Monthly Orders", value: "Loading...", icon: "fa-bag-shopping", description: "Successfully paid orders for the current month", comparison: "Loading monthly analytics..." },
      { key: "refund-reports", title: "Refund Reports Received", value: "Loading...", icon: "fa-rotate-left", description: "Refund reports received for your active store", comparison: "Loading live refund analytics..." }
    ],
    exposure: [
      { title: "Featured Stores Appearances", value: "3,420", icon: "fa-star", description: "Featured Stores impressions", comparison: "Demo comparison: +7.8%" },
      { title: "Product Hero Slider Appearances", value: "5,160", icon: "fa-images", description: "Product hero slider impressions", comparison: "Demo comparison: +10.2%" }
    ]
  },
  visibility: [
    { title: "Featured Stores appearances", value: "3,420", icon: "fa-star", description: "Homepage impressions only; not store visits." },
    { title: "Product hero slider appearances", value: "5,160", icon: "fa-images", description: "Homepage impressions only; not product views." },
    { title: "Total store views", value: "8,462", icon: "fa-store", description: "Visits to the store page." },
    { title: "Total product views", value: "12,730", icon: "fa-eye", description: "Views of products in this store." }
  ],
};

let salesPerformanceChart = null;
let setupProgressRequest = 0;
let monthlyAnalyticsRequest = 0;
let reviewAnalyticsRequest = 0;
let refundAnalyticsRequest = 0;
let productViewAnalyticsRequest = 0;

function renderMetricCards(containerId, metrics) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = metrics.map((metric) => {
    const isFollowerMetric = metric.key === "store-followers";
    const isMonthlyMetric = metric.key === "monthly-sales" || metric.key === "monthly-orders";
    const isReviewMetric = metric.key === "total-reviews";
    const isRefundMetric = metric.key === "refund-reports";
    const isProductViewMetric = metric.key === "product-views";
    const isLive = isFollowerMetric || isMonthlyMetric || isReviewMetric || isRefundMetric || isProductViewMetric;
    const valueId = isFollowerMetric
      ? "store-follower-value"
      : (isReviewMetric
        ? "review-total-value"
        : (isRefundMetric
          ? "refund-report-value"
          : (isProductViewMetric ? "product-view-value" : `monthly-${metric.key?.replace("monthly-", "")}-value`)));
    const descriptionId = isFollowerMetric
      ? "store-follower-description"
      : (isReviewMetric
        ? "review-total-description"
        : (isRefundMetric
          ? "refund-report-description"
          : (isProductViewMetric ? "product-view-description" : `monthly-${metric.key?.replace("monthly-", "")}-description`)));
    const statusId = isFollowerMetric
      ? "store-follower-status"
      : (isReviewMetric
        ? "review-total-status"
        : (isRefundMetric
          ? "refund-report-status"
          : (isProductViewMetric ? "product-view-status" : `monthly-${metric.key?.replace("monthly-", "")}-status`)));
    return `
    <article class="metric-card">
      <div class="metric-card-top">
        <span class="metric-icon" aria-hidden="true"><i class="fas ${metric.icon}"></i></span>
        <span class="metric-demo">${isLive ? "LIVE" : "DEMO"}</span>
      </div>
      <h3>${metric.title}</h3>
      <p class="metric-value"${isLive ? ` id="${valueId}" aria-live="polite"` : ""}>${metric.value}</p>
      <p class="metric-description"${isLive ? ` id="${descriptionId}"` : ""}>${metric.description}</p>
      <p class="metric-comparison"${isLive ? ` id="${statusId}" aria-live="polite"` : ""}>${metric.comparison}</p>
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

function getCurrentUtcMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-NG", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function getLastSixMonths(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(year, monthNumber - 6 + index, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

function isValidMonthlyHistory(history, month) {
  const expectedMonths = getLastSixMonths(month);
  return Array.isArray(history) &&
    history.length === expectedMonths.length &&
    history.every((item, index) =>
      item?.month === expectedMonths[index] &&
      Number.isSafeInteger(item.monthlyOrderCount) &&
      item.monthlyOrderCount >= 0 &&
      Number.isFinite(item.grossMonthlySales) &&
      item.grossMonthlySales >= 0 &&
      Number.isFinite(item.netMonthlySales) &&
      item.netMonthlySales >= 0
    );
}

function setMonthlyMetricState(metric, state, monthLabel, message = "") {
  const value = document.getElementById(`monthly-${metric}-value`);
  const description = document.getElementById(`monthly-${metric}-description`);
  const status = document.getElementById(`monthly-${metric}-status`);
  if (!value || !description || !status) return;

  if (state === "loading") {
    value.textContent = "Loading...";
    description.textContent = `${metric === "sales" ? "Net sales" : "Successfully paid orders"} for ${monthLabel}`;
    status.textContent = "Loading live monthly analytics...";
    return;
  }

  if (state === "error") {
    value.textContent = "Unavailable";
    description.textContent = `Live ${metric === "sales" ? "sales" : "order count"} unavailable for ${monthLabel}`;
    status.textContent = message || "Try refreshing the page to load this metric.";
  }
}

function monthlyComparison(current, previous) {
  if (current === 0 && previous === 0) return "No change vs previous month";
  if (previous === 0) return "New activity vs previous month";
  const change = ((current - previous) / previous) * 100;
  return `${change >= 0 ? "+" : ""}${change.toFixed(1)}% vs previous month`;
}

function renderSalesSummary(monthlyHistory) {
  const container = document.getElementById("sales-summary");
  if (!container) return;

  const currentMonth = monthlyHistory[monthlyHistory.length - 1];
  const previousMonth = monthlyHistory[monthlyHistory.length - 2];
  container.innerHTML = `
    <div class="sales-summary-card">
      <span>Current month net sales</span>
      <strong>${formatNaira(currentMonth.netMonthlySales)}</strong>
      <small>${monthlyComparison(currentMonth.netMonthlySales, previousMonth.netMonthlySales)}</small>
    </div>
    <div class="sales-summary-card">
      <span>Current month orders</span>
      <strong>${currentMonth.monthlyOrderCount.toLocaleString("en-NG")}</strong>
      <small>${monthlyComparison(currentMonth.monthlyOrderCount, previousMonth.monthlyOrderCount)}</small>
    </div>
  `;
}

function setSalesPerformanceState(state) {
  const description = document.getElementById("monthly-chart-description");
  const badge = document.getElementById("monthly-chart-badge");
  const summary = document.getElementById("sales-summary");
  const chartNote = document.querySelector(".chart-note");
  if (salesPerformanceChart) {
    salesPerformanceChart.destroy();
    salesPerformanceChart = null;
  }

  if (state === "loading") {
    if (description) description.textContent = "Loading live sales and paid-order trends for the latest six months.";
    if (badge) badge.textContent = "LOADING";
    if (summary) {
      summary.innerHTML = `
        <div class="sales-summary-card"><span>Current month net sales</span><strong>Loading...</strong><small>Loading live comparison...</small></div>
        <div class="sales-summary-card"><span>Current month orders</span><strong>Loading...</strong><small>Loading live comparison...</small></div>
      `;
    }
    if (chartNote) chartNote.textContent = "Loading live monthly sales and order data.";
    return;
  }

  if (state === "error") {
    if (description) description.textContent = "Live monthly sales performance is unavailable.";
    if (badge) badge.textContent = "UNAVAILABLE";
    if (summary) {
      summary.innerHTML = `
        <div class="sales-summary-card"><span>Current month net sales</span><strong>Unavailable</strong><small>Live comparison unavailable</small></div>
        <div class="sales-summary-card"><span>Current month orders</span><strong>Unavailable</strong><small>Live comparison unavailable</small></div>
      `;
    }
    if (chartNote) chartNote.textContent = "Live chart data could not be loaded. Refresh the page to try again.";
    return;
  }

  if (description) description.textContent = "Live net sales and paid-order trends for the latest six calendar months.";
  if (badge) badge.textContent = "LIVE DATA";
  if (chartNote) chartNote.textContent = "Sales show net product revenue after platform commission. Shipping and refunds are excluded.";
}

async function loadMonthlyAnalytics() {
  const requestId = ++monthlyAnalyticsRequest;
  const month = getCurrentUtcMonth();
  const monthLabel = formatMonthLabel(month);
  setMonthlyMetricState("sales", "loading", monthLabel);
  setMonthlyMetricState("orders", "loading", monthLabel);
  setSalesPerformanceState("loading");

  try {
    if (!window.StoreManager) throw new Error("Store services are unavailable.");

    const activeStore = await window.StoreManager.requireActiveStore();
    const storeId = activeStore?.id || window.StoreManager.getActiveStoreId();
    if (!storeId) throw new Error("No active store is selected.");

    const query = new URLSearchParams({ month, storeId: String(storeId) });
    const response = await window.StoreManager.apiFetch(
      `/seller/stores/monthly-analytics?${query}`,
      { headers: { "X-Store-Id": String(storeId) } }
    );
    if (requestId !== monthlyAnalyticsRequest) return;

    const analytics = response?.data;
    const netMonthlySales = analytics?.netMonthlySales;
    const monthlyOrderCount = analytics?.monthlyOrderCount;
    if (response?.status !== "success" ||
        analytics?.storeId !== storeId ||
        analytics?.month !== month ||
        typeof netMonthlySales !== "number" ||
        !Number.isFinite(netMonthlySales) ||
        netMonthlySales < 0 ||
        !Number.isSafeInteger(monthlyOrderCount) ||
        monthlyOrderCount < 0 ||
        !isValidMonthlyHistory(analytics?.monthlyHistory, month)) {
      throw new Error(response?.message || "Monthly analytics data was incomplete.");
    }

    const currentHistory = analytics.monthlyHistory[analytics.monthlyHistory.length - 1];
    if (currentHistory.netMonthlySales !== netMonthlySales ||
        currentHistory.monthlyOrderCount !== monthlyOrderCount) {
      throw new Error("Monthly analytics summary did not match its history.");
    }

    document.getElementById("monthly-sales-value").textContent = formatNaira(netMonthlySales);
    document.getElementById("monthly-sales-description").textContent = `Net sales for ${monthLabel}`;
    document.getElementById("monthly-sales-status").textContent = "Live data for the active store";
    document.getElementById("monthly-orders-value").textContent = monthlyOrderCount.toLocaleString("en-NG");
    document.getElementById("monthly-orders-description").textContent = `Successfully paid orders for ${monthLabel}`;
    document.getElementById("monthly-orders-status").textContent = "Live data for the active store";
    setSalesPerformanceState("success");
    renderSalesSummary(analytics.monthlyHistory);
    renderSalesChart(analytics.monthlyHistory);
  } catch (error) {
    console.error("Unable to load monthly store analytics:", error);
    if (requestId !== monthlyAnalyticsRequest) return;
    const message = error.message === "Unauthorized"
      ? "Your seller session has expired. Sign in again to view this metric."
      : "Try refreshing the page to load these metrics.";
    setMonthlyMetricState("sales", "error", monthLabel, message);
    setMonthlyMetricState("orders", "error", monthLabel, message);
    setSalesPerformanceState("error");
  }
}

function setReviewAnalyticsState(state, data = null) {
  const totalValue = document.getElementById("review-total-value");
  const totalDescription = document.getElementById("review-total-description");
  const totalStatus = document.getElementById("review-total-status");
  const summary = document.getElementById("reviews-summary");
  if (!totalValue || !totalDescription || !totalStatus || !summary) return;

  if (state === "loading") {
    totalValue.textContent = "Loading...";
    totalDescription.textContent = "Reviews for products in your active store";
    totalStatus.textContent = "Loading live review analytics...";
    summary.innerHTML = `
      <div class="activity-summary"><strong>Loading...</strong><span>customer reviews</span></div>
      <p class="metric-description">Average review rating: <strong>Loading...</strong></p>
      <p class="future-note" id="review-analytics-status">Loading review analytics for the active store.</p>
    `;
    return;
  }

  if (state === "error") {
    totalValue.textContent = "Unavailable";
    totalDescription.textContent = "Live customer review count is unavailable.";
    totalStatus.textContent = "Try refreshing the page to load this metric.";
    summary.innerHTML = `
      <div class="activity-summary"><strong>Unavailable</strong><span>customer reviews</span></div>
      <p class="metric-description">Average review rating: <strong>Unavailable</strong></p>
      <p class="future-note" id="review-analytics-status">Live review analytics could not be loaded.</p>
    `;
    return;
  }

  const { totalReviews, averageRating } = data;
  totalValue.textContent = totalReviews.toLocaleString("en-NG");
  totalDescription.textContent = totalReviews === 0
    ? "No qualifying reviews for the active store"
    : "Approved, published reviews for the active store";
  totalStatus.textContent = "Live data for the active store";

  const stars = "★".repeat(Math.round(averageRating)) + "☆".repeat(5 - Math.round(averageRating));
  summary.innerHTML = `
    <div class="activity-summary"><strong>${totalReviews.toLocaleString("en-NG")}</strong><span>customer reviews</span></div>
    <p class="metric-description">Average review rating: <strong>${averageRating.toFixed(2)} / 5</strong> <span class="rating-stars" aria-label="${averageRating.toFixed(2)} out of 5 stars">${stars}</span></p>
    <p class="future-note" id="review-analytics-status">${totalReviews === 0
      ? "No qualifying reviews yet for the active store."
      : "Live review analytics for the active store."}</p>
  `;
}

async function loadStoreReviewAnalytics() {
  const requestId = ++reviewAnalyticsRequest;
  setReviewAnalyticsState("loading");

  try {
    if (!window.StoreManager) throw new Error("Store services are unavailable.");

    const activeStore = await window.StoreManager.requireActiveStore();
    const storeId = activeStore?.id || window.StoreManager.getActiveStoreId();
    if (!storeId) throw new Error("No active store is selected.");

    const query = new URLSearchParams({ storeId: String(storeId) });
    const response = await window.StoreManager.apiFetch(
      `/seller/stores/review-analytics?${query}`,
      { headers: { "X-Store-Id": String(storeId) } }
    );
    if (requestId !== reviewAnalyticsRequest) return;

    const analytics = response?.data;
    if (response?.status !== "success" ||
        analytics?.storeId !== storeId ||
        !Number.isSafeInteger(analytics?.totalReviews) ||
        analytics.totalReviews < 0 ||
        typeof analytics.averageRating !== "number" ||
        !Number.isFinite(analytics.averageRating) ||
        analytics.averageRating < 0 ||
        analytics.averageRating > 5) {
      throw new Error(response?.message || "Store review analytics data was incomplete.");
    }

    setReviewAnalyticsState("success", analytics);
  } catch (error) {
    console.error("Unable to load store review analytics:", error);
    if (requestId === reviewAnalyticsRequest) setReviewAnalyticsState("error");
  }
}

function setRefundAnalyticsState(state, reportCount = null) {
  const value = document.getElementById("refund-report-value");
  const description = document.getElementById("refund-report-description");
  const status = document.getElementById("refund-report-status");
  const summary = document.getElementById("refunds-summary");
  if (!value || !description || !status || !summary) return;

  if (state === "loading") {
    value.textContent = "Loading...";
    description.textContent = "Refund reports received for your active store";
    status.textContent = "Loading live refund analytics...";
    summary.innerHTML = `
      <div class="activity-summary"><strong>Loading...</strong><span>refund reports received</span></div>
      <p class="future-note" id="refund-analytics-status">Loading refund analytics for the active store.</p>
    `;
    return;
  }

  if (state === "error") {
    value.textContent = "Unavailable";
    description.textContent = "The live refund report count is unavailable.";
    status.textContent = "Try refreshing the page to load this metric.";
    summary.innerHTML = `
      <div class="activity-summary"><strong>Unavailable</strong><span>refund reports received</span></div>
      <p class="future-note" id="refund-analytics-status">Live refund analytics could not be loaded.</p>
    `;
    return;
  }

  value.textContent = reportCount.toLocaleString("en-NG");
  description.textContent = reportCount === 0
    ? "No refund reports recorded for the active store"
    : "Refund reports received for the active store";
  status.textContent = "Live data for the active store";
  summary.innerHTML = `
    <div class="activity-summary"><strong>${reportCount.toLocaleString("en-NG")}</strong><span>refund reports received</span></div>
    <p class="future-note" id="refund-analytics-status">${reportCount === 0
      ? "No refund reports have been recorded for the active store."
      : "Live refund report count for the active store."}</p>
  `;
}

async function loadStoreRefundAnalytics() {
  const requestId = ++refundAnalyticsRequest;
  setRefundAnalyticsState("loading");

  try {
    if (!window.StoreManager) throw new Error("Store services are unavailable.");

    const activeStore = await window.StoreManager.requireActiveStore();
    if (requestId !== refundAnalyticsRequest) return;
    const storeId = activeStore?.id || window.StoreManager.getActiveStoreId();
    if (!storeId) throw new Error("No active store is selected.");

    const response = await window.StoreManager.apiFetch(
      "/seller/stores/refund-analytics",
      { headers: { "X-Store-Id": String(storeId) } }
    );
    if (requestId !== refundAnalyticsRequest) return;

    const analytics = response?.data;
    if (response?.status !== "success" ||
        analytics?.storeId !== storeId ||
        !Number.isSafeInteger(analytics?.refundReportsReceived) ||
        analytics.refundReportsReceived < 0) {
      throw new Error(response?.message || "Store refund analytics data was incomplete.");
    }

    setRefundAnalyticsState("success", analytics.refundReportsReceived);
  } catch (error) {
    console.error("Unable to load store refund analytics:", error);
    if (requestId === refundAnalyticsRequest) setRefundAnalyticsState("error");
  }
}

function setProductViewAnalyticsState(state, totalViews = null) {
  const value = document.getElementById("product-view-value");
  const description = document.getElementById("product-view-description");
  const status = document.getElementById("product-view-status");
  if (!value || !description || !status) return;

  if (state === "loading") {
    value.textContent = "Loading...";
    description.textContent = "Views across active products in your store";
    status.textContent = "Loading live product view analytics...";
    return;
  }

  if (state === "error") {
    value.textContent = "Unavailable";
    description.textContent = "The live product view count is unavailable.";
    status.textContent = "Try refreshing the page to load this metric.";
    return;
  }

  value.textContent = totalViews.toLocaleString("en-NG");
  description.textContent = totalViews === 0
    ? "No views recorded for active products in this store"
    : "Views across active products in your store";
  status.textContent = "Live data for the active store";
}

async function loadStoreProductViewAnalytics() {
  const requestId = ++productViewAnalyticsRequest;
  setProductViewAnalyticsState("loading");

  try {
    if (!window.StoreManager) throw new Error("Store services are unavailable.");

    const activeStore = await window.StoreManager.requireActiveStore();
    if (requestId !== productViewAnalyticsRequest) return;
    const storeId = activeStore?.id || window.StoreManager.getActiveStoreId();
    if (!storeId) throw new Error("No active store is selected.");

    const response = await window.StoreManager.apiFetch(
      "/seller/stores/product-view-analytics",
      { headers: { "X-Store-Id": String(storeId) } }
    );
    if (requestId !== productViewAnalyticsRequest) return;

    const analytics = response?.data;
    if (response?.status !== "success" ||
        analytics?.storeId !== storeId ||
        !Number.isSafeInteger(analytics?.totalProductViews) ||
        analytics.totalProductViews < 0 ||
        !Array.isArray(analytics.products) ||
        !analytics.products.every((product) =>
          typeof product?.productId === "string" &&
          typeof product?.productName === "string" &&
          Number.isSafeInteger(product?.views) &&
          product.views >= 0
        )) {
      throw new Error(response?.message || "Store product view analytics data was incomplete.");
    }

    setProductViewAnalyticsState("success", analytics.totalProductViews);
  } catch (error) {
    console.error("Unable to load store product view analytics:", error);
    if (requestId === productViewAnalyticsRequest) setProductViewAnalyticsState("error");
  }
}

function renderSalesChart(monthlyHistory) {
  const canvas = document.getElementById("sales-performance-chart");
  if (!canvas) return;
  if (typeof Chart === "undefined") {
    const chartNote = document.querySelector(".chart-note");
    if (chartNote) chartNote.textContent = "Live monthly figures loaded, but the chart library is unavailable.";
    const badge = document.getElementById("monthly-chart-badge");
    if (badge) badge.textContent = "CHART UNAVAILABLE";
    return;
  }

  if (salesPerformanceChart) {
    salesPerformanceChart.destroy();
  }

  const months = monthlyHistory.map((item) => item.month);
  const revenue = monthlyHistory.map((item) => item.netMonthlySales);
  const orders = monthlyHistory.map((item) => item.monthlyOrderCount);
  canvas.setAttribute("aria-label", "Live chart of net sales and paid order counts for the latest six months");
  salesPerformanceChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: months,
      datasets: [
        {
          type: "bar",
          label: "Net sales (₦)",
          data: revenue,
          backgroundColor: "rgba(37, 99, 235, 0.78)",
          borderRadius: 6,
          yAxisID: "revenue"
        },
        {
          type: "line",
          label: "Paid orders",
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
      <div class="activity-summary"><strong>Loading...</strong><span>customer reviews</span></div>
      <p class="metric-description">Average review rating: <strong>Loading...</strong></p>
      <p class="future-note" id="review-analytics-status">Loading review analytics for the active store.</p>
    `;
  }
  if (refunds) {
    setRefundAnalyticsState("loading");
  }
}

function updateDateRangeLabel() {
  const filter = document.getElementById("date-filter");
  const status = document.getElementById("range-status");
  if (!filter || !status) return;
  const selectedLabel = filter.options[filter.selectedIndex].text;
  status.textContent = `Demo UI range: ${selectedLabel}. Live Monthly Sales and Monthly Orders are for ${formatMonthLabel(getCurrentUtcMonth())}; the range selector does not change their request.`;
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
    loadMonthlyAnalytics();
    loadStoreReviewAnalytics();
    loadStoreRefundAnalytics();
    loadStoreProductViewAnalytics();
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
  loadMonthlyAnalytics();
  loadStoreReviewAnalytics();
  loadStoreRefundAnalytics();
  loadStoreProductViewAnalytics();
  renderVisibilityCards();
  renderActivitySummaries();

  const dateFilter = document.getElementById("date-filter");
  dateFilter?.addEventListener("change", updateDateRangeLabel);
  updateDateRangeLabel(dateFilter?.value || "30days");

});
