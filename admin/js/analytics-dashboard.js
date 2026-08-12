const analyticsData = {
  kpis: [
    { title: 'Total Revenue', value: '$4,825,930', badge: '+18.2%', badgeClass: 'bg-emerald-50 text-emerald-600' },
    { title: 'Total Orders', value: '94,382', badge: '+9%', badgeClass: 'bg-emerald-50 text-emerald-600' },
    { title: 'Total Buyers', value: '38,511', badge: '+14%', badgeClass: 'bg-emerald-50 text-emerald-600' },
    { title: 'Active Sellers', value: '4,628', badge: '+7%', badgeClass: 'bg-emerald-50 text-emerald-600' },
    { title: 'Refund Rate', value: '1.8%', badge: '-0.4%', badgeClass: 'bg-red-50 text-red-600' },
    { title: 'Completed Withdrawals', value: '$1,930,000' },
    { title: 'Conversion Rate', value: '6.2%' },
    { title: 'Marketplace Health', value: '98%', indicator: true }
  ],
  topCategories: [
    { category: 'Electronics', orders: '24,120', revenue: '$1,240,000', growth: '+18%', conversion: '7.9%' },
    { category: 'Fashion', orders: '19,560', revenue: '$965,400', growth: '+12%', conversion: '6.2%' },
    { category: 'Home', orders: '12,850', revenue: '$712,300', growth: '+9%', conversion: '5.6%' },
    { category: 'Gaming', orders: '8,340', revenue: '$398,200', growth: '+15%', conversion: '6.8%' },
    { category: 'Beauty', orders: '7,230', revenue: '$312,140', growth: '+7%', conversion: '4.9%' }
  ],
  topProducts: [
    { product: 'Wireless Headphones', seller: 'TechHub', orders: '6,480', revenue: '$513,000', rating: '4.8' },
    { product: 'Premium Sneakers', seller: 'Fashion Pro', orders: '5,720', revenue: '$448,500', rating: '4.7' },
    { product: 'Smartwatch Pro', seller: 'Gadget World', orders: '5,040', revenue: '$369,600', rating: '4.9' },
    { product: 'Designer Bag', seller: 'Luxury Lane', orders: '4,390', revenue: '$391,500', rating: '4.6' },
    { product: 'LED Desk Lamp', seller: 'Home Essentials', orders: '4,120', revenue: '$193,800', rating: '4.5' }
  ],
  activityFeed: [
    'New Order • ORD-9145 • $1,120 • 2m ago',
    'New Seller Registration • MoonCart • 5m ago',
    'Product Approved • Smart Leisure Watch • 12m ago',
    'Refund Requested • ORD-9098 • $84 • 21m ago',
    'Withdrawal Approved • WD-20425 • 35m ago',
    'Support Ticket Created • Ticket #7851 • 42m ago',
    'Coupon Redeemed • SAVE15 • 58m ago',
    'User Registered • Sarah N. • 1h ago'
  ],
  reports: [
    { title: 'Revenue Report' },
    { title: 'Seller Report' },
    { title: 'Buyer Report' },
    { title: 'Orders Report' },
    { title: 'Refund Report' },
    { title: 'Payments Report' },
    { title: 'Products Report' },
    { title: 'Support Report' }
  ],
  insights: [
    'Revenue increased 18% this month.',
    'Electronics remain the top-performing category.',
    'Refund requests decreased by 11%.',
    'Buyer retention improved by 6%.',
    'Weekend sales outperform weekdays by 14%.'
  ],
  revenueSeries: [
    285000, 352000, 398000, 412000, 455000, 468000, 485000, 502000, 520000, 530000, 554000, 582000
  ],
  ordersSeries: Array.from({ length: 30 }, (_, i) => 760 + Math.round(Math.sin(i / 4) * 80 + Math.random() * 35)),
  categorySeries: [27, 18, 13, 11, 9, 7, 6, 9],
  categoryLabels: ['Electronics','Fashion','Home','Gaming','Beauty','Automotive','Books','Digital Products'],
  customerGrowthSeries: [2400, 2550, 2680, 2810, 2920, 3040, 3180, 3320, 3450, 3610, 3790, 4190],
  sellerPerformanceSeries: [72, 75, 79, 82, 84, 86, 88, 90, 91, 92, 93, 94],
  trafficSourcesSeries: [45, 28, 14, 8, 5],
  deviceTypesSeries: [52, 31, 13, 4]
};

function renderAnalyticsSummaryCards() {
  const container = document.getElementById('summaryCards');
  container.innerHTML = analyticsData.kpis.map((kpi) => `
    <div class="summary-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md min-h-[190px] min-w-0 flex flex-col justify-between overflow-hidden">
      <div class="summary-card-header flex flex-wrap items-start justify-between gap-3 min-w-0">
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 break-words">${kpi.title}</p>
          <p class="mt-3 text-3xl font-semibold text-slate-900 break-words">${kpi.value}</p>
        </div>
        <div class="flex-shrink-0">
          ${kpi.indicator ? '<span class="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-600 whitespace-nowrap">● Healthy</span>' : kpi.badge ? `<span class="inline-flex rounded-full ${kpi.badgeClass} px-3 py-1 text-sm font-semibold whitespace-nowrap">${kpi.badge}</span>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function renderTopCategoriesTable() {
  const body = document.getElementById('topCategoriesTable');
  body.innerHTML = analyticsData.topCategories.map(item => `
    <tr>
      <td class="px-4 py-3 font-medium text-slate-900">${item.category}</td>
      <td class="px-4 py-3">${item.orders}</td>
      <td class="px-4 py-3">${item.revenue}</td>
      <td class="px-4 py-3 text-emerald-600">${item.growth}</td>
      <td class="px-4 py-3">${item.conversion}</td>
    </tr>
  `).join('');
}

function renderTopProductsTable() {
  const body = document.getElementById('topProductsTable');
  body.innerHTML = analyticsData.topProducts.map(item => `
    <tr>
      <td class="px-4 py-3 font-medium text-slate-900">${item.product}</td>
      <td class="px-4 py-3">${item.seller}</td>
      <td class="px-4 py-3">${item.orders}</td>
      <td class="px-4 py-3">${item.revenue}</td>
      <td class="px-4 py-3">${item.rating}</td>
    </tr>
  `).join('');
}

function renderActivityFeed() {
  const container = document.getElementById('activityFeed');
  container.innerHTML = analyticsData.activityFeed.map(item => `
    <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p class="text-sm text-slate-700">${item}</p>
    </div>
  `).join('');
}

function renderReportsPanel() {
  const container = document.getElementById('reportsPanel');
  container.innerHTML = analyticsData.reports.map(report => `
    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-slate-900">${report.title}</p>
        </div>
        <div class="flex items-center gap-2">
          <button class="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-100">View</button>
          <button class="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-100">PDF</button>
          <button class="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-100">Excel</button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderAiInsights() {
  const container = document.getElementById('aiInsights');
  container.innerHTML = analyticsData.insights.map(item => `
    <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p class="text-sm text-slate-700">${item}</p>
    </div>
  `).join('');
}

function initAnalyticsCharts() {
  const revenueCtx = document.getElementById('revenueChart');
  const ordersCtx = document.getElementById('ordersChart');
  const categoryCtx = document.getElementById('categoryChart');
  const customerGrowthCtx = document.getElementById('customerGrowthChart');
  const sellerPerformanceCtx = document.getElementById('sellerPerformanceChart');
  const trafficSourcesCtx = document.getElementById('trafficSourcesChart');
  const deviceTypesCtx = document.getElementById('deviceTypesChart');

  if (revenueCtx) {
    new Chart(revenueCtx, {
      type: 'line',
      data: {
        labels: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
        datasets: [{
          label: 'Revenue',
          data: analyticsData.revenueSeries,
          borderColor: '#2563EB',
          backgroundColor: 'rgba(59,130,246,0.18)',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#1D4ED8'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#475569' } },
          y: { grid: { color: '#E2E8F0' }, ticks: { color: '#475569' } }
        }
      }
    });
  }

  if (ordersCtx) {
    new Chart(ordersCtx, {
      type: 'bar',
      data: {
        labels: Array.from({ length: 30 }, (_, i) => `${i + 1}`),
        datasets: [{
          label: 'Daily Orders',
          data: analyticsData.ordersSeries,
          backgroundColor: '#2563EB',
          borderRadius: 12,
          maxBarThickness: 18
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#475569' } },
          y: { grid: { color: '#E2E8F0' }, ticks: { color: '#475569' } }
        }
      }
    });
  }

  if (categoryCtx) {
    new Chart(categoryCtx, {
      type: 'doughnut',
      data: {
        labels: analyticsData.categoryLabels,
        datasets: [{
          data: analyticsData.categorySeries,
          backgroundColor: ['#2563EB','#6366F1','#14B8A6','#F97316','#EC4899','#8B5CF6','#22C55E','#EAB308']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#475569' }}}}
    });
  }

  if (customerGrowthCtx) {
    new Chart(customerGrowthCtx, {
      type: 'line',
      data: {
        labels: ['Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'],
        datasets: [{ label: 'New Buyers', data: analyticsData.customerGrowthSeries, borderColor: '#22C55E', backgroundColor: 'rgba(34,197,94,0.18)', fill: true, tension: 0.35, pointRadius: 3 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: '#475569' } }, y: { grid: { color: '#E2E8F0' }, ticks: { color: '#475569' } } } }
    });
  }

  if (sellerPerformanceCtx) {
    new Chart(sellerPerformanceCtx, {
      type: 'line',
      data: {
        labels: ['Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'],
        datasets: [{ label: 'Seller Score', data: analyticsData.sellerPerformanceSeries, borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.18)', fill: true, tension: 0.35, pointRadius: 3 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: '#475569' } }, y: { grid: { color: '#E2E8F0' }, ticks: { color: '#475569' } } } }
    });
  }

  if (trafficSourcesCtx) {
    new Chart(trafficSourcesCtx, {
      type: 'doughnut',
      data: { labels: ['Organic','Referral','Paid Search','Social','Email'], datasets: [{ data: analyticsData.trafficSourcesSeries, backgroundColor: ['#2563EB','#F97316','#EAB308','#8B5CF6','#14B8A6'] }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#475569' } } } }
    });
  }

  if (deviceTypesCtx) {
    new Chart(deviceTypesCtx, {
      type: 'pie',
      data: { labels: ['Desktop','Mobile','Tablet','Other'], datasets: [{ data: analyticsData.deviceTypesSeries, backgroundColor: ['#2563EB','#10B981','#8B5CF6','#F97316'] }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#475569' } } } }
    });
  }
}

function wireAnalyticsButtons() {
  document.getElementById('refreshAnalyticsBtn').addEventListener('click', () => showToast('Analytics refreshed (UI-only)', 'success'));
  document.getElementById('exportReportBtn').addEventListener('click', () => showToast('Export started (UI-only)', 'success'));
  document.getElementById('dateRangeBtn').addEventListener('click', () => showToast('Date range selector is UI-only', 'success'));
  document.getElementById('comparePeriodsBtn').addEventListener('click', () => showToast('Compare periods panel is UI-only', 'success'));
}

function initializeAnalyticsDashboardPage() {
  renderAnalyticsSummaryCards();
  renderTopCategoriesTable();
  renderTopProductsTable();
  renderActivityFeed();
  renderReportsPanel();
  renderAiInsights();
  initAnalyticsCharts();
  wireAnalyticsButtons();
}

window.initializeAnalyticsDashboardPage = initializeAnalyticsDashboardPage;
