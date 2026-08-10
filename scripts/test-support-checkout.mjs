#!/usr/bin/env node

import assert from "node:assert/strict";
import { onRequestGet, onRequestPost } from "../functions/api/support/checkout.js";

class MockRateLimiter {
  constructor() {
    this.counts = new Map();
  }

  idFromName(name) {
    return name;
  }

  get(id) {
    return {
      fetch: async () => {
        const count = (this.counts.get(id) || 0) + 1;
        this.counts.set(id, count);
        return new Response(null, { status: count > 3 ? 429 : 204 });
      }
    };
  }
}

function environment(overrides = {}) {
  return {
    DRIP_SUPPORT_ENABLED: "true",
    TURNSTILE_SITE_KEY: "site-key",
    TURNSTILE_SECRET_KEY: "secret-key",
    STRIPE_SECRET_KEY: "stripe-key",
    DRIP_SUPPORT_RATE_LIMIT_SALT: "a-secure-test-only-salt-that-is-long-enough",
    DRIP_SUPPORT_RATE_LIMITER: new MockRateLimiter(),
    SUPPORT_SUCCESS_URL: "https://dripcouncil.org/support.html?support=success",
    SUPPORT_CANCEL_URL: "https://dripcouncil.org/support.html?support=cancel",
    ...overrides
  };
}

function context({
  env = environment(),
  method = "GET",
  body,
  origin = "https://dripcouncil.org",
  clientIp = "203.0.113.10",
  headers = {}
} = {}) {
  const requestHeaders = new Headers(headers);
  if (origin !== null) requestHeaders.set("origin", origin);
  if (clientIp !== null) requestHeaders.set("cf-connecting-ip", clientIp);
  if (body !== undefined && !requestHeaders.has("content-type")) {
    requestHeaders.set("content-type", "application/json");
  }
  return {
    env,
    request: new Request("https://dripcouncil.org/api/support/checkout", {
      method,
      headers: requestHeaders,
      body
    })
  };
}

async function payload(response) {
  return response.json();
}

const realFetch = globalThis.fetch;
let turnstileHostname = "dripcouncil.org";
let stripeCalls = 0;
globalThis.fetch = async (url) => {
  if (String(url).startsWith("https://challenges.cloudflare.com/")) {
    return Response.json({
      success: true,
      action: "drip_support_checkout",
      hostname: turnstileHostname
    });
  }
  if (String(url) === "https://api.stripe.com/v1/checkout/sessions") {
    stripeCalls += 1;
    return Response.json({ url: "https://checkout.stripe.com/c/pay/cs_test_safe" });
  }
  throw new Error(`Unexpected fetch: ${url}`);
};

try {
  const getResponse = await onRequestGet(context());
  assert.equal(getResponse.status, 200);
  assert.equal((await payload(getResponse)).enabled, true);

  const unsafeReturn = environment({ SUPPORT_SUCCESS_URL: "https://attacker.example/paid" });
  assert.equal((await payload(await onRequestGet(context({ env: unsafeReturn })))).enabled, false);

  const validBody = JSON.stringify({ amountCents: 500, turnstileToken: "valid-token" });
  assert.equal((await onRequestPost(context({ method: "POST", body: validBody, origin: null }))).status, 403);
  assert.equal((await onRequestPost(context({ method: "POST", body: validBody, origin: "https://attacker.example" }))).status, 403);

  const spoofedForwarded = context({
    method: "POST",
    body: validBody,
    clientIp: null,
    headers: { "x-forwarded-for": "198.51.100.99" }
  });
  assert.equal((await onRequestPost(spoofedForwarded)).status, 503);

  const boundedInputEnv = environment();
  const wrongType = context({
    env: boundedInputEnv,
    method: "POST",
    body: validBody,
    headers: { "content-type": "text/plain" }
  });
  assert.equal((await onRequestPost(wrongType)).status, 415);
  assert.equal(boundedInputEnv.DRIP_SUPPORT_RATE_LIMITER.counts.size, 0);

  const declaredOversize = context({
    method: "POST",
    body: "{}",
    headers: { "content-length": "4097" }
  });
  assert.equal((await onRequestPost(declaredOversize)).status, 413);

  const streamedOversize = context({ method: "POST", body: "x".repeat(4097) });
  assert.equal((await onRequestPost(streamedOversize)).status, 413);

  const extraField = JSON.stringify({ amountCents: 500, turnstileToken: "valid-token", surprise: true });
  assert.equal((await onRequestPost(context({ method: "POST", body: extraField }))).status, 400);

  const oversizedToken = JSON.stringify({ amountCents: 500, turnstileToken: "x".repeat(2049) });
  assert.equal((await onRequestPost(context({ method: "POST", body: oversizedToken }))).status, 400);

  turnstileHostname = "preview.dripcouncil.pages.dev";
  assert.equal((await onRequestPost(context({ method: "POST", body: validBody }))).status, 403);
  turnstileHostname = "dripcouncil.org";

  const sharedEnv = environment();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await onRequestPost(context({ env: sharedEnv, method: "POST", body: validBody }));
    assert.equal(response.status, 200);
    assert.equal((await payload(response)).url, "https://checkout.stripe.com/c/pay/cs_test_safe");
  }
  assert.equal((await onRequestPost(context({ env: sharedEnv, method: "POST", body: validBody }))).status, 429);
  assert.equal(stripeCalls, 3);

  const missingLimiter = environment({ DRIP_SUPPORT_RATE_LIMITER: undefined });
  assert.equal((await onRequestPost(context({ env: missingLimiter, method: "POST", body: validBody }))).status, 503);
} finally {
  globalThis.fetch = realFetch;
}

console.log("Support checkout boundary passed 20 checks.");
