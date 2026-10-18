const RELEASE_VERSION = new URL(import.meta.url).searchParams.get("v") || "current";
const STORAGE_PREFIX = "drip-council:";
const CACHE_PREFIX = "drip-council";
const REFRESH_DEADLINE_MS = 3000;
let refreshStarted = false;

function clearPrefixedStorage(storage) {
  try {
    const keys = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
    }
    for (const key of keys) storage.removeItem(key);
  } catch {
    // Storage may be unavailable in hardened or private browsing contexts.
  }
}

async function clearAppCaches(signal) {
  if (!("caches" in window)) return;
  try {
    const names = await window.caches.keys();
    if (signal.aborted) return;
    await Promise.all(
      names
        .filter((name) => name === CACHE_PREFIX || name.startsWith(`${CACHE_PREFIX}-`))
        .map((name) => window.caches.delete(name))
    );
  } catch {
    // A cache reset is helpful, not required for the versioned-asset reload.
  }
}

function sameOriginAssets() {
  const urls = [
    ...document.querySelectorAll("link[rel='stylesheet'][href], script[src]")
  ].map((element) => new URL(element.href || element.src, window.location.href));

  return [...new Map(
    urls
      .filter((url) => url.origin === window.location.origin)
      .map((url) => [url.href, url])
  ).values()];
}

async function warmFreshAssets(signal) {
  if (signal.aborted) return;
  await Promise.allSettled(
    sameOriginAssets().map((url) => fetch(url, {
      cache: "reload",
      credentials: "same-origin",
      headers: { "X-Drip-Refresh": RELEASE_VERSION },
      signal
    }))
  );
}

function cleanRefreshMarker(button) {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("refresh")) return;

  url.searchParams.delete("refresh");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  button.textContent = "Version refreshed";
  window.setTimeout(() => {
    if (!refreshStarted) button.textContent = "Refresh this version";
  }, 2400);
}

async function refreshCurrentVersion(button) {
  if (refreshStarted) return;
  refreshStarted = true;
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  button.textContent = "Refreshing…";

  const controller = new AbortController();
  let deadlineTimer;
  try {
    const deadline = new Promise((resolve) => {
      deadlineTimer = window.setTimeout(() => {
        controller.abort();
        resolve();
      }, REFRESH_DEADLINE_MS);
    });
    const bestEffort = (async () => {
      clearPrefixedStorage(window.localStorage);
      clearPrefixedStorage(window.sessionStorage);
      await clearAppCaches(controller.signal);
      await warmFreshAssets(controller.signal);
    })();
    await Promise.race([bestEffort, deadline]);
  } catch {
    controller.abort();
    // Cleanup and warming failures must not prevent the versioned reload.
  } finally {
    window.clearTimeout(deadlineTimer);
  }

  const url = new URL(window.location.href);
  url.searchParams.set("refresh", Date.now().toString(36));
  window.location.replace(url);
}

for (const button of document.querySelectorAll("[data-site-refresh]")) {
  cleanRefreshMarker(button);
  button.addEventListener("click", () => {
    refreshCurrentVersion(button).catch(() => {
      // A blocked navigation can be retried deliberately, never twice per click.
      refreshStarted = false;
      button.disabled = false;
      button.removeAttribute("aria-busy");
      button.textContent = "Refresh this version";
    });
  });
}
