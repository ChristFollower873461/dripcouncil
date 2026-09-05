import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { JSDOM } from 'jsdom';

// Execute the actual page module and checked-in WASM. Keep this harness outside
// scripts/ so the static build never copies its test-only dependencies.
const repo = new URL('../', import.meta.url);
const html = await readFile(new URL('fifth-seat.html', repo), 'utf8');
const sample = JSON.parse(await readFile(new URL('cases/case_015.json', repo), 'utf8')).sample_ballot;
const otherSample = JSON.parse(await readFile(new URL('cases/case_014.json', repo), 'utf8')).sample_ballot;
const sampleText = JSON.stringify(sample);
const turn = () => new Promise((resolve) => setImmediate(resolve));
let pageSequence = 0;

async function page(t, { unavailableWasm = false, beforeReady, caseResponseGate } = {}) {
  const dom = new JSDOM(html, {
    url: 'https://drip.example.test/fifth-seat.html?case=case_015',
    runScripts: 'outside-only', pretendToBeVisual: true,
  });
  const w = dom.window;
  w.matchMedia = () => ({ matches: true });
  const asyncErrors = [];
  const unexpectedRequests = [];
  const reads = [];
  const allowed = new Set(['/cases/index.json', '/cases/case_015.json', '/wasm/boundary_validator.wasm']);
  const descriptors = new Map(['window', 'document', 'navigator', 'fetch'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries({ window: w, document: w.document, navigator: w.navigator })) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  globalThis.fetch = async (url) => {
    if (!allowed.has(String(url))) {
      unexpectedRequests.push(String(url));
      throw new Error('Network or undeclared fixture request forbidden');
    }
    if (caseResponseGate && url === '/cases/case_015.json') await caseResponseGate;
    if (unavailableWasm && url === '/wasm/boundary_validator.wasm') return new Response('Synthetic unavailable module', { status: 503 });
    return new Response(await readFile(new URL(String(url).slice(1), repo)), { status: 200 });
  };

  // Browser EventTarget ignores listener return values. Observe the actual
  // listener's Promise so rejected file reads become precise test failures,
  // without changing its code, scheduling, or return value.
  const originalAdd = w.EventTarget.prototype.addEventListener;
  w.EventTarget.prototype.addEventListener = function(type, listener, options) {
    if (typeof listener !== 'function') return originalAdd.call(this, type, listener, options);
    return originalAdd.call(this, type, function(event) {
      const result = listener.call(this, event);
      if (result && typeof result.then === 'function') result.catch((error) => asyncErrors.push(error));
      return result;
    }, options);
  };
  w.addEventListener('error', (event) => { asyncErrors.push(event.error); event.preventDefault(); });

  const h = {
    w, asyncErrors,
    input: w.document.querySelector('#ballot-input, #ballot-json'),
    status: w.document.getElementById('ballot-status'),
    result: w.document.getElementById('seat-result'),
    validate: w.document.getElementById('validate-ballot'),
    sample: w.document.getElementById('load-ballot-sample'),
    reset: w.document.getElementById('reset-ballot'),
    edit(text) { this.input.value = text; this.input.dispatchEvent(new w.Event('input', { bubbles: true })); },
    snapshot() { return { text: this.input.value, lit: this.result.classList.contains('is-lit'), status: this.status.textContent, error: this.status.classList.contains('is-error') }; },
    async settle() { await turn(); await turn(); },
    deferred(size = 100) {
      let resolve, reject;
      const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
      const read = { calls: 0, settled: false, file: { size, text: () => { read.calls += 1; return promise; } },
        resolve(value) { read.settled = true; resolve(value); }, reject(error) { read.settled = true; reject(error); } };
      reads.push(read);
      return read;
    },
    importFile(kind, file) {
      const event = new w.Event(kind === 'file' ? 'change' : 'drop', { bubbles: true, cancelable: true });
      if (kind === 'file') {
        const input = w.document.getElementById('ballot-file');
        Object.defineProperty(input, 'files', { configurable: true, value: file ? [file] : [] });
        input.dispatchEvent(event);
      } else {
        Object.defineProperty(event, 'dataTransfer', { value: { files: file ? [file] : [] } });
        w.document.getElementById('ballot-dropzone').dispatchEvent(event);
      }
    },
  };
  t.after(async () => {
    for (const read of reads) if (!read.settled) read.resolve('');
    await h.settle();
    dom.window.close();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
    assert.deepEqual(unexpectedRequests, [], 'only exact local fixture reads are permitted');
  });
  await import(new URL(`scripts/council-worlds.mjs?page-test=${++pageSequence}`, repo));
  w.EventTarget.prototype.addEventListener = originalAdd;
  if (beforeReady) await beforeReady(h);
  const deadline = Date.now() + 2_000;
  while (w.document.getElementById('validator-engine').dataset.engineState === 'loading' && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.match(w.document.getElementById('selected-case-label').textContent, /015/);
  assert.equal(w.document.getElementById('validator-engine').dataset.engineState, unavailableWasm ? 'error' : 'ready');
  assert.equal(h.validate.disabled, unavailableWasm);
  return h;
}

function assertNoAsyncErrors(h) {
  assert.deepEqual(h.asyncErrors.map((error) => error?.message ?? String(error)), [], 'actual page handlers must catch file read rejection');
}

function light(h, text = sampleText) {
  h.edit(text);
  h.validate.click();
  assert.equal(h.snapshot().lit, true, 'matching current-case ballot must pass actual Rust/WASM');
}

test('selected Case 015 sample receives an actual local Rust/WASM verdict', async (t) => {
  const h = await page(t); h.sample.click(); h.validate.click();
  assert.equal(JSON.parse(h.input.value).case_id, 'case_015');
  assert.equal(h.snapshot().lit, true); assertNoAsyncErrors(h);
});

test('a valid ballot for Case 014 cannot light the seat under the Case 015 brief', async (t) => {
  const h = await page(t); h.edit(JSON.stringify(otherSample)); h.validate.click();
  assert.equal(h.snapshot().lit, false);
  assert.equal(h.snapshot().error, true);
  assert.match(h.status.textContent, /case/i);
  light(h); assertNoAsyncErrors(h);
});

test('malformed JSON remains a Rust validation failure', async (t) => {
  const h = await page(t); h.edit('{broken'); h.validate.click();
  assert.equal(h.snapshot().lit, false); assert.equal(h.snapshot().error, true);
  assert.equal(h.validate.disabled, false); assertNoAsyncErrors(h);
});

test('unavailable checked-in WASM never yields a fallback verdict', async (t) => {
  const h = await page(t, { unavailableWasm: true }); h.sample.click(); h.validate.click();
  assert.equal(h.snapshot().lit, false); assert.equal(h.validate.disabled, true); assertNoAsyncErrors(h);
});

for (const kind of ['file', 'drop']) {
  test(`${kind}: current import loads and can be validated`, async (t) => {
    const h = await page(t); const read = h.deferred(); h.importFile(kind, read.file);
    read.resolve(sampleText); await h.settle();
    assert.equal(h.input.value, sampleText); h.validate.click();
    assert.equal(h.snapshot().lit, true); assertNoAsyncErrors(h);
  });

  test(`${kind}: starting a pending read clears the previous verdict immediately`, async (t) => {
    const h = await page(t); light(h); const read = h.deferred(); h.importFile(kind, read.file);
    assert.equal(h.snapshot().lit, false);
    read.resolve(sampleText); await h.settle(); assert.equal(h.snapshot().lit, false); assertNoAsyncErrors(h);
  });

  for (const action of ['reset', 'edit', 'sample']) {
    test(`${kind}: ${action} supersedes an older read and preserves the new state`, async (t) => {
      const h = await page(t); const read = h.deferred(); h.importFile(kind, read.file);
      if (action === 'reset') h.reset.click();
      else if (action === 'edit') light(h, JSON.stringify({ ...sample, uncertainty: 'A newer typed local ballot.' }));
      else { h.sample.click(); h.validate.click(); assert.equal(h.snapshot().lit, true); }
      const current = h.snapshot();
      read.resolve('Stale file contents must not replace this draft'); await h.settle();
      assert.deepEqual(h.snapshot(), current); assertNoAsyncErrors(h);
    });
  }

  test(`${kind}: a newer completed import supersedes an old read across input methods`, async (t) => {
    const h = await page(t); const old = h.deferred(); const fresh = h.deferred();
    h.importFile(kind, old.file); h.importFile(kind === 'file' ? 'drop' : 'file', fresh.file);
    fresh.resolve(sampleText); await h.settle(); h.validate.click(); assert.equal(h.snapshot().lit, true);
    const current = h.snapshot(); old.resolve('Old import'); await h.settle();
    assert.deepEqual(h.snapshot(), current); assertNoAsyncErrors(h);
  });

  test(`${kind}: a current read rejection is handled and leaves a recoverable error`, async (t) => {
    const h = await page(t); light(h); const read = h.deferred(); h.importFile(kind, read.file);
    read.reject(new Error('Synthetic file read failure')); await h.settle();
    assertNoAsyncErrors(h); assert.equal(h.snapshot().lit, false); assert.equal(h.snapshot().error, true);
    assert.match(h.status.textContent, /read|file/i);
    h.sample.click(); h.validate.click(); assert.equal(h.snapshot().lit, true);
  });

  test(`${kind}: stale read rejection cannot clear a newer valid ballot`, async (t) => {
    const h = await page(t); const read = h.deferred(); h.importFile(kind, read.file);
    light(h); const current = h.snapshot(); read.reject(new Error('Synthetic stale rejection')); await h.settle();
    assertNoAsyncErrors(h); assert.deepEqual(h.snapshot(), current);
  });

  for (const replacement of ['no file', 'empty file', 'oversize file']) {
    test(`${kind}: ${replacement} request supersedes an older pending import`, async (t) => {
      const h = await page(t); const old = h.deferred(); h.importFile(kind, old.file);
      const next = replacement === 'no file' ? null : h.deferred(replacement === 'oversize file' ? 100_001 : 0);
      h.importFile(kind, next?.file);
      if (next && replacement === 'empty file') { next.resolve(''); await h.settle(); }
      if (replacement === 'oversize file') assert.equal(next.calls, 0, 'oversize files must not be read');
      const current = h.snapshot(); old.resolve(sampleText); await h.settle();
      assert.deepEqual(h.snapshot(), current); assertNoAsyncErrors(h);
    });
  }
}

for (const outcome of ['completion', 'rejection']) {
  test(`native file-picker cancel supersedes pending ${outcome}`, async (t) => {
    const h = await page(t);
    h.edit('Preserved visible draft before file import');
    const old = h.deferred();
    h.importFile('file', old.file);
    h.w.document.getElementById('ballot-file').dispatchEvent(new h.w.Event('cancel', { bubbles: true }));
    const current = h.snapshot();
    if (outcome === 'completion') old.resolve('Canceled stale import');
    else old.reject(new Error('Canceled stale import failure'));
    await h.settle();
    assertNoAsyncErrors(h);
    assert.deepEqual(h.snapshot(), current, 'cancelled import must not mutate the visible draft or feedback');
  });

  test(`selected-case response supersedes an import ${outcome} begun under the default case`, async (t) => {
    let releaseCase;
    const caseResponseGate = new Promise((resolve) => { releaseCase = resolve; });
    let old;
    const h = await page(t, {
      caseResponseGate,
      beforeReady(h) {
        assert.match(h.w.document.getElementById('selected-case-label').textContent, /014/);
        h.edit('Preserved draft while the selected case loads');
        old = h.deferred();
        h.importFile('file', old.file);
        releaseCase();
      }
    });
    const current = h.snapshot();
    if (outcome === 'completion') old.resolve('Stale import from the previous case context');
    else old.reject(new Error('Stale import failed after case changed'));
    await h.settle();
    assertNoAsyncErrors(h);
    assert.deepEqual(h.snapshot(), current, 'newly loaded case context must invalidate prior import work');
    light(h);
  });
}
