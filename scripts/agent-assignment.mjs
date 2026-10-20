export function initAgentAssignment(document, clipboard, timeoutMs = 2000) {
  const button = document.querySelector('#copy-agent-prompt');
  const prompt = document.querySelector('#agent-prompt');
  const status = document.querySelector('#agent-prompt-status');
  if (!button || !prompt || !status) return;

  button.hidden = false;
  status.textContent = 'Nothing is sent from this page.';
  button.addEventListener('click', async () => {
    if (button.disabled) return;
    button.disabled = true;
    let timer;
    try {
      // Clipboard permission can remain pending; always leave a manual way out.
      await Promise.race([
        Promise.resolve().then(() => {
          if (!clipboard?.writeText) throw new Error('Clipboard unavailable');
          return clipboard.writeText(prompt.value);
        }),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('Clipboard timeout')), timeoutMs);
        }),
      ]);
      status.textContent = 'Assignment copied. Nothing was sent to an agent.';
    } catch {
      prompt.focus();
      prompt.select();
      status.textContent = 'Automatic copy unavailable. The assignment is selected for manual copying.';
    } finally {
      clearTimeout(timer);
      button.disabled = false;
    }
  });
}

if (typeof document !== 'undefined') initAgentAssignment(document, navigator.clipboard);
