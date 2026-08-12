// Product actions: toggle status, delete
function toggleProductStatus(id) {
  const p = dummyData.products.find(x => x.id === id);
  if (!p) return showToast('Product not found', 'error');
  p.status = p.status === 'Active' ? 'Inactive' : 'Active';
  showToast(`Product ${p.status === 'Active' ? 'activated' : 'deactivated'}`);
  if (currentPage === 'products') renderProducts(); else if (typeof viewProduct === 'function') try { viewProduct(id); } catch(e){}
}

function deleteProduct(id) {
  const idx = dummyData.products.findIndex(x => x.id === id);
  if (idx === -1) return showToast('Product not found', 'error');
  dummyData.products.splice(idx, 1);
  showToast('Product deleted');
  renderProducts();
}

// Notification bell: show notifications dropdown
function toggleNotificationBell() {
  // Find the bell button specifically wired to toggleNotificationBell
  const bell = document.querySelector('button[onclick="toggleNotificationBell()"]') || document.querySelector('.fa-bell');
  if (!bell) return;

  // if the icon was selected, get the closest button
  const button = bell.tagName.toLowerCase() === 'button' ? bell : bell.closest('button');
  if (!button) return;

  const parent = button.parentElement;
  let dropdown = parent.querySelector('.notification-dropdown');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.className = 'notification-dropdown absolute right-0 mt-2 w-80 bg-white dark:bg-gray-700 rounded shadow-lg py-2 z-50 max-h-96 overflow-y-auto hidden';
    dropdown.style.top = '100%';
    dropdown.style.minWidth = '320px';
    dropdown.innerHTML = `
      <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-600">
        <p class="font-semibold text-gray-900 dark:text-white text-sm">Notifications</p>
      </div>
      <a href="javascript:void(0);" class="block px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-600 border-b border-gray-200 dark:border-gray-600">
        <p class="font-semibold text-sm text-gray-900 dark:text-white">New seller registered</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">2 minutes ago</p>
      </a>
      <a href="javascript:void(0);" class="block px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-600 border-b border-gray-200 dark:border-gray-600">
        <p class="font-semibold text-sm text-gray-900 dark:text-white">Order pending review</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">15 minutes ago</p>
      </a>
      <a href="javascript:void(0);" class="block px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-600">
        <p class="font-semibold text-sm text-gray-900 dark:text-white">Product flagged for review</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">1 hour ago</p>
      </a>
    `;
    parent.appendChild(dropdown);

    // close when clicking outside
    if (!window._notificationDropdownListenerAdded) {
      window._notificationDropdownListenerAdded = true;
      document.addEventListener('click', (e) => {
        const open = document.querySelector('.notification-dropdown:not(.hidden)');
        if (!open) return;
        if (e.target.closest && !e.target.closest('.notification-dropdown') && !e.target.closest('button[onclick="toggleNotificationBell()"]')) {
          open.classList.add('hidden');
        }
      });
    }
    // show it immediately
    dropdown.classList.remove('hidden');
    return;
  }

  dropdown.classList.toggle('hidden');
}

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
