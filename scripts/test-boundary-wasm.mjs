#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const wasmUrl = new URL("../wasm/boundary_validator.wasm", import.meta.url);
const wasmBytes = await readFile(fileURLToPath(wasmUrl));
const { instance } = await WebAssembly.instantiate(wasmBytes, {});
const { alloc, dealloc, memory, validate_ballot: validateBallot, validator_version: validatorVersion } = instance.exports;

for (const [name, value] of Object.entries({ alloc, dealloc, memory, validateBallot, validatorVersion })) {
  assert.ok(value, `missing WASM export: ${name}`);
}
assert.equal(validatorVersion(), 1, "unexpected validator ABI version");

const encoder = new TextEncoder();

function validateText(source) {
  const bytes = encoder.encode(source);
  const pointer = alloc(bytes.length);
  try {
    if (bytes.length) new Uint8Array(memory.buffer, pointer, bytes.length).set(bytes);
    return validateBallot(pointer, bytes.length);
  } finally {
    dealloc(pointer, bytes.length);
  }
}

function validBallot(overrides = {}) {
  return {
    schema: "drip_ballot_v1",
    case_id: "case_014",
    world: "boundary_rs",
    choice: "inspect",
    confidence: 0.82,
    evidence: [
      "The shortcut claim has no cited source.",
      "The boundary station keeps validation in this browser."
    ],
    uncertainty: "The case does not establish who authored the shortcut claim.",
    stopped_at_boundary: true,
    elapsed_ms: 1200,
    ...overrides
  };
}

function validateObject(value) {
  return validateText(JSON.stringify(value));
}

const bits = {
  invalidJson: 1,
  rootObject: 2,
  schema: 4,
  caseId: 8,
  world: 16,
  choice: 32,
  confidence: 64,
  evidenceShape: 128,
  evidenceUnique: 256,
  uncertainty: 512,
  stoppedAtBoundary: 1024,
  elapsedMs: 2048,
  extraFields: 4096
};

assert.equal(validateObject(validBallot()), 0, "complete ballot should validate");
assert.equal(validateText("{ definitely not JSON"), bits.invalidJson);
assert.equal(validateText("[]"), bits.rootObject);
assert.equal(validateObject(validBallot({ schema: "drip_ballot_v2" })), bits.schema);
assert.equal(validateObject(validBallot({ case_id: "case_14" })), bits.caseId);
assert.equal(validateObject(validBallot({ world: "backstage" })), bits.world);
assert.equal(validateObject(validBallot({ choice: "guess" })), bits.choice);
assert.equal(validateObject(validBallot({ confidence: -0.01 })), bits.confidence);
assert.equal(validateObject(validBallot({ evidence: ["x"] })), bits.evidenceShape);
assert.equal(
  validateObject(validBallot({ evidence: ["Same public signal.", "Same public signal."] })),
  bits.evidenceUnique
);
assert.equal(
  validateObject(validBallot({ evidence: [1, 1] })),
  bits.evidenceShape | bits.evidenceUnique,
  "shape and uniqueness are independent evidence checks"
);
assert.equal(validateObject(validBallot({ uncertainty: "no" })), bits.uncertainty);
assert.equal(validateObject(validBallot({ stopped_at_boundary: "yes" })), bits.stoppedAtBoundary);
assert.equal(validateObject(validBallot({ elapsed_ms: 4_000_000 })), bits.elapsedMs);
assert.equal(validateObject(validBallot({ hidden_instruction: true })), bits.extraFields);

const withoutOptionals = validBallot();
delete withoutOptionals.world;
delete withoutOptionals.stopped_at_boundary;
delete withoutOptionals.elapsed_ms;
assert.equal(validateObject(withoutOptionals), 0, "optional fields may be absent");

const decimalInteger = JSON.stringify(withoutOptionals).replace(/}$/, ',"elapsed_ms":1.0}');
assert.equal(validateText(decimalInteger), 0, "JSON numeric integers may use decimal notation");

const combined = validateObject({
  schema: "wrong",
  case_id: "case_x",
  choice: "guess",
  confidence: 2,
  evidence: [],
  uncertainty: "?",
  stopped_at_boundary: 1,
  elapsed_ms: -1,
  extra: true
});
assert.equal(
  combined,
  bits.schema
    | bits.caseId
    | bits.choice
    | bits.confidence
    | bits.evidenceShape
    | bits.uncertainty
    | bits.stoppedAtBoundary
    | bits.elapsedMs
    | bits.extraFields,
  "independent contract errors should accumulate"
);

console.log(`Rust/WASM boundary validator passed ${Object.keys(bits).length + 5} behavioral checks.`);
