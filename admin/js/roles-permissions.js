const adminAccounts = [
  { name: 'Amina Johnson', email: 'amina.johnson@marketmix.com', role: 'Super Admin', department: 'Platform', status: 'Active', lastLogin: 'Today, 08:24', created: 'Jan 12, 2024' },
  { name: 'Tyler Brooks', email: 'tyler.brooks@marketmix.com', role: 'Platform Administrator', department: 'Infrastructure', status: 'Active', lastLogin: 'Today, 07:05', created: 'Mar 22, 2024' },
  { name: 'Priya Singh', email: 'priya.singh@marketmix.com', role: 'Operations Manager', department: 'Operations', status: 'Active', lastLogin: 'Yesterday, 18:40', created: 'Feb 08, 2024' },
  { name: 'Jamal Carter', email: 'jamal.carter@marketmix.com', role: 'Finance Manager', department: 'Finance', status: 'Active', lastLogin: 'Yesterday, 16:12', created: 'Apr 03, 2024' },
  { name: 'Lena West', email: 'lena.west@marketmix.com', role: 'Support Manager', department: 'Customer Support', status: 'Pending', lastLogin: 'Apr 17, 2024', created: 'Apr 17, 2024' },
  { name: 'Melody Chen', email: 'melody.chen@marketmix.com', role: 'Content Manager', department: 'Content', status: 'Active', lastLogin: 'Apr 23, 2024', created: 'Jan 31, 2024' },
  { name: 'Hector Alvarez', email: 'hector.alvarez@marketmix.com', role: 'Moderator', department: 'Community', status: 'Active', lastLogin: 'Apr 23, 2024', created: 'Feb 18, 2024' },
  { name: 'Noah Patel', email: 'noah.patel@marketmix.com', role: 'Analytics Viewer', department: 'Insights', status: 'Inactive', lastLogin: 'Apr 12, 2024', created: 'Mar 10, 2024' },
  { name: 'Keisha Morgan', email: 'keisha.morgan@marketmix.com', role: 'Support Agent', department: 'Customer Support', status: 'Suspended', lastLogin: 'Apr 05, 2024', created: 'Feb 14, 2024' }
];

const rolesDataset = [
  { role: 'Super Admin', description: 'Full platform control with all system permissions.', admins: 2, permissions: 98, created: 'Jan 02, 2024', status: 'Full Access' },
  { role: 'Platform Administrator', description: 'Manage infrastructure, release schedules and integrations.', admins: 3, permissions: 76, created: 'Jan 18, 2024', status: 'High Access' },
  { role: 'Operations Manager', description: 'Oversee operations and logistics workflows.', admins: 2, permissions: 56, created: 'Feb 02, 2024', status: 'Moderate Access' },
  { role: 'Finance Manager', description: 'Handle payments, settlements and financial reporting.', admins: 2, permissions: 48, created: 'Feb 20, 2024', status: 'Moderate Access' },
  { role: 'Support Manager', description: 'Manage support teams, tickets and service standards.', admins: 1, permissions: 32, created: 'Mar 05, 2024', status: 'Limited Access' },
  { role: 'Content Manager', description: 'Create and review promotional content and marketplace pages.', admins: 2, permissions: 28, created: 'Mar 14, 2024', status: 'Limited Access' },
  { role: 'Moderator', description: 'Review community submissions and enforce content policy.', admins: 3, permissions: 22, created: 'Mar 30, 2024', status: 'Read Only' }
];

const roleSummaries = [
  { name: 'Super Admin', admins: 2, permissions: 98, access: 'Full Access', status: 'Active' },
  { name: 'Platform Administrator', admins: 3, permissions: 76, access: 'High Access', status: 'Active' },
  { name: 'Operations Manager', admins: 2, permissions: 56, access: 'Moderate Access', status: 'Active' },
  { name: 'Support Manager', admins: 1, permissions: 32, access: 'Limited Access', status: 'Active' }
];

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

function formatStatusBadge(status) {
  const normalized = (status || '').toLowerCase();
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
  return `<span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${classes}">${status}</span>`;
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

function initializeRolePermissions(roleName = '') {
  const templateName = roleName || currentRole || '';
  const templatePermissions = roleTemplatePermissions[templateName] || null;

  permissionMatrix = permissionModules.map((module) => {
    const permissions = {};
    permissionTypes.forEach((type) => {
      permissions[type] = templatePermissions?.[module]?.[type] ?? 'none';
    });
    return { module, permissions };
  });

  baselineMatrix = permissionMatrix.map((row) => ({
    module: row.module,
    permissions: { ...row.permissions }
  }));
}

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

const permissionHistory = [
  { date: 'Apr 22, 2024', administrator: 'Amina Johnson', action: 'Role created', changedBy: 'System' },
  { date: 'Apr 21, 2024', administrator: 'Tyler Brooks', action: 'Permissions updated', changedBy: 'Amina Johnson' },
  { date: 'Apr 20, 2024', administrator: 'Priya Singh', action: 'Administrator role changed', changedBy: 'Amina Johnson' },
  { date: 'Apr 18, 2024', administrator: 'Lena West', action: 'High-risk permission granted', changedBy: 'Tyler Brooks' },
  { date: 'Apr 17, 2024', administrator: 'Keisha Morgan', action: 'Permission removed', changedBy: 'Amina Johnson' }
];

const adminProfiles = {
  'Amina Johnson': { name: 'Amina Johnson', email: 'amina.johnson@marketmix.com', role: 'Super Admin', department: 'Platform', status: 'Active', lastLogin: 'Today, 08:24', assigned: 98, inherited: 2, custom: ['Manage Roles & Permissions', 'Approve Withdrawals'], security: 'High' },
  'Tyler Brooks': { name: 'Tyler Brooks', email: 'tyler.brooks@marketmix.com', role: 'Platform Administrator', department: 'Infrastructure', status: 'Active', lastLogin: 'Today, 07:05', assigned: 76, inherited: 4, custom: ['Manage Payments'], security: 'High' },
  'Priya Singh': { name: 'Priya Singh', email: 'priya.singh@marketmix.com', role: 'Operations Manager', department: 'Operations', status: 'Active', lastLogin: 'Yesterday, 18:40', assigned: 56, inherited: 6, custom: ['Approve Refunds'], security: 'Moderate' },
  'Jamal Carter': { name: 'Jamal Carter', email: 'jamal.carter@marketmix.com', role: 'Finance Manager', department: 'Finance', status: 'Active', lastLogin: 'Yesterday, 16:12', assigned: 48, inherited: 3, custom: ['Manage Payments', 'Approve Withdrawals'], security: 'High' },
  'Lena West': { name: 'Lena West', email: 'lena.west@marketmix.com', role: 'Support Manager', department: 'Customer Support', status: 'Pending', lastLogin: 'Apr 17, 2024', assigned: 32, inherited: 8, custom: ['Manage Support Tickets'], security: 'Moderate' },
  'Melody Chen': { name: 'Melody Chen', email: 'melody.chen@marketmix.com', role: 'Content Manager', department: 'Content', status: 'Active', lastLogin: 'Apr 23, 2024', assigned: 28, inherited: 4, custom: ['Manage Website CMS'], security: 'Moderate' },
  'Hector Alvarez': { name: 'Hector Alvarez', email: 'hector.alvarez@marketmix.com', role: 'Moderator', department: 'Community', status: 'Active', lastLogin: 'Apr 23, 2024', assigned: 22, inherited: 2, custom: ['Review Content'], security: 'Limited' },
  'Noah Patel': { name: 'Noah Patel', email: 'noah.patel@marketmix.com', role: 'Analytics Viewer', department: 'Insights', status: 'Inactive', lastLogin: 'Apr 12, 2024', assigned: 18, inherited: 5, custom: ['View Analytics'], security: 'Limited' },
  'Keisha Morgan': { name: 'Keisha Morgan', email: 'keisha.morgan@marketmix.com', role: 'Support Agent', department: 'Customer Support', status: 'Suspended', lastLogin: 'Apr 05, 2024', assigned: 12, inherited: 1, custom: ['View Support Center'], security: 'Restricted' }
};

let permissionMatrix = [];
let currentRole = null;
let currentRoleMode = 'create';
let selectedAdmin = null;
let baselineMatrix = [];

function renderAdministratorsTable() {
  const tbody = document.getElementById('rolesAdminsTableBody');
  if (!tbody) return;

  if (!adminAccounts.length) {
    tbody.innerHTML = `
      <tr><td colspan="8" class="px-6 py-10 text-center text-sm text-slate-500">No administrators found.</td></tr>
    `;
    return;
  }

  tbody.innerHTML = adminAccounts.map((admin) => `
      <tr class="hover:bg-slate-50 transition">
        <td class="px-4 py-4">
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700"><i class="fas fa-user"></i></div>
            <div>
              <p class="font-semibold text-slate-900">${admin.name}</p>
              <p class="text-xs text-slate-500">${admin.role}</p>
            </div>
          </div>
        </td>
        <td class="px-4 py-4 text-slate-600">${admin.email}</td>
        <td class="px-4 py-4 text-slate-600">${admin.role}</td>
        <td class="px-4 py-4 text-slate-600">${admin.department}</td>
        <td class="px-4 py-4">${formatStatusBadge(admin.status)}</td>
        <td class="px-4 py-4 text-slate-600">${admin.lastLogin}</td>
        <td class="px-4 py-4 text-slate-600">${admin.created}</td>
        <td class="px-4 py-4 text-slate-600">
          <div class="flex flex-wrap gap-2">
            <button onclick="openAdminModal('${admin.name}')" class="action-btn text-blue-600 hover:bg-blue-50">View</button>
            <button onclick="openRoleModal('edit', '${admin.role}')" class="action-btn text-slate-700 hover:bg-slate-100">Edit</button>
            <button onclick="handleAdminSuspendAccount('${admin.name}')" class="action-btn text-amber-600 hover:bg-amber-50">Suspend</button>
            <button onclick="handleAdminDelete('${admin.name}')" class="action-btn text-red-600 hover:bg-red-50">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
}

function renderRolesTable() {
  const tbody = document.getElementById('rolesTableBody');
  if (!tbody) return;

  if (!rolesDataset.length) {
    tbody.innerHTML = `
      <tr><td colspan="7" class="px-6 py-10 text-center text-sm text-slate-500">No roles found.</td></tr>
    `;
    return;
  }

  tbody.innerHTML = rolesDataset.map((role) => `
      <tr class="hover:bg-slate-50 transition">
        <td class="px-4 py-4 font-semibold text-slate-900">${role.role}</td>
        <td class="px-4 py-4 text-slate-600">${role.description}</td>
        <td class="px-4 py-4 text-slate-600">${role.admins}</td>
        <td class="px-4 py-4 text-slate-600">${role.permissions}</td>
        <td class="px-4 py-4 text-slate-600">${role.created}</td>
        <td class="px-4 py-4">${formatStatusBadge(role.status)}</td>
        <td class="px-4 py-4">
          <div class="flex flex-wrap gap-2">
            <button onclick="openRoleModal('view', '${role.role}')" class="action-btn text-blue-600 hover:bg-blue-50">View</button>
            <button onclick="openRoleModal('edit', '${role.role}')" class="action-btn text-slate-700 hover:bg-slate-100">Edit</button>
          </div>
        </td>
      </tr>
    `).join('');
}

function renderRoleSummaryCards() {
  const container = document.getElementById('roleSummaryCards');
  if (!container) return;

  container.innerHTML = roleSummaries.map((item) => `
      <div class="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">${item.name}</p>
            <h3 class="mt-3 text-2xl font-semibold text-slate-900">${item.admins} Admins</h3>
          </div>
          <span class="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">${item.access}</span>
        </div>
        <div class="mt-4 space-y-2 text-sm text-slate-600">
          <div class="flex items-center justify-between gap-2"><span>Permissions</span><span class="font-semibold text-slate-900">${item.permissions}</span></div>
          <div class="flex items-center justify-between gap-2"><span>Status</span><span class="font-semibold text-slate-900">${item.status}</span></div>
          <button onclick="openRoleModal('view', '${item.name}')" class="mt-4 w-full rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100 transition">View Permissions</button>
        </div>
      </div>
    `).join('');
}

function renderPermissionHistoryList() {
  const container = document.getElementById('permissionHistoryList');
  if (!container) return;

  if (!permissionHistory.length) {
    container.innerHTML = '<p class="text-sm text-slate-500">No permission change history available.</p>';
    return;
  }

  container.innerHTML = permissionHistory.map((item) => `
      <div class="rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-semibold text-slate-900">${item.action}</p>
            <p class="mt-1 text-sm text-slate-500">${item.administrator} • Changed by ${item.changedBy}</p>
          </div>
          <span class="rounded-2xl bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">${item.date}</span>
        </div>
      </div>
    `).join('');
}

function populateFilterOptions() {
  const moduleSelect = document.getElementById('permissionModuleFilter');
  const roleSelect = document.getElementById('permissionRoleFilter');
  const typeSelect = document.getElementById('permissionTypeFilter');

  if (moduleSelect) {
    moduleSelect.innerHTML = `<option value="">All modules</option>${permissionModules.map((module) => `<option value="${module}">${module}</option>`).join('')}`;
  }
  if (roleSelect) {
    roleSelect.innerHTML = `<option value="">All roles</option>${Object.keys(roleTemplatePermissions).map((role) => `<option value="${role}">${role}</option>`).join('')}`;
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
      const state = row.permissions[type] || 'none';
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

function openRoleModal(mode, roleName = '') {
  currentRoleMode = mode;
  currentRole = roleName || null;

  const modal = document.getElementById('roleModal');
  const modalModeText = document.getElementById('roleModalMode');
  const modalTitle = document.getElementById('roleModalTitle');
  const roleNameField = document.getElementById('roleNameField');
  const roleDescriptionField = document.getElementById('roleDescriptionField');
  const roleStatusField = document.getElementById('roleStatusField');
  const roleAccessField = document.getElementById('roleAccessField');

  if (modalModeText) modalModeText.textContent = mode === 'edit' ? 'Edit Role' : 'Create Role';
  if (modalTitle) modalTitle.textContent = mode === 'edit' ? `Edit ${roleName}` : 'New role details';
  if (roleNameField) roleNameField.value = roleName || '';
  if (roleDescriptionField) roleDescriptionField.value = rolesDataset.find((r) => r.role === roleName)?.description || '';
  if (roleStatusField) roleStatusField.value = rolesDataset.find((r) => r.role === roleName)?.status || 'Active';
  if (roleAccessField) roleAccessField.value = rolesDataset.find((r) => r.role === roleName)?.status || 'Moderate Access';

  initializeRolePermissions(roleName);
  renderPermissionMatrix();
  updatePermissionSummary();
  updateChangePreview();
  showDangerWarning();
  attachMatrixEvents();

  if (modal) modal.classList.remove('hidden');
}

function closeRoleModal() {
  document.getElementById('roleModal')?.classList.add('hidden');
}

function openAdminModal(adminName) {
  selectedAdmin = adminName;
  const profile = adminProfiles[adminName];
  if (!profile) return;

  document.getElementById('adminNameField').textContent = profile.name;
  document.getElementById('adminEmailField').textContent = profile.email;
  document.getElementById('adminRoleField').textContent = profile.role;
  document.getElementById('adminDepartmentField').textContent = profile.department;
  document.getElementById('adminStatusField').textContent = profile.status;
  document.getElementById('adminLastLoginField').textContent = profile.lastLogin;
  document.getElementById('adminAssignedPermissions').textContent = profile.assigned;
  document.getElementById('adminInheritedPermissions').textContent = profile.inherited;
  document.getElementById('adminSecurityLevel').textContent = profile.security;

  const customPermissions = document.getElementById('adminCustomPermissions');
  if (customPermissions) {
    customPermissions.innerHTML = profile.custom.map((perm) => `<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">${perm}</span>`).join('');
  }

  document.getElementById('adminModal')?.classList.remove('hidden');
}

function closeAdminModal() {
  document.getElementById('adminModal')?.classList.add('hidden');
}

function handleAdminChangeRole() {
  if (!selectedAdmin) return;
  openRoleModal('edit', adminProfiles[selectedAdmin].role);
}

function handleAdminEditPermissions() {
  if (!selectedAdmin) return;
  openRoleModal('edit', adminProfiles[selectedAdmin].role);
}

function handleAdminSuspendAccount(adminName) {
  alert(`Suspend account action is not connected yet for ${adminName || 'this administrator'}.`);
}

function handleAdminResetPermissions() {
  if (!selectedAdmin) return;
  alert(`Reset permissions action is not connected yet for ${selectedAdmin}.`);
}

function handleAdminDelete(adminName) {
  alert(`Delete administrator action is not connected yet for ${adminName}.`);
}

function openPermissionsConfirmModal() {
  const modal = document.getElementById('permissionsConfirmModal');
  document.getElementById('confirmAdminName').textContent = selectedAdmin || 'System preview';
  document.getElementById('confirmRoleName').textContent = currentRole || 'New Role';
  updateChangePreview();
  if (modal) modal.classList.remove('hidden');
}

function closePermissionsConfirmModal() {
  document.getElementById('permissionsConfirmModal')?.classList.add('hidden');
}

function confirmPermissionChanges() {
  closePermissionsConfirmModal();
  showToast('Permission changes previewed successfully (UI-only).', 'success');
}

function saveRoleDraft() {
  showToast('Role draft saved (UI-only).', 'success');
}

function saveRole() {
  openPermissionsConfirmModal();
}

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

  if (refreshButton) refreshButton.addEventListener('click', () => window.location.reload());
  if (createRoleBtn) createRoleBtn.addEventListener('click', () => openRoleModal('create'));
  if (inviteAdminBtn) inviteAdminBtn.addEventListener('click', () => alert('Invite Administrator is not connected yet.'));
  if (saveRoleDraftBtn) saveRoleDraftBtn.addEventListener('click', saveRoleDraft);
  if (saveRoleBtn) saveRoleBtn.addEventListener('click', saveRole);
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
      const templateName = button.dataset.template;
      if (!templateName) return;
      currentRole = templateName;
      initializeRolePermissions(templateName);
      renderPermissionMatrix();
      updatePermissionSummary();
      updateChangePreview();
      showDangerWarning();
      showToast(`${templateName} template loaded (UI-only).`, 'success');
    });
  });
}

function attachMatrixEvents() {
  const tbody = document.getElementById('permissionsMatrixBody');
  if (!tbody) return;

  tbody.addEventListener('click', (event) => {
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

function initializeRolesPermissionsPage() {
  renderAdministratorsTable();
  renderRolesTable();
  renderRoleSummaryCards();
  populateFilterOptions();
  renderPermissionHistoryList();
  initializeRolePermissions();
  renderPermissionMatrix();
  updatePermissionSummary();
  updateChangePreview();
  showDangerWarning();
  attachInlineActions();
  attachMatrixEvents();
}

window.initializeRolesPermissionsPage = initializeRolesPermissionsPage;
