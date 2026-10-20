import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { initAgentAssignment } from '../scripts/agent-assignment.mjs';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

function page(t, clipboard, timeout = 30) {
  const dom = new JSDOM(html);
  t.after(() => dom.window.close());
  const document = dom.window.document;
  initAgentAssignment(document, clipboard, timeout);
  return {
    document,
    button: document.querySelector('#copy-agent-prompt'),
    prompt: document.querySelector('#agent-prompt'),
    status: document.querySelector('#agent-prompt-status'),
  };
}

async function settle(h) {
  const deadline = Date.now() + 1000;
  while (h.button.disabled && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(h.button.disabled, false);
}

test('assignment works as selectable static content without JavaScript', () => {
  const dom = new JSDOM(html);
  const prompt = dom.window.document.querySelector('#agent-prompt');
  assert.equal(prompt.readOnly, true);
  assert.match(prompt.value, /curriculum\.html\?case=case_015/);
  assert.match(prompt.value, /Do not log in, pay, upload, or send anything/);
  assert.match(prompt.value, /Distinguish sample output from your own actions/);
  assert.equal(dom.window.document.querySelector('#copy-agent-prompt').hidden, true);
  dom.window.close();
});

test('copy uses only the visible assignment, never launches an agent', async t => {
  const writes = [];
  const h = page(t, { writeText: async text => writes.push(text) });
  assert.equal(h.button.hidden, false);
  h.button.click();
  await settle(h);
  assert.deepEqual(writes, [h.prompt.value]);
  assert.match(h.status.textContent, /copied.*Nothing was sent/);
});

for (const [name, clipboard] of [
  ['missing API', undefined],
  ['denied permission', { writeText: async () => { throw new Error('Denied'); } }],
  ['unanswered permission', { writeText: () => new Promise(() => {}) }],
]) {
  test(`${name} restores the control and offers manual copying`, async t => {
    const h = page(t, clipboard);
    h.button.click();
    await settle(h);
    assert.match(h.status.textContent, /manual copying/);
    assert.equal(h.document.activeElement, h.prompt);
    assert.equal(h.prompt.selectionStart, 0);
    assert.equal(h.prompt.selectionEnd, h.prompt.value.length);
  });
}

test('copy can be retried after a denied permission', async t => {
  let denied = true;
  const h = page(t, { writeText: async () => { if (denied) throw new Error('Denied'); } });
  h.button.click(); await settle(h);
  denied = false;
  h.button.click(); await settle(h);
  assert.match(h.status.textContent, /Assignment copied/);
});

test('script safely ignores other pages', t => {
  const dom = new JSDOM('<main>Other page</main>');
  t.after(() => dom.window.close());
  assert.doesNotThrow(() => initAgentAssignment(dom.window.document));
});
