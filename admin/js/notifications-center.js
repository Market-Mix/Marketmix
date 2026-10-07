(function () {
function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString();
}

const NOTIF_API = `${window.ADMIN_API_BASE || 'https://marketmix-backend.onrender.com/api'}/admin/notifications`;
const state = { page: 1, perPage: 10, total: 0, items: [], stats: {}, selected: null, editingId: null,
  filters: { search: '', id: '', status: 'all', type: 'all', audience: 'all', date: '' } };
const esc = s => window.escapeHtml(s);
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

async function nApi(path = '', method = 'GET', body, isForm = false) {
  const headers = { ...getAdminAuthHeaders() };
  if (body && !isForm) headers['Content-Type'] = 'application/json';
  const res = await fetch(NOTIF_API + path, { method, headers, body: body ? (isForm ? body : JSON.stringify(body)) : undefined });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.message || 'Request failed');
  return json.data;
}

async function loadNotifications() {
  const q = new URLSearchParams({ page: state.page, limit: state.perPage });
  Object.entries(state.filters).forEach(([k, v]) => { if (v && v !== 'all') q.set(k, v); });
  try {
    const d = await nApi('?' + q);
    state.items = d.notifications; state.total = d.total;
    renderNotificationsTable();
  } catch (e) { showToast(e.message, 'error'); }
}
async function loadStats() {
  try { state.stats = await nApi('/stats'); renderSummaryCards(); updateSidebarAnalytics(); }
  catch (e) { console.error('notif stats', e.message); }
}
const refreshAll = () => Promise.all([loadNotifications(), loadStats()]);

function renderSummaryCards() {
  const s = state.stats;
  const cards = [
    ['Total Notifications', s.total, 'fa-bell'], ['Unread (Admin Inbox)', s.unread, 'fa-envelope'],
    ['System Alerts', s.systemAlerts, 'fa-server'], ['User Notifications', s.userNotifications, 'fa-user'],
    ['Seller Notifications', s.sellerNotifications, 'fa-store'], ['Scheduled', s.scheduled, 'fa-calendar'],
  ];
  const el = document.getElementById('summaryCards'); if (!el) return;
  el.innerHTML = cards.map(([t, v, i]) => `
    <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="mb-3 rounded-xl bg-slate-100 px-3 py-2 w-fit text-slate-700"><i class="fa-solid ${i}"></i></div>
      <p class="text-sm text-slate-500">${t}</p><p class="mt-2 text-2xl font-semibold text-slate-900">${v ?? 0}</p>
    </div>`).join('');
}

const STATUS_CLS = { sent: 'bg-emerald-50 text-emerald-700', scheduled: 'bg-blue-50 text-blue-700',
  draft: 'bg-slate-100 text-slate-600', sending: 'bg-amber-50 text-amber-700', failed: 'bg-red-50 text-red-700' };

function renderNotificationsTable() {
  const body = document.getElementById('notificationsTableBody'); if (!body) return;
  body.innerHTML = state.items.length ? state.items.map(n => `
    <tr>
      <td class="px-4 py-3 font-medium text-slate-900">${n.displayId}</td>
      <td class="px-4 py-3">${esc(n.title)}</td>
      <td class="px-4 py-3">${cap(n.audience)}</td>
      <td class="px-4 py-3">${cap(n.type)}</td>
      <td class="px-4 py-3"><span class="px-2 py-1 rounded-full text-xs bg-slate-100">${cap(n.priority)}</span></td>
      <td class="px-4 py-3"><span class="px-2 py-1 rounded-full text-xs font-semibold ${STATUS_CLS[n.status] || ''}">${cap(n.status)}</span></td>
      <td class="px-4 py-3">${formatDate(n.sentDate || n.scheduledFor)}</td>
      <td class="px-4 py-3"><div class="flex gap-2">
        <button data-act="view" data-id="${n.id}" class="rounded-lg border border-slate-200 bg-white px-3 py-2"><i class="fas fa-eye mr-1"></i>View</button>
        ${['draft', 'scheduled'].includes(n.status) ? `
          <button data-act="edit" data-id="${n.id}" class="rounded-lg border border-slate-200 bg-white px-3 py-2"><i class="fas fa-edit mr-1"></i>Edit</button>
          <button data-act="send" data-id="${n.id}" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-blue-600"><i class="fas fa-paper-plane mr-1"></i>Send</button>` : ''}
        ${n.status !== 'sending' ? `<button data-act="delete" data-id="${n.id}" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-red-600"><i class="fas fa-trash mr-1"></i>Delete</button>` : ''}
      </div></td>
    </tr>`).join('') : `<tr><td colspan="8" class="px-4 py-10 text-center text-slate-500">No notifications found.</td></tr>`;
  const c = document.getElementById('notificationsCount'); if (c) c.textContent = `${state.total} notifications`;
  renderPagination(state.total);
}

function renderPagination(total) {
  const el = document.getElementById('pagination'); if (!el) return;
  const pages = Math.max(1, Math.ceil(total / state.perPage));
  el.innerHTML = Array.from({ length: pages }, (_, i) => i + 1).map(i =>
    `<button class="px-3 py-1 rounded ${i === state.page ? 'bg-blue-600 text-white' : 'bg-white border'}" data-page="${i}">${i}</button>`).join('');
  el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { state.page = +b.dataset.page; loadNotifications(); }));
}

async function openNotificationDetails(id) {
  try {
    const { notification: n } = await nApi('/' + id);
    state.selected = n;
    document.getElementById('notificationDetails').innerHTML = `
      ${n.bannerUrl ? `<img src="${esc(n.bannerUrl)}" class="mb-3 max-h-40 rounded-xl object-cover">` : ''}
      <h4 class="text-lg font-semibold text-slate-900">${esc(n.title)}</h4>
      <p class="text-sm text-slate-500 mt-1">${cap(n.type)} • ${cap(n.audience)} • ${n.channel.replace('_', '-')} • ${cap(n.status)}</p>
      <p class="mt-3 text-sm text-slate-700 whitespace-pre-line">${esc(n.message)}</p>
      <div class="mt-3 grid grid-cols-2 gap-4 text-sm">
        <div><strong>Created By</strong><p>${esc(n.createdBy)}</p></div>
        <div><strong>${n.status === 'scheduled' ? 'Scheduled For' : 'Sent'}</strong><p>${formatDate(n.scheduledFor || n.sentDate)}</p></div>
      </div>
      ${n.error ? `<p class="mt-3 text-sm text-red-600">Error: ${esc(n.error)}</p>` : ''}
      <div class="mt-3 rounded-xl border p-3 bg-slate-50"><h5 class="font-semibold">Delivery Statistics</h5>
        <div class="grid gap-1 mt-2 text-sm">
          <div>Total Recipients: <strong>${n.recipients}</strong></div><div>Delivered: <strong>${n.delivered}</strong></div>
          <div>Opened: <strong>${n.opened}</strong></div><div>Clicked: <strong>N/A</strong></div>
          <div>Failed: <strong>${n.failed}</strong></div>
        </div></div>`;
  } catch (e) { showToast(e.message, 'error'); }
}

function editNotification(id) {
  const n = state.items.find(x => x.id === id); if (!n) return;
  state.editingId = id;
  const set = (i, v) => { const el = document.getElementById(i); if (el) el.value = v ?? ''; };
  set('notifTitle', n.title); set('notifSubject', n.subject); set('notifMessage', n.message);
  set('notifType', n.channel); set('notifAudience', n.audience); set('notifCategory', n.type);
  set('notifPriority', n.priority); set('notifLink', n.link);
  toggleTargetField();
  if (n.scheduledFor) {
    const d = new Date(n.scheduledFor);
    set('scheduleDate', d.toISOString().slice(0, 10)); set('scheduleTime', d.toTimeString().slice(0, 5));
  }
  document.getElementById('notifTitle').scrollIntoView({ behavior: 'smooth' });
  showToast('Editing — Save, Send or Schedule when ready', 'success');
}

async function deleteNotification(id) {
  if (!confirm('Delete this notification? Copies already delivered in-app will be recalled.')) return;
  try { await nApi('/' + id, 'DELETE'); showToast('Notification deleted'); refreshAll(); }
  catch (e) { showToast(e.message, 'error'); }
}

async function sendExisting(id) {
  if (!confirm('Send this notification now?')) return;
  try { await nApi(`/${id}/send`, 'POST'); showToast('Sending…'); setTimeout(refreshAll, 1200); }
  catch (e) { showToast(e.message, 'error'); }
}

/* ── Compose ── */
const val = id => (document.getElementById(id)?.value || '').trim();
function toggleTargetField() {
  document.getElementById('notifTarget')?.classList.toggle('hidden', val('notifAudience').toLowerCase() !== 'individual');
}
function resetCompose() {
  document.getElementById('composeForm').reset(); state.editingId = null; toggleTargetField();
}

async function submitCompose(action) {
  const form = document.getElementById('composeForm');
  const btns = [...form.querySelectorAll('button')]; btns.forEach(b => b.disabled = true);
  try {
    const body = { action, title: val('notifTitle'), subject: val('notifSubject'), message: val('notifMessage'),
      channel: val('notifType'), audience: val('notifAudience'), target_email: val('notifTarget'),
      type: val('notifCategory'), priority: val('notifPriority'), link: val('notifLink') };
    if (action === 'schedule') {
      if (!val('scheduleDate') || !val('scheduleTime')) throw new Error('Pick a schedule date and time');
      body.scheduled_for = new Date(`${val('scheduleDate')}T${val('scheduleTime')}`).toISOString();
    }
    if (action === 'send' && !confirm(`Send now to: ${body.audience}?`)) return;
    const file = document.getElementById('notifBannerInput').files[0];
    if (file) {
      const fd = new FormData(); fd.append('file', file);
      body.banner_url = (await nApi('/banner-upload', 'POST', fd, true)).url;
    }
    await nApi(state.editingId ? '/' + state.editingId : '', state.editingId ? 'PUT' : 'POST', body);
    showToast({ draft: 'Draft saved', send: 'Notification sent', schedule: 'Notification scheduled' }[action]);
    resetCompose(); state.page = 1;
    setTimeout(refreshAll, action === 'send' ? 800 : 0);
  } catch (e) { showToast(e.message, 'error'); }
  finally { btns.forEach(b => b.disabled = false); }
}

function wireComposeForm() {
  const on = (id, fn) => document.getElementById(id).addEventListener('click', e => { e.preventDefault(); fn(); });
  on('saveDraftBtn', () => submitCompose('draft'));
  on('sendNowBtn', () => submitCompose('send'));
  on('scheduleBtn', () => submitCompose('schedule'));
  on('previewBtn', () => alert(`Preview:\n${val('notifTitle')}\n---\n${val('notifMessage')}`));
  document.getElementById('notifAudience').addEventListener('change', toggleTargetField);
}

/* ── Filters / top buttons ── */
const reloadFilters = (() => { let t; return () => { clearTimeout(t); t = setTimeout(() => { state.page = 1; loadNotifications(); }, 300); }; })();

function wireFilters() {
  const bind = (id, key, ev = 'input') => document.getElementById(id).addEventListener(ev, e => { state.filters[key] = e.target.value; reloadFilters(); });
  bind('searchNotification', 'search'); bind('notificationIdFilter', 'id');
  bind('statusFilter', 'status', 'change'); bind('typeFilter', 'type', 'change');
  bind('audienceFilter', 'audience', 'change'); bind('notifDateInput', 'date', 'change');
  document.getElementById('resetNotifFiltersBtn').addEventListener('click', () => {
    state.filters = { search: '', id: '', status: 'all', type: 'all', audience: 'all', date: '' };
    ['searchNotification', 'notificationIdFilter', 'notifDateInput'].forEach(i => document.getElementById(i).value = '');
    ['statusFilter', 'typeFilter', 'audienceFilter'].forEach(i => document.getElementById(i).value = 'all');
    reloadFilters();
  });
}

function wireTopButtons() {
  document.getElementById('refreshNotifBtn').addEventListener('click', async () => { await refreshAll(); showToast('Refreshed'); });
  document.getElementById('createNotifBtn').addEventListener('click', () => { resetCompose(); document.getElementById('notifTitle').focus(); });
  document.getElementById('exportNotifBtn').addEventListener('click', () => {
    const rows = [['ID', 'Title', 'Audience', 'Type', 'Priority', 'Status', 'Recipients', 'Delivered', 'Opened', 'Failed', 'Date']]
      .concat(state.items.map(n => [n.displayId, n.title, n.audience, n.type, n.priority, n.status, n.recipients, n.delivered, n.opened, n.failed, n.sentDate || n.scheduledFor || '']));
    const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `notifications-${Date.now()}.csv`; a.click();
  });
}

function updateSidebarAnalytics() {
  const s = state.stats, set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('todayCount', s.today ?? 0); set('deliveryRate', (s.deliveryRate ?? 0) + '%');
  set('openRate', (s.openRate ?? 0) + '%'); set('clickRate', 'N/A');
}

function initializeNotificationsPage() {
  wireFilters(); wireTopButtons(); wireComposeForm();
  document.getElementById('notificationsTableBody').addEventListener('click', e => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    ({ view: openNotificationDetails, edit: editNotification, send: sendExisting, delete: deleteNotification })[b.dataset.act](b.dataset.id);
  });
  refreshAll();
}
window.initializeNotificationsPage = initializeNotificationsPage;
})();
