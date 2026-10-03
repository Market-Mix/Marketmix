(function () {
  const API = `${window.ADMIN_API_BASE || 'https://marketmix-backend.onrender.com/api'}/admin/coupons`;
  const $ = id => document.getElementById(id);
  const esc = s => window.escapeHtml(s);
  const val = id => ($(id)?.value || '').trim();
  const money = v => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(v || 0);
  const dt = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const local = d => d ? new Date(new Date(d) - new Date(d).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
  const iso = id => val(id) ? new Date(val(id)).toISOString() : null;
  const TYPE = { percentage: 'Percentage', fixed: 'Fixed Amount', free_shipping: 'Free Shipping' };
  const TYPE_REV = { Percentage: 'percentage', 'Fixed Amount': 'fixed', 'Free Shipping': 'free_shipping' };
  const AUD = { all: 'All Buyers', new_buyers: 'New Buyers', returning_buyers: 'Returning Buyers' };
  const S = { page: 1, limit: 10, total: 0, coupons: [], promos: [], meta: { campaigns: [], sellers: [] },
              f: { search: '', code: '', campaign: '', type: 'all', status: 'all', seller: 'all', from: '', to: '' }, couponId: null, promoId: null };

  async function api(path = '', method = 'GET', body) {
    const headers = { ...getAdminAuthHeaders() };
    if (body) headers['Content-Type'] = 'application/json';
    const r = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new Error(j?.message || 'Request failed');
    return j.data;
  }
  const guard = fn => async (...a) => { try { await fn(...a); } catch (e) { showToast(e.message, 'error'); } };
  const open = id => $(id).classList.remove('hidden'), close = id => $(id).classList.add('hidden');
  const valueLabel = c => c.discountType === 'percentage' ? `${c.discountValue}%` : c.discountType === 'fixed' ? money(c.discountValue) : 'Free';
  const badge = s => `<span class="table-badge ${s.toLowerCase()}">${s}</span>`;

  /* ── summary + sidebar ── */
  async function loadSummary() {
    const s = await api('/summary');
    const cards = [
      ['Active Coupons', s.activeCoupons, 'fa-tag'], ['Scheduled Campaigns', s.scheduledCampaigns, 'fa-calendar-days'],
      ['Expired Coupons', s.expiredCoupons, 'fa-clock'], ['Coupons Redeemed Today', s.redeemedToday, 'fa-gift'],
      ['Total Discounts Given', money(s.totalDiscounts), 'fa-naira-sign'], ['Promotion Revenue Generated', money(s.promotionRevenue), 'fa-chart-line'],
      ['Average Redemption Rate', s.redemptionRate + '%', 'fa-percent'], ['Top Performing Campaign', s.topCampaign || '—', 'fa-star']];
    $('summaryCards').innerHTML = cards.map(([t, v, i]) => `
      <div class="summary-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm min-h-[170px] flex flex-col justify-between overflow-hidden">
        <div class="flex items-center justify-between gap-3"><span class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><i class="fas ${i}"></i></span>
        <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase text-emerald-600">Live</span></div>
        <div><p class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">${t}</p><p class="mt-4 text-3xl font-semibold text-slate-900">${esc(v)}</p></div></div>`).join('');
  }
  const card = (t, sub, right) => `<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p class="text-sm font-semibold text-slate-900">${esc(t)}</p>${sub ? `<p class="mt-1 text-sm text-slate-500">${esc(sub)}</p>` : ''}${right ? `<p class="mt-3 text-sm font-semibold text-slate-900">${right}</p>` : ''}</div>`;
  const left = d => { const days = Math.ceil((new Date(d) - Date.now()) / 864e5); return days <= 0 ? 'Ends today' : `Ends in ${days} day${days > 1 ? 's' : ''}`; };
  const stat = (x, empty) => x ? card(x.title, x.detail, x.kind === 'money' ? money(x.metric) + ' revenue' : x.metric + ' redemptions') : `<p class="text-sm text-slate-400">${empty}</p>`;
  async function loadSidebar() {
    const d = await api('/sidebar');
    $('activePromotionsList').innerHTML = d.activePromotions.map(a => card(a.title, a.subtitle, a.value)).join('') || '<p class="text-sm text-slate-400">No active promotions.</p>';
    $('endingSoonList').innerHTML = d.endingSoon.map(a => card(a.title, left(a.due))).join('') || '<p class="text-sm text-slate-400">Nothing ending soon.</p>';
    $('bestCouponCard').innerHTML = stat(d.bestCoupon, 'No redemptions yet.');
    $('highestRedemptionCard').innerHTML = stat(d.highestRedemption, 'No redemptions yet.');
    $('totalSavingsValue').textContent = money(d.totalSavings);
    $('upcomingCampaignsList').innerHTML = d.upcoming.map(a => `<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between"><p class="text-sm text-slate-900">${esc(a.title)}</p><span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">${dt(a.date)}</span></div>`).join('') || '<p class="text-sm text-slate-400">No upcoming campaigns.</p>';
  }

  /* ── coupons table ── */
  const qs = (extra = {}) => { const p = new URLSearchParams({ page: S.page, limit: S.limit, ...extra });
    const f = S.f; Object.entries({ search: f.search, code: f.code, campaign: f.campaign, status: f.status, seller: f.seller, from: f.from, to: f.to,
      type: TYPE_REV[f.type] }).forEach(([k, v]) => { if (v && v !== 'all') p.set(k, v); }); return p; };

  const btn = (a, id, label, cls = '') => `<button data-act="${a}" data-id="${id}" class="table-action-btn ${cls}">${label}</button>`;
  const loadCoupons = guard(async () => {
    const d = await api('?' + qs());
    S.coupons = d.coupons; S.total = d.total;
    $('couponsTableBody').innerHTML = d.coupons.length ? d.coupons.map(c => `<tr>
      <td class="px-4 py-3 font-medium text-slate-900">${esc(c.code)}<div class="text-xs text-slate-400">${esc(c.seller)}</div></td>
      <td class="px-4 py-3">${esc(c.campaignName || '—')}</td><td class="px-4 py-3">${TYPE[c.discountType]}</td><td class="px-4 py-3">${valueLabel(c)}</td>
      <td class="px-4 py-3">${c.used}/${c.usageLimit || '∞'}</td><td class="px-4 py-3">${dt(c.startDate)}</td><td class="px-4 py-3">${dt(c.endDate)}</td>
      <td class="px-4 py-3">${badge(c.status)}</td>
      <td class="px-4 py-3"><div class="flex flex-wrap gap-1">${btn('view', c.id, 'View')}${btn('edit', c.id, 'Edit')}${btn('dup', c.id, 'Duplicate')}
        ${btn('toggle', c.id, c.adminStatus === 'active' ? 'Disable' : 'Enable')}${btn('del', c.id, 'Delete', '!text-red-600')}</div></td></tr>`).join('')
      : '<tr><td colspan="9" class="px-4 py-10 text-center text-slate-400">No coupons found.</td></tr>';
    $('couponTableCount').textContent = `${d.total} coupons`;
    const pages = Math.max(Math.ceil(d.total / S.limit), 1);
    $('couponPagination').innerHTML = `<div class="flex items-center gap-2">
      <button data-pg="${S.page - 1}" ${S.page <= 1 ? 'disabled' : ''} class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-40">Previous</button>
      <span class="text-sm text-slate-500">Page ${S.page} of ${pages}</span>
      <button data-pg="${S.page + 1}" ${S.page >= pages ? 'disabled' : ''} class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-40">Next</button></div>`;
  });

  /* ── promotions table ── */
  const loadPromos = guard(async () => {
    S.promos = (await api('/promotions')).promotions;
    $('promotionsTableBody').innerHTML = S.promos.length ? S.promos.map(p => `<tr>
      <td class="px-4 py-3 font-medium text-slate-900">${esc(p.name)}<div class="text-xs text-slate-400">${p.coupons} coupon(s) · ${p.redemptions} redemptions</div></td>
      <td class="px-4 py-3">${AUD[p.audience]}</td><td class="px-4 py-3">${dt(p.startDate)}</td><td class="px-4 py-3">${dt(p.endDate)}</td>
      <td class="px-4 py-3">${p.budget ? money(p.budget) : 'No cap'}</td>
      <td class="px-4 py-3">${p.performance == null ? '—' : p.performance + '% used'}</td><td class="px-4 py-3">${badge(p.status)}</td>
      <td class="px-4 py-3"><div class="flex gap-1">${btn('p-edit', p.id, 'Edit')}${btn('p-toggle', p.id, p.adminStatus === 'active' ? 'Disable' : 'Enable')}${btn('p-del', p.id, 'Delete', '!text-red-600')}</div></td></tr>`).join('')
      : '<tr><td colspan="8" class="px-4 py-10 text-center text-slate-400">No campaigns yet.</td></tr>';
    $('promotionTableCount').textContent = `${S.promos.length} promotions`;
  });

  async function loadMeta() {
    S.meta = await api('/meta');
    $('cpCampaign').innerHTML = '<option value="">None</option>' + S.meta.campaigns.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
    $('sellerFilter').innerHTML = '<option value="all">All Sellers</option><option value="platform">MarketMix (Platform)</option>' +
      S.meta.sellers.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
    $('sellerFilter').value = S.f.seller;
  }
  const refreshAll = () => Promise.all([loadSummary(), loadSidebar(), loadCoupons(), loadPromos(), loadMeta()]).catch(e => showToast(e.message, 'error'));

  /* ── coupon form ── */
  function syncTypeFields() {
    const t = val('cpType');
    $('cpValueWrap').classList.toggle('hidden', t === 'free_shipping');
    $('cpMaxWrap').classList.toggle('hidden', t === 'fixed');
    $('cpValueLabel').textContent = t === 'percentage' ? 'Value (%)' : 'Amount (₦)';
  }
  function openCoupon(c = null) {
    S.couponId = c?.id || null;
    $('couponDrawerTitle').textContent = c ? `Edit ${c.code}` : 'New Coupon';
    const set = (id, v) => { $(id).value = v ?? ''; };
    set('cpCode', c?.code); set('cpDesc', c?.description); set('cpType', c?.discountType || 'percentage'); set('cpValue', c?.discountValue || '');
    set('cpMax', c?.maxDiscount || 0); set('cpMin', c?.minOrderAmount || 0); set('cpLimit', c?.usageLimit || 0); set('cpPerUser', c?.perUserLimit || 0);
    set('cpStart', local(c?.startDate)); set('cpEnd', local(c?.endDate)); set('cpCampaign', c?.campaignId || ''); set('cpStatus', c?.adminStatus || 'draft');
    $('cpCode').disabled = !!c && c.used > 0;
    syncTypeFields(); open('couponDrawer');
  }
  const saveCoupon = guard(async () => {
    const b = $('cpSave'); b.disabled = true;
    try {
      await api(S.couponId ? `/${S.couponId}` : '', S.couponId ? 'PUT' : 'POST', {
        code: val('cpCode'), description: val('cpDesc'), discountType: val('cpType'), discountValue: val('cpValue'), maxDiscount: val('cpMax'),
        minOrderAmount: val('cpMin'), usageLimit: val('cpLimit'), perUserLimit: val('cpPerUser'), startDate: iso('cpStart'), endDate: iso('cpEnd'),
        campaignId: val('cpCampaign') || null, status: val('cpStatus') });
      showToast('Coupon saved'); close('couponDrawer'); refreshAll();
    } finally { b.disabled = false; }
  });

  /* ── campaign form ── */
  function openPromo(p = null) {
    S.promoId = p?.id || null;
    $('campaignDrawerTitle').textContent = p ? `Edit ${p.name}` : 'New Campaign';
    const set = (id, v) => { $(id).value = v ?? ''; };
    set('pmName', p?.name); set('pmDesc', p?.description); set('pmAudience', p?.audience || 'all'); set('pmBudget', p?.budget || 0);
    set('pmStart', local(p?.startDate)); set('pmEnd', local(p?.endDate)); set('pmStatus', p?.adminStatus || 'draft');
    open('campaignDrawer');
  }
  const savePromo = guard(async () => {
    const b = $('pmSave'); b.disabled = true;
    try {
      await api(S.promoId ? `/promotions/${S.promoId}` : '/promotions', S.promoId ? 'PUT' : 'POST', {
        name: val('pmName'), description: val('pmDesc'), audience: val('pmAudience'), budget: val('pmBudget'),
        startDate: iso('pmStart'), endDate: iso('pmEnd'), status: val('pmStatus') });
      showToast('Campaign saved'); close('campaignDrawer'); refreshAll();
    } finally { b.disabled = false; }
  });

  /* ── view modal ── */
  const viewCoupon = guard(async id => {
    const { coupon: c, stats, history } = await api('/' + id);
    const m = document.createElement('div');
    m.className = 'fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 p-4';
    m.innerHTML = `<div class="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl">
      <div class="mb-4 flex items-center justify-between"><h3 class="text-lg font-semibold">${esc(c.code)} ${badge(c.status)}</h3><button class="text-xl text-slate-500">✕</button></div>
      <div class="grid grid-cols-3 gap-3 text-sm">
        ${[['Redemptions', stats.redemptions], ['Discounts given', money(stats.discounts)], ['Revenue', money(stats.revenue)],
           ['Type', TYPE[c.discountType]], ['Value', valueLabel(c)], ['Min order', money(c.minOrderAmount)],
           ['Usage', `${c.used}/${c.usageLimit || '∞'}`], ['Per user', c.perUserLimit || '∞'], ['Owner', esc(c.seller)]]
          .map(([l, v]) => `<div class="rounded-xl bg-slate-50 p-3"><p class="text-xs text-slate-500">${l}</p><p class="font-semibold text-slate-900">${v}</p></div>`).join('')}
      </div>
      <h4 class="mt-5 mb-2 text-sm font-semibold">Recent redemptions</h4>
      ${history.length ? history.map(h => `<div class="flex justify-between border-b py-2 text-sm"><span>${esc(h.orderNo)} · ${esc(h.buyer)}</span><span>-${money(h.discount)} on ${money(h.orderTotal)} · ${dt(h.at)}</span></div>`).join('') : '<p class="text-sm text-slate-400">No redemptions yet.</p>'}
    </div>`;
    m.addEventListener('click', e => { if (e.target === m || e.target.tagName === 'BUTTON') m.remove(); });
    document.body.appendChild(m);
  });

  /* ── export ── */
  const cell = c => { c = String(c ?? ''); return /^[=+\-@]/.test(c) ? "'" + c : c; };
  const exportCsv = guard(async () => {
    const d = await api('?' + qs({ export: '1' }));
    const rows = [['Code', 'Owner', 'Campaign', 'Type', 'Value', 'Used', 'Limit', 'Start', 'End', 'Status'],
      ...d.coupons.map(c => [c.code, c.seller, c.campaignName || '', TYPE[c.discountType], c.discountValue, c.used, c.usageLimit, c.startDate || '', c.endDate || '', c.status])];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.map(r => r.map(c => `"${cell(c).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' }));
    a.download = `coupons-${Date.now()}.csv`; a.click();
  });

  /* ── wiring ── */
  const confirmDo = (msg, fn) => { if (confirm(msg)) fn(); };
  const act = guard(async (a, id) => {
    const c = S.coupons.find(x => x.id === id), p = S.promos.find(x => x.id === id);
    if (a === 'view') return viewCoupon(id);
    if (a === 'edit') return openCoupon(c);
    if (a === 'dup') { const r = await api(`/${id}/duplicate`, 'POST'); showToast(`Created draft ${r.code}`); return refreshAll(); }
    if (a === 'toggle') { showToast((await api(`/${id}/toggle`, 'POST'), 'Coupon updated')); return refreshAll(); }
    if (a === 'del') return confirmDo(`Delete coupon ${c.code}?`, guard(async () => { await api('/' + id, 'DELETE'); showToast('Coupon deleted'); refreshAll(); }));
    if (a === 'p-edit') return openPromo(p);
    if (a === 'p-toggle') { await api(`/promotions/${id}/toggle`, 'POST'); showToast('Campaign updated'); return refreshAll(); }
    if (a === 'p-del') return confirmDo(`Delete campaign "${p.name}"? Its coupons stay but are detached.`, guard(async () => { await api(`/promotions/${id}`, 'DELETE'); showToast('Campaign deleted'); refreshAll(); }));
  });

  const debounce = (fn, ms = 350) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const filterMap = { couponSearch: 'search', couponCodeFilter: 'code', campaignFilter: 'campaign', couponTypeFilter: 'type', statusFilter: 'status', sellerFilter: 'seller', dateStartFilter: 'from', dateEndFilter: 'to' };

  function init() {
    if (!$('summaryCards')) return;
    Object.entries(filterMap).forEach(([id, key]) => $(id).addEventListener(id.endsWith('Filter') && !/Code|campaign|date/i.test(id) ? 'change' : 'input',
      debounce(e => { S.f[key] = e.target.value; S.page = 1; loadCoupons(); })));
    $('dateStartFilter').addEventListener('change', e => { S.f.from = e.target.value; S.page = 1; loadCoupons(); });
    $('dateEndFilter').addEventListener('change', e => { S.f.to = e.target.value; S.page = 1; loadCoupons(); });
    $('resetCouponFilters').addEventListener('click', () => {
      Object.entries(filterMap).forEach(([id, key]) => { S.f[key] = ['type', 'status', 'seller'].includes(key) ? 'all' : ''; $(id).value = S.f[key]; });
      S.page = 1; loadCoupons();
    });
    $('createCouponBtn').addEventListener('click', () => openCoupon());
    $('createCampaignBtn').addEventListener('click', () => openPromo());
    $('createPromotionBtn').addEventListener('click', () => openPromo());
    $('refreshCouponsBtn').addEventListener('click', async () => { await refreshAll(); showToast('Refreshed'); });
    $('exportCouponsBtn').addEventListener('click', exportCsv);
    $('cpType').addEventListener('change', syncTypeFields);
    $('cpSave').addEventListener('click', saveCoupon);
    $('pmSave').addEventListener('click', savePromo);
    document.querySelectorAll('[data-close-drawer]').forEach(el => el.addEventListener('click', () => el.closest('.drawer').classList.add('hidden')));
    ['couponsTableBody', 'promotionsTableBody'].forEach(id => $(id).addEventListener('click', e => {
      const b = e.target.closest('button[data-act]'); if (b) act(b.dataset.act, b.dataset.id); }));
    $('couponPagination').addEventListener('click', e => {
      const b = e.target.closest('button[data-pg]'); if (b && !b.disabled) { S.page = +b.dataset.pg; loadCoupons(); } });
    refreshAll();
  }
  window.initializeCouponsPromotionsPage = init;
})();