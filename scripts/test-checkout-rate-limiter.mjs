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

  async setAlarm(value) {
    this.alarm = value;
  }

  async deleteAll() {
    this.values.clear();
    this.alarm = null;
  }
}

const realNow = Date.now;
let now = 1_000_000;
Date.now = () => now;

try {
  const storage = new MemoryStorage();
  const limiter = new CheckoutRateLimiter({ storage });
  const attempt = () => limiter.fetch(new Request("https://rate-limiter.internal/attempt", { method: "POST" }));

  assert.equal((await attempt()).status, 204);
  assert.equal((await attempt()).status, 204);
  assert.equal((await attempt()).status, 204);
  assert.equal((await attempt()).status, 429);
  assert.equal(storage.values.get("window").count, 3);
  assert.equal(storage.alarm, now + (10 * 60 * 1000));

  now = storage.alarm;
  assert.equal((await attempt()).status, 204);
  assert.equal(storage.values.get("window").count, 1);

  await limiter.alarm();
  assert.equal(storage.values.size, 0);
  assert.equal((await limiter.fetch(new Request("https://rate-limiter.internal/nope", { method: "POST" }))).status, 404);
  assert.equal((await limiterWorker.fetch(new Request("https://worker.example/"))).status, 404);
} finally {
  Date.now = realNow;
}

console.log("Durable checkout limiter passed 10 checks.");
