const storeAnalyticsDemoData = {
  metrics: {
    audience: [
      { title: "Total Store Followers", value: "1,284", icon: "fa-users", description: "People following this store", comparison: "Demo comparison: +8.2%" },
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
  setup: {
    completedStages: 2,
    currentStage: 2,
    stages: [
      { title: "Upload First Product", status: "complete", detail: "Completed in demo state" },
      { title: "Complete KYC", status: "complete", detail: "Submitted in demo state" },
      { title: "KYC Under Review", status: "current", detail: "Current demo stage" },
      { title: "Fully Verified", status: "pending", detail: "Pending review outcome" }
    ]
  },
  reviews: { total: "86", rating: "4.6" },
  refunds: { total: "7" }
};

let salesPerformanceChart = null;

function renderMetricCards(containerId, metrics) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = metrics.map((metric) => `
    <article class="metric-card">
      <div class="metric-card-top">
        <span class="metric-icon" aria-hidden="true"><i class="fas ${metric.icon}"></i></span>
        <span class="metric-demo">DEMO</span>
      </div>
      <h3>${metric.title}</h3>
      <p class="metric-value">${metric.value}</p>
      <p class="metric-description">${metric.description}</p>
      <p class="metric-comparison">${metric.comparison}</p>
    </article>
  `).join("");
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

function renderSetupProgress() {
  const { completedStages, currentStage, stages } = storeAnalyticsDemoData.setup;
  const percent = Math.round((completedStages / stages.length) * 100);
  const progressBar = document.getElementById("setup-progress-bar");
  const progressContainer = document.querySelector(".setup-progress-tracker .progress-bar-container");
  const progressLabel = document.getElementById("setup-progress-label");
  const steps = document.getElementById("setup-steps");

  if (progressBar) progressBar.style.width = `${percent}%`;
  if (progressContainer) progressContainer.setAttribute("aria-valuenow", String(percent));
  if (progressLabel) progressLabel.textContent = `${completedStages} of ${stages.length} setup steps complete in this demo (${percent}%).`;
  if (!steps) return;

  steps.innerHTML = stages.map((stage, index) => {
    const statusLabel = stage.status === "complete" ? "Completed" : stage.status === "current" ? "Current Stage" : "Pending";
    const currentAttribute = stage.status === "current" ? ' aria-current="step"' : "";
    const icon = stage.status === "complete" ? '<i class="fas fa-check" aria-hidden="true"></i>' : String(index + 1);
    return `
      <li class="setup-step setup-step--${stage.status}"${currentAttribute}>
        <span class="setup-step-marker">${icon}</span>
        <h3>${stage.title}</h3>
        <p>${statusLabel} — ${stage.detail}</p>
      </li>
    `;
  }).join("");
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

window.toggleProfileDropdown = toggleProfileDropdown;

document.addEventListener("DOMContentLoaded", () => {
  const toggler = document.getElementById("navbar-toggler");
  const menu = document.getElementById("offcanvasMenu");
  const closeButton = document.getElementById("offcanvasClose");
  const profileDropdown = document.getElementById("profileDropdown");

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
  renderSalesSummary();
  renderVisibilityCards();
  renderSetupProgress();
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
