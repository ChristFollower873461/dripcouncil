const ALLOWED_HOSTS = new Set([
  "dripcouncil.org",
  "www.dripcouncil.org",
  "dripcouncil.pages.dev",
  "localhost",
  "127.0.0.1"
]);

const CURRENCY = "usd";
const MINIMUM_CENTS = 500;
const MAXIMUM_CENTS = 1_000_000;

const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 3;
const attempts = new Map();

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...(init.headers || {})
    }
  });
}

function configured(env) {
  return Boolean(
    env.DRIP_SUPPORT_ENABLED === "true" &&
    env.TURNSTILE_SITE_KEY &&
    env.TURNSTILE_SECRET_KEY &&
    (env.STRIPE_SECRET_KEY || env.STRIPE_API_KEY)
  );
}

function requestHost(context) {
  return new URL(context.request.url).hostname;
}

function requestOrigin(context) {
  const origin = context.request.headers.get("origin");
  if (!origin) return null;
  try {
    return new URL(origin);
  } catch {
    return null;
  }
}

function allowedHostname(hostname) {
  if (typeof hostname !== "string") return false;
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  return ALLOWED_HOSTS.has(normalized) || normalized.endsWith(".dripcouncil.pages.dev");
}

function allowedRequest(context) {
  const host = requestHost(context);
  const origin = requestOrigin(context);
  if (!allowedHostname(host)) return false;
  if (!origin) return true;
  return allowedHostname(origin.hostname);
}

function clientIp(context) {
  return (
    context.request.headers.get("cf-connecting-ip") ||
    context.request.headers.get("x-forwarded-for") ||
    "unknown"
  ).split(",")[0].trim();
}

function throttle(context) {
  const key = clientIp(context);
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || now > current.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return false;
  }
  current.count += 1;
  attempts.set(key, current);
  return current.count > MAX_ATTEMPTS_PER_WINDOW;
}

async function validateTurnstile(context, token) {
  const body = new FormData();
  body.append("secret", context.env.TURNSTILE_SECRET_KEY);
  body.append("response", token);
  body.append("remoteip", clientIp(context));

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body
  });

  if (!response.ok) return false;
  const result = await response.json();
  if (!result.success) return false;
  if (result.action !== "drip_support_checkout") return false;
  if (!allowedHostname(result.hostname)) return false;
  return true;
}

async function createCheckoutSession(context, amountCents) {
  const url = new URL(context.request.url);
  const siteOrigin = `${url.protocol}//${url.host}`;
  const stripeKey = context.env.STRIPE_SECRET_KEY || context.env.STRIPE_API_KEY;
  const params = new URLSearchParams();

  params.set("mode", "payment");
  params.set("success_url", context.env.SUPPORT_SUCCESS_URL || `${siteOrigin}/support.html?support=success`);
  params.set("cancel_url", context.env.SUPPORT_CANCEL_URL || `${siteOrigin}/support.html?support=cancel`);
  params.set("billing_address_collection", "auto");
  params.set("customer_creation", "if_required");
  params.set("client_reference_id", `drip-support-${crypto.randomUUID()}`);
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", CURRENCY);
  params.set("line_items[0][price_data][unit_amount]", String(amountCents));
  params.set("line_items[0][price_data][product_data][name]", "Drip Council Research Support");
  params.set("line_items[0][price_data][product_data][description]", "Human-approved support for Drip Council research.");
  params.set("metadata[purpose]", "drip_council_research_support");
  params.set("metadata[source]", "server_side_turnstile_checkout");
  params.set("metadata[amount_cents]", String(amountCents));
  params.set("payment_intent_data[metadata][purpose]", "drip_council_research_support");
  params.set("payment_intent_data[metadata][source]", "server_side_turnstile_checkout");
  params.set("payment_intent_data[metadata][amount_cents]", String(amountCents));

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${stripeKey}`,
      "content-type": "application/x-www-form-urlencoded",
      "idempotency-key": `drip-support-${crypto.randomUUID()}`
    },
    body: params
  });

  const payload = await response.json();
  if (!response.ok || !payload.url) {
    return null;
  }

  try {
    const checkoutUrl = new URL(payload.url);
    if (checkoutUrl.protocol !== "https:" || checkoutUrl.hostname !== "checkout.stripe.com") {
      return null;
    }
    return checkoutUrl.href;
  } catch {
    return null;
  }
}

export async function onRequestGet(context) {
  if (!allowedRequest(context)) {
    return json({ enabled: false, error: "origin_not_allowed" }, { status: 403 });
  }

  const enabled = configured(context.env);
  return json({
    enabled,
    turnstileSiteKey: enabled ? context.env.TURNSTILE_SITE_KEY : null,
    currency: CURRENCY,
    minimumCents: MINIMUM_CENTS,
    maximumCents: MAXIMUM_CENTS
  });
}

export async function onRequestPost(context) {
  if (!allowedRequest(context)) {
    return json({ error: "origin_not_allowed" }, { status: 403 });
  }
  if (!configured(context.env)) {
    return json({ error: "checkout_not_configured" }, { status: 503 });
  }
  if (throttle(context)) {
    return json({ error: "too_many_attempts" }, { status: 429 });
  }

  let payload;
  try {
    payload = await context.request.json();
  } catch {
    return json({ error: "invalid_json" }, { status: 400 });
  }

  const amountCents = payload?.amountCents;
  const token = String(payload?.turnstileToken || "");
  if (
    !Number.isInteger(amountCents) ||
    amountCents < MINIMUM_CENTS ||
    amountCents > MAXIMUM_CENTS
  ) {
    return json({ error: "invalid_amount" }, { status: 400 });
  }
  if (!token) {
    return json({ error: "turnstile_required" }, { status: 400 });
  }

  const humanVerified = await validateTurnstile(context, token);
  if (!humanVerified) {
    return json({ error: "human_check_failed" }, { status: 403 });
  }

  const checkoutUrl = await createCheckoutSession(context, amountCents);
  if (!checkoutUrl) {
    return json({ error: "checkout_unavailable" }, { status: 502 });
  }

  return json({ url: checkoutUrl });
}
