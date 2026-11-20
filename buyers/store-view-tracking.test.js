const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('./store-id.js'), 'utf8');
const storeId = '11111111-1111-4111-8111-111111111111';

test('repeated store profile initialization tracks one page visit only', async () => {
  const trackingRequests = [];
  const document = { addEventListener() {} };
  const sandbox = {
    URLSearchParams,
    encodeURIComponent,
    crypto: { randomUUID: () => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    document,
    window: { location: { search: `?store=${storeId}`, pathname: '/buyers/store-id.html' } },
    localStorage: { getItem: () => '', removeItem() {} },
    fetch: async (url, options) => {
      if (url.endsWith('/view')) {
        trackingRequests.push({ url, options });
        return { ok: true };
      }
      return {
        ok: true,
        json: async () => ({
          status: 'success',
          data: { store: { id: storeId, businessName: 'Test Store' } }
        })
      };
    },
    console: { error() {}, warn() {} }
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'buyers/store-id.js' });
  sandbox.renderStoreInfo = () => {};

  await Promise.all([
    sandbox.loadStoreProfile(),
    sandbox.loadStoreProfile()
  ]);
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(trackingRequests.length, 1);
  assert.equal(trackingRequests[0].options.method, 'POST');
  assert.equal(trackingRequests[0].options.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(trackingRequests[0].options.body), {
    request_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  });
  assert.match(trackingRequests[0].url, new RegExp(`/public/${storeId}/view$`));
});

test('store tracking reuses the same request ID for a retry', async () => {
  const requests = [];
  let uuidCalls = 0;
  const sandbox = {
    URLSearchParams,
    encodeURIComponent,
    crypto: { randomUUID: () => { uuidCalls += 1; return 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'; } },
    document: { addEventListener() {} },
    window: { location: { search: `?store=${storeId}`, pathname: '/buyers/store-id.html' } },
    localStorage: { getItem: () => '', removeItem() {} },
    fetch: async (url, options) => {
      requests.push(options);
      if (requests.length === 1) throw new Error('temporary network failure');
      return { ok: true };
    },
    console: { error() {}, warn() {} }
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'buyers/store-id.js' });

  await sandbox.trackStoreVisit(storeId);

  assert.equal(uuidCalls, 1);
  assert.equal(requests.length, 2);
  assert.deepEqual(
    requests.map((options) => JSON.parse(options.body).request_id),
    ['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb']
  );
});
