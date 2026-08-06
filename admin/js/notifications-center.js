const notificationsData = [
  { id: 'NTF-1001', title: 'Flash Sale Starts Tomorrow', audience: 'All', type: 'System', priority: 'High', status: 'Scheduled', sentDate: '2026-08-05', recipients: 12000, delivered: 0, opened: 0, clicked: 0, failed: 0, createdBy: 'System' },
  { id: 'NTF-1002', title: 'Withdrawal Approved', audience: 'Sellers', type: 'User', priority: 'Medium', status: 'Sent', sentDate: '2026-07-31', recipients: 3200, delivered: 3180, opened: 2800, clicked: 1200, failed: 20, createdBy: 'Finance Admin' },
  { id: 'NTF-1003', title: 'Order Delivered', audience: 'Buyers', type: 'User', priority: 'Low', status: 'Sent', sentDate: '2026-07-30', recipients: 5400, delivered: 5388, opened: 4000, clicked: 500, failed: 12, createdBy: 'Logistics' },
  { id: 'NTF-1004', title: 'New Seller Registered', audience: 'Admins', type: 'System', priority: 'Low', status: 'Draft', sentDate: '', recipients: 12, delivered: 0, opened: 0, clicked: 0, failed: 0, createdBy: 'System' },
  { id: 'NTF-1005', title: 'System Maintenance', audience: 'All', type: 'System', priority: 'Critical', status: 'Sent', sentDate: '2026-07-28', recipients: 15000, delivered: 14800, opened: 10000, clicked: 3000, failed: 200, createdBy: 'Infra' },
  { id: 'NTF-1006', title: 'Refund Completed', audience: 'Buyers', type: 'User', priority: 'Medium', status: 'Sent', sentDate: '2026-07-27', recipients: 800, delivered: 800, opened: 600, clicked: 40, failed: 0, createdBy: 'Support' }
];

const state = {
  page: 1,
  perPage: 5,
  filters: {
    search: '',
    status: 'all',
    type: 'all',
    audience: 'all',
    date: ''
  },
  selected: null
};

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString();
}

function renderSummaryCards() {
  const cards = [
    { title: 'Total Notifications', value: notificationsData.length, icon: 'fa-bell', badge: 'primary' },
    { title: 'Unread Notifications', value: 124, icon: 'fa-envelope', badge: 'amber' },
    { title: 'System Alerts', value: notificationsData.filter(n => n.type === 'System').length, icon: 'fa-server', badge: 'red' },
    { title: 'User Notifications', value: notificationsData.filter(n => n.type === 'User').length, icon: 'fa-user', badge: 'blue' },
    { title: 'Seller Notifications', value: notificationsData.filter(n => n.audience === 'Sellers').length, icon: 'fa-store', badge: 'violet' },
    { title: 'Scheduled Notifications', value: notificationsData.filter(n => n.status === 'Scheduled').length, icon: 'fa-calendar', badge: 'cyan' }
  ];

  const container = document.getElementById('summaryCards');
  if (!container) return;
  container.innerHTML = cards.map(c => `
    <div class="metric-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
      <div class="mb-3 flex items-center justify-between">
        <div class="rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 px-3 py-2 text-slate-700 shadow-sm"><i class="fa-solid ${c.icon}"></i></div>
        <span class="rounded-full bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">${c.title}</span>
      </div>
      <p class="text-sm text-slate-500">${c.title}</p>
      <p class="mt-2 text-2xl font-semibold text-slate-900">${c.value}</p>
    </div>
  `).join('');
}

function getFilteredNotifications() {
  return notificationsData.filter(n => {
    if (state.filters.search && !(`${n.title} ${n.id}`.toLowerCase().includes(state.filters.search.toLowerCase()))) return false;
    if (state.filters.status !== 'all' && n.status !== state.filters.status) return false;
    if (state.filters.type !== 'all' && n.type !== state.filters.type) return false;
    if (state.filters.audience !== 'all' && state.filters.audience !== '' && n.audience !== state.filters.audience) return false;
    if (state.filters.date && n.sentDate && new Date(n.sentDate).toDateString() !== new Date(state.filters.date).toDateString()) return false;
    return true;
  });
}

function renderNotificationsTable() {
  const body = document.getElementById('notificationsTableBody');
  if (!body) return;
  const all = getFilteredNotifications();
  const start = (state.page - 1) * state.perPage;
  const pageItems = all.slice(start, start + state.perPage);

  body.innerHTML = pageItems.map(n => `
    <tr>
      <td class="px-4 py-3 font-medium text-slate-900">${n.id}</td>
      <td class="px-4 py-3">${n.title}</td>
      <td class="px-4 py-3">${n.audience}</td>
      <td class="px-4 py-3">${n.type}</td>
      <td class="px-4 py-3"><span class="px-2 py-1 rounded-full text-xs bg-slate-100">${n.priority}</span></td>
      <td class="px-4 py-3">${n.status}</td>
      <td class="px-4 py-3">${formatDate(n.sentDate)}</td>
      <td class="px-4 py-3">
        <div class="flex gap-2">
          <button class="view-btn rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700" data-id="${n.id}"><i class="fas fa-eye mr-1"></i>View</button>
          <button class="edit-btn rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700" data-id="${n.id}"><i class="fas fa-edit mr-1"></i>Edit</button>
          <button class="delete-btn rounded-lg border border-slate-200 bg-white px-3 py-2 text-red-600" data-id="${n.id}"><i class="fas fa-trash mr-1"></i>Delete</button>
        </div>
      </td>
    </tr>
  `).join('');

  document.getElementById('notificationsCount') && (document.getElementById('notificationsCount').textContent = `${all.length} notifications`);
  renderPagination(all.length);

  // wire buttons
  document.querySelectorAll('.view-btn').forEach(b => b.addEventListener('click', (e) => openNotificationDetails(e.currentTarget.dataset.id)));
  document.querySelectorAll('.edit-btn').forEach(b => b.addEventListener('click', (e) => editNotification(e.currentTarget.dataset.id)));
  document.querySelectorAll('.delete-btn').forEach(b => b.addEventListener('click', (e) => deleteNotification(e.currentTarget.dataset.id)));
}

function renderPagination(total) {
  const container = document.getElementById('pagination');
  if (!container) return;
  const pages = Math.max(1, Math.ceil(total / state.perPage));
  let html = '';
  for (let i = 1; i <= pages; i++) {
    html += `<button class="px-3 py-1 rounded ${i===state.page ? 'bg-blue-600 text-white' : 'bg-white'}" data-page="${i}">${i}</button>`;
  }
  container.innerHTML = html;
  container.querySelectorAll('button').forEach(btn => btn.addEventListener('click', (e) => { state.page = Number(e.currentTarget.dataset.page); renderNotificationsTable(); }));
}

function openNotificationDetails(id) {
  const n = notificationsData.find(x => x.id === id);
  if (!n) return;
  state.selected = n;
  const container = document.getElementById('notificationDetails');
  if (!container) return;
  container.innerHTML = `
    <h4 class="text-lg font-semibold text-slate-900">${n.title}</h4>
    <p class="text-sm text-slate-500 mt-1">${n.type} • ${n.audience} • ${n.status}</p>
    <div class="mt-4 grid gap-3">
      <div><strong>Full Message</strong><p class="mt-1 text-sm text-slate-700">${n.title} — full message placeholder for designers.</p></div>
      <div class="grid grid-cols-2 gap-4">
        <div><strong>Created By</strong><p class="mt-1 text-sm">${n.createdBy}</p></div>
        <div><strong>Scheduled Time</strong><p class="mt-1 text-sm">${n.status === 'Scheduled' ? formatDate(n.sentDate) : '-'}</p></div>
      </div>
      <div class="mt-3 rounded-xl border p-3 bg-slate-50">
        <h5 class="font-semibold">Delivery Statistics</h5>
        <div class="grid gap-2 mt-2">
          <div>Total Recipients: <strong>${n.recipients}</strong></div>
          <div>Delivered: <strong>${n.delivered}</strong></div>
          <div>Opened: <strong>${n.opened}</strong></div>
          <div>Clicked: <strong>${n.clicked}</strong></div>
          <div>Failed: <strong>${n.failed}</strong></div>
        </div>
      </div>
    </div>
  `;
  updateSidebarAnalytics();
}

function editNotification(id) {
  const n = notificationsData.find(x => x.id === id);
  if (!n) return alert('Not found');
  // populate compose form
  document.getElementById('notifTitle').value = n.title;
  document.getElementById('notifSubject').value = n.title;
  document.getElementById('notifMessage').value = `${n.title} — editable message`;
  document.getElementById('notifType').value = n.type;
  document.getElementById('notifAudience').value = n.audience;
  showToast('Loaded notification into compose form', 'success');
}

function deleteNotification(id) {
  if (!confirm('Delete this notification?')) return;
  const idx = notificationsData.findIndex(x => x.id === id);
  if (idx === -1) return showToast('Not found', 'error');
  notificationsData.splice(idx, 1);
  renderSummaryCards();
  renderNotificationsTable();
  showToast('Notification deleted', 'success');
}

function wireFilters() {
  document.getElementById('searchNotification').addEventListener('input', (e) => { state.filters.search = e.target.value; state.page = 1; renderNotificationsTable(); });
  document.getElementById('statusFilter').addEventListener('change', (e) => { state.filters.status = e.target.value; state.page = 1; renderNotificationsTable(); });
  document.getElementById('typeFilter').addEventListener('change', (e) => { state.filters.type = e.target.value; state.page = 1; renderNotificationsTable(); });
  document.getElementById('audienceFilter').addEventListener('change', (e) => { state.filters.audience = e.target.value; state.page = 1; renderNotificationsTable(); });
  document.getElementById('notifDateInput').addEventListener('change', (e) => { state.filters.date = e.target.value; state.page = 1; renderNotificationsTable(); });
  document.getElementById('resetNotifFiltersBtn').addEventListener('click', () => { state.filters = { search: '', status: 'all', type: 'all', audience: 'all', date: '' }; document.getElementById('searchNotification').value = ''; document.getElementById('statusFilter').value = 'all'; document.getElementById('typeFilter').value = 'all'; document.getElementById('audienceFilter').value = 'all'; document.getElementById('notifDateInput').value = ''; renderNotificationsTable(); });
}

function wireTopButtons() {
  document.getElementById('refreshNotifBtn').addEventListener('click', () => { renderSummaryCards(); renderNotificationsTable(); showToast('Refreshed'); });
  document.getElementById('exportNotifBtn').addEventListener('click', () => { showToast('Exported (UI-only)', 'success'); });
  document.getElementById('createNotifBtn').addEventListener('click', () => { document.getElementById('notifTitle').focus(); showToast('Compose opened'); });
}

function wireComposeForm() {
  document.getElementById('saveDraftBtn').addEventListener('click', (e) => { e.preventDefault(); showToast('Saved draft (UI-only)', 'success'); });
  document.getElementById('previewBtn').addEventListener('click', (e) => { e.preventDefault(); const title = document.getElementById('notifTitle').value; const message = document.getElementById('notifMessage').value; alert(`Preview:\n${title}\n---\n${message}`); });
  document.getElementById('sendNowBtn').addEventListener('click', (e) => { e.preventDefault(); showToast('Sent (UI-only)', 'success'); });
  document.getElementById('scheduleBtn').addEventListener('click', (e) => { e.preventDefault(); showToast('Scheduled (UI-only)', 'success'); });
}

function updateSidebarAnalytics() {
  const totalToday = notificationsData.filter(n => n.sentDate === new Date().toISOString().slice(0,10)).length;
  document.getElementById('todayCount') && (document.getElementById('todayCount').textContent = String(totalToday));
  // simplistic rates
  const delivered = notificationsData.reduce((s,n)=>s+n.delivered,0);
  const recipients = notificationsData.reduce((s,n)=>s+n.recipients,0) || 1;
  const opened = notificationsData.reduce((s,n)=>s+n.opened,0);
  const clicked = notificationsData.reduce((s,n)=>s+n.clicked,0);
  const failed = notificationsData.reduce((s,n)=>s+n.failed,0);
  document.getElementById('deliveryRate') && (document.getElementById('deliveryRate').textContent = Math.round((delivered/recipients)*100) + '%');
  document.getElementById('openRate') && (document.getElementById('openRate').textContent = Math.round((opened/recipients)*100) + '%');
  document.getElementById('clickRate') && (document.getElementById('clickRate').textContent = Math.round((clicked/recipients)*100) + '%');
}

function initializeNotificationsPage() {
  renderSummaryCards();
  wireFilters();
  wireTopButtons();
  wireComposeForm();
  renderNotificationsTable();
  updateSidebarAnalytics();
}

window.initializeNotificationsPage = initializeNotificationsPage;
