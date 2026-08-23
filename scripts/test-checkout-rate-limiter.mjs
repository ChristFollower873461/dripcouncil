#!/usr/bin/env node

import assert from "node:assert/strict";
import limiterWorker, { CheckoutRateLimiter } from "../workers/checkout-rate-limiter/index.js";

class MemoryStorage {
  constructor() {
    this.values = new Map();
    this.alarm = null;
  }

  async get(key) {
    return this.values.get(key);
  }

  async put(key, value) {
    this.values.set(key, structuredClone(value));
  }

  async delete(key) {
    this.values.delete(key);
  }

  async setAlarm(value) {
    this.alarm = value;
  }

  async deleteAlarm() {
    this.alarm = null;
  }
}

const realNow = Date.now;
let now = 1_000_000;
Date.now = () => now;

try {
  const storage = new MemoryStorage();
  const limiter = new CheckoutRateLimiter({ storage });
  const attempt = (bucket) => limiter.fetch(new Request(`https://rate-limiter.internal/${bucket}`, {
    method: "POST"
  }));

  for (let count = 0; count < 20; count += 1) {
    assert.equal((await attempt("validation")).status, 204);
  }
  assert.equal((await attempt("validation")).status, 429);
  assert.equal(storage.values.get("validation-window").count, 20);
  const validationResetAt = now + (10 * 60 * 1000);
  assert.equal(storage.alarm, validationResetAt);

  now += 60 * 1000;
  assert.equal((await attempt("checkout")).status, 204);
  assert.equal((await attempt("checkout")).status, 204);
  assert.equal((await attempt("checkout")).status, 204);
  assert.equal((await attempt("checkout")).status, 429);
  assert.equal(storage.values.get("checkout-window").count, 3);
  const checkoutResetAt = now + (10 * 60 * 1000);
  assert.equal(storage.alarm, validationResetAt);

  now = validationResetAt;
  await limiter.alarm();
  assert.equal(storage.values.has("validation-window"), false);
  assert.equal(storage.values.get("checkout-window").count, 3);
  assert.equal(storage.alarm, checkoutResetAt);

  assert.equal((await attempt("validation")).status, 204);
  const renewedValidationResetAt = now + (10 * 60 * 1000);
  assert.equal(storage.values.get("validation-window").count, 1);
  assert.equal(storage.alarm, checkoutResetAt);

  now = checkoutResetAt;
  await limiter.alarm();
  assert.equal(storage.values.has("checkout-window"), false);
  assert.equal(storage.values.get("validation-window").count, 1);
  assert.equal(storage.alarm, renewedValidationResetAt);

  now = renewedValidationResetAt;
  await limiter.alarm();
  assert.equal(storage.values.size, 0);
  assert.equal(storage.alarm, null);
  assert.equal((await limiter.fetch(new Request("https://rate-limiter.internal/attempt", { method: "POST" }))).status, 404);
  assert.equal((await limiter.fetch(new Request("https://rate-limiter.internal/validation"))).status, 404);
  assert.equal((await limiterWorker.fetch(new Request("https://worker.example/"))).status, 404);
} finally {
  Date.now = realNow;
}

console.log("Durable validation and checkout limiter tests passed.");
