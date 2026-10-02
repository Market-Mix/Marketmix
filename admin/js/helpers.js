// ── Admin notification bell (live inbox from /api/notifications) ──
(function () {
  const POLL_MS = 60000;
  let items = [], unread = 0, timer = null, dropdown = null;

  const ICONS = {
    refund: 'fa-undo text-red-500', refund_chat: 'fa-comments text-red-500',
    withdrawal: 'fa-wallet text-indigo-500', order: 'fa-receipt text-blue-500',
    payment: 'fa-credit-card text-green-500', account: 'fa-user-shield text-amber-500',
  };
  const ROUTES = { refund: 'returns', refund_chat: 'returns', withdrawal: 'withdrawals', order: 'orders', payment: 'payments' };

  const esc = s => window.escapeHtml(s);
  const api = async (path = '', method = 'GET') => {
    const res = await fetch(`${ADMIN_API_BASE}/notifications${path}`, { method, headers: getAdminAuthHeaders() });
    if (res.status === 401) { stopPolling(); throw new Error('unauthorized'); }
    const body = await res.json().catch(() => null);
    if (!res.ok) throw new Error(body?.message || 'Request failed');
    return body.data;
  };

  function ago(iso) {
    const m = Math.floor((Date.now() - new Date(iso)) / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    if (m < 1440) return `${Math.floor(m / 60)}h ago`;
    if (m < 10080) return `${Math.floor(m / 1440)}d ago`;
    return new Date(iso).toLocaleDateString();
  }

  function renderBadge() {
    const b = document.getElementById('notifBadge'); if (!b) return;
    b.textContent = unread > 99 ? '99+' : unread;
    b.classList.toggle('hidden', unread === 0);
  }

  function renderList() {
    if (!dropdown) return;
    const list = dropdown.querySelector('#notifList');
    list.innerHTML = items.length ? items.map(n => `
      <div data-id="${n.id}" data-type="${esc(n.type)}" class="notif-item group flex gap-3 px-4 py-3 cursor-pointer border-b border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 ${n.isRead ? '' : 'bg-blue-50 dark:bg-gray-800'}">
        <i class="fas ${ICONS[n.type] || 'fa-bell text-gray-400'} mt-1 w-4"></i>
        <div class="flex-1 min-w-0">
          <p class="text-sm ${n.isRead ? 'font-medium' : 'font-semibold'} text-gray-900 dark:text-white break-words">${esc(n.title)}</p>
          <p class="text-xs text-gray-600 dark:text-gray-300 mt-0.5 break-words">${esc(n.message)}</p>
          <p class="text-xs text-gray-400 mt-1">${ago(n.createdAt)}</p>
        </div>
        ${n.isRead ? '' : '<span class="mt-2 w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>'}
        <button data-del="${n.id}" title="Dismiss" class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 text-xs self-start">✕</button>
      </div>`).join('')
      : '<p class="px-4 py-8 text-center text-sm text-gray-500">You\'re all caught up 🎉</p>';
  }

  async function refresh() {
    try {
      const d = await api();
      items = d.notifications || []; unread = d.unreadCount || 0;
      renderBadge(); renderList();
    } catch (e) { if (e.message !== 'unauthorized') console.warn('Notification poll failed:', e.message); }
  }

  function startPolling() {
    stopPolling(); refresh();
    timer = setInterval(() => { if (!document.hidden) refresh(); }, POLL_MS);
  }
  function stopPolling() { if (timer) { clearInterval(timer); timer = null; } }

  function build(parent) {
    dropdown = document.createElement('div');
    dropdown.className = 'notification-dropdown hidden absolute right-0 mt-2 w-96 max-w-[90vw] bg-white dark:bg-gray-700 rounded shadow-lg z-50 overflow-hidden';
    dropdown.style.top = '100%';
    dropdown.innerHTML = `
      <div class="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-600">
        <p class="font-semibold text-gray-900 dark:text-white text-sm">Notifications</p>
        <button id="notifMarkAll" class="text-xs text-blue-600 hover:underline">Mark all read</button>
      </div>
      <div id="notifList" class="max-h-96 overflow-y-auto"></div>
      <div class="px-4 py-2 text-center border-t border-gray-200 dark:border-gray-600">
        <a href="javascript:void(0);" id="notifOpenCenter" class="text-xs text-blue-600 hover:underline">Open Notifications Center</a>
      </div>`;
    parent.appendChild(dropdown);

    dropdown.addEventListener('click', async (e) => {
      e.stopPropagation();
      const del = e.target.closest('[data-del]');
      if (del) {
        const id = del.dataset.del, n = items.find(x => x.id === id);
        items = items.filter(x => x.id !== id);
        if (n && !n.isRead) unread = Math.max(0, unread - 1);
        renderBadge(); renderList();
        api(`/${id}`, 'DELETE').catch(refresh);
        return;
      }
      if (e.target.closest('#notifMarkAll')) {
        items.forEach(n => n.isRead = true); unread = 0; renderBadge(); renderList();
        api('/read-all', 'PUT').catch(refresh);
        return;
      }
      if (e.target.closest('#notifOpenCenter')) { dropdown.classList.add('hidden'); loadPage('notifications'); return; }
      const row = e.target.closest('.notif-item');
      if (row) {
        const n = items.find(x => x.id === row.dataset.id);
        if (n && !n.isRead) {
          n.isRead = true; unread = Math.max(0, unread - 1); renderBadge(); renderList();
          api(`/${n.id}/read`, 'PUT').catch(refresh);
        }
        const page = ROUTES[row.dataset.type];
        if (page) { dropdown.classList.add('hidden'); loadPage(page); }
      }
    });

    document.addEventListener('click', (e) => {
      if (!dropdown.classList.contains('hidden') && !e.target.closest('.notification-dropdown') &&
          !e.target.closest('button[onclick="toggleNotificationBell()"]')) dropdown.classList.add('hidden');
    });
  }

  window.toggleNotificationBell = function () {
    const btn = document.querySelector('button[onclick="toggleNotificationBell()"]');
    if (!btn) return;
    if (!dropdown) build(btn.parentElement);
    document.getElementById('profileDropdown')?.classList.add('hidden');
    const opening = dropdown.classList.contains('hidden');
    dropdown.classList.toggle('hidden');
    if (opening) refresh();
  };

  const init = () => { if (localStorage.getItem('adminSession')) startPolling(); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
  document.addEventListener('visibilitychange', () => { if (!document.hidden && timer) refresh(); });
})();

// Profile dropdown toggle
function toggleProfileDropdown() {
  const dropdown = document.getElementById('profileDropdown');
  if (!dropdown) return;
  dropdown.classList.toggle('hidden');

  // close when clicking outside
  if (!window._profileDropdownListenerAdded) {
    window._profileDropdownListenerAdded = true;
    document.addEventListener('click', (e) => {
      const open = document.getElementById('profileDropdown');
      if (!open || open.classList.contains('hidden')) return;
      if (e.target.closest && !e.target.closest('#profileDropdown') && !e.target.closest('button[onclick="toggleProfileDropdown()"]')) {
        open.classList.add('hidden');
      }
    });
  }
}
