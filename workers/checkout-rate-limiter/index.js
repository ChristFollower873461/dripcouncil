const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const BUCKETS = Object.freeze({
  "/validation": Object.freeze({ storageKey: "validation-window", maximum: 20 }),
  "/checkout": Object.freeze({ storageKey: "checkout-window", maximum: 3 })
});
const WINDOW_KEYS = Object.values(BUCKETS).map(({ storageKey }) => storageKey);

function response(status) {
  return new Response(null, {
    status,
    headers: { "cache-control": "no-store" }
  });
}

export class CheckoutRateLimiter {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const bucket = BUCKETS[url.pathname];
    if (request.method !== "POST" || !bucket) return response(404);

    const now = Date.now();
    let window = await this.state.storage.get(bucket.storageKey);
    if (!window
      || !Number.isSafeInteger(window.count)
      || window.count < 0
      || !Number.isSafeInteger(window.resetAt)
      || now >= window.resetAt) {
      window = { count: 0, resetAt: now + ATTEMPT_WINDOW_MS };
    }

    if (window.count >= bucket.maximum) return response(429);

    window.count += 1;
    await this.state.storage.put(bucket.storageKey, window);
    await this.scheduleNextAlarm(now);
    return response(204);
  }

  async scheduleNextAlarm(now) {
    let nextResetAt = null;
    for (const key of WINDOW_KEYS) {
      const window = await this.state.storage.get(key);
      if (window && Number.isSafeInteger(window.resetAt) && window.resetAt > now) {
        nextResetAt = nextResetAt === null ? window.resetAt : Math.min(nextResetAt, window.resetAt);
      }
    }
    if (nextResetAt !== null) await this.state.storage.setAlarm(nextResetAt);
  }

  async alarm() {
    const now = Date.now();
    let nextResetAt = null;

    for (const key of WINDOW_KEYS) {
      const window = await this.state.storage.get(key);
      if (!window || !Number.isSafeInteger(window.resetAt) || now >= window.resetAt) {
        await this.state.storage.delete(key);
      } else {
        nextResetAt = nextResetAt === null ? window.resetAt : Math.min(nextResetAt, window.resetAt);
      }
    }

    if (nextResetAt === null) {
      await this.state.storage.deleteAlarm();
    } else {
      await this.state.storage.setAlarm(nextResetAt);
    }
  }
}

export default {
  fetch() {
    return response(404);
  }
};
