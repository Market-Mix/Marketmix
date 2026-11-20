const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('./store-analytics.js'), 'utf8');

function createAnalyticsSandbox(apiFetch) {
  const elements = new Map();
  const dateFilter = { value: '30days' };
  const document = {
    addEventListener() {},
    getElementById(id) {
      if (id === 'sales-performance-chart') return null;
      if (id === 'date-filter') return dateFilter;
      if (!elements.has(id)) elements.set(id, { textContent: '', innerHTML: '' });
      return elements.get(id);
    },
    querySelector() { return null; }
  };
  const sandbox = {
    document,
    window: {
      StoreManager: {
        requireActiveStore: async () => ({ id: 'store-a' }),
        getActiveStoreId: () => 'store-a',
        apiFetch
      },
      addEventListener() {}
    },
    URLSearchParams,
    Date,
    Intl,
    console: { error() {} },
    setImmediate
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'sellers/store-analytics.js' });
  return { sandbox, elements, dateFilter };
}

function validResponse(path) {
  const url = new URL(path, 'https://marketmix.example');
  const range = url.searchParams.get('range');
  if (path.startsWith('/seller/stores/monthly-analytics')) {
    return {
      status: 'success',
      data: {
        storeId: 'store-a',
        range,
        netMonthlySales: 0,
        monthlyOrderCount: 0,
        periodHistory: []
      }
    };
  }
  if (path.startsWith('/seller/stores/review-analytics')) {
    return { status: 'success', data: { storeId: 'store-a', range, totalReviews: 0, averageRating: 0 } };
  }
  if (path.startsWith('/seller/stores/refund-analytics')) {
    return { status: 'success', data: { storeId: 'store-a', range, refundReportsReceived: 0 } };
  }
  if (path.startsWith('/seller/stores/product-view-analytics')) {
    return { status: 'success', data: { storeId: 'store-a', range, totalProductViews: 0, products: [] } };
  }
  if (path.startsWith('/seller/stores/store-view-analytics')) {
    return { status: 'success', data: { storeId: 'store-a', range, storeViews: 0 } };
  }
  if (path.startsWith('/seller/stores/featured-store-impression-analytics')) {
    return { status: 'success', data: { storeId: 'store-a', range, impressionCount: 0 } };
  }
  throw new Error(`Unexpected analytics endpoint: ${path}`);
}

test('all four date ranges are sent to every supported live analytics endpoint', async () => {
  const calls = [];
  const { sandbox, dateFilter, elements } = createAnalyticsSandbox(async (path) => {
    calls.push(path);
    return validResponse(path);
  });

  for (const [range, label] of [
    ['7days', 'Last 7 days'],
    ['30days', 'Last 30 days'],
    ['90days', 'Last 90 days'],
    ['year', 'This year']
  ]) {
    dateFilter.value = range;
    await sandbox.handleAnalyticsRangeChange();

    const currentCalls = calls.slice(-6);
    assert.equal(currentCalls.length, 6);
    assert.ok(currentCalls.every((path) => new URL(path, 'https://marketmix.example').searchParams.get('range') === range));
    assert.equal(elements.get('monthly-sales-metric-title').textContent, `Sales — ${label}`);
    assert.equal(elements.get('monthly-orders-metric-title').textContent, `Orders — ${label}`);
  }

  assert.equal(calls.length, 24);
  assert.ok(calls.every((path) => !path.includes('/followers')));
});

test('changing ranges while sales requests are pending prevents an old response overwriting the new range', async () => {
  let resolveFirstRequest;
  const requests = [];
  const { sandbox, dateFilter, elements } = createAnalyticsSandbox((path) => {
    const range = new URL(path, 'https://marketmix.example').searchParams.get('range');
    requests.push(range);
    if (range === '7days') {
      return new Promise((resolve) => { resolveFirstRequest = resolve; });
    }
    return Promise.resolve({
      status: 'success',
      data: {
        storeId: 'store-a',
        range,
        netMonthlySales: 900,
        monthlyOrderCount: 3,
        periodHistory: [{
          day: '2026-11-20',
          monthlyOrderCount: 3,
          grossMonthlySales: 990,
          netMonthlySales: 900
        }]
      }
    });
  });

  vm.runInContext(`
    loadStoreReviewAnalytics = () => Promise.resolve();
    loadStoreRefundAnalytics = () => Promise.resolve();
    loadStoreProductViewAnalytics = () => Promise.resolve();
    loadStoreViewAnalytics = () => Promise.resolve();
    loadFeaturedStoreImpressionAnalytics = () => Promise.resolve();
    selectedAnalyticsRange = '7days';
  `, sandbox);

  const oldRequest = sandbox.loadMonthlyAnalytics();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(requests, ['7days']);

  dateFilter.value = 'year';
  await sandbox.handleAnalyticsRangeChange();
  assert.deepEqual(requests, ['7days', 'year']);
  assert.equal(elements.get('monthly-sales-value').textContent, '₦900');

  resolveFirstRequest({
    status: 'success',
    data: {
      storeId: 'store-a',
      range: '7days',
      netMonthlySales: 700,
      monthlyOrderCount: 2,
      periodHistory: [{
        day: '2026-11-19',
        monthlyOrderCount: 2,
        grossMonthlySales: 770,
        netMonthlySales: 700
      }]
    }
  });
  await oldRequest;

  assert.equal(elements.get('monthly-sales-value').textContent, '₦900');
  assert.equal(elements.get('monthly-orders-value').textContent, '3');
  assert.equal(elements.get('monthly-sales-metric-title').textContent, 'Sales — This year');
});
