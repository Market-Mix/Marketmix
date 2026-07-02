/* ============================================================
   sellers layout.js  —  MarketMix Seller Dashboard
   All data calls are now scoped to the active store via
   StoreManager.apiFetch() which auto-sends X-Store-Id header.
   ============================================================ */

// ─── Auth helpers (kept for logout which doesn't need store scope) ────────────
function getToken() {
  // Prefer seller-scoped token to avoid buyer session overwrite
  return localStorage.getItem('seller_token') || localStorage.getItem('token') || '';
}

function normalizeKycStatus(rawStatus, previousStatus = 'not_submitted') {
  const status = String(rawStatus || '').trim().toLowerCase();
  if (!status) return previousStatus || 'not_submitted';
  if (status === 'under_review' || status === 'pending' || status.includes('review') || status.includes('submitted')) {
    return 'pending';
  }
  if (status === 'approved' || status.includes('approved') || status.includes('verified')) {
    return 'approved';
  }
  if (status === 'rejected' || status === 'failed' || status.includes('reject')) {
    return 'rejected';
  }
  if (status === 'not_submitted' || status.includes('not') || status.includes('unsubmitted')) {
    return 'not_submitted';
  }
  return previousStatus || 'not_submitted';
}

async function handleLogout() {
  try {
    await fetch(`${StoreManager.API_BASE || 'https://marketmix-backend.onrender.com/api'}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
    });
  } catch (_) {}
  ['token','user','seller_token','seller_user','userRole'].forEach(k => localStorage.removeItem(k));
  // Keep mm_active_store and mm_stores_cache so it restores on next login
  window.location.href = "login.html";
}

// Wire logout links
document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  handleLogout();
});

// ─── DOM Ready ────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  // dashboardLoaded prevents clearing cards on subsequent refreshes
  window._dashboardLoaded = false;
  // Central seller dashboard state (single source of truth for KYC and similar flags)
  window.sellerDashboardState = window.sellerDashboardState || { kycStatus: null };
  initNavToggle();
  initMobilePanel();
  initProfileDropdownClose();
  initTips();
  initActivityModal();
  initModals();

  // Clear static demo content immediately (only on first load)
  clearOverviewCards();
  clearActivityTicker();

  // Ensure an active store is selected — redirects if none
  const store = await StoreManager.requireActiveStore();
  if (!store) return; // redirected

  // Render store switcher badge in navbar
  await StoreManager.renderStoreSwitcher('storeSwitcher');

  // Initial data load
  await loadDashboardData();

  // Re-load when user switches stores on this page
  window.addEventListener('storeChanged', async () => {
    // Clear any stale cached seller counts for previous stores
    window._sellerReturnsCount = null;
    window._sellerNotificationCounts = null;
    clearOverviewCards();
    clearActivityTicker();
    await loadDashboardData();
    await StoreManager.renderStoreSwitcher('storeSwitcher');
  });

  // Refresh when seller notification events are emitted
  window.addEventListener('sellerNotificationsUpdated', async (evt) => {
    console.log('Seller notification refresh triggered');
    // Try to read count from event detail or from persisted storage
    // so badge updates are immediate while we reload dashboard data
    try {
      const last = (evt && evt.detail && typeof evt.detail.count === 'number') ? evt.detail.count : null;
      const stored = Number(localStorage.getItem('sellerReturnsActiveCount') || 0) || 0;
      const count = last !== null ? last : stored;
      updateSellerBadges(count);
    } catch (e) {
      console.warn('Could not read seller notification event detail:', e);
    }
    await loadDashboardData();
  });

  // Also listen for explicit dashboard update events (dispatched after key actions)
  window.addEventListener('seller-dashboard-updated', async () => {
    try {
      console.log('seller-dashboard-updated event received — reloading dashboard data');
      await loadDashboardData();
    } catch (e) { console.warn('Failed to reload dashboard on seller-dashboard-updated', e); }
  });

  // Auto-refresh every 30 seconds
  setInterval(loadDashboardData, 30_000);

  let lastVisible = Date.now();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      lastVisible = Date.now();
      return;
    }
    // Only refresh if hidden for more than 60 seconds
    if (Date.now() - lastVisible > 60_000) {
      StoreManager.setCachedStores?.(null);
      loadDashboardData();
    }
  });

  // Refresh dashboard when user returns focus to the window
  // This ensures progress tracker updates immediately after product upload
  window.addEventListener('focus', async () => {
    await loadDashboardData();
  });

  // Update navbar notification badge right away and poll every 30s
  try {
    updateNavbarNotificationBadge();
    setInterval(updateNavbarNotificationBadge, 30_000);
  } catch (e) { console.warn('Notification badge updater init failed', e); }
});

// Fetch unread notifications count and update all navbar badges on seller pages
async function updateNavbarNotificationBadge() {
  const token = localStorage.getItem('seller_token') || localStorage.getItem('token') || '';
  if (!token) return;
  const apiBase = StoreManager?.API_BASE || 'https://marketmix-backend.onrender.com/api';
  try {
    const res = await fetch(`${apiBase}/notifications?unread=true`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!res.ok) return;
    const json = await res.json();
    // support both shapes: { status,data:{unreadCount } } and { unreadCount }
    const unread = json?.data?.unreadCount ?? json?.unreadCount ?? 0;
    // Also merge with seller returns active count (some alerts are refund chat based)
    const sellerReturns = Number(localStorage.getItem('sellerReturnsActiveCount') || 0) || 0;
    const displayCount = Math.max(unread || 0, sellerReturns || 0);
    document.querySelectorAll('.notification-badge').forEach(b => {
      try {
        b.innerText = displayCount;
        b.style.display = displayCount > 0 ? 'inline-block' : 'none';
      } catch (e) { /* ignore */ }
    });
  } catch (e) {
    console.error('Failed to update notification badge:', e);
  }
}

// Update seller-specific badges (refunds + navbar). count is open refunds count
function updateSellerBadges(count = 0) {
  try {
    // update any returns/overview card that expects a badge
    // find returns link badge in overview cards (sellers layout.html uses an overview card link to sellers returns)
    const returnsOverview = Array.from(document.querySelectorAll('.overview-card')).find(c => {
      const p = c.querySelector('p');
      return p && p.textContent && p.textContent.trim().toLowerCase() === 'returns';
    });
    if (returnsOverview) {
      const h3 = returnsOverview.querySelector('h3');
      if (h3) h3.textContent = count > 0 ? String(count) : '—';
    }

    // update any dedicated returns page icon badge
    document.querySelectorAll('.notification-badge').forEach(b => {
      try {
        // preserve numeric badges from updateNavbarNotificationBadge which may call this
        const current = Number(b.innerText) || 0;
        const merged = Math.max(current, count || 0);
        b.innerText = merged > 0 ? String(merged) : '';
        b.style.display = merged > 0 ? 'inline-block' : 'none';
      } catch (e) { /* ignore */ }
    });
  } catch (e) {
    console.warn('Failed to update seller badges:', e);
  }
}

// ─── Clear placeholder content ────────────────────────────────────────────────
function clearOverviewCards() {
  // Don't clear once dashboard has completed its initial load
  if (window._dashboardLoaded) return;

  document.querySelectorAll(".overview-card h3").forEach((h3) => {
    // Only clear if it looks like placeholder numeric text (numbers only), not "—"
    const text = h3.textContent.trim();
    if (/^\d+$/.test(text) || /^\d+,\d+$/.test(text) || /^₦/.test(text)) {
      h3.textContent = "Loading...";
    }
  });
}

function clearActivityTicker() {
  const tickerList = document.getElementById("tickerList");
  if (tickerList) {
    const currentHtml = tickerList.innerHTML.trim();
    // Only update if not already loading
    if (!currentHtml.includes("Loading activity") && tickerList.innerText !== "Loading activity...") {
      tickerList.innerHTML = "<li>Loading activity...</li>";
    }
  }
  const fullLog = document.querySelector(".full-log");
  if (fullLog) {
    const currentHtml = fullLog.innerHTML.trim();
    if (!currentHtml.includes("Loading activity") && fullLog.innerText !== "Loading activity...") {
      fullLog.innerHTML = "<li>Loading activity...</li>";
    }
  }
}

function getOpenRefundCount(refunds = []) {
  const openStatuses = new Set([
    'open',
    'pending',
    'active',
    'waiting_buyer_confirmation',
    'waiting_buyer_confirmation',
    'in_progress',
    'in_review',
    'under_review',
    'under review'
  ]);
  return (refunds || []).reduce((count, refund) => {
    const status = String(refund?.resolution_status || refund?.status || '').toLowerCase().trim();
    return openStatuses.has(status) ? count + 1 : count;
  }, 0);
}

// ─── Central data loader ──────────────────────────────────────────────────────
async function loadDashboardData() {
  let store = StoreManager.getActiveStore();
  if (!store) return;

  // Refresh active store data so dashboard progress stays in sync after setup/KYC flow.
  try {
    const freshStores = await StoreManager.loadStores(true);
    const freshStore = Array.isArray(freshStores) ? freshStores.find(s => s?.id === store?.id) : null;
    if (freshStore) {
      StoreManager.setActiveStore(freshStore);
      store = freshStore;
    }
  } catch (err) {
    console.warn('Could not refresh active store data:', err);
  }

  // All calls go through StoreManager.apiFetch which auto-adds X-Store-Id
  const [profileRes, userRes, statsRes, earningsRes, activityRes, refundsRes] = await Promise.allSettled([
    StoreManager.apiFetch("/seller/profile"),
    StoreManager.apiFetch("/auth/me"),
    StoreManager.apiFetch("/seller/dashboard-stats"),
    StoreManager.apiFetch("/earnings"),
    StoreManager.apiFetch("/seller/activity?limit=50"),
    // Fetch returns/refunds count from the seller endpoint
    (async () => {
      try {
        const result = await StoreManager.apiFetch("/seller/refund-cases");
        const refunds = Array.isArray(result?.data) ? result.data : [];
        const openCount = getOpenRefundCount(refunds);
        return { data: { count: openCount, refunds } };
      } catch (e) {
        console.warn('Could not fetch refunds count:', e.message);
        return { data: { count: 0, refunds: [] } };
      }
    })(),
  ]);

  const profile    = profileRes.status  === "fulfilled" ? profileRes.value?.data?.seller      : null;
  const user       = userRes.status     === "fulfilled" ? userRes.value?.data?.user        : null;
  const stats      = statsRes.status    === "fulfilled"  ? statsRes.value?.data?.stats          : null;
  const earnings   = earningsRes.status === "fulfilled"  ? earningsRes.value?.data?.summary     : null;
  const activities = activityRes.status === "fulfilled"
    ? (activityRes.value?.data?.activities || [])
    : [];
  
  let refundsCount = 0;
  if (refundsRes.status === "fulfilled" && refundsRes.value?.data) {
    refundsCount = refundsRes.value.data.count || 0;
  }

  console.log('Seller returns count:', refundsCount);
  console.log('Seller current store:', store?.id || 'unknown');

  // Merge stats into store object for progress tracker
  if (stats) {
    const existingProductCount = Number(store.productCount || store.product_count || 0);
    const existingTotalSales = Number(store.total_sales || store.totalSales || 0);
    store.productCount = stats.product_count ?? stats.productCount ?? existingProductCount;
    store.total_sales = stats.total_sales ?? stats.totalSales ?? stats.totalOrders ?? existingTotalSales;
  }

  renderWelcome(store);
  renderProfileImage(profile);
  renderOverviewCards(stats, earnings, store, refundsCount);
  renderProgressTracker(profile, store, user, {
    profileOk: profileRes.status === 'fulfilled',
    userOk: userRes.status === 'fulfilled',
    statsOk: statsRes.status === 'fulfilled',
  });
  updateKYCNotificationBanner(profile);
  renderActivityLog(activities);
  renderStoreShareLink(store);

  // Mark initial load complete — subsequent refreshes won't show loading placeholders
  if (!window._dashboardLoaded) window._dashboardLoaded = true;
}

// ─── Nav Toggle ───────────────────────────────────────────────────────────────
function initNavToggle() {
  const toggler = document.getElementById("navbar-toggler");
  const menu    = document.getElementById("offcanvasMenu");
  const close   = document.getElementById("offcanvasClose");
  if (!toggler || !menu) return;

  toggler.addEventListener("click", () => menu.classList.add("show"));
  close?.addEventListener("click", () => menu.classList.remove("show"));
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !toggler.contains(e.target))
      menu.classList.remove("show");
  });
  menu.addEventListener("click", (e) => e.stopPropagation());
  document.querySelectorAll(".offcanvas-body a").forEach((l) =>
    l.addEventListener("click", () => menu.classList.remove("show"))
  );
}

// ─── Mobile Panel ─────────────────────────────────────────────────────────────
function initMobilePanel() {
  const toggle   = document.getElementById("mobileLogoToggle");
  const panel    = document.getElementById("mobileLogoPanel");
  const closeBtn = document.getElementById("mobileLogoPanelClose");
  if (!toggle || !panel) return;

  toggle.addEventListener("click", (e) => { e.stopPropagation(); panel.classList.add("show"); });
  closeBtn?.addEventListener("click", (e) => { e.stopPropagation(); panel.classList.remove("show"); });
  document.addEventListener("click", (e) => {
    if (!panel.contains(e.target) && !toggle.contains(e.target))
      panel.classList.remove("show");
  });
  panel.addEventListener("click", (e) => e.stopPropagation());
  document.querySelectorAll(".mobile-logo-nav-links a").forEach((l) =>
    l.addEventListener("click", () => panel.classList.remove("show"))
  );
}

// ─── Profile Dropdown ─────────────────────────────────────────────────────────
function toggleProfileDropdown() {
  const dd = document.getElementById("profileDropdown");
  if (!dd) return;
  dd.style.display = dd.style.display === "flex" ? "none" : "flex";
}
window.toggleProfileDropdown = toggleProfileDropdown;

function initProfileDropdownClose() {
  document.addEventListener("click", (e) => {
    const dd   = document.getElementById("profileDropdown");
    const icon = document.querySelector(".profile-icon");
    if (dd && icon && !dd.contains(e.target) && !icon.contains(e.target))
      dd.style.display = "none";
  });
}

// ─── Welcome Text — shows active store name ───────────────────────────────────
function renderWelcome(store) {
  const el = document.getElementById("welcomeText");
  if (!el) return;
  el.textContent = `Welcome to ${store?.business_name || 'Your Store'}!`;
}

// ─── Profile Image — shows active store logo ─────────────────────────────────
function renderProfileImage(profile) {
  const images = [
    document.getElementById("sellerProfileImage"),
    document.getElementById("sellerProfileImageMobile"),
  ].filter(Boolean);
  if (!images.length) return;

  // Prefer active store logo, fall back to seller avatar
  const store = StoreManager.getActiveStore();
  const logo  = store?.store_logo_url || profile?.avatarUrl || '';

  if (logo) {
    images.forEach((img) => {
      // Only update if src actually changed to prevent unnecessary re-renders
      if (img.src !== logo) {
        img.src = logo;
        // Only clear on error if we have a valid logo URL - don't clear on first load
        img.onerror = function handleImgError() {
          if (this.src && this.src === logo) {
            // Use a placeholder or leave as is instead of clearing completely
            this.style.backgroundColor = '#e2e8f0';
          }
        };
      }
    });
  }

  renderProfileVerifiedBadge(profile, false);
}

function renderProfileVerifiedBadge(profile, accountCompleted = false) {
  // Profile verification tick removed per UX requirement.
  return;

  const profileData = profile?.profile || profile || {};
  const rawStatus = profileData?.kyc_status ?? profileData?.kycStatus;
  const kycStatus = String(rawStatus || 'not_submitted').toLowerCase();
  const hasSubmittedKYC = ['pending', 'approved', 'rejected'].includes(kycStatus);
  const kycApproved = kycStatus === 'approved';
  const isVerified = hasSubmittedKYC && kycApproved;
  const isRejected = ['rejected', 'failed'].includes(kycStatus);

  const targets = Array.from(new Set([
    ...Array.from(document.querySelectorAll('.profile-container')),
    ...Array.from(document.querySelectorAll('.mobile-profile-container')),
    ...Array.from(document.querySelectorAll('.seller-identity-card')),
    ...Array.from(document.querySelectorAll('.dashboard-identity-card')),
    ...Array.from(document.querySelectorAll('.identity-card')),
  ])).filter(Boolean);

  targets.forEach((container) => {
    if (!container) return;
    let badge = container.querySelector('#profileVerifiedBadge');
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'profileVerifiedBadge';
      badge.style.position = 'absolute';
      badge.style.top = '-4px';
      badge.style.right = '-4px';
      badge.style.width = '24px';
      badge.style.height = '24px';
      badge.style.borderRadius = '999px';
      badge.style.fontSize = '14px';
      badge.style.fontWeight = '700';
      badge.style.color = '#fff';
      badge.style.display = 'none';
      badge.style.alignItems = 'center';
      badge.style.justifyContent = 'center';
      badge.style.textAlign = 'center';
      badge.style.lineHeight = '1';
      badge.style.zIndex = '9999';
      badge.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
      container.style.position = 'relative';
      container.appendChild(badge);
    }

    if (accountCompleted) {
      badge.textContent = '✓';
      badge.style.background = '#2563eb';
      badge.title = 'Seller account setup complete';
      badge.style.display = 'flex';
    } else if (isRejected) {
      badge.textContent = '!';
      badge.style.background = '#dc2626';
      badge.title = 'KYC failed';
      badge.style.display = 'flex';
    } else if (isVerified) {
      badge.textContent = '✓';
      badge.style.background = '#16a34a';
      badge.title = 'Verified seller';
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  });
}

// ─── Store Share Link — uses store.id not seller user id ─────────────────────
function renderStoreShareLink(store) {
  if (!store?.id) return;

  const baseUrl  = window.location.origin;
  const storeUrl = `${baseUrl}/buyers/store-id.html?store=${store.id}`;

  const input   = document.getElementById('storeLinkInput');
  const openBtn = document.getElementById('openStoreBtn');

  if (input)   input.value = storeUrl;
  if (openBtn) openBtn.href = storeUrl;
}

window.copyStoreLink = function () {
  const input     = document.getElementById('storeLinkInput');
  const successEl = document.getElementById('copySuccess');
  const copyBtn   = document.getElementById('copyLinkBtn');

  if (!input || !input.value || input.value === 'Generating your link...') return;

  navigator.clipboard.writeText(input.value).then(() => {
    if (successEl) {
      successEl.style.display = 'block';
      setTimeout(() => { successEl.style.display = 'none'; }, 3000);
    }
    if (copyBtn) {
      copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
      copyBtn.style.background = '#16a34a';
      setTimeout(() => {
        copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
        copyBtn.style.background = '';
      }, 2500);
    }
  }).catch(() => {
    input.select();
    document.execCommand('copy');
    if (successEl) {
      successEl.style.display = 'block';
      setTimeout(() => { successEl.style.display = 'none'; }, 3000);
    }
  });
};

// ─── Overview Cards — store-scoped stats ─────────────────────────────────────
function renderOverviewCards(stats, earnings, store, refundsCount = 0) {
  function setCard(labelText, value) {
    const cards = document.querySelectorAll(".overview-card");
    for (const card of cards) {
      const p = card.querySelector("p");
      if (p && p.textContent.trim().toLowerCase() === labelText.toLowerCase()) {
        const h3 = card.querySelector("h3");
        if (h3) {
          // Only update if value actually changed to prevent blinking
          const currentText = h3.textContent;
          const newText = String(value);
          if (currentText !== newText) {
            h3.textContent = newText;
          }
        }
        return;
      }
    }
  }

  // Use normalized stats with fallbacks for field name variations
  const totalOrders = stats?.totalOrders ?? stats?.total_orders ?? 0;
  const productCount = stats?.productCount ?? stats?.product_count ?? store?.product_count ?? 0;
  
  // Returns can come from refunds count OR cancelled orders from stats
  const returnsCancelled = refundsCount > 0 ? refundsCount : (stats?.cancelled ?? stats?.cancelledOrders ?? 0);
  
  // Handle earnings from multiple possible sources
  let totalEarnings = null;
  if (earnings?.totalEarnings) {
    totalEarnings = earnings.totalEarnings;
  } else if (earnings?.total_earnings) {
    totalEarnings = earnings.total_earnings;
  } else if (stats?.totalEarnings) {
    totalEarnings = stats.totalEarnings;
  } else if (stats?.total_earnings) {
    totalEarnings = stats.total_earnings;
  }

  // Update cards with actual data or placeholder
  setCard("Orders", totalOrders > 0 ? totalOrders : "—");
  setCard("Products", productCount > 0 ? productCount : "—");
  
  if (totalEarnings !== null && totalEarnings > 0) {
    setCard("Earnings", "₦" + Number(totalEarnings).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }));
  } else {
    setCard("Earnings", "—");
  }

  // For returns - this should pull from refunds table or cancelled orders
  setCard("Returns", returnsCancelled > 0 ? returnsCancelled : "—");
}

// ─── Progress Tracker ─────────────────────────────────────────────────────────
function renderProgressTracker(profile, store, user, fetchStatus = {}) {
  const bar       = document.getElementById("progressBar");
  const barContainer = document.querySelector('.progress-bar-container');
  const text      = document.getElementById("progress-text");
  const badge     = document.getElementById("progressBadge");
  const trackerEl = document.querySelector('.progress-tracker');
  if (!bar || !barContainer || !text || !badge || !trackerEl) return;

  const hasSnapshot = !!window._sellerProgressSnapshot;
  if (hasSnapshot && (!fetchStatus.profileOk || !fetchStatus.userOk || !fetchStatus.statsOk)) {
    console.warn('Skipping progress render because refresh returned incomplete dashboard data', fetchStatus);
    return;
  }

  const p            = profile?.profile || profile || {};
  const rawKycStatus  = p?.kyc_status ?? p?.kycStatus;
  const prevKycStatus  = window._sellerProgressSnapshot?.kycStatus || window.sellerDashboardState?.kycStatus || 'not_submitted';
  const kycStatus      = normalizeKycStatus(rawKycStatus, prevKycStatus);
  const hasSubmittedKYC = ['pending', 'approved', 'rejected'].includes(kycStatus);
  const isVerifiedFlag = kycStatus === 'approved';
  const isRejectedFlag = ['rejected', 'failed'].includes(kycStatus);
  const isKycPendingFlag = kycStatus === 'pending';
  const isNotSubmitted = kycStatus === 'not_submitted';
  const sellerId = p?.id || p?.sellerId || p?.userId || profile?.id || 'unknown';
  console.log('Seller KYC debug:', {
    sellerId,
    kycStatus,
    isVerifiedFlag,
    isRejectedFlag,
    isKycPendingFlag,
    isNotSubmitted,
  });
  const userAddress  = user?.address || user?.business_address || p?.address || p?.business_address || null;
  const hasShoppingDetails = !!(
    userAddress ||
    user?.city || user?.state || user?.postalCode || user?.country ||
    p?.city || p?.state || p?.postalCode || p?.country
  );

  const storeLogoUrl = store?.store_logo_url || store?.storeLogo || store?.logo_url || store?.logo;
  const storeAddress = store?.business_address || store?.address || store?.store_address;
  const storeSetupDone = !!(store?.business_name && storeLogoUrl && storeAddress);
  const productCount   = store?.productCount || store?.product_count || 0;
  const totalSales     = store?.total_sales || 0;
  const completedStages = [];
  if (storeSetupDone) completedStages.push('store_setup');
  if (productCount >= 1) completedStages.push('upload_product');
  if (productCount >= 1 && hasShoppingDetails) completedStages.push('shopping_details');
  if (totalSales >= 1) completedStages.push('first_order');

  let stage = 'unknown';
  let progress = 0;
  let color = '#2563eb';
  let html = '';
  let badgeText = '';
  let badgeClass = '';

  if (!storeSetupDone) {
    stage = 'store_setup';
    progress = 15;
    color = '#ef4444';
    html = `<a href="sellers setting.html" style="color:#1e293b;text-decoration:underline">Complete your store setup</a>`;
  } else if (productCount < 1) {
    progress = 30;
    if (isNotSubmitted) {
      stage = 'kyc_not_submitted';
      color = '#ef4444';
      html = `<a href="kyc-verification.html" style="color:#1e293b;text-decoration:underline">Complete KYC</a>`;
    } else {
      stage = 'upload_product';
      if (isVerifiedFlag) {
        color = '#16a34a';
      } else if (isRejectedFlag) {
        color = '#dc2626';
      } else if (isKycPendingFlag) {
        color = '#f59e0b';
      } else {
        color = '#f97316';
      }
      html = `<a href="sellers product.html" style="color:#1e293b;text-decoration:underline">Upload your first product</a>`;
    }
  } else if (productCount >= 1 && !hasShoppingDetails) {
    stage = 'shopping_details';
    progress = 60;
    color = '#eab308';
    html = `<a href="sellers-account.html#address" style="color:#1e293b;text-decoration:underline">Setup your shopping details</a>`;
  } else if (productCount >= 1 && hasShoppingDetails && totalSales < 1) {
    stage = 'first_sales';
    progress = 75;
    color = '#86efac';
    html = `Make your first sales`;
  } else if (totalSales >= 1 && !(productCount >= 1 && hasShoppingDetails && isVerifiedFlag)) {
    stage = 'withdraw_earning';
    progress = 90;
    color = '#22c55e';
    html = `<a href="sellers earning.html" style="color:#1e293b;text-decoration:underline">Withdraw your first earning</a>`;
  }

  if (isRejectedFlag) {
    badgeText = 'KYC Failed';
    badgeClass = 'red';
  } else if (isVerifiedFlag) {
    badgeText = 'Verified ✓';
    badgeClass = 'green';
  }

  if (storeSetupDone && productCount >= 1 && hasShoppingDetails && totalSales >= 1) {
    stage = 'complete';
    progress = 100;
    if (isVerifiedFlag) {
      color = '#3b82f6';
      html = `Everything complete!`;
      badgeText = 'Fully Verified ✓';
      badgeClass = 'blue';
    } else if (isKycPendingFlag) {
      color = '#f59e0b';
      html = `<a href="kyc-verification.html" style="color:#1e293b;text-decoration:underline">Your KYC is under review</a>`;
      badgeText = 'KYC Under Review';
      badgeClass = 'yellow';
    } else if (isRejectedFlag) {
      color = '#dc2626';
      html = `<a href="kyc-verification.html" style="color:#1e293b;text-decoration:underline">KYC rejected — resubmit</a>`;
      badgeText = 'KYC Rejected';
      badgeClass = 'red';
    } else {
      color = '#f97316';
      html = `<a href="kyc-verification.html" style="color:#1e293b;text-decoration:underline">Review your KYC status</a>`;
      badgeText = 'KYC Pending';
      badgeClass = 'yellow';
    }
  }

  const accountCompleted = progress === 100;

  console.log({
    kyc_status: kycStatus,
    is_verified: p?.is_verified,
    hasSubmittedKYC,
    currentStep: stage,
    progressPercent: progress,
  });
  console.info('Seller completion status:', accountCompleted ? 'complete' : 'incomplete',
    'Progress percentage:', progress,
    'Completed stages:', completedStages,
    'Seller ID:', sellerId,
    'is_verified:', p?.is_verified,
    'kycStatus:', kycStatus,
    'Blue badge status:', accountCompleted ? 'shown' : 'hidden');
  // Debug: current milestone
  console.log('Current milestone:', stage);

  // Prevent flicker/backwards transitions: only render when forward or when
  // database-backed metrics have actually decreased. Keep a snapshot to
  // compare subsequent renders.
  const STAGE_ORDER = ['store_setup','upload_product','shopping_details','first_sales','withdraw_earning','complete'];
  const newIndex = STAGE_ORDER.indexOf(stage);
  const prevStage = window._lastSellerProgressStage || null;
  const prevIndex = prevStage ? STAGE_ORDER.indexOf(prevStage) : -1;
  const prevSnapshot = window._sellerProgressSnapshot || {};

  let allowRender = true;
  if (prevStage && newIndex < prevIndex) {
    // Only allow backward movement if numeric/store flags decreased (i.e. DB changed)
    const prevProductCount = Number(prevSnapshot.productCount || 0);
    const prevTotalSales = Number(prevSnapshot.totalSales || 0);
    const prevStoreSetup = !!prevSnapshot.storeSetupDone;

    const decreasedProduct = (productCount < prevProductCount);
    const decreasedSales = (totalSales < prevTotalSales);
    const lostStoreSetup = (!storeSetupDone && prevStoreSetup);

    if (!(decreasedProduct || decreasedSales || lostStoreSetup)) {
      allowRender = false;
      console.log('Skipping backward progress render: previous stage', prevStage, 'new stage', stage);
    }
  }

  if (!allowRender) return;

  // Mark first successful render
  if (!window._sellerProgressRenderedOnce) {
    console.log('Progress rendered once');
    window._sellerProgressRenderedOnce = true;
  }

  // Persist last seen stage and numeric snapshot for future comparisons
  window._lastSellerProgressStage = stage;
  window._sellerProgressSnapshot = { productCount, totalSales, storeSetupDone, hasShoppingDetails, kycStatus };

  if (accountCompleted) {
    text.innerHTML = `<strong>Congratulations!</strong><br>Your seller account setup is complete.`;
    barContainer.style.display = 'none';
  } else {
    text.innerHTML = html;
    barContainer.style.display = 'block';
    bar.style.width = progress + "%";
    bar.style.backgroundColor = color;
  }

  if (badgeText) {
    badge.textContent = badgeText;
    badge.className = `progress-badge ${badgeClass}`;
    badge.hidden = false;
  } else {
    badge.hidden = true;
  }

  renderProfileVerifiedBadge(profile, accountCompleted);
}

// ─── KYC Notification Banner ──────────────────────────────────────────────────
// Centralized KYC banner + logo updater — single place that controls banner text and logo color
function applyKycBannerAndLogo(normalizedStatus) {
  try {
    const brandLogo = document.querySelector('.brand-logo');
    // Logo rule: approved => yellow, all other states => default
    if (brandLogo) {
      if (normalizedStatus === 'approved') {
        brandLogo.style.color = '#f59e0b';
      } else {
        brandLogo.style.color = '';
      }
    }
  } catch (e) { console.warn('applyKycBannerAndLogo failed', e); }
}

function updateKYCNotificationBanner(profile) {
  const banner   = document.getElementById("kycNotificationBanner");
  const closeBtn = document.getElementById("kycNotificationClose");
  const notificationText = document.getElementById("kycNotificationText");
  if (!banner || !closeBtn || !notificationText) return;

  const profileData = profile?.profile || profile || {};
  const rawStatus = profileData?.kyc_status ?? profileData?.kycStatus;
  const prevStatus = window.sellerDashboardState?.kycStatus || 'not_submitted';
  const normalizedStatus = normalizeKycStatus(rawStatus, prevStatus);
  const dismissedStatus = localStorage.getItem('mm_kyc_banner_dismissed_status');
  const shouldShowBanner = normalizedStatus !== dismissedStatus;

  let message = '';
  if (normalizedStatus === 'not_submitted') {
    message = 'Complete your KYC verification.';
  } else if (normalizedStatus === 'pending') {
    message = 'Your KYC is under review.';
  } else if (normalizedStatus === 'approved') {
    message = 'KYC verified successfully.';
  } else if (normalizedStatus === 'rejected' || normalizedStatus === 'failed') {
    message = 'Your KYC was rejected. Please resubmit.';
  }

  if (message && shouldShowBanner) {
    banner.style.display = "block";
    notificationText.textContent = message;
    banner.dataset.kycStatus = normalizedStatus;
  } else {
    banner.style.display = "none";
    banner.dataset.kycStatus = normalizedStatus;
  }

  // Update centralized state and apply logo rules — only when changed
  try {
    const prev = window.sellerDashboardState?.kycStatus;
    if (prev !== normalizedStatus) {
      window.sellerDashboardState = window.sellerDashboardState || {};
      window.sellerDashboardState.kycStatus = normalizedStatus;
      applyKycBannerAndLogo(normalizedStatus);
      console.log('KYC state updated:', normalizedStatus);
    }
  } catch (e) { console.warn('Could not update sellerDashboardState', e); }

  if (!closeBtn.dataset.listenerAttached) {
    closeBtn.addEventListener("click", () => {
      const dismissed = banner.dataset.kycStatus || normalizedStatus;
      localStorage.setItem('mm_kyc_banner_dismissed_status', dismissed);
      banner.style.display = "none";
    });
    closeBtn.dataset.listenerAttached = "true";
  }
}

// ─── Activity Log ─────────────────────────────────────────────────────────────
const ACTIVITY_META = {
  product_added:        { icon: "📦", label: "Product added"        },
  product_updated:      { icon: "✏️",  label: "Product updated"      },
  product_deleted:      { icon: "🗑️",  label: "Product deleted"      },
  order_confirmed:      { icon: "✅",  label: "Order confirmed"      },
  order_processing:     { icon: "⚙️",  label: "Order processing"     },
  order_shipped:        { icon: "🚚",  label: "Order shipped"        },
  order_delivered:      { icon: "📬",  label: "Order delivered"      },
  order_cancelled:      { icon: "❌",  label: "Order cancelled"      },
  order_updated:        { icon: "🔄",  label: "Order updated"        },
  withdrawal_requested: { icon: "💰",  label: "Withdrawal requested" },
};

function activityMeta(type) {
  return ACTIVITY_META[type] || { icon: "🔔", label: type.replace(/_/g, " ") };
}

function formatRelativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs  / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function renderActivityLog(activities) {
  const tickerList = document.getElementById("tickerList");
  const fullLog    = document.querySelector(".full-log");

  if (tickerList) {
    tickerList.innerHTML = activities.length
      ? activities.slice(0, 15).map((a) => {
          const { icon } = activityMeta(a.type);
          return `<li>${icon} ${a.title} <span style="opacity:.55;font-size:.85em">${formatRelativeTime(a.createdAt)}</span></li>`;
        }).join("")
      : "<li>No activity yet — start by adding a product!</li>";
  }

  if (fullLog) {
    fullLog.innerHTML = activities.length
      ? activities.map((a) => {
          const { icon, label } = activityMeta(a.type);
          const dateStr = new Date(a.createdAt).toLocaleString("en-US", {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
          });
          const detail = a.detail
            ? `<br><span style="font-size:.85em;opacity:.65">${a.detail}</span>`
            : "";
          return `<li style="padding:.5rem 0;border-bottom:1px solid rgba(0,0,0,.06)">
            <span style="font-size:1.1em;margin-right:.4em">${icon}</span>
            <strong>${a.title}</strong>${detail}
            <span style="float:right;font-size:.8em;opacity:.5">${dateStr}</span>
          </li>`;
        }).join("")
      : "<li>No activity yet.</li>";
  }
}

// ─── Seller Tips ──────────────────────────────────────────────────────────────
function initTips() {
  const tips = [
    "Welcome to MarketMix!",
    "Keep your product descriptions clear and detailed.",
    "Offer promotions to boost your sales.",
    "Respond quickly to buyer inquiries for better ratings.",
    "Update your shop regularly to keep it fresh.",
    "Use high-quality images to attract more buyers.",
    "Check your earnings dashboard weekly.",
  ];
  let i = 0;
  const el = document.getElementById("tip-text");
  if (!el) return;
  setInterval(() => {
    i = (i + 1) % tips.length;
    el.textContent = tips[i];
  }, 3000);
}

// ─── Activity Modal ───────────────────────────────────────────────────────────
function initActivityModal() {
  const ticker = document.getElementById("activityTicker");
  const modal  = document.getElementById("activityModal");
  const close  = document.getElementById("closeModal");

  ticker?.addEventListener("click", () => { if (modal) modal.style.display = "block"; });
  close?.addEventListener("click",  () => { if (modal) modal.style.display = "none";  });
  window.addEventListener("click",  (e) => { if (e.target === modal) modal.style.display = "none"; });
}

// ─── Tool Modals (Coupons + Sales Chart) ──────────────────────────────────────
function initModals() {
  const couponsModal = document.getElementById("coupons-modal");
  const salesModal   = document.getElementById("sales-modal");

  document.getElementById("marketing-coupons-card")?.addEventListener("click", () => {
    if (couponsModal) couponsModal.style.display = "block";
    loadSellerProductsForCoupon();
  });

  document.getElementById("sales-chart-card")?.addEventListener("click", () => {
    if (salesModal) salesModal.style.display = "block";
    renderSalesChart();
  });

  document.getElementById("close-coupons")?.addEventListener("click", () => { if (couponsModal) couponsModal.style.display = "none"; });
  document.getElementById("close-sales")?.addEventListener("click",   () => { if (salesModal)   salesModal.style.display   = "none"; });

  window.addEventListener("click", (e) => {
    if (e.target?.classList?.contains("modal")) e.target.style.display = "none";
  });

  document.getElementById("coupon-form")?.addEventListener("submit", handleCouponSubmit);
}

// ─── Coupon product dropdown — store-scoped ───────────────────────────────────
async function loadSellerProductsForCoupon() {
  const dropdown = document.getElementById("couponProduct");
  if (!dropdown) return;
  dropdown.innerHTML = `<option value="">Loading...</option>`;
  dropdown.disabled  = true;

  try {
    const data     = await StoreManager.apiFetch("/seller/products?limit=100");
    const products = data?.data?.products || [];
    dropdown.innerHTML = `<option value="">-- Choose a product --</option>`;
    if (!products.length) {
      // Seed a demo product option so the coupon form can be submitted during testing
      const demoId = 'demo-product-temp-1';
      const demoName = 'DEMO Product (remove after test)';
      const opt = document.createElement('option');
      opt.value = demoId;
      opt.textContent = demoName;
      dropdown.appendChild(opt);
      dropdown.disabled = false;
      return;
    }
    products.forEach((p) => {
      const opt = document.createElement("option");
      opt.value       = p.id;
      opt.textContent = p.name;
      dropdown.appendChild(opt);
    });
    dropdown.disabled = false;
  } catch (err) {
    dropdown.innerHTML = `<option value="">Failed to load products</option>`;
  }
}

// ─── Coupon submit ────────────────────────────────────────────────────────────
async function handleCouponSubmit(e) {
  e.preventDefault();
  const code       = document.getElementById("coupon-code")?.value.trim().toUpperCase();
  const discount   = parseInt(document.getElementById("discount")?.value);
  const productId  = document.getElementById("couponProduct")?.value;
  const expiryDate = document.getElementById("couponExpiry")?.value;
  const usageLimit = parseInt(document.getElementById("couponLimit")?.value) || 0;

  if (!code)                          return alert("Please enter a coupon code.");
  if (discount < 1 || discount > 100) return alert("Discount must be 1–100%.");
  if (!productId)                     return alert("Please select a product.");

  try {
    const data = await StoreManager.apiFetch("/coupons", {
      method: "POST",
      body: JSON.stringify({ code, discount_percent: discount, product_id: productId, expiry_date: expiryDate || null, usage_limit: usageLimit })
    });
    if (data.status === 'error') { alert(data.message); return; }
    alert(`Coupon created!\nCode: ${code}  |  Discount: ${discount}%`);
    e.target.reset();
    document.getElementById("coupons-modal").style.display = "none";
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// ─── Sales Chart — store-scoped ───────────────────────────────────────────────
async function renderSalesChart() {
  if (typeof Chart === "undefined") { alert("Chart library not loaded."); return; }

  const ctx = document.getElementById("salesChart")?.getContext("2d");
  if (!ctx) return;

  if (window._salesChartInstance) {
    window._salesChartInstance.destroy();
    window._salesChartInstance = null;
  }

  let monthlySales = new Array(12).fill(0);

  try {
    const data   = await StoreManager.apiFetch("/seller/orders?limit=200");
    const orders = data?.data?.orders || [];
    orders.forEach((o) => {
      if (o.createdAt && o.totalAmount) {
        const month = new Date(o.createdAt).getMonth();
        monthlySales[month] += Number(o.totalAmount);
      }
    });
  } catch (err) {
    console.warn("Sales chart: could not fetch orders.", err);
  }

  const labels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  window._salesChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Monthly Sales (₦)",
        data: monthlySales,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.1)",
        fill: true, tension: 0.35,
        pointRadius: 5, pointHoverRadius: 7,
        pointBackgroundColor: "#3b82f6", pointBorderColor: "#fff", pointBorderWidth: 2,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { display: true, position: "top" },
        title: { display: true, text: `Sales — ${StoreManager.getActiveStore()?.business_name || 'Store'}` },
        tooltip: { callbacks: { label: (ctx) => " ₦" + Number(ctx.parsed.y).toLocaleString() } },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => "₦" + Number(v).toLocaleString() },
          title: { display: true, text: "Sales (₦)" },
        },
        x: { title: { display: true, text: "Month" } },
      },
    },
  });
}
