import assert from 'node:assert/strict';
import test from 'node:test';

// Import the actual browser module with tiny local interfaces. No DOM dependency
// or real network/storage is needed to control pending Cache API and fetch work.
const turn = () => new Promise((resolve) => setImmediate(resolve));
let sequence = 0;

function storage() {
  const values = new Map([
    ['drip-council:synthetic', 'clear'],
    ['drip-councilish:synthetic', 'preserve'],
    ['unrelated', 'preserve']
  ]);
  return {
    values,
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    removeItem(key) { values.delete(key); }
  };
}

async function page(t, options = {}) {
  const descriptors = new Map(['window', 'document', 'fetch'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const timers = new Map();
  const gates = [];
  let time = 0;
  let timerSequence = 0;
  const h = {
    navigations: [], fetches: [], deletedCaches: [], cacheListings: 0, historyChanges: [],
    local: storage(), session: storage(), timers,
    blockNavigation: false,
    hold(value) {
      let resolve;
      const promise = new Promise((done) => { resolve = done; });
      const gate = { promise, resolve: (next = value) => resolve(next) };
      gates.push(gate);
      return gate;
    },
    async settle() { await turn(); await turn(); },
    tick(milliseconds) {
      const target = time + milliseconds;
      while (true) {
        const next = [...timers].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        timers.delete(next[0]);
        time = next[1].at;
        next[1].callback();
      }
      time = target;
    }
  };
  h.buttons = Array.from({ length: 2 }, () => {
    const attributes = new Map();
    const listeners = new Map();
    return {
      attributes, listeners, disabled: false, textContent: 'Refresh this version',
      setAttribute(name, value) { attributes.set(name, value); },
      removeAttribute(name) { attributes.delete(name); },
      addEventListener(name, listener) { listeners.set(name, listener); }
    };
  });
  h.click = (index = 0) => h.buttons[index].listeners.get('click')();
  const href = options.href ?? 'https://drip.example.test/curriculum.html?case=case_015&tag=one&tag=two#run';
  h.window = {
    location: {
      href, origin: new URL(href).origin,
      replace(url) {
        h.navigations.push(String(url));
        if (h.blockNavigation) throw new Error('Synthetic blocked navigation');
      }
    },
    history: {
      state: { synthetic: true },
      replaceState(state, title, path) {
        h.historyChanges.push({ state, title, path });
        h.window.location.href = new URL(path, h.window.location.href).href;
      }
    },
    localStorage: h.local, sessionStorage: h.session,
    setTimeout(callback, milliseconds) {
      const id = ++timerSequence;
      timers.set(id, { callback, at: time + milliseconds, milliseconds });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
    caches: {
      keys() {
        h.cacheListings += 1;
        return options.cacheKeys ? options.cacheKeys(h) : Promise.resolve(['drip-council', 'drip-council-old', 'drip-councilish', 'unrelated-cache']);
      },
      delete(name) {
        h.deletedCaches.push(name);
        return options.cacheDelete ? options.cacheDelete(h, name) : Promise.resolve(true);
      }
    }
  };
  const assets = options.assets ?? [
    { href: 'https://drip.example.test/style.css?v=2.2.0' },
    { href: 'https://drip.example.test/style.css?v=2.2.0' },
    { src: 'https://drip.example.test/scripts/site-refresh.mjs?v=2.2.0' },
    { src: 'https://external.example.test/unrelated.js' }
  ];
  const document = { querySelectorAll: (selector) => selector === '[data-site-refresh]' ? h.buttons : assets };
  const fetch = (url, config) => {
    const call = { url: String(url), config };
    h.fetches.push(call);
    return options.fetch ? options.fetch(h, call) : Promise.resolve({ ok: true });
  };
  for (const [key, value] of Object.entries({ window: h.window, document, fetch })) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  t.after(async () => {
    for (const gate of gates) gate.resolve();
    h.tick(10000);
    await h.settle();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const source = new URL('../scripts/site-refresh.mjs', import.meta.url);
  source.search = `?v=2.2.0&synthetic-case=${++sequence}`;
  await import(source.href);
  return h;
}

function assertNavigation(h) {
  assert.equal(h.navigations.length, 1);
  const before = new URL(h.window.location.href);
  const after = new URL(h.navigations[0]);
  assert.equal(after.origin, before.origin);
  assert.equal(after.pathname, before.pathname);
  assert.equal(after.hash, before.hash);
  assert.ok(after.searchParams.get('refresh'));
  before.searchParams.delete('refresh');
  after.searchParams.delete('refresh');
  assert.deepEqual([...after.searchParams], [...before.searchParams]);
}

function assertScopedCleanup(h) {
  for (const area of [h.local, h.session]) {
    assert.equal(area.values.has('drip-council:synthetic'), false);
    assert.equal(area.values.get('drip-councilish:synthetic'), 'preserve');
    assert.equal(area.values.get('unrelated'), 'preserve');
  }
  assert.ok(h.deletedCaches.every((name) => ['drip-council', 'drip-council-old'].includes(name)));
  for (const call of h.fetches) {
    assert.equal(new URL(call.url).origin, h.window.location.origin);
    assert.equal(call.config.cache, 'reload');
    assert.equal(call.config.credentials, 'same-origin');
    assert.equal(call.config.headers['X-Drip-Refresh'], '2.2.0');
  }
}

test('healthy refresh preserves the current URL, scopes cleanup, deduplicates assets and navigates once', async (t) => {
  const h = await page(t);
  h.click();
  assert.equal(h.buttons[0].disabled, true);
  assert.equal(h.buttons[0].attributes.get('aria-busy'), 'true');
  assert.equal(h.buttons[0].textContent, 'Refreshing…');
  await h.settle();
  assertNavigation(h);
  assertScopedCleanup(h);
  assert.deepEqual(h.deletedCaches, ['drip-council', 'drip-council-old']);
  assert.equal(h.fetches.length, 2);
  assert.equal(h.timers.size, 0);
  h.tick(10000);
  await h.settle();
  assert.equal(h.navigations.length, 1);
});

for (const phase of ['cache listing', 'cache deletion', 'asset request']) {
  test(`held ${phase} cannot exceed the shared deadline or start work after expiry`, async (t) => {
    let held;
    const options = phase === 'cache listing'
      ? { cacheKeys: (h) => (held ??= h.hold(['drip-council', 'drip-council-old'])).promise }
      : phase === 'cache deletion'
        ? { cacheDelete: (h) => (held ??= h.hold(true)).promise }
        : { fetch: (h) => (held ??= h.hold({ ok: true })).promise };
    const h = await page(t, options);
    h.click();
    await h.settle();
    assert.equal(h.navigations.length, 0);
    assert.equal(h.cacheListings, 1);
    assert.deepEqual([...h.timers.values()].map((timer) => timer.milliseconds), [3000]);
    h.tick(2999);
    await h.settle();
    assert.equal(h.navigations.length, 0);
    h.tick(1);
    await h.settle();
    assertNavigation(h);
    assertScopedCleanup(h);
    assert.equal(h.timers.size, 0);
    if (phase === 'asset request') {
      assert.equal(h.fetches.length, 2);
      assert.ok(h.fetches.every((call) => call.config.signal.aborted));
    } else assert.equal(h.fetches.length, 0);
    if (phase === 'cache listing') assert.equal(h.deletedCaches.length, 0);
    const counts = [h.fetches.length, h.deletedCaches.length];
    held.resolve();
    await h.settle();
    h.click(1);
    await h.settle();
    assert.deepEqual([h.fetches.length, h.deletedCaches.length], counts, 'late cache completion must not begin a new phase');
    assert.equal(h.navigations.length, 1);
    assert.equal(h.cacheListings, 1);
  });
}

test('cache work and asset warming share one deadline instead of restarting the budget', async (t) => {
  let cacheGate;
  let fetchGate;
  const h = await page(t, {
    cacheKeys: (h) => (cacheGate ??= h.hold(['drip-council'])).promise,
    fetch: (h) => (fetchGate ??= h.hold({ ok: true })).promise
  });
  h.click();
  await h.settle();
  h.tick(2000);
  cacheGate.resolve();
  await h.settle();
  assert.equal(h.fetches.length, 2);
  h.tick(999);
  await h.settle();
  assert.equal(h.navigations.length, 0);
  h.tick(1);
  await h.settle();
  assertNavigation(h);
  assert.ok(h.fetches.every((call) => call.config.signal.aborted));
  fetchGate.resolve();
});

test('queued clicks and a second control share the active refresh', async (t) => {
  const h = await page(t, { cacheKeys: (h) => h.hold(['drip-council']).promise });
  h.click();
  h.click();
  h.click(1);
  await h.settle();
  assert.equal(h.cacheListings, 1);
  assert.equal(h.timers.size, 1);
  h.tick(3000);
  await h.settle();
  assertNavigation(h);
  h.click(1);
  assert.equal(h.cacheListings, 1);
});

for (const phase of ['cache listing', 'cache deletion', 'asset request']) {
  test(`rejected ${phase} still falls through to one reload`, async (t) => {
    const reject = () => Promise.reject(new Error('Synthetic best-effort failure'));
    const h = await page(t, phase === 'cache listing' ? { cacheKeys: reject }
      : phase === 'cache deletion' ? { cacheDelete: reject } : { fetch: reject });
    h.click();
    await h.settle();
    assertNavigation(h);
    assertScopedCleanup(h);
    assert.equal(h.timers.size, 0);
  });
}

test('deadline aborts a fetch that observes its signal without causing a second navigation', async (t) => {
  let aborts = 0;
  const h = await page(t, { fetch: (_h, call) => new Promise((_resolve, reject) => {
    call.config.signal.addEventListener('abort', () => { aborts += 1; reject(new Error('Synthetic aborted fetch')); }, { once: true });
  }) });
  h.click();
  await h.settle();
  h.tick(3000);
  await h.settle();
  assert.equal(aborts, 2);
  assertNavigation(h);
  assert.equal(h.timers.size, 0);
});

test('unavailable storage and malformed asset URLs each use the single reload fallback', async (t) => {
  for (const kind of ['storage', 'asset']) await t.test(kind, async (t) => {
    const h = await page(t, kind === 'asset' ? { assets: [{ href: 'http://[' }] } : {});
    if (kind === 'storage') Object.defineProperty(h.window, 'localStorage', { get() { throw new Error('Synthetic unavailable storage'); } });
    h.click();
    await h.settle();
    assertNavigation(h);
    assert.equal(h.timers.size, 0);
  });
});

test('refresh marker cleanup preserves URL state and cannot overwrite an active refresh label', async (t) => {
  let held;
  const h = await page(t, {
    href: 'https://drip.example.test/fifth-seat.html?case=case_015&refresh=old#ballot',
    cacheKeys: (h) => (held ??= h.hold(['drip-council'])).promise
  });
  assert.equal(h.historyChanges.length, 1);
  assert.equal(h.historyChanges[0].path, '/fifth-seat.html?case=case_015#ballot');
  assert.deepEqual(h.historyChanges[0].state, { synthetic: true });
  assert.equal(h.buttons[0].textContent, 'Version refreshed');
  h.click();
  h.tick(2400);
  await h.settle();
  assert.equal(h.buttons[0].textContent, 'Refreshing…');
  h.tick(600);
  await h.settle();
  assertNavigation(h);
  held.resolve();
  await h.settle();
  assert.equal(h.navigations.length, 1);
});

test('blocked navigation gets one attempt and permits a later deliberate retry', async (t) => {
  const h = await page(t);
  h.blockNavigation = true;
  h.click();
  await h.settle();
  assertNavigation(h);
  assert.equal(h.buttons[0].disabled, false);
  assert.equal(h.buttons[0].attributes.has('aria-busy'), false);
  assert.equal(h.buttons[0].textContent, 'Refresh this version');
  h.blockNavigation = false;
  h.click();
  await h.settle();
  assert.equal(h.navigations.length, 2);
});
