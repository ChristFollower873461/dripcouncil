const ALLOWED_HOSTS = new Set([
  "dripcouncil.org",
  "www.dripcouncil.org",
  "dripcouncil.pages.dev",
  "localhost",
  "127.0.0.1"
]);

const CANONICAL_ORIGIN = "https://dripcouncil.org";
const CURRENCY = "usd";
const MINIMUM_CENTS = 500;
const MAXIMUM_CENTS = 1_000_000;
const MAXIMUM_BODY_BYTES = 4 * 1024;
const MAXIMUM_TURNSTILE_TOKEN_LENGTH = 2048;
const EXTERNAL_REQUEST_TIMEOUT_MS = 8_000;

class RequestBodyError extends Error {
  constructor(code, status) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

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

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function allowedHostname(hostname) {
  if (typeof hostname !== "string") return false;
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  return ALLOWED_HOSTS.has(normalized) || normalized.endsWith(".dripcouncil.pages.dev");
}

function requestUrl(context) {
  try {
    return new URL(context.request.url);
  } catch {
    return null;
  }
}

function requestOrigin(context) {
  const value = context.request.headers.get("origin");
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function allowedRequest(context, { requireOrigin = false } = {}) {
  const url = requestUrl(context);
  if (!url || !allowedHostname(url.hostname)) return false;
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) return false;

  const originHeader = context.request.headers.get("origin");
  const origin = requestOrigin(context);
  if (!originHeader) return !requireOrigin;
  if (!origin || !allowedHostname(origin.hostname)) return false;
  return origin.origin === url.origin;
}

function validReturnUrl(value, state) {
  try {
    const url = new URL(value);
    const entries = [...url.searchParams.entries()];
    return url.protocol === "https:"
      && url.origin === CANONICAL_ORIGIN
      && !url.username
      && !url.password
      && !url.hash
      && url.pathname === "/support.html"
      && entries.length === 1
      && entries[0][0] === "support"
      && entries[0][1] === state;
  } catch {
    return false;
  }
}

function checkoutReturnUrls(env) {
  const success = env.SUPPORT_SUCCESS_URL || `${CANONICAL_ORIGIN}/support.html?support=success`;
  const cancel = env.SUPPORT_CANCEL_URL || `${CANONICAL_ORIGIN}/support.html?support=cancel`;
  if (!validReturnUrl(success, "success") || !validReturnUrl(cancel, "cancel")) return null;
  return { success, cancel };
}

function hasRateLimiter(env) {
  return Boolean(
    env.DRIP_SUPPORT_RATE_LIMITER
    && typeof env.DRIP_SUPPORT_RATE_LIMITER.idFromName === "function"
    && typeof env.DRIP_SUPPORT_RATE_LIMITER.get === "function"
    && typeof env.DRIP_SUPPORT_RATE_LIMIT_SALT === "string"
    && env.DRIP_SUPPORT_RATE_LIMIT_SALT.length >= 32
    && env.DRIP_SUPPORT_RATE_LIMIT_SALT.length <= 256
  );
}

function configured(env) {
  return Boolean(
    env.DRIP_SUPPORT_ENABLED === "true"
    && env.TURNSTILE_SITE_KEY
    && env.TURNSTILE_SECRET_KEY
    && (env.STRIPE_SECRET_KEY || env.STRIPE_API_KEY)
    && hasRateLimiter(env)
    && checkoutReturnUrls(env)
  );
}

function clientIp(context) {
  const value = context.request.headers.get("cf-connecting-ip");
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized && normalized.length <= 64 && !/[\u0000-\u001f\u007f]/.test(normalized)
    ? normalized
    : null;
}

async function throttle(context) {
  const ip = clientIp(context);
  if (!ip || !hasRateLimiter(context.env)) return "unavailable";

  try {
    const id = context.env.DRIP_SUPPORT_RATE_LIMITER.idFromName(
      `${context.env.DRIP_SUPPORT_RATE_LIMIT_SALT}:${ip}`
    );
    const stub = context.env.DRIP_SUPPORT_RATE_LIMITER.get(id);
    const response = await stub.fetch("https://rate-limiter.internal/attempt", {
      method: "POST"
    });
    if (response.status === 204) return "allowed";
    if (response.status === 429) return "blocked";
    return "unavailable";
  } catch {
    return "unavailable";
  }
}

async function readJsonBody(request) {
  const mediaType = (request.headers.get("content-type") || "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (mediaType !== "application/json") {
    throw new RequestBodyError("unsupported_media_type", 415);
  }

  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0) {
      throw new RequestBodyError("invalid_content_length", 400);
    }
    if (parsedLength > MAXIMUM_BODY_BYTES) {
      throw new RequestBodyError("request_too_large", 413);
    }
  }

  if (!request.body) throw new RequestBodyError("invalid_json", 400);
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAXIMUM_BODY_BYTES) {
        await reader.cancel();
        throw new RequestBodyError("request_too_large", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return JSON.parse(source);
  } catch {
    throw new RequestBodyError("invalid_json", 400);
  }
}

async function fetchWithTimeout(url, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EXTERNAL_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function validateTurnstile(context, token) {
  const body = new FormData();
  body.append("secret", context.env.TURNSTILE_SECRET_KEY);
  body.append("response", token);
  body.append("remoteip", clientIp(context));

  try {
    const response = await fetchWithTimeout(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body }
    );
    if (!response.ok) return false;
    const result = await response.json();
    const host = requestUrl(context)?.hostname.toLowerCase().replace(/\.$/, "");
    const verifiedHost = typeof result.hostname === "string"
      ? result.hostname.toLowerCase().replace(/\.$/, "")
      : "";
    return result.success === true
      && result.action === "drip_support_checkout"
      && verifiedHost === host;
  } catch {
    return false;
  }
}

async function createCheckoutSession(context, amountCents, returnUrls) {
  const stripeKey = context.env.STRIPE_SECRET_KEY || context.env.STRIPE_API_KEY;
  const params = new URLSearchParams();

  params.set("mode", "payment");
  params.set("success_url", returnUrls.success);
  params.set("cancel_url", returnUrls.cancel);
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

  try {
    const response = await fetchWithTimeout("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${stripeKey}`,
        "content-type": "application/x-www-form-urlencoded",
        "idempotency-key": `drip-support-${crypto.randomUUID()}`
      },
      body: params
    });

    const payload = await response.json();
    if (!response.ok || typeof payload.url !== "string") return null;

    const checkoutUrl = new URL(payload.url);
    if (checkoutUrl.protocol !== "https:"
      || checkoutUrl.hostname !== "checkout.stripe.com"
      || checkoutUrl.username
      || checkoutUrl.password) {
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
  if (!allowedRequest(context, { requireOrigin: true })) {
    return json({ error: "origin_not_allowed" }, { status: 403 });
  }

  const returnUrls = checkoutReturnUrls(context.env);
  if (!configured(context.env) || !returnUrls) {
    return json({ error: "checkout_not_configured" }, { status: 503 });
  }

  if (!clientIp(context)) {
    return json({ error: "rate_limit_unavailable" }, { status: 503 });
  }

  let payload;
  try {
    payload = await readJsonBody(context.request);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return json({ error: error.code }, { status: error.status });
    }
    return json({ error: "invalid_json" }, { status: 400 });
  }

  if (!isRecord(payload)
    || Object.keys(payload).length !== 2
    || !Object.hasOwn(payload, "amountCents")
    || !Object.hasOwn(payload, "turnstileToken")) {
    return json({ error: "invalid_request" }, { status: 400 });
  }

  const { amountCents, turnstileToken } = payload;
  if (!Number.isInteger(amountCents)
    || amountCents < MINIMUM_CENTS
    || amountCents > MAXIMUM_CENTS) {
    return json({ error: "invalid_amount" }, { status: 400 });
  }
  if (typeof turnstileToken !== "string"
    || !turnstileToken
    || turnstileToken.length > MAXIMUM_TURNSTILE_TOKEN_LENGTH) {
    return json({ error: "turnstile_required" }, { status: 400 });
  }

  const humanVerified = await validateTurnstile(context, turnstileToken);
  if (!humanVerified) {
    return json({ error: "human_check_failed" }, { status: 403 });
  }

  const throttleResult = await throttle(context);
  if (throttleResult === "blocked") {
    return json({ error: "too_many_attempts" }, { status: 429 });
  }
  if (throttleResult !== "allowed") {
    return json({ error: "rate_limit_unavailable" }, { status: 503 });
  }

  const checkoutUrl = await createCheckoutSession(context, amountCents, returnUrls);
  if (!checkoutUrl) {
    return json({ error: "checkout_unavailable" }, { status: 502 });
  }

  return json({ url: checkoutUrl });
}
