const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('./product-page.js'), 'utf8');
const trackingFunction = source.match(
  /function trackProductView\(productId, storeId = getStoreIdFromParams\(\)\) \{[\s\S]*?\n\}/
)?.[0];

test('product view retries reuse the UUID and repeated initialization shares the same request', async () => {
  assert.ok(trackingFunction);
  const requests = [];
  let uuidCalls = 0;
  const sandbox = {
    crypto: { randomUUID: () => { uuidCalls += 1; return 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'; } },
    fetch: async (url, options) => {
      requests.push({ url, options });
      if (requests.length === 1) throw new Error('temporary network failure');
      return { ok: true };
    },
    scopedHeaders: (headers, storeId) => ({ ...headers, ...(storeId ? { 'X-Store-Id': storeId } : {}) }),
    console: { warn() {} },
    encodeURIComponent,
    JSON
  };
  vm.createContext(sandbox);
  vm.runInContext(`
    const API_BASE = 'https://marketmix-backend.onrender.com/api';
    let productViewTrackingPromise = null;
    ${trackingFunction}
  `, sandbox);

  const firstCall = sandbox.trackProductView('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'store-a');
  const duplicateInitialization = sandbox.trackProductView('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'store-a');
  await Promise.all([firstCall, duplicateInitialization]);

  assert.equal(uuidCalls, 1);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, requests[1].url);
  assert.deepEqual(
    requests.map(({ options }) => JSON.parse(options.body).request_id),
    ['cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc']
  );
  assert.equal(requests[0].options.headers['X-Store-Id'], 'store-a');
});

test('mock fallback products are not sent to product-view tracking', () => {
  assert.match(source, /if \(isRealProduct\) \{\s*const trackingStoreId = product\.store_id/);
  assert.match(source, /if \(productResult\.status === 'fulfilled'\)[\s\S]*?isRealProduct = true/);
});
