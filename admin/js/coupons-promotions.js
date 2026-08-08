const couponsPromotionsData = {
  summaryCards: [
    { title: 'Active Coupons', value: '72', badge: '+8%', badgeClass: 'bg-emerald-50 text-emerald-600', icon: 'fas fa-tag' },
    { title: 'Scheduled Campaigns', value: '18', badge: '+12%', badgeClass: 'bg-blue-50 text-blue-600', icon: 'fas fa-calendar-days' },
    { title: 'Expired Coupons', value: '42', badge: '-4%', badgeClass: 'bg-red-50 text-red-600', icon: 'fas fa-clock' },
    { title: 'Coupons Redeemed Today', value: '154', badge: '+9%', badgeClass: 'bg-emerald-50 text-emerald-600', icon: 'fas fa-gift' },
    { title: 'Total Discounts Given', value: '$134,720', badge: '+18%', badgeClass: 'bg-emerald-50 text-emerald-600', icon: 'fas fa-dollar-sign' },
    { title: 'Promotion Revenue Generated', value: '$624,000', badge: '+14%', badgeClass: 'bg-blue-50 text-blue-600', icon: 'fas fa-chart-line' },
    { title: 'Average Redemption Rate', value: '28.6%', badge: '+3%', badgeClass: 'bg-amber-50 text-amber-700', icon: 'fas fa-percent' },
    { title: 'Top Performing Campaign', value: 'Summer Flash', badge: 'Live', badgeClass: 'bg-violet-50 text-violet-700', icon: 'fas fa-star' }
  ],
  coupons: [
    { code: 'SUMMER22', campaign: 'Summer Flash Sale', type: 'Percentage', value: '25%', usage: '1,240/2,500', start: '2026-08-01', end: '2026-08-15', status: 'Active' },
    { code: 'FREESHIP', campaign: 'Free Shipping Weekend', type: 'Free Shipping', value: 'Free', usage: '980/1,200', start: '2026-08-05', end: '2026-08-07', status: 'Scheduled' },
    { code: 'WELCOME50', campaign: 'New Buyer Welcome', type: 'Fixed Amount', value: '$50', usage: '3,480/5,000', start: '2026-07-01', end: '2026-09-30', status: 'Active' },
    { code: 'FLASH10', campaign: 'Flash Friday', type: 'Percentage', value: '10%', usage: '1,980/2,000', start: '2026-08-27', end: '2026-08-28', status: 'Draft' },
    { code: 'BACK2SCHOOL', campaign: 'Back to School', type: 'Percentage', value: '20%', usage: '4,100/5,000', start: '2026-07-15', end: '2026-08-31', status: 'Expired' }
  ],
  promotions: [
    { name: 'Summer Flash Sale', audience: 'All Buyers', start: '2026-08-01', end: '2026-08-15', budget: '$125,000', performance: '82%', status: 'Active' },
    { name: 'Free Shipping Weekend', audience: 'All Customers', start: '2026-08-05', end: '2026-08-07', budget: '$18,500', performance: '71%', status: 'Scheduled' },
    { name: 'VIP Summer Bonus', audience: 'VIP Customers', start: '2026-08-10', end: '2026-08-20', budget: '$42,000', performance: '67%', status: 'Draft' }
  ],
  activePromotions: [
    { title: 'Summer Flash Sale', subtitle: '25% off orders above $120', value: 'Live now' },
    { title: 'New Buyer Bonus', subtitle: 'First order coupon for new buyers', value: 'Running' }
  ],
  endingSoon: [
    { title: 'Free Shipping Weekend', due: 'Ends in 2 days' },
    { title: 'Holiday Preview', due: 'Ends in 4 days' }
  ],
  bestCoupon: { title: 'WELCOME50', detail: 'New buyer fixed discount', metric: '4.8% conversion' },
  highestRedemption: { title: 'SUMMER22', detail: '25% off campaign', metric: '5,120 redemptions' },
  totalSavings: '$134,720',
  upcomingCampaigns: [
    { title: 'Back to School', date: 'Aug 20' },
    { title: 'Labor Day Launch', date: 'Sep 03' }
  ]
};

function renderCouponsSummaryCards() {
  const container = document.getElementById('summaryCards');
  container.innerHTML = couponsPromotionsData.summaryCards.map(card => `
    <div class="summary-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md min-h-[170px] min-w-0 flex flex-col justify-between overflow-hidden">
      <div class="flex items-center justify-between gap-3">
        <span class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"> <i class="${card.icon}"></i> </span>
        <span class="inline-flex rounded-full ${card.badgeClass} px-3 py-1 text-xs font-semibold uppercase tracking-wide">${card.badge}</span>
      </div>
      <div>
        <p class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">${card.title}</p>
        <p class="mt-4 text-3xl font-semibold text-slate-900">${card.value}</p>
      </div>
    </div>
  `).join('');
}

function renderCouponsTable() {
  const body = document.getElementById('couponsTableBody');
  body.innerHTML = couponsPromotionsData.coupons.map(coupon => `
    <tr>
      <td class="px-4 py-3 font-medium text-slate-900">${coupon.code}</td>
      <td class="px-4 py-3">${coupon.campaign}</td>
      <td class="px-4 py-3">${coupon.type}</td>
      <td class="px-4 py-3">${coupon.value}</td>
      <td class="px-4 py-3">${coupon.usage}</td>
      <td class="px-4 py-3">${coupon.start}</td>
      <td class="px-4 py-3">${coupon.end}</td>
      <td class="px-4 py-3"><span class="table-badge ${coupon.status.toLowerCase()}">${coupon.status}</span></td>
      <td class="px-4 py-3 space-x-2">
        <button class="table-action-btn">View</button>
        <button class="table-action-btn">Edit</button>
        <button class="table-action-btn">Duplicate</button>
      </td>
    </tr>
  `).join('');
  document.getElementById('couponTableCount').textContent = `${couponsPromotionsData.coupons.length} coupons`;
}

function renderPromotionsTable() {
  const body = document.getElementById('promotionsTableBody');
  body.innerHTML = couponsPromotionsData.promotions.map(promo => `
    <tr>
      <td class="px-4 py-3 font-medium text-slate-900">${promo.name}</td>
      <td class="px-4 py-3">${promo.audience}</td>
      <td class="px-4 py-3">${promo.start}</td>
      <td class="px-4 py-3">${promo.end}</td>
      <td class="px-4 py-3">${promo.budget}</td>
      <td class="px-4 py-3">${promo.performance}</td>
      <td class="px-4 py-3"><span class="table-badge ${promo.status.toLowerCase()}">${promo.status}</span></td>
      <td class="px-4 py-3 space-x-2">
        <button class="table-action-btn">View</button>
        <button class="table-action-btn">Edit</button>
      </td>
    </tr>
  `).join('');
  document.getElementById('promotionTableCount').textContent = `${couponsPromotionsData.promotions.length} promotions`;
}

function renderRightSidebar() {
  document.getElementById('activePromotionsList').innerHTML = couponsPromotionsData.activePromotions.map(item => `
    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p class="text-sm font-semibold text-slate-900">${item.title}</p>
      <p class="mt-1 text-sm text-slate-500">${item.subtitle}</p>
      <p class="mt-3 text-sm font-semibold text-slate-900">${item.value}</p>
    </div>
  `).join('');

  document.getElementById('endingSoonList').innerHTML = couponsPromotionsData.endingSoon.map(item => `
    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p class="text-sm font-semibold text-slate-900">${item.title}</p>
      <p class="mt-1 text-sm text-slate-500">${item.due}</p>
    </div>
  `).join('');

  document.getElementById('bestCouponCard').innerHTML = `
    <p class="text-sm font-semibold text-slate-900">${couponsPromotionsData.bestCoupon.title}</p>
    <p class="mt-2 text-sm text-slate-500">${couponsPromotionsData.bestCoupon.detail}</p>
    <p class="mt-3 text-2xl font-semibold text-slate-900">${couponsPromotionsData.bestCoupon.metric}</p>
  `;

  document.getElementById('highestRedemptionCard').innerHTML = `
    <p class="text-sm font-semibold text-slate-900">${couponsPromotionsData.highestRedemption.title}</p>
    <p class="mt-2 text-sm text-slate-500">${couponsPromotionsData.highestRedemption.detail}</p>
    <p class="mt-3 text-2xl font-semibold text-slate-900">${couponsPromotionsData.highestRedemption.metric}</p>
  `;

  document.getElementById('totalSavingsValue').textContent = couponsPromotionsData.totalSavings;

  document.getElementById('upcomingCampaignsList').innerHTML = couponsPromotionsData.upcomingCampaigns.map(item => `
    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between">
      <p class="text-sm text-slate-900">${item.title}</p>
      <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">${item.date}</span>
    </div>
  `).join('');
}

function renderCouponPagination() {
  const pagination = document.getElementById('couponPagination');
  pagination.innerHTML = `
    <div class="flex items-center gap-2">
      <button class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">Previous</button>
      <button class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">1</button>
      <button class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">2</button>
      <button class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">3</button>
      <button class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">Next</button>
    </div>
    <div class="text-sm text-slate-500">Showing 1-5 of ${couponsPromotionsData.coupons.length} items</div>
  `;
}

function initializeCouponsPromotionsPage() {
  renderCouponsSummaryCards();
  renderCouponsTable();
  renderPromotionsTable();
  renderRightSidebar();
  renderCouponPagination();
  document.getElementById('refreshCouponsBtn').addEventListener('click', () => showToast('Coupons refreshed (UI-only)', 'success'));
  document.getElementById('exportCouponsBtn').addEventListener('click', () => showToast('Export started (UI-only)', 'success'));
  document.getElementById('createCouponBtn').addEventListener('click', () => showToast('Create coupon action opened (UI-only)', 'success'));
  document.getElementById('createCampaignBtn').addEventListener('click', () => showToast('Create campaign action opened (UI-only)', 'success'));
  document.getElementById('resetCouponFilters').addEventListener('click', () => showToast('Filters reset (UI-only)', 'success'));
}

window.initializeCouponsPromotionsPage = initializeCouponsPromotionsPage;
