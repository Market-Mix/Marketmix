const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('./store-analytics.js'), 'utf8');

function createAnalyticsSandbox(storeManager) {
  const elements = new Map();
  const document = {
    addEventListener() {},
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, { textContent: '' });
      return elements.get(id);
    }
  };
  const sandbox = {
    document,
    window: { StoreManager: storeManager },
    URLSearchParams,
    Date,
    Intl,
    console: { error() {} }
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'sellers/store-analytics.js' });
  return { sandbox, elements };
}

test('store view analytics displays the live zero count and sends the active-store header', async () => {
  const apiCalls = [];
  const { sandbox, elements } = createAnalyticsSandbox({
    requireActiveStore: async () => ({ id: 'store-a' }),
    apiFetch: async (path, options) => {
      apiCalls.push({ path, options });
      return {
        status: 'success',
        data: { storeId: 'store-a', storeViews: 0 }
      };
    }
  });

  elements.set('store-view-visibility-value', { textContent: '' });
  elements.set('store-view-visibility-description', { textContent: '' });
  sandbox.loadStoreViewAnalytics();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(apiCalls.length, 1);
  assert.equal(apiCalls[0].path, '/seller/stores/store-view-analytics');
  assert.equal(apiCalls[0].options.headers['X-Store-Id'], 'store-a');
  assert.equal(elements.get('store-view-value').textContent, '0');
  assert.equal(elements.get('store-view-visibility-value').textContent, '0');
  assert.match(elements.get('store-view-description').textContent, /No visits recorded/);
});

test('store view analytics displays an error state when the request fails', async () => {
  const { sandbox, elements } = createAnalyticsSandbox({
    requireActiveStore: async () => ({ id: 'store-a' }),
    apiFetch: async () => { throw new Error('request failed'); }
  });

  await sandbox.loadStoreViewAnalytics();

  assert.equal(elements.get('store-view-value').textContent, 'Unavailable');
  assert.match(elements.get('store-view-status').textContent, /refreshing/);
});

test('late active-store resolution cannot issue a stale request or overwrite the newer store count', async () => {
  let resolveFirstStore;
  const apiCalls = [];
  let activeStoreRequestCount = 0;
  const { sandbox, elements } = createAnalyticsSandbox({
    requireActiveStore: () => {
      activeStoreRequestCount += 1;
      if (activeStoreRequestCount === 1) {
        return new Promise((resolve) => { resolveFirstStore = resolve; });
      }
      return Promise.resolve({ id: 'store-b' });
    },
    apiFetch: async (path, options) => {
      apiCalls.push(options.headers['X-Store-Id']);
      return {
        status: 'success',
        data: { storeId: 'store-b', storeViews: 12 }
      };
    }
  });

  const firstRequest = sandbox.loadStoreViewAnalytics();
  const secondRequest = sandbox.loadStoreViewAnalytics();
  await secondRequest;
  resolveFirstStore({ id: 'store-a' });
  await firstRequest;

  assert.deepEqual(apiCalls, ['store-b']);
  assert.equal(elements.get('store-view-value').textContent, '12');
});
