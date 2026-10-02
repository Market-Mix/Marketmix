(function () {
  const BR = '#FF7A00', PAL = [BR, '#1E293B', '#14B8A6', '#6366F1', '#EAB308', '#EC4899', '#22C55E', '#94A3B8'];
  const $ = id => document.getElementById(id);
  const esc = s => window.escapeHtml(s);
  const S = { range: '30d', data: null, first: true, timer: null, charts: {} };
  const FMT = {
    money: v => { v = +v || 0; return Math.abs(v) >= 1e6 ? '₦' + (v / 1e6).toFixed(2) + 'M' : '₦' + Math.round(v).toLocaleString('en-NG'); },
    int: v => Math.round(v).toLocaleString(), pct: v => (+v).toFixed(1) + '%', score: v => Math.round(v) + '%',
    days: v => (+v).toFixed(1) + 'd', mins: v => Math.round(v) + 'm', rating: v => (+v).toFixed(1) + '/5', text: v => v,
  };
  const val = (v, f) => v == null ? '<span title="Not tracked">—</span>' : f === 'text' ? esc(v) : `<span data-count="${v}" data-fmt="${f}">${FMT[f](v)}</span>`;
  const badge = (c, inv, u = '%') => c == null ? '' : `<span class="inline-flex rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap ${(c >= 0) !== !!inv ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}">${c >= 0 ? '+' : ''}${c}${u}</span>`;
  const tile = (l, v, f) => `<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 fade-in"><p class="text-sm text-slate-500">${l}</p><p class="mt-2 text-2xl font-semibold text-slate-900">${val(v, f)}</p></div>`;
  const kpi = (l, v, f) => `<div class="analytics-kpi-card fade-in"><div class="analytics-kpi-card-inner"><p class="text-sm text-slate-500">${l}</p><div class="text-2xl font-semibold text-slate-900">${val(v, f)}</div></div></div>`;
  const put = (id, html) => { const el = $(id); if (el) el.innerHTML = html; };

  async function api(path) {
    const r = await fetch(`${ADMIN_API_BASE}/admin/analytics${path}`, { headers: getAdminAuthHeaders() });
    const b = await r.json().catch(() => null);
    if (!r.ok) throw new Error(b?.message || 'Request failed');
    return b.data;
  }

  function skeleton() {
    put('summaryCards', Array.from({ length: 8 }, () => '<div class="skel min-h-[190px]"></div>').join(''));
  }

  async function load(force) {
    try { S.data = await api(`?range=${S.range}${force ? '&refresh=1' : ''}`); render(); }
    catch (e) { showToast(e.message, 'error'); if (!S.data) put('summaryCards', `<p class="text-sm text-red-600">${esc(e.message)}</p>`); }
  }

  const lbl = k => new Date(k + 'T00:00:00Z').toLocaleDateString('en-US',
    S.data.granularity === 'month' ? { month: 'short', year: '2-digit', timeZone: 'UTC' } : { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const ago = iso => { const m = Math.floor((Date.now() - new Date(iso)) / 60000);
    return m < 1 ? 'just now' : m < 60 ? m + 'm ago' : m < 1440 ? Math.floor(m / 60) + 'h ago' : Math.floor(m / 1440) + 'd ago'; };

  function render() {
    const d = S.data, k = d.kpis;
    const healthPill = `<span class="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${k.health.value >= 90 ? 'bg-emerald-50 text-emerald-600' : k.health.value >= 75 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}">● ${k.health.label}</span>`;
    const cards = [
      ['Total Revenue', k.revenue.value, 'money', badge(k.revenue.change)],
      ['Total Orders', k.orders.value, 'int', badge(k.orders.change)],
      ['Total Buyers', k.buyers.total, 'int', badge(k.buyers.change)],
      ['Active Sellers', k.sellers.active, 'int', `<span class="text-sm text-slate-500">${k.sellers.total} total</span>`],
      ['Refund Rate', k.refundRate.value, 'pct', badge(k.refundRate.change, true, ' pts')],
      ['Completed Withdrawals', k.withdrawals.value, 'money', ''],
      ['Buyer Conversion', k.conversion.value, 'pct', ''],
      ['Marketplace Health', k.health.value, 'score', healthPill],
    ];
    put('summaryCards', cards.map(([t, v, f, b]) => `
      <div class="summary-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md min-h-[190px] flex flex-col justify-between overflow-hidden fade-in">
        <div class="flex flex-wrap items-start justify-between gap-3 min-w-0">
          <div class="min-w-0 flex-1"><p class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 break-words">${t}</p>
          <p class="mt-3 text-3xl font-semibold text-slate-900 break-words">${val(v, f)}</p></div>
          <div class="flex-shrink-0">${b}</div></div></div>`).join(''));

    $('revenueSub').textContent = { '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days', '12m': 'Last 12 months' }[d.range] + ' · paid orders, ' + (d.granularity === 'month' ? 'monthly' : 'daily');

    const empty = c => `<tr><td colspan="${c}" class="px-4 py-8 text-center text-slate-400">No sales in this period.</td></tr>`;
    put('topCategoriesTable', d.categories.length ? d.categories.map(c => `<tr class="fade-in"><td class="px-4 py-3 font-medium text-slate-900">${esc(c.category)}</td><td class="px-4 py-3">${c.orders}</td>
      <td class="px-4 py-3">${FMT.money(c.revenue)}</td><td class="px-4 py-3">${c.growth == null ? '<span class="text-slate-400">New</span>' : `<span class="${c.growth >= 0 ? 'text-emerald-600' : 'text-red-600'}">${c.growth >= 0 ? '+' : ''}${c.growth}%</span>`}</td>
      <td class="px-4 py-3">${c.share}%</td></tr>`).join('') : empty(5));
    put('topProductsTable', d.products.length ? d.products.map(p => `<tr class="fade-in"><td class="px-4 py-3 font-medium text-slate-900">${esc(p.name)}</td><td class="px-4 py-3">${esc(p.seller)}</td>
      <td class="px-4 py-3">${p.orders}</td><td class="px-4 py-3">${FMT.money(p.revenue)}</td><td class="px-4 py-3">${p.rating ? '★ ' + p.rating : '—'}</td></tr>`).join('') : empty(5));

    const c = d.customers, s = d.sellerStats, p = d.productStats, f = d.financial, o = d.operational;
    put('customerStats', tile('New Buyers', c.newBuyers, 'int') + tile('Returning Buyers (all-time)', c.returning, 'int') + tile('Retention Rate', c.retention, 'pct') + tile('Avg. Buyer Value', c.clv, 'money'));
    put('sellerStats', tile('New Sellers', s.newSellers, 'int') + tile('Active Sellers', s.active, 'int') + tile('KYC Approval Rate', s.kycRate, 'pct') + tile('Avg. Seller Rating', s.avgRating, 'rating'));
    put('productStats', tile('Total Products', p.total, 'int') + tile('Out of Stock', p.oos, 'int') + tile('Low Stock (≤10)', p.low, 'int') + tile('Pending Approvals', p.pending, 'int'));
    put('trafficStats', tile('Top Payment Channel', d.channels[0]?.name || '—', 'text') + tile('Orders in Period', d.orderStatus.reduce((a, x) => a + x.value, 0), 'int'));
    put('financialStats', kpi('Gross Revenue', f.gross, 'money') + kpi('Net (Seller Share)', f.net, 'money') + kpi('Platform Commission', f.commission, 'money') +
      kpi('Refund Amount', f.refunds, 'money') + kpi('Withdrawal Amount', f.withdrawals, 'money') + kpi('Taxes Collected', f.taxes, 'money'));
    put('operationalStats', kpi('Avg Delivery Time', o.deliveryDays, 'days') + kpi('Avg Refund Time', o.refundDays, 'days') + kpi('Avg Support Response', o.supportMinutes, 'mins') +
      kpi('Order Success', o.orderSuccess, 'pct') + kpi('Payment Success', o.paymentSuccess, 'pct') + kpi('Failed Txns', o.failedRate, 'pct'));

    const ICON = { order: 'fa-receipt', seller: 'fa-store', refund: 'fa-undo', withdrawal: 'fa-wallet' };
    put('activityFeed', d.activity.length ? d.activity.map(a => `<div class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 fade-in">
      <span class="flex h-9 w-9 items-center justify-center rounded-full bg-orange-50 text-[#FF7A00]"><i class="fas ${ICON[a.type] || 'fa-bell'}"></i></span>
      <div class="min-w-0 flex-1"><p class="text-sm text-slate-700 break-words">${esc(a.text)}</p><p class="text-xs text-slate-400">${ago(a.at)}</p></div></div>`).join('') : '<p class="text-sm text-slate-400">No recent activity.</p>');
    put('aiInsights', d.insights.length ? d.insights.map(i => `<div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 fade-in"><p class="text-sm text-slate-700">${esc(i)}</p></div>`).join('') : '<p class="text-sm text-slate-400">Not enough data yet.</p>');

    drawCharts(d);
    if (S.first) { S.first = false; countUp(); }
  }

  function countUp() {
    document.querySelectorAll('[data-count]').forEach(el => {
      const to = +el.dataset.count, fn = FMT[el.dataset.fmt], t0 = performance.now();
      (function tick(t) { const p = Math.min((t - t0) / 700, 1); el.textContent = fn(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); })(t0);
    });
  }

  function mk(id, cfg) {
    const el = $(id); if (!el || !window.Chart) return;
    S.charts[id]?.destroy(); S.charts[id] = new Chart(el, cfg);
  }
  const axes = { x: { grid: { display: false }, ticks: { color: '#475569', maxTicksLimit: 12 } }, y: { grid: { color: '#E2E8F0' }, ticks: { color: '#475569' }, beginAtZero: true } };
  const base = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: axes };
  const pie = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#475569' } } } };

  function drawCharts(d) {
    const L = d.series.labels.map(lbl);
    mk('revenueChart', { type: 'line', data: { labels: L, datasets: [{ label: 'Revenue', data: d.series.revenue, borderColor: BR, backgroundColor: 'rgba(255,122,0,.15)', fill: true, tension: .35, pointRadius: L.length > 40 ? 0 : 3 }] },
      options: { ...base, plugins: { ...base.plugins, tooltip: { callbacks: { label: c => FMT.money(c.raw) } } } } });
    mk('ordersChart', { type: 'bar', data: { labels: L, datasets: [{ label: 'Orders', data: d.series.orders, backgroundColor: '#1E293B', borderRadius: 8, maxBarThickness: 18 }] }, options: base });
    mk('categoryChart', { type: 'doughnut', data: { labels: d.categories.map(c => c.category), datasets: [{ data: d.categories.map(c => c.revenue), backgroundColor: PAL }] }, options: pie });
    mk('customerGrowthChart', { type: 'line', data: { labels: L, datasets: [{ label: 'New Buyers', data: d.series.buyers, borderColor: '#14B8A6', backgroundColor: 'rgba(20,184,166,.15)', fill: true, tension: .35, pointRadius: 2 }] }, options: base });
    mk('sellerPerformanceChart', { type: 'line', data: { labels: L, datasets: [{ label: 'Active Sellers', data: d.series.sellers, borderColor: '#6366F1', backgroundColor: 'rgba(99,102,241,.15)', fill: true, tension: .35, pointRadius: 2 }] }, options: base });
    mk('trafficSourcesChart', { type: 'doughnut', data: { labels: d.channels.map(c => c.name), datasets: [{ data: d.channels.map(c => c.value), backgroundColor: PAL }] }, options: pie });
    mk('deviceTypesChart', { type: 'pie', data: { labels: d.orderStatus.map(c => c.name), datasets: [{ data: d.orderStatus.map(c => c.value), backgroundColor: PAL }] }, options: pie });
  }

  const REPORTS = [['revenue', 'Revenue Report'], ['orders', 'Orders Report'], ['sellers', 'Seller Report'], ['buyers', 'Buyer Report'],
                   ['refunds', 'Refund Report'], ['payments', 'Payments Report'], ['products', 'Products Report']];
  const cell = c => { c = String(c ?? ''); return /^[=+\-@]/.test(c) ? "'" + c : c; };
  const head = c => c.replace(/_/g, ' ');
  function download(name, cols, rows) {
    const csv = [cols.map(head), ...rows].map(r => r.map(c => `"${cell(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = name + '.csv'; a.click();
  }
  const tableHtml = (cols, rows, max) => `<table style="width:100%;border-collapse:collapse;font:13px Arial"><thead><tr>${cols.map(c => `<th style="background:#FF7A00;color:#fff;padding:6px;text-align:left;text-transform:capitalize">${esc(head(c))}</th>`).join('')}</tr></thead>
    <tbody>${rows.slice(0, max).map(r => `<tr>${r.map(c => `<td style="padding:6px;border-bottom:1px solid #e2e8f0">${esc(c ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

  function modal(title, html) {
    const m = document.createElement('div');
    m.className = 'fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 p-4';
    m.innerHTML = `<div class="max-h-[85vh] w-full max-w-5xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl"><div class="mb-4 flex items-center justify-between"><h3 class="text-lg font-semibold">${esc(title)}</h3><button class="text-slate-500 text-xl">✕</button></div>${html}</div>`;
    m.addEventListener('click', e => { if (e.target === m || e.target.tagName === 'BUTTON') m.remove(); });
    document.body.appendChild(m);
  }

  function wireReports() {
    put('reportsPanel', REPORTS.map(([k, t]) => `<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div class="flex items-center justify-between gap-3"><p class="text-sm font-semibold text-slate-900">${t}</p>
      <div class="flex gap-2">${['view', 'pdf', 'csv'].map(a => `<button data-r="${k}" data-a="${a}" class="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:border-[#FF7A00] hover:text-[#FF7A00]">${a.toUpperCase()}</button>`).join('')}</div></div></div>`).join(''));
    $('reportsPanel').addEventListener('click', async e => {
      const b = e.target.closest('button[data-r]'); if (!b) return;
      b.disabled = true;
      try {
        const { columns, rows } = await api(`/reports/${b.dataset.r}?range=${S.range}`);
        const title = REPORTS.find(r => r[0] === b.dataset.r)[1], a = b.dataset.a;
        if (a === 'csv') download(`${b.dataset.r}-${S.range}`, columns, rows);
        else if (a === 'view') modal(`${title} (${rows.length} rows${rows.length > 100 ? ', first 100' : ''})`, rows.length ? tableHtml(columns, rows, 100) : '<p class="text-sm text-slate-500">No data for this period.</p>');
        else { const w = window.open('', '', 'width=900,height=700'); w.document.write(`<h2 style="font-family:Arial">MarketMix — ${title} (${S.range})</h2>${tableHtml(columns, rows, 5000)}`); w.document.close(); w.print(); }
      } catch (err) { showToast(err.message, 'error'); } finally { b.disabled = false; }
    });
  }

  function wire() {
    const sel = $('rangeSelect'); sel.value = S.range;
    sel.addEventListener('change', () => { S.range = sel.value; S.first = true; skeleton(); load(); });
    $('refreshAnalyticsBtn').addEventListener('click', async e => {
      const btn = e.currentTarget; btn.classList.add('spin'); await load(true); btn.classList.remove('spin'); showToast('Analytics refreshed');
    });
    $('exportReportBtn').addEventListener('click', () => {
      if (!S.data) return;
      const s = S.data.series;
      download(`analytics-${S.range}`, ['period', 'revenue', 'orders', 'new_buyers', 'active_sellers'], s.labels.map((k, i) => [k, s.revenue[i], s.orders[i], s.buyers[i], s.sellers[i]]));
    });
  }

  function init() {
    if (!$('summaryCards')) return;
    S.data = null; S.first = true;
    wire(); wireReports(); skeleton(); load();
    clearInterval(S.timer);
    S.timer = setInterval(() => { if (!$('summaryCards')) return clearInterval(S.timer); if (!document.hidden) load(); }, 60000);
  }
  window.initializeAnalyticsDashboardPage = init;
})();
