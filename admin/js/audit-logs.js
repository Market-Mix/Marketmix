(function () {
  const API = `${ADMIN_API_BASE}/admin/audit-logs`;
  const $ = id => document.getElementById(id);
  const esc = value => window.escapeHtml(value);
  const defaults = () => ({ search: '', action: 'all', type: 'all', actor: 'all', severity: 'all', from: '', to: '', sort: 'desc' });
  const S = { page: 1, limit: 20, total: 0, rows: [], f: defaults() };
  const FMAP = { auditSearch: 'search', actionFilter: 'action', typeFilter: 'type', actorFilter: 'actor', severityFilter: 'severity', dateFrom: 'from', dateTo: 'to', sortSelect: 'sort' };

  const qs = () => {
    const params = new URLSearchParams({ page: S.page, limit: S.limit });
    Object.entries(S.f).forEach(([key, value]) => {
      if (value && value !== 'all') params.set(key, value);
    });
    return params;
  };

  async function api(path = '', raw = false) {
    const response = await fetch(API + path, { headers: getAdminAuthHeaders() });
    if (raw) {
      if (!response.ok) throw new Error('Export failed');
      return response.blob();
    }
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.message || 'Request failed');
    return body.data;
  }

  const guard = fn => async (...args) => {
    try {
      await fn(...args);
      return true;
    } catch (error) {
      showToast(error.message || 'Request failed', 'error');
      return false;
    }
  };
  const when = date => new Date(date).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const severity = value => ['high', 'medium', 'low'].includes(value) ? value : 'low';

  const loadStats = guard(async () => {
    const stats = await api('/stats');
    const cards = [
      ['Total Events', stats.total, 'fa-clipboard-list'],
      ['Today', stats.today, 'fa-calendar-day'],
      ['Last 7 Days', stats.week, 'fa-clock'],
      ['Active Actors (30d)', stats.actors, 'fa-user-shield'],
      ['High Severity (7d)', stats.highWeek, 'fa-triangle-exclamation']
    ];
    $('summaryCards').innerHTML = cards.map(([title, value, icon]) => `
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" style="border-top:3px solid #FF7A00">
        <div class="flex items-center justify-between"><span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><i class="fas ${icon}"></i></span></div>
        <p class="mt-4 text-sm text-slate-500">${title}</p><p class="mt-1 text-3xl font-semibold text-slate-900">${Number(value).toLocaleString()}</p></div>`).join('');

    $('topActions').innerHTML = stats.topActions.length ? stats.topActions.map(action => `
      <button data-top="${esc(action.action)}" class="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm hover:border-[#FF7A00]">
        <span class="text-slate-700">${esc(action.label)}</span><span class="font-semibold text-slate-900">${action.count}</span></button>`).join('')
      : '<p class="text-sm text-slate-400">No activity yet.</p>';
  });

  const loadFilters = guard(async () => {
    const data = await api('/filters');
    $('actionFilter').innerHTML = '<option value="all">All Actions</option>' + data.actions.map(action => `<option value="${esc(action.value)}">${esc(action.label)}</option>`).join('');
    $('typeFilter').innerHTML = '<option value="all">All Objects</option>' + data.types.map(type => `<option value="${esc(type)}">${esc(type)}</option>`).join('');
    $('actorFilter').innerHTML = '<option value="all">All Actors</option>' + data.actors.map(actor => `<option value="${esc(actor.id)}">${esc(actor.name)}</option>`).join('');
    Object.entries(FMAP).forEach(([id, key]) => { $(id).value = S.f[key]; });
  });

  const loadRows = guard(async () => {
    const data = await api('?' + qs());
    S.rows = data.logs;
    S.total = data.total;
    $('auditTableBody').innerHTML = data.logs.length ? data.logs.map(log => `
      <tr class="audit-row" data-id="${esc(log.id)}">
        <td class="whitespace-nowrap px-4 py-3">${when(log.createdAt)}</td>
        <td class="px-4 py-3"><span class="sev ${severity(log.severity)}">${esc(log.severity)}</span></td>
        <td class="px-4 py-3"><p class="font-medium text-slate-900">${esc(log.actionLabel)}</p><p class="max-w-xs truncate text-xs text-slate-400">${esc(log.description)}</p></td>
        <td class="px-4 py-3">${esc(log.actor.name)}<p class="text-xs capitalize text-slate-400">${esc(log.actor.role)}</p></td>
        <td class="px-4 py-3">${esc(log.objectType || '—')}<p class="text-xs text-slate-400">${esc(String(log.objectId || '').slice(0, 8))}</p></td>
        <td class="px-4 py-3">${esc(log.ip || '—')}</td>
        <td class="px-4 py-3 text-right text-slate-400"><i class="fas fa-chevron-right"></i></td></tr>`).join('')
      : '<tr><td colspan="7" class="px-4 py-12 text-center text-slate-400">No audit events match these filters.</td></tr>';
    $('auditCount').textContent = `${data.total.toLocaleString()} events`;
    const pages = Math.max(Math.ceil(data.total / S.limit), 1);
    $('auditPagination').innerHTML = `
      <span>Page ${S.page} of ${pages}</span>
      <div class="flex gap-2">
        <button data-pg="${S.page - 1}" ${S.page <= 1 ? 'disabled' : ''} class="rounded-xl border border-slate-200 bg-white px-3 py-2 disabled:opacity-40">Previous</button>
        <button data-pg="${S.page + 1}" ${S.page >= pages ? 'disabled' : ''} class="rounded-xl border border-slate-200 bg-white px-3 py-2 disabled:opacity-40">Next</button></div>`;
  });

  const kv = (label, value) => `<div class="audit-kv"><span>${label}</span><span>${value}</span></div>`;
  const openLog = guard(async id => {
    const log = S.rows.find(row => row.id === id) || (await api('/' + encodeURIComponent(id))).log;
    $('auditDrawerTitle').textContent = log.actionLabel;
    const json = JSON.stringify(log.metadata ?? {}, null, 2);
    $('auditDrawerBody').innerHTML = `
      <div class="mb-4"><span class="sev ${severity(log.severity)}">${esc(log.severity)} severity</span></div>
      <p class="mb-4 text-sm text-slate-700">${esc(log.description)}</p>
      <div class="space-y-2">
        ${kv('Event ID', esc(log.id))}${kv('Time', when(log.createdAt))}${kv('Action', esc(log.action))}
        ${kv('Actor', esc(log.actor.name))}${kv('Actor Email', esc(log.actor.email || '—'))}${kv('Role', esc(log.actor.role))}
        ${kv('Object Type', esc(log.objectType || '—'))}${kv('Object ID', esc(log.objectId || '—'))}
        ${kv('IP Address', esc(log.ip || '—'))}${kv('Device', esc(log.userAgent || '—'))}</div>
      <div class="mt-5 flex items-center justify-between"><h4 class="text-sm font-semibold text-slate-900">Metadata</h4>
        <button id="copyMeta" class="rounded-lg border border-slate-200 px-3 py-1 text-xs">Copy JSON</button></div>
      <pre class="mt-2 max-h-80 overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">${esc(json)}</pre>`;
    $('copyMeta').onclick = guard(async () => {
      await navigator.clipboard.writeText(json);
      showToast('Copied');
    });
    $('auditDrawer').classList.remove('hidden');
  });

  const exportCsv = guard(async () => {
    const blob = await api('/export?' + qs(), true);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Export started');
  });

  const debounce = (fn, ms = 350) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  };
  const refreshAll = () => Promise.all([loadStats(), loadRows()]);

  function init() {
    if (!$('auditTableBody')) return;
    clearInterval(window.__auditTimer);
    Object.entries(FMAP).forEach(([id, key]) => $(id).addEventListener(id === 'auditSearch' ? 'input' : 'change',
      debounce(event => {
        S.f[key] = event.target.value;
        S.page = 1;
        loadRows();
      }, id === 'auditSearch' ? 350 : 0)));
    $('resetAuditFilters').addEventListener('click', () => {
      S.f = defaults();
      Object.entries(FMAP).forEach(([id, key]) => { $(id).value = S.f[key]; });
      S.page = 1;
      loadRows();
    });
    $('refreshAuditLogsBtn').addEventListener('click', async () => {
      const results = await refreshAll();
      if (results.every(Boolean)) showToast('Refreshed');
    });
    $('exportAuditLogsBtn').addEventListener('click', exportCsv);
    $('auditTableBody').addEventListener('click', event => {
      const row = event.target.closest('tr[data-id]');
      if (row) openLog(row.dataset.id);
    });
    $('auditPagination').addEventListener('click', event => {
      const button = event.target.closest('button[data-pg]');
      if (button && !button.disabled) {
        S.page = Number(button.dataset.pg);
        loadRows();
      }
    });
    $('topActions').addEventListener('click', event => {
      const button = event.target.closest('button[data-top]');
      if (!button) return;
      S.f.action = button.dataset.top;
      $('actionFilter').value = S.f.action;
      S.page = 1;
      loadRows();
    });
    document.querySelectorAll('[data-close-audit]').forEach(element => element.addEventListener('click', () => $('auditDrawer').classList.add('hidden')));
    $('auditLive').addEventListener('change', event => {
      clearInterval(window.__auditTimer);
      if (event.target.checked) window.__auditTimer = setInterval(() => {
        if (!$('auditTableBody')) return clearInterval(window.__auditTimer);
        if (!document.hidden && S.page === 1) refreshAll();
      }, 30000);
    });
    loadFilters();
    refreshAll();
  }

  window.initializeAuditLogsPage = init;
})();
