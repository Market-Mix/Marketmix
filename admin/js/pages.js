// Minimal SPA navigation and utilities for the admin panel
window.currentPage = window.currentPage || 'dashboard';

function loadPage(page) {
	window.currentPage = page || 'dashboard';
	const content = document.getElementById('content');
	if (!content) return console.warn('Content container not found');

	// Simple router: render minimal dashboard or placeholder for other pages
	if (page === 'dashboard') {
		content.innerHTML = `
			<section class="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div class="p-6 bg-white dark:bg-gray-800 rounded shadow">
					<p class="text-sm text-gray-500">Open Cases</p>
					<p class="text-2xl font-semibold">0</p>
				</div>
				<div class="p-6 bg-white dark:bg-gray-800 rounded shadow">
					<p class="text-sm text-gray-500">Outstanding Debt</p>
					<p class="text-2xl font-semibold">₦0</p>
				</div>
				<div class="p-6 bg-white dark:bg-gray-800 rounded shadow">
					<p class="text-sm text-gray-500">Completed Today</p>
					<p class="text-2xl font-semibold">0</p>
				</div>
			</section>

			<section class="mt-8 p-6 bg-white dark:bg-gray-800 rounded shadow">
				<h2 class="text-lg font-semibold mb-4">Recent Activity</h2>
				<div id="recentActivity">Loading...</div>
			</section>
		`;

		// allow other scripts to hook into dashboard loaded event
		if (window.onDashboardLoaded && typeof window.onDashboardLoaded === 'function') {
			try { window.onDashboardLoaded(); } catch (e) { console.warn('onDashboardLoaded error', e); }
		}
		return;
	}

	// Generic placeholder for other pages
	content.innerHTML = `
		<div class="p-6 bg-white dark:bg-gray-800 rounded shadow">
			<h2 class="text-xl font-semibold">${page}</h2>
			<p class="text-sm text-gray-500 mt-2">This page is not yet implemented in the local preview.</p>
		</div>
	`;
}

function handleLogout() {
	localStorage.removeItem('adminToken');
	localStorage.removeItem('adminSession');
	// optional: clear remembered username
	// localStorage.removeItem('adminUsername');
	window.location.href = 'login.html';
}

// Initialize to dashboard on load
window.addEventListener('DOMContentLoaded', () => {
	try { loadPage(window.currentPage); } catch (e) { console.error('loadPage init error', e); }
});
