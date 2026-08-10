const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 3;

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
    if (request.method !== "POST" || url.pathname !== "/attempt") return response(404);

    const now = Date.now();
    let window = await this.state.storage.get("window");
    if (!window || !Number.isSafeInteger(window.resetAt) || now >= window.resetAt) {
      window = { count: 0, resetAt: now + ATTEMPT_WINDOW_MS };
    }

    if (window.count >= MAX_ATTEMPTS_PER_WINDOW) return response(429);

    window.count += 1;
    await this.state.storage.put("window", window);
    await this.state.storage.setAlarm(window.resetAt);
    return response(204);
  }

  async alarm() {
    await this.state.storage.deleteAll();
  }
}

export default {
  fetch() {
    return response(404);
  }
};
