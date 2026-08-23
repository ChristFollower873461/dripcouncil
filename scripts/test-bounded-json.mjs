#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  BoundedResourceError,
  readBoundedJsonResponse,
  readBoundedResponseBytes
} from "./bounded-json.mjs";

const valid = await readBoundedJsonResponse(
  new Response('{"safe":true}', { headers: { "content-length": "13" } }),
  32,
  "fixture"
);
assert.deepEqual(valid, { safe: true });

await assert.rejects(
  readBoundedJsonResponse(
    new Response("{}", { headers: { "content-length": "1000" } }),
    32,
    "declared fixture"
  ),
  BoundedResourceError
);

await assert.rejects(
  readBoundedResponseBytes(new Response("x".repeat(33)), 32, "streamed fixture"),
  /exceeded 32 bytes/
);

await assert.rejects(
  readBoundedJsonResponse(new Response(new Uint8Array([0xff])), 32, "UTF-8 fixture"),
  /valid UTF-8 JSON/
);

await assert.rejects(
  readBoundedJsonResponse(new Response("not JSON"), 32, "JSON fixture"),
  /valid UTF-8 JSON/
);

console.log("Bounded browser resource reader passed 5 checks.");
