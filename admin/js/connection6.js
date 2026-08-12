// Connection 6 client script: fetch refund & debt summary and populate dashboard values
(async function () {
  function log(...args) { console.log('[Connection 6]', ...args); }

  function formatCurrency(value) {
    const amount = Number(value || 0);
    return `₦${amount.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
  }

  function findLabelElement(labelText) {
    const nodes = Array.from(document.querySelectorAll('p'));
    return nodes.find(n => (n.textContent || '').trim() === labelText) || null;
  }

  function setMetricByLabel(labelText, valueText) {
    const labelEl = findLabelElement(labelText);
    if (!labelEl) return false;
    // number element is usually the next sibling p with large text
    let parent = labelEl.parentElement;
    if (!parent) return false;
    const numberEl = parent.querySelector('.text-2xl');
    if (numberEl) {
      numberEl.textContent = valueText;
      return true;
    }
    // fallback: try nextElementSibling
    const sibling = labelEl.nextElementSibling;
    if (sibling && (sibling.className || '').includes('text-2xl')) {
      sibling.textContent = valueText;
      return true;
    }
    return false;
  }

  async function load() {
    try {
      const base = window.ADMIN_API_BASE || (window.location.protocol === 'file:' ? 'http://localhost:5000/api' : 'https://marketmix-backend.onrender.com/api');
      const res = await fetch(`${base}/admin/refund-debt-summary`, { headers: (window.getAdminAuthHeaders && getAdminAuthHeaders()) || {} });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        log('API request failed:', body?.message || res.statusText);
        return;
      }

      const data = body?.data || {};
      const refunds = data.refunds || {};
      const debt = data.debt || {};

      // Map refund metrics
      setMetricByLabel('Open Cases', String(refunds.openCases ?? 0));
      setMetricByLabel('Awaiting Seller Response', String(refunds.awaitingSellerResponse ?? 0));
      setMetricByLabel('Awaiting Buyer Response', String(refunds.awaitingBuyerResponse ?? 0));
      setMetricByLabel('Awaiting Decision', String(refunds.awaitingDecision ?? 0));
      setMetricByLabel('Refund Processing', String(refunds.refundProcessing ?? 0));
      setMetricByLabel('Completed Today', String(refunds.completedToday ?? 0));

      // Map debt metrics (format currency where appropriate)
      setMetricByLabel('Outstanding Debt', formatCurrency(debt.outstandingDebt));
      setMetricByLabel('Sellers With Debt', String(debt.sellersWithDebt ?? 0));
      setMetricByLabel('Recovered This Month', formatCurrency(debt.recoveredThisMonth));
      setMetricByLabel('Unrecovered Debt', formatCurrency(debt.unrecoveredDebt));

      log('Connected and updated dashboard metrics.');
    } catch (err) {
      log('Error loading refund & debt summary:', err.message || err);
    }
  }

  // Wait for the dashboard DOM to be rendered
  function waitForDashboard(timeout = 5000) {
    return new Promise((resolve) => {
      const start = Date.now();
      const interval = setInterval(() => {
        const hasDashboard = document.querySelector('h2') && document.querySelector('main');
        if (hasDashboard) {
          clearInterval(interval);
          resolve(true);
        } else if (Date.now() - start > timeout) {
          clearInterval(interval);
          resolve(false);
        }
      }, 150);
    });
  }

  const ready = await waitForDashboard(3000);
  if (!ready) log('Dashboard DOM not detected; will still try to update when available.');
  // Try loading immediately and again after a short delay to catch late renderers
  load();
  setTimeout(load, 800);
})();
