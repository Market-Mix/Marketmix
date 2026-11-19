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
  assert.match(trackingRequests[0].url, new RegExp(`/public/${storeId}/view$`));
});
