let adminAccounts = [], rolesDataset = [], permissionHistory = [], selectedAdmin = null, currentRoleId = null;
const RBAC_API = `${window.ADMIN_API_BASE || 'https://marketmix-backend.onrender.com/api'}/admin/rbac`;
const esc = value => window.escapeHtml(value);
const val = id => (document.getElementById(id)?.value || '').trim();
const fmtDate = date => date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

async function rbac(path = '', method = 'GET', body) {
  const response = await fetch(RBAC_API + path, {
    method,
    headers: { ...getAdminAuthHeaders(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.message || 'Request failed');
  return result.data;
}

async function loadRbac() {
  try {
    const [summary, admins, roles, history] = await Promise.all([
      rbac('/summary'), rbac('/admins'), rbac('/roles'), rbac('/history')
    ]);
    adminAccounts = admins.admins;
    rolesDataset = roles.roles;
    permissionHistory = history.history;
    const values = [summary.total, summary.active, summary.pending, summary.roles, summary.custom, summary.suspended];
    document.querySelectorAll('main section.mb-6.grid p.text-3xl').forEach((element, index) => {
      element.textContent = values[index] ?? 0;
    });
    renderAdministratorsTable();
    renderRolesTable();
    renderRoleSummaryCards();
    populateFilterOptions();
    renderPermissionHistoryList();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

const guarded = fn => async (...args) => {
  try {
    return await fn(...args);
  } catch (error) {
    showToast(error.message, 'error');
  }
};

const permissionTypes = ['View', 'Create', 'Edit', 'Delete', 'Approve', 'Reject', 'Export', 'Manage'];
const permissionModules = [
  'Dashboard', 'Users', 'Buyers', 'Sellers', 'Seller KYC', 'Stores', 'Products', 'Product Approvals',
  'Orders', 'Payments', 'Withdrawals', 'Refunds', 'Reviews', 'Support Center', 'Notifications',
  'Website CMS', 'Analytics', 'Coupons & Promotions', 'Audit Logs', 'Roles & Permissions', 'Settings'
];

const highRiskPermissions = new Set([
  'Users:Delete', 'Withdrawals:Approve', 'Payments:Manage', 'Refunds:Manage', 'Roles & Permissions:Manage', 'Audit Logs:Delete'
]);

const permissionStates = {
  allowed: { label: 'Allowed', icon: 'fas fa-check' },
  restricted: { label: 'Restricted', icon: 'fas fa-ban' },
  inherited: { label: 'Inherited', icon: 'fas fa-check-double' },
  none: { label: 'Not Allowed', icon: 'fas fa-minus' }
};
const normalizePermission = state => ['allowed', 'restricted', 'inherited', 'none'].includes(state) ? state : 'none';

function formatStatusBadge(status) {
  const normalized = String(status || '').toLowerCase();
  const styles = {
    'full access': 'bg-emerald-100 text-emerald-700',
    'high access': 'bg-blue-100 text-blue-700',
    'moderate access': 'bg-amber-100 text-amber-700',
    'limited access': 'bg-orange-100 text-orange-700',
    'read only': 'bg-slate-100 text-slate-700',
    active: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    suspended: 'bg-red-100 text-red-700',
    inactive: 'bg-slate-100 text-slate-700'
  };

  const classes = styles[normalized] || 'bg-slate-100 text-slate-700';
  return `<span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${classes}">${esc(status || 'Unknown')}</span>`;
}

function getNextState(currentState) {
  const cycle = ['allowed', 'restricted', 'inherited', 'none'];
  const index = cycle.indexOf(currentState);
  return cycle[(index + 1) % cycle.length];
}

function getPermissionClass(state) {
  switch (state) {
    case 'allowed': return 'rounded-full bg-emerald-100 px-3 py-2 text-emerald-700';
    case 'restricted': return 'rounded-full bg-amber-100 px-3 py-2 text-amber-700';
    case 'inherited': return 'rounded-full bg-sky-100 px-3 py-2 text-sky-700';
    default: return 'rounded-full bg-slate-100 px-3 py-2 text-slate-500';
  }
}

function getPermissionIcon(state) {
  return `<i class="${permissionStates[state]?.icon || permissionStates.none.icon}"></i>`;
}

function applyMatrix(matrix) {
  permissionMatrix = permissionModules.map(module => ({
    module,
    permissions: Object.fromEntries(permissionTypes.map(type => [type, normalizePermission(matrix?.[module]?.[type])]))
  }));
}

function initializeRolePermissions(matrix) {
  applyMatrix(matrix);
  baselineMatrix = permissionMatrix.map(row => ({ module: row.module, permissions: { ...row.permissions } }));
}

const collectMatrix = () => Object.fromEntries(permissionMatrix.map(row => [row.module, row.permissions]));

function all(state) {
  return permissionTypes.reduce((acc, type) => { acc[type] = state; return acc; }, {});
}

const roleTemplatePermissions = {
  'Super Admin': permissionModules.reduce((acc, module) => { acc[module] = all('allowed'); return acc; }, {}),
  'Platform Administrator': {
    Dashboard: all('allowed'), Users: all('restricted'), Buyers: all('restricted'), Sellers: all('allowed'), 'Seller KYC': all('allowed'),
    Stores: all('allowed'), Products: all('allowed'), 'Product Approvals': all('allowed'),
    Orders: { View: 'allowed', Create: 'allowed', Edit: 'allowed', Delete: 'restricted', Approve: 'allowed', Reject: 'allowed', Export: 'allowed', Manage: 'allowed' },
    Payments: { View: 'allowed', Create: 'restricted', Edit: 'allowed', Delete: 'restricted', Approve: 'allowed', Reject: 'allowed', Export: 'allowed', Manage: 'allowed' },
    Withdrawals: { View: 'allowed', Create: 'restricted', Edit: 'allowed', Delete: 'restricted', Approve: 'allowed', Reject: 'allowed', Export: 'allowed', Manage: 'allowed' },
    Refunds: { View: 'allowed', Create: 'restricted', Edit: 'allowed', Delete: 'restricted', Approve: 'allowed', Reject: 'allowed', Export: 'allowed', Manage: 'allowed' },
    Reviews: all('allowed'), 'Support Center': all('allowed'), Notifications: all('allowed'), 'Website CMS': all('allowed'),
    Analytics: all('allowed'), 'Coupons & Promotions': all('allowed'), 'Audit Logs': all('restricted'), 'Roles & Permissions': all('restricted'), Settings: all('allowed')
  },
  'Operations Manager': {
    Dashboard: all('allowed'), Users: all('restricted'),
    Buyers: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    Sellers: { View: 'allowed', Create: 'restricted', Edit: 'allowed', Delete: 'restricted', Approve: 'allowed', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    'Seller KYC': { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'allowed', Reject: 'allowed', Export: 'allowed', Manage: 'restricted' },
    Stores: { View: 'allowed', Create: 'restricted', Edit: 'allowed', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    Products: { View: 'allowed', Create: 'allowed', Edit: 'allowed', Delete: 'restricted', Approve: 'allowed', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    'Product Approvals': { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'allowed', Reject: 'allowed', Export: 'allowed', Manage: 'restricted' },
    Orders: { View: 'allowed', Create: 'restricted', Edit: 'allowed', Delete: 'restricted', Approve: 'allowed', Reject: 'allowed', Export: 'allowed', Manage: 'restricted' },
    Payments: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    Withdrawals: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    Refunds: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    Reviews: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'restricted', Manage: 'restricted' },
    'Support Center': { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'restricted', Manage: 'restricted' },
    Notifications: all('restricted'), 'Website CMS': all('restricted'), Analytics: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    'Coupons & Promotions': all('restricted'), 'Audit Logs': all('restricted'), 'Roles & Permissions': all('restricted'), Settings: all('restricted')
  },
  'Finance Manager': {
    Dashboard: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    Users: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'restricted', Manage: 'restricted' },
    Buyers: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    Sellers: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    'Seller KYC': all('restricted'), Stores: all('restricted'), Products: all('restricted'), 'Product Approvals': all('restricted'),
    Orders: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    Payments: { View: 'allowed', Create: 'restricted', Edit: 'allowed', Delete: 'restricted', Approve: 'allowed', Reject: 'allowed', Export: 'allowed', Manage: 'allowed' },
    Withdrawals: { View: 'allowed', Create: 'restricted', Edit: 'allowed', Delete: 'restricted', Approve: 'allowed', Reject: 'allowed', Export: 'allowed', Manage: 'allowed' },
    Refunds: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'allowed', Reject: 'allowed', Export: 'allowed', Manage: 'allowed' },
    Reviews: all('restricted'), 'Support Center': all('restricted'), Notifications: all('restricted'), 'Website CMS': all('restricted'),
    Analytics: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    'Coupons & Promotions': all('restricted'), 'Audit Logs': all('restricted'), 'Roles & Permissions': all('restricted'), Settings: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' }
  },
  'Support Manager': {
    Dashboard: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    Users: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'restricted', Manage: 'restricted' },
    Buyers: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    Sellers: { View: 'restricted', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'restricted', Manage: 'restricted' },
    'Seller KYC': all('restricted'), Stores: all('restricted'), Products: all('restricted'), 'Product Approvals': all('restricted'),
    Orders: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    Payments: all('restricted'), Withdrawals: all('restricted'), Refunds: all('restricted'),
    Reviews: { View: 'allowed', Create: 'allowed', Edit: 'allowed', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    'Support Center': all('allowed'), Notifications: all('allowed'), 'Website CMS': all('restricted'),
    Analytics: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    'Coupons & Promotions': all('restricted'), 'Audit Logs': all('restricted'), 'Roles & Permissions': all('restricted'), Settings: all('restricted')
  },
  'Content Manager': {
    Dashboard: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    Users: all('restricted'), Buyers: all('restricted'), Sellers: all('restricted'), 'Seller KYC': all('restricted'), Stores: all('restricted'),
    Products: { View: 'allowed', Create: 'allowed', Edit: 'allowed', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    'Product Approvals': { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    Orders: all('restricted'), Payments: all('restricted'), Withdrawals: all('restricted'), Refunds: all('restricted'),
    Reviews: all('allowed'), 'Support Center': { View: 'allowed', Create: 'allowed', Edit: 'allowed', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    Notifications: all('allowed'), 'Website CMS': all('allowed'), Analytics: all('restricted'), 'Coupons & Promotions': all('allowed'),
    'Audit Logs': all('restricted'), 'Roles & Permissions': all('restricted'), Settings: all('restricted')
  },
  Moderator: {
    Dashboard: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    Users: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'restricted', Manage: 'restricted' },
    Buyers: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'restricted', Manage: 'restricted' },
    Sellers: all('restricted'), 'Seller KYC': all('restricted'), Stores: all('restricted'),
    Products: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    'Product Approvals': all('restricted'), Orders: all('restricted'), Payments: all('restricted'), Withdrawals: all('restricted'), Refunds: all('restricted'),
    Reviews: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'restricted', Manage: 'restricted' },
    'Support Center': { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'restricted', Manage: 'restricted' },
    Notifications: all('restricted'), 'Website CMS': all('restricted'), Analytics: all('restricted'), 'Coupons & Promotions': all('restricted'),
    'Audit Logs': { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'restricted', Manage: 'restricted' }, 'Roles & Permissions': all('restricted'), Settings: all('restricted')
  },
  'Analytics Viewer': {
    Dashboard: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    Users: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'restricted', Manage: 'restricted' },
    Buyers: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    Sellers: all('restricted'), 'Seller KYC': all('restricted'), Stores: all('restricted'),
    Products: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    'Product Approvals': all('restricted'), Orders: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    Payments: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    Withdrawals: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    Refunds: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    Reviews: all('restricted'), 'Support Center': all('restricted'), Notifications: all('restricted'), 'Website CMS': all('restricted'),
    Analytics: { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    'Coupons & Promotions': all('restricted'), 'Audit Logs': { View: 'allowed', Create: 'restricted', Edit: 'restricted', Delete: 'restricted', Approve: 'restricted', Reject: 'restricted', Export: 'allowed', Manage: 'restricted' },
    'Roles & Permissions': all('restricted'), Settings: all('restricted')
  }
};

let permissionMatrix = [];
let currentRole = null;
let currentRoleMode = 'create';
let baselineMatrix = [];

function renderAdministratorsTable() {
  const tbody = document.getElementById('rolesAdminsTableBody');
  if (!tbody) return;
  tbody.innerHTML = adminAccounts.length ? adminAccounts.map(admin => `
    <tr class="hover:bg-slate-50 transition">
      <td class="px-4 py-4"><div class="flex items-center gap-3">
        <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><i class="fas fa-user"></i></div>
        <div><p class="font-semibold text-slate-900">${esc(admin.name)}</p><p class="text-xs text-slate-500">${esc(admin.role)}</p></div></div></td>
      <td class="px-4 py-4 text-slate-600">${esc(admin.email)}</td><td class="px-4 py-4 text-slate-600">${esc(admin.role)}</td>
      <td class="px-4 py-4 text-slate-600">${esc(admin.department)}</td><td class="px-4 py-4">${formatStatusBadge(admin.status)}</td>
      <td class="px-4 py-4 text-slate-600">${admin.lastLogin ? new Date(admin.lastLogin).toLocaleString() : 'Never'}</td>
      <td class="px-4 py-4 text-slate-600">${fmtDate(admin.createdAt)}</td>
      <td class="px-4 py-4"><div class="flex flex-wrap gap-2">
        <button data-admin-action="view" data-id="${esc(admin.id)}" class="action-btn text-blue-600 hover:bg-blue-50">View</button>
        <button data-admin-action="edit" data-id="${esc(admin.id)}" class="action-btn text-slate-700 hover:bg-slate-100">Edit</button>
        <button data-admin-action="suspend" data-id="${esc(admin.id)}" class="action-btn text-amber-600 hover:bg-amber-50">${admin.status === 'Suspended' ? 'Activate' : 'Suspend'}</button>
        <button data-admin-action="delete" data-id="${esc(admin.id)}" class="action-btn text-red-600 hover:bg-red-50">Delete</button></div></td></tr>`).join('')
    : '<tr><td colspan="8" class="px-6 py-10 text-center text-sm text-slate-500">No administrators found.</td></tr>';
}

function renderRolesTable() {
  const tbody = document.getElementById('rolesTableBody');
  if (!tbody) return;
  tbody.innerHTML = rolesDataset.length ? rolesDataset.map(role => `
    <tr class="hover:bg-slate-50 transition">
      <td class="px-4 py-4 font-semibold text-slate-900">${esc(role.name)}</td><td class="px-4 py-4 text-slate-600">${esc(role.description)}</td>
      <td class="px-4 py-4 text-slate-600">${Number(role.admins) || 0}</td><td class="px-4 py-4 text-slate-600">${Number(role.permissionCount) || 0}</td>
      <td class="px-4 py-4 text-slate-600">${fmtDate(role.createdAt)}</td><td class="px-4 py-4">${formatStatusBadge(role.accessLevel)}</td>
      <td class="px-4 py-4"><div class="flex flex-wrap gap-2">
        <button data-role-action="view" data-id="${esc(role.id)}" class="action-btn text-blue-600 hover:bg-blue-50">View</button>
        ${role.isSuper ? '' : `<button data-role-action="edit" data-id="${esc(role.id)}" class="action-btn text-slate-700 hover:bg-slate-100">Edit</button>
        <button data-role-action="delete" data-id="${esc(role.id)}" class="action-btn text-red-600 hover:bg-red-50">Delete</button>`}</div></td></tr>`).join('')
    : '<tr><td colspan="7" class="px-6 py-10 text-center text-sm text-slate-500">No roles found.</td></tr>';
}

function renderRoleSummaryCards() {
  const container = document.getElementById('roleSummaryCards');
  if (!container) return;
  container.innerHTML = [...rolesDataset].sort((a, b) => b.admins - a.admins).slice(0, 4).map(role => `
    <div class="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
      <div class="flex items-center justify-between gap-3"><div>
        <p class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">${esc(role.name)}</p>
        <h3 class="mt-3 text-2xl font-semibold text-slate-900">${Number(role.admins) || 0} Admins</h3></div>
        <span class="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">${esc(role.accessLevel)}</span></div>
      <div class="mt-4 space-y-2 text-sm text-slate-600">
        <div class="flex justify-between"><span>Permissions</span><span class="font-semibold text-slate-900">${Number(role.permissionCount) || 0}</span></div>
        <div class="flex justify-between"><span>Status</span><span class="font-semibold text-slate-900">${esc(role.status)}</span></div>
        <button data-role-action="view" data-id="${esc(role.id)}" class="mt-4 w-full rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100">View Permissions</button></div></div>`).join('');
}

function renderPermissionHistoryList() {
  const container = document.getElementById('permissionHistoryList');
  if (!container) return;
  container.innerHTML = permissionHistory.length ? permissionHistory.map(item => `
    <div class="rounded-3xl border border-slate-200 bg-slate-50 p-4"><div class="flex items-start justify-between gap-4"><div>
      <p class="text-sm font-semibold text-slate-900">${esc(item.description)}</p>
      <p class="mt-1 text-sm text-slate-500">${esc(item.target)} • Changed by ${esc(item.changedBy)}</p></div>
      <span class="rounded-2xl bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">${fmtDate(item.at)}</span></div></div>`).join('')
    : '<p class="text-sm text-slate-500">No permission change history available.</p>';
}

function populateFilterOptions() {
  const moduleSelect = document.getElementById('permissionModuleFilter');
  const roleSelect = document.getElementById('permissionRoleFilter');
  const typeSelect = document.getElementById('permissionTypeFilter');

  if (moduleSelect) {
    moduleSelect.innerHTML = `<option value="">All modules</option>${permissionModules.map((module) => `<option value="${module}">${module}</option>`).join('')}`;
  }
  if (roleSelect) {
    roleSelect.innerHTML = `<option value="">All roles</option>${rolesDataset.map(role => `<option value="${esc(role.name)}">${esc(role.name)}</option>`).join('')}`;
  }
  if (typeSelect) {
    typeSelect.innerHTML = `<option value="">All types</option>${permissionTypes.map((type) => `<option value="${type}">${type}</option>`).join('')}`;
  }
}

function renderPermissionMatrix() {
  const tbody = document.getElementById('permissionsMatrixBody');
  if (!tbody) return;

  const searchText = document.getElementById('permissionSearch')?.value.toLowerCase().trim() || '';
  const moduleFilter = document.getElementById('permissionModuleFilter')?.value || '';
  const roleFilter = document.getElementById('permissionRoleFilter')?.value || '';
  const typeFilter = document.getElementById('permissionTypeFilter')?.value || '';
  const statusFilter = document.getElementById('permissionStatusFilter')?.value || '';

  const rows = permissionMatrix.filter((row) => {
    if (moduleFilter && row.module !== moduleFilter) return false;
    if (searchText && !row.module.toLowerCase().includes(searchText)) return false;
    if (roleFilter && currentRole !== roleFilter) return false;

    if (typeFilter && (!row.permissions[typeFilter] || row.permissions[typeFilter] === 'none')) return false;
    if (statusFilter) {
      const match = Object.values(row.permissions).some((value) => {
        return statusFilter === 'none' ? value === 'none' : value === statusFilter;
      });
      if (!match) return false;
    }

    return true;
  });

  if (!rows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${permissionTypes.length + 1}" class="px-6 py-10 text-center text-sm text-slate-500">No permissions found.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = rows.map((row) => {
    const cells = permissionTypes.map((type) => {
      const state = normalizePermission(row.permissions[type]);
      return `
        <td class="px-2 py-3 text-center">
          <button type="button" data-module="${row.module}" data-permission="${type}" data-state="${state}" class="permission-toggle ${getPermissionClass(state)}" aria-label="${type} permission for ${row.module}">
            ${getPermissionIcon(state)}
          </button>
        </td>
      `;
    }).join('');

    return `
      <tr class="border-y border-slate-200 hover:bg-slate-50 transition">
        <td class="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">${row.module}</td>
        ${cells}
      </tr>
    `;
  }).join('');
}

function updatePermissionSummary() {
  const counts = { total: 0, allowed: 0, restricted: 0, inherited: 0, highRisk: 0 };

  permissionMatrix.forEach((row) => {
    permissionTypes.forEach((type) => {
      const state = row.permissions[type] || 'none';
      counts.total += 1;
      if (state === 'allowed') counts.allowed += 1;
      if (state === 'restricted') counts.restricted += 1;
      if (state === 'inherited') counts.inherited += 1;
      if (state === 'allowed' && highRiskPermissions.has(`${row.module}:${type}`)) counts.highRisk += 1;
    });
  });

  document.getElementById('summaryTotalPermissions').textContent = counts.total;
  document.getElementById('summaryAllowedPermissions').textContent = counts.allowed;
  document.getElementById('summaryRestrictedPermissions').textContent = counts.restricted;
  document.getElementById('summaryInheritedPermissions').textContent = counts.inherited;
  document.getElementById('summaryHighRiskPermissions').textContent = counts.highRisk;
  document.getElementById('previewAddedCount').textContent = counts.allowed;
  document.getElementById('previewRemovedCount').textContent = counts.restricted;
  document.getElementById('previewModifiedCount').textContent = counts.inherited;
}

function updateChangePreview() {
  let added = 0;
  let removed = 0;
  let modified = 0;

  permissionMatrix.forEach((currentRow, rowIndex) => {
    const baselineRow = baselineMatrix[rowIndex];
    permissionTypes.forEach((type) => {
      const previous = baselineRow?.permissions[type] || 'none';
      const current = currentRow.permissions[type] || 'none';
      if (previous === current) return;
      if (previous === 'none' && current !== 'none') added += 1;
      else if (previous !== 'none' && current === 'none') removed += 1;
      else modified += 1;
    });
  });

  document.getElementById('previewAddedCount').textContent = added;
  document.getElementById('previewRemovedCount').textContent = removed;
  document.getElementById('previewModifiedCount').textContent = modified;
  document.getElementById('confirmAddedCount').textContent = added;
  document.getElementById('confirmRemovedCount').textContent = removed;
  document.getElementById('confirmModifiedCount').textContent = modified;

  const details = [];
  if (added) details.push(`<div>Added permissions: ${added}</div>`);
  if (removed) details.push(`<div>Removed permissions: ${removed}</div>`);
  if (modified) details.push(`<div>Modified permissions: ${modified}</div>`);
  document.getElementById('confirmChangeDetails').innerHTML = details.join('') || '<div class="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">No permission changes detected.</div>';
}

function showDangerWarning() {
  const warning = document.getElementById('dangerPermissionWarning');
  if (!warning) return;

  const hasDanger = permissionMatrix.some((row) => permissionTypes.some((type) => row.permissions[type] === 'allowed' && highRiskPermissions.has(`${row.module}:${type}`)));
  warning.classList.toggle('hidden', !hasDanger);
}

function openRoleModal(mode, id = '') {
  const role = rolesDataset.find(item => item.id === id) || null;
  currentRoleMode = mode !== 'create' && role?.isSuper ? 'view' : mode;
  currentRoleId = mode === 'admin' ? null : role?.id || null;
  currentRole = mode === 'admin' ? selectedAdmin.role : role?.name || null;
  const locked = currentRoleMode === 'view' || currentRoleMode === 'admin';
  const set = (fieldId, value) => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.value = value ?? '';
      field.disabled = locked;
    }
  };
  set('roleNameField', mode === 'admin' ? `${selectedAdmin.name} — ${selectedAdmin.role}` : role?.name);
  set('roleDescriptionField', mode === 'admin' ? 'Custom permission overrides for this administrator' : role?.description);
  set('roleStatusField', role?.status || 'Active');
  set('roleAccessField', role?.accessLevel || 'Moderate Access');
  document.getElementById('saveRoleBtn').classList.toggle('hidden', currentRoleMode === 'view');
  document.getElementById('saveRoleDraftBtn').classList.toggle('hidden', locked);
  document.getElementById('roleModalMode').textContent = {
    create: 'Create Role', edit: 'Edit Role', view: 'View Role', admin: 'Edit Administrator Permissions'
  }[currentRoleMode];
  document.getElementById('roleModalTitle').textContent =
    mode === 'create' ? 'New role details' : (mode === 'admin' ? selectedAdmin.name : role?.name || '');
  initializeRolePermissions(mode === 'admin' ? selectedAdmin.effective : role?.permissions);
  renderPermissionMatrix();
  updatePermissionSummary();
  updateChangePreview();
  showDangerWarning();
  document.getElementById('roleModal')?.classList.remove('hidden');
}

function closeRoleModal() {
  document.getElementById('roleModal')?.classList.add('hidden');
}

async function loadAdmin(id) {
  selectedAdmin = (await rbac('/admins/' + encodeURIComponent(id))).admin;
  return selectedAdmin;
}

const openAdminModal = guarded(async id => {
  const admin = await loadAdmin(id);
  const setText = (fieldId, value) => { document.getElementById(fieldId).textContent = value ?? '—'; };
  setText('adminNameField', admin.name);
  setText('adminEmailField', admin.email);
  setText('adminRoleField', admin.role);
  setText('adminDepartmentField', admin.department);
  setText('adminStatusField', admin.status);
  setText('adminLastLoginField', admin.lastLogin ? new Date(admin.lastLogin).toLocaleString() : 'Never');
  setText('adminAssignedPermissions', admin.assigned);
  setText('adminInheritedPermissions', admin.inherited);
  setText('adminSecurityLevel', admin.security);
  document.getElementById('adminCustomPermissions').innerHTML = admin.custom.length
    ? admin.custom.map(permission => `<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">${esc(permission)}</span>`).join('')
    : '<span class="text-sm text-slate-400">None</span>';
  document.querySelector('#adminModal button[onclick*="handleAdminSuspendAccount"]').textContent =
    admin.status === 'Suspended' ? 'Reactivate Account' : 'Suspend Account';
  document.getElementById('adminModal').classList.remove('hidden');
});

const editAdmin = guarded(async id => {
  await loadAdmin(id);
  openRoleModal('admin');
});

function closeAdminModal() {
  document.getElementById('adminModal')?.classList.add('hidden');
}

function handleAdminChangeRole() {
  if (!selectedAdmin) return;
  document.getElementById('adminRoleField').innerHTML = `
    <select id="adminRoleSelect" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
      ${rolesDataset.filter(role => role.status === 'Active').map(role => `<option value="${esc(role.id)}" ${role.id === selectedAdmin.roleId ? 'selected' : ''}>${esc(role.name)}</option>`).join('')}
    </select><button type="button" onclick="saveAdminRole()" class="ml-2 rounded-xl bg-slate-900 px-3 py-2 text-sm text-white">Save</button>`;
}

const saveAdminRole = guarded(async () => {
  await rbac(`/admins/${encodeURIComponent(selectedAdmin.id)}/role`, 'PUT', {
    roleId: document.getElementById('adminRoleSelect').value
  });
  showToast('Role updated (custom overrides reset)');
  await loadRbac();
  await openAdminModal(selectedAdmin.id);
});

function handleAdminEditPermissions() {
  if (selectedAdmin) openRoleModal('admin');
}

const handleAdminSuspendAccount = guarded(async id => {
  id = id || selectedAdmin?.id;
  const admin = adminAccounts.find(item => item.id === id);
  if (!admin) throw new Error('Administrator not found');
  const suspend = admin.status !== 'Suspended';
  if (!confirm(`${suspend ? 'Suspend' : 'Reactivate'} ${admin.name}?`)) return;
  await rbac(`/admins/${encodeURIComponent(id)}/${suspend ? 'suspend' : 'activate'}`, 'POST');
  closeAdminModal();
  showToast(suspend ? 'Administrator suspended' : 'Administrator reactivated');
  await loadRbac();
});

const handleAdminResetPermissions = guarded(async () => {
  if (!selectedAdmin) return;
  if (!confirm('Reset to the role defaults?')) return;
  await rbac(`/admins/${encodeURIComponent(selectedAdmin.id)}/reset-permissions`, 'POST');
  showToast('Permissions reset');
  await loadRbac();
  await openAdminModal(selectedAdmin.id);
});

const handleAdminDelete = guarded(async id => {
  const admin = adminAccounts.find(item => item.id === id);
  if (!admin) throw new Error('Administrator not found');
  if (!confirm(`Remove admin access for ${admin.name}? Their account becomes a normal user.`)) return;
  await rbac('/admins/' + encodeURIComponent(id), 'DELETE');
  showToast('Administrator removed');
  await loadRbac();
});

function openPermissionsConfirmModal() {
  const modal = document.getElementById('permissionsConfirmModal');
  document.getElementById('confirmAdminName').textContent = currentRoleMode === 'admin' ? selectedAdmin.name : 'Role update';
  document.getElementById('confirmRoleName').textContent = currentRole || 'New Role';
  updateChangePreview();
  if (modal) modal.classList.remove('hidden');
}

function closePermissionsConfirmModal() {
  document.getElementById('permissionsConfirmModal')?.classList.add('hidden');
}

async function persistRole(statusOverride) {
  if (currentRoleMode === 'admin') {
    return rbac(`/admins/${encodeURIComponent(selectedAdmin.id)}/permissions`, 'PUT', { permissions: collectMatrix() });
  }
  const body = {
    name: val('roleNameField'),
    description: val('roleDescriptionField'),
    accessLevel: val('roleAccessField'),
    status: statusOverride || val('roleStatusField'),
    permissions: collectMatrix()
  };
  return currentRoleId
    ? rbac(`/roles/${encodeURIComponent(currentRoleId)}`, 'PUT', body)
    : rbac('/roles', 'POST', body);
}

const finishSave = async message => {
  closeRoleModal();
  closeAdminModal();
  showToast(message);
  await loadRbac();
};

const saveRoleDraft = guarded(async () => {
  await persistRole('Pending');
  await finishSave('Role saved as draft');
});

function saveRole() {
  openPermissionsConfirmModal();
}

const confirmPermissionChanges = guarded(async () => {
  await persistRole();
  closePermissionsConfirmModal();
  await finishSave('Permissions saved');
});

const deleteRole = guarded(async id => {
  const role = rolesDataset.find(item => item.id === id);
  if (!role) throw new Error('Role not found');
  if (!confirm(`Delete role "${role.name}"?`)) return;
  await rbac(`/roles/${encodeURIComponent(id)}`, 'DELETE');
  showToast('Role deleted');
  await loadRbac();
});

const closeInviteModal = () => {
  const modal = document.getElementById('inviteModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
};

const refreshInvites = guarded(async () => {
  const { invitations } = await rbac('/invitations');
  document.getElementById('invList').innerHTML = invitations.length ? invitations.map(invitation => `
    <div class="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
      <div><p class="font-semibold text-slate-900">${esc(invitation.email)}</p><p class="text-xs text-slate-500">${esc(invitation.role)} · expires ${fmtDate(invitation.expiresAt)}</p></div>
      <div class="flex gap-2"><button data-invite-action="resend" data-id="${esc(invitation.id)}" class="action-btn text-blue-600">Resend</button>
      <button data-invite-action="revoke" data-id="${esc(invitation.id)}" class="action-btn text-red-600">Revoke</button></div></div>`).join('')
    : '<p class="text-sm text-slate-400">No pending invitations.</p>';
});

const openInviteModal = guarded(async () => {
  document.getElementById('invRole').innerHTML = rolesDataset.filter(role => role.status === 'Active')
    .map(role => `<option value="${esc(role.id)}">${esc(role.name)}</option>`).join('');
  const modal = document.getElementById('inviteModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  await refreshInvites();
});

const sendInvite = guarded(async () => {
  await rbac('/invitations', 'POST', {
    firstName: val('invFirst'),
    lastName: val('invLast'),
    email: val('invEmail'),
    department: val('invDept'),
    roleId: val('invRole')
  });
  ['invFirst', 'invLast', 'invEmail', 'invDept'].forEach(id => { document.getElementById(id).value = ''; });
  showToast('Invitation sent');
  await refreshInvites();
  await loadRbac();
});

const resendInvite = guarded(async id => {
  await rbac(`/invitations/${encodeURIComponent(id)}/resend`, 'POST');
  showToast('Invitation resent');
});

const revokeInvite = guarded(async id => {
  await rbac('/invitations/' + encodeURIComponent(id), 'DELETE');
  showToast('Invitation revoked');
  await refreshInvites();
  await loadRbac();
});

function attachInlineActions() {
  const refreshButton = document.getElementById('refreshRolesBtn');
  const createRoleBtn = document.getElementById('createRoleBtn');
  const inviteAdminBtn = document.getElementById('inviteAdminBtn');
  const saveRoleDraftBtn = document.getElementById('saveRoleDraftBtn');
  const saveRoleBtn = document.getElementById('saveRoleBtn');
  const searchInput = document.getElementById('permissionSearch');
  const moduleFilter = document.getElementById('permissionModuleFilter');
  const typeFilter = document.getElementById('permissionTypeFilter');
  const roleFilter = document.getElementById('permissionRoleFilter');
  const statusFilter = document.getElementById('permissionStatusFilter');

  if (refreshButton) refreshButton.addEventListener('click', loadRbac);
  if (createRoleBtn) createRoleBtn.addEventListener('click', () => openRoleModal('create'));
  if (inviteAdminBtn) inviteAdminBtn.addEventListener('click', openInviteModal);
  if (saveRoleDraftBtn) saveRoleDraftBtn.addEventListener('click', saveRoleDraft);
  if (saveRoleBtn) saveRoleBtn.addEventListener('click', saveRole);
  document.getElementById('sendInviteBtn')?.addEventListener('click', sendInvite);
  document.getElementById('rolesAdminsTableBody')?.addEventListener('click', event => {
    const button = event.target.closest('button[data-admin-action]');
    if (!button) return;
    const { adminAction, id } = button.dataset;
    if (adminAction === 'view') openAdminModal(id);
    if (adminAction === 'edit') editAdmin(id);
    if (adminAction === 'suspend') handleAdminSuspendAccount(id);
    if (adminAction === 'delete') handleAdminDelete(id);
  });
  const handleRoleAction = event => {
    const button = event.target.closest('button[data-role-action]');
    if (!button) return;
    const { roleAction, id } = button.dataset;
    if (roleAction === 'delete') deleteRole(id);
    else openRoleModal(roleAction, id);
  };
  document.getElementById('rolesTableBody')?.addEventListener('click', handleRoleAction);
  document.getElementById('roleSummaryCards')?.addEventListener('click', handleRoleAction);
  document.getElementById('invList')?.addEventListener('click', event => {
    const button = event.target.closest('button[data-invite-action]');
    if (!button) return;
    if (button.dataset.inviteAction === 'resend') resendInvite(button.dataset.id);
    if (button.dataset.inviteAction === 'revoke') revokeInvite(button.dataset.id);
  });
  if (searchInput) searchInput.addEventListener('input', () => {
    renderPermissionMatrix();
    updateChangePreview();
  });
  if (moduleFilter) moduleFilter.addEventListener('change', () => { renderPermissionMatrix(); updateChangePreview(); });
  if (typeFilter) typeFilter.addEventListener('change', () => { renderPermissionMatrix(); updateChangePreview(); });
  if (roleFilter) roleFilter.addEventListener('change', (event) => { currentRole = event.target.value || null; renderPermissionMatrix(); updateChangePreview(); });
  if (statusFilter) statusFilter.addEventListener('change', () => { renderPermissionMatrix(); updateChangePreview(); });

  document.querySelectorAll('.role-template-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const name = button.dataset.template;
      const preset = roleTemplatePermissions[name];
      if (!preset) return;
      if (document.getElementById('roleModal').classList.contains('hidden')) {
        openRoleModal('create');
        document.getElementById('roleNameField').value = name;
      }
      if (currentRoleMode === 'view' || currentRoleMode === 'admin') {
        showToast('Templates apply to role editing only', 'error');
        return;
      }
      applyMatrix(preset);
      renderPermissionMatrix();
      updatePermissionSummary();
      updateChangePreview();
      showDangerWarning();
      showToast(`${name} template loaded`);
    });
  });
}

function attachMatrixEvents() {
  const tbody = document.getElementById('permissionsMatrixBody');
  if (!tbody) return;

  tbody.addEventListener('click', (event) => {
    if (currentRoleMode === 'view') return;
    const button = event.target.closest('.permission-toggle');
    if (!button) return;

    const moduleName = button.dataset.module;
    const permission = button.dataset.permission;
    const currentState = button.dataset.state;
    const nextState = getNextState(currentState);

    const row = permissionMatrix.find((item) => item.module === moduleName);
    if (!row) return;

    row.permissions[permission] = nextState;
    renderPermissionMatrix();
    updatePermissionSummary();
    updateChangePreview();
    showDangerWarning();
  });
}

async function initializeRolesPermissionsPage() {
  attachInlineActions();
  attachMatrixEvents();
  initializeRolePermissions(null);
  renderPermissionMatrix();
  updatePermissionSummary();
  updateChangePreview();
  showDangerWarning();
  await loadRbac();
}

window.initializeRolesPermissionsPage = initializeRolesPermissionsPage;
