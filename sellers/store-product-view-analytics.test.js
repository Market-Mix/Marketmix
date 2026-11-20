const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('./store-analytics.js'), 'utf8');

function createAnalyticsSandbox(apiFetch) {
  const elements = new Map();
  const document = {
    addEventListener() {},
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, { textContent: '', innerHTML: '' });
      return elements.get(id);
    }
  };
  const sandbox = {
    document,
    window: {
      StoreManager: {
        requireActiveStore: async () => ({ id: 'store-a' }),
        apiFetch
      }
    },
    URLSearchParams,
    Date,
    Intl,
    console: { error() {} }
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'sellers/store-analytics.js' });
  return { sandbox, elements };
}

test('Store Visibility product views use the live active-store analytics count', async () => {
  const apiCalls = [];
  const { sandbox, elements } = createAnalyticsSandbox(async (path, options) => {
    apiCalls.push({ path, options });
    return {
      status: 'success',
      data: {
        storeId: 'store-a',
        range: '30days',
        totalProductViews: 37,
        products: [{ productId: 'product-a', productName: 'Product A', views: 37 }]
      }
    };
  });

  sandbox.renderVisibilityCards();
  assert.match(elements.get('visibility-metrics').innerHTML, /id="product-view-visibility-value">Loading\.\.\./);

  await sandbox.loadStoreProductViewAnalytics();

  assert.equal(apiCalls.length, 1);
  assert.equal(apiCalls[0].path, '/seller/stores/product-view-analytics?range=30days');
  assert.equal(apiCalls[0].options.headers['X-Store-Id'], 'store-a');
  assert.equal(elements.get('product-view-value').textContent, '37');
  assert.equal(elements.get('product-view-visibility-value').textContent, '37');
  assert.match(elements.get('product-view-visibility-description').textContent, /Product views for last 30 days/);
});

test('Store Visibility product views show an unavailable state if analytics fail', async () => {
  const { sandbox, elements } = createAnalyticsSandbox(async () => {
    throw new Error('request failed');
  });
  sandbox.renderVisibilityCards();

  await sandbox.loadStoreProductViewAnalytics();

  assert.equal(elements.get('product-view-value').textContent, 'Unavailable');
  assert.equal(elements.get('product-view-visibility-value').textContent, 'Unavailable');
  assert.match(elements.get('product-view-visibility-description').textContent, /unavailable/);
});
