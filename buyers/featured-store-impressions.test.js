const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('./buyers homepage.js'), 'utf8');
const trackingFunction = source.match(
  /async function trackFeaturedStoreImpression\(storeId\) \{[\s\S]*?\n  \}/
)?.[0];
const observerFunction = source.match(
  /function observeFeaturedStoreCards\(container\) \{[\s\S]*?\n  \}/
)?.[0];

test('visible featured store is tracked once and retry reuses its request ID', async () => {
  assert.ok(trackingFunction);
  assert.ok(observerFunction);
  const calls = [];
  let uuidCalls = 0;
  const observers = [];
  class MockIntersectionObserver {
    constructor(callback) {
      this.callback = callback;
      this.observed = [];
      this.disconnected = false;
      observers.push(this);
    }
    observe(target) { this.observed.push(target); }
    unobserve(target) { this.observed = this.observed.filter((item) => item !== target); }
    disconnect() { this.disconnected = true; }
  }

  const card = { dataset: { storeId: 'store-a' } };
  const sandbox = {
    API: 'https://marketmix-backend.onrender.com/api',
    featuredStoreImpressionsStarted: new Set(),
    featuredStoreImpressionRequestIds: new Map(),
    featuredStoreObserver: null,
    crypto: { randomUUID: () => { uuidCalls += 1; return 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; } },
    IntersectionObserver: MockIntersectionObserver,
    encodeURIComponent,
    console: { warn() {} },
    fetch: async (url, options) => {
      calls.push({ url, options });
      if (calls.length === 1) throw new Error('temporary network failure');
      return { ok: true };
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(`${trackingFunction}\n${observerFunction}`, sandbox);

  const container = { querySelectorAll: () => [card] };
  sandbox.observeFeaturedStoreCards(container);
  sandbox.observeFeaturedStoreCards(container);
  assert.equal(observers[0].disconnected, true);
  const observer = observers[1];
  observer.callback([{ target: card, isIntersecting: true, intersectionRatio: 0.6 }]);
  observer.callback([{ target: card, isIntersecting: true, intersectionRatio: 0.8 }]);
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(uuidCalls, 1);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, calls[1].url);
  assert.deepEqual(
    calls.map(({ options }) => JSON.parse(options.body).request_id),
    ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa']
  );
});

test('featured store impression waits until at least half the card is visible', async () => {
  assert.ok(trackingFunction);
  assert.ok(observerFunction);
  const calls = [];
  class MockIntersectionObserver {
    constructor(callback) { this.callback = callback; }
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  const card = { dataset: { storeId: 'store-a' } };
  const sandbox = {
    API: 'https://marketmix-backend.onrender.com/api',
    featuredStoreImpressionsStarted: new Set(),
    featuredStoreImpressionRequestIds: new Map(),
    featuredStoreObserver: null,
    crypto: { randomUUID: () => 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
    IntersectionObserver: MockIntersectionObserver,
    encodeURIComponent,
    console: { warn() {} },
    fetch: async (url, options) => { calls.push({ url, options }); return { ok: true }; }
  };
  vm.createContext(sandbox);
  vm.runInContext(`${trackingFunction}\n${observerFunction}`, sandbox);
  sandbox.observeFeaturedStoreCards({ querySelectorAll: () => [card] });

  sandbox.featuredStoreObserver.callback([
    { target: card, isIntersecting: true, intersectionRatio: 0.49 }
  ]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.length, 0);

  sandbox.featuredStoreObserver.callback([
    { target: card, isIntersecting: true, intersectionRatio: 0.5 }
  ]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.length, 1);
});
