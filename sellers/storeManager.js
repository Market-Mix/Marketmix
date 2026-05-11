/**
 * storeManager.js — MarketMix
 *
 * Manages the active store selection across all seller pages.
 * Include this script on every seller page BEFORE any page-specific JS.
 *
 * Usage:
 *   StoreManager.getActiveStoreId()           → 'uuid' | null
 *   StoreManager.setActiveStore(store)        → persists to localStorage
 *   StoreManager.getActiveStore()             → full store object | null
 *   StoreManager.apiFetch(path, opts)         → fetch with X-Store-Id header auto-added
 *   StoreManager.loadStores()                 → fetch + cache stores from API
 *   StoreManager.requireActiveStore()         → redirect to view-store.html if none selected
 */

const StoreManager = (() => {
  const API_BASE        = 'https://marketmix-backend.onrender.com/api';
  const ACTIVE_STORE_KEY = 'mm_active_store';   // localStorage key (full store object)
  const STORES_CACHE_KEY = 'mm_stores_cache';   // localStorage key (array of stores)

  /* ── Token ────────────────────────────────────────────────────────────── */
  function getToken() {
    return localStorage.getItem('token') || '';
  }

  /* ── Active store ─────────────────────────────────────────────────────── */
  function getActiveStore() {
    try {
      return JSON.parse(localStorage.getItem(ACTIVE_STORE_KEY) || 'null');
    } catch (_) { return null; }
  }

  function getActiveStoreId() {
    return getActiveStore()?.id || null;
  }

  function setActiveStore(store) {
    localStorage.setItem(ACTIVE_STORE_KEY, JSON.stringify(store));
    // Dispatch event so any listener on the page can react
    window.dispatchEvent(new CustomEvent('storeChanged', { detail: store }));
  }

  /* ── Stores cache ─────────────────────────────────────────────────────── */
  function getCachedStores() {
    try {
      return JSON.parse(localStorage.getItem(STORES_CACHE_KEY) || 'null');
    } catch (_) { return null; }
  }

  function setCachedStores(stores) {
    localStorage.setItem(STORES_CACHE_KEY, JSON.stringify(stores));
  }

  /* ── Load stores from API ─────────────────────────────────────────────── */
  async function loadStores(forceRefresh = false) {
    if (!forceRefresh) {
      const cached = getCachedStores();
      if (cached) return cached;
    }

    const token = getToken();
    if (!token) return [];

    try {
      const res  = await fetch(`${API_BASE}/seller/stores`, {
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) return [];
      const data   = await res.json();
      const stores = data?.data?.stores || [];
      setCachedStores(stores);
      return stores;
    } catch (_) { return []; }
  }

  /* ── Ensure an active store is selected ──────────────────────────────── */
  /**
   * Call on pages that need an active store.
   * If none is selected, redirects to view-store.html.
   * If only one store exists, auto-selects it.
   */
  async function requireActiveStore() {
    let active = getActiveStore();
    if (active) return active;

    // Try to auto-select if there's exactly one store
    const stores = await loadStores();
    if (stores.length === 1) {
      setActiveStore(stores[0]);
      return stores[0];
    }

    if (stores.length === 0) {
      // No store yet — send to setup
      window.location.href = 'setup-store.html';
      return null;
    }

    // Multiple stores, none selected — send to picker
    window.location.href = 'view-store.html';
    return null;
  }

  /* ── apiFetch — auto-attaches X-Store-Id ─────────────────────────────── */
  async function apiFetch(path, opts = {}) {
    const token   = getToken();
    const storeId = getActiveStoreId();

    opts.headers = {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${token}`,
      ...(storeId ? { 'X-Store-Id': storeId } : {}),
      ...(opts.headers || {}),
    };

    const res = await fetch(`${API_BASE}${path}`, opts);

    if (res.status === 401) {
      localStorage.removeItem('token');
      window.location.href = 'sellers login.html';
      throw new Error('Unauthorized');
    }

    return res.json();
  }

  /* ── Render a store badge/switcher in the navbar ─────────────────────── */
  /**
   * Call after DOM loaded. Looks for element with id="storeSwitcher".
   * Renders active store name + a "Switch" link.
   */
  async function renderStoreSwitcher(containerId = 'storeSwitcher') {
    const el = document.getElementById(containerId);
    if (!el) return;

    const stores = await loadStores();
    const active = getActiveStore();

    if (!stores.length) {
      el.innerHTML = '';
      return;
    }

    const activeName = active?.business_name || 'Select store';
    const logo       = active?.store_logo_url || '';

    el.innerHTML = `
      <div class="store-switcher-badge" title="Active store">
        ${logo ? `<img src="${logo}" alt="logo" class="store-badge-logo">` : ''}
        <span class="store-badge-name">${activeName}</span>
        ${stores.length > 1
          ? `<a href="view-store.html" class="store-badge-switch" title="Switch store">⇄</a>`
          : ''
        }
      </div>
    `;
  }

  /* ── Public API ───────────────────────────────────────────────────────── */
  return {
    getToken,
    getActiveStore,
    getActiveStoreId,
    setActiveStore,
    loadStores,
    requireActiveStore,
    apiFetch,
    renderStoreSwitcher,
    getCachedStores,
    setCachedStores,
  };
})();

// Make available globally
window.StoreManager = StoreManager;