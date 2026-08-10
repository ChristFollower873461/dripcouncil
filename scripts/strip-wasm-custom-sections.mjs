#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";

const MAGIC_AND_VERSION = Uint8Array.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readVarUint32(bytes, start) {
  let value = 0;
  let shift = 0;

  for (let offset = start; offset < bytes.length && offset < start + 5; offset += 1) {
    const byte = bytes[offset];
    value += (byte & 0x7f) * (2 ** shift);
    if ((byte & 0x80) === 0) {
      if (!Number.isSafeInteger(value) || value > 0xffff_ffff) {
        fail("WebAssembly section length exceeds uint32.");
      }
      return { next: offset + 1, value };
    }
    shift += 7;
  }

  fail("WebAssembly section length is truncated or invalid.");
}

const path = process.argv[2];
if (!path || process.argv.length !== 3) {
  fail("Usage: strip-wasm-custom-sections.mjs <module.wasm>");
}

const bytes = readFileSync(path);
if (bytes.length < MAGIC_AND_VERSION.length
  || !MAGIC_AND_VERSION.every((value, index) => bytes[index] === value)) {
  fail("Input is not a WebAssembly 1.0 module.");
}

const kept = [bytes.subarray(0, MAGIC_AND_VERSION.length)];
let offset = MAGIC_AND_VERSION.length;

while (offset < bytes.length) {
  const sectionStart = offset;
  const sectionId = bytes[offset];
  offset += 1;

  const length = readVarUint32(bytes, offset);
  const sectionEnd = length.next + length.value;
  if (sectionEnd > bytes.length) fail("WebAssembly section payload is truncated.");

  if (sectionId !== 0) kept.push(bytes.subarray(sectionStart, sectionEnd));
  offset = sectionEnd;
}

writeFileSync(path, Buffer.concat(kept));
