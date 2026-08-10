#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isPlainCase, isSafeLocalPath, isValidBallot } from "./public-contracts.mjs";

const caseFile = JSON.parse(await readFile("cases/case_015.json", "utf8"));

assert.equal(isSafeLocalPath("/fifth-seat.html?case=case_015"), true);
assert.equal(isSafeLocalPath("/#live-case"), true);
assert.equal(isSafeLocalPath("//attacker.example"), false);
assert.equal(isSafeLocalPath("/\\\\attacker.example"), false);
assert.equal(isSafeLocalPath("/safe/../admin"), false);
assert.equal(isSafeLocalPath("https://attacker.example"), false);

assert.equal(isPlainCase(caseFile, "case_015"), true);
assert.equal(isValidBallot(caseFile.sample_ballot, "case_015"), true);

const unsafeLaunch = structuredClone(caseFile);
unsafeLaunch.launch.path = "/\\\\attacker.example";
assert.equal(isPlainCase(unsafeLaunch, "case_015"), false);

const oversizedSignals = structuredClone(caseFile);
oversizedSignals.public_signals = Array.from({ length: 13 }, (_, index) => `Signal ${index}`);
assert.equal(isPlainCase(oversizedSignals, "case_015"), false);

const extraBallotField = structuredClone(caseFile);
extraBallotField.sample_ballot.private_reasoning = "must not enter the public ballot";
assert.equal(isPlainCase(extraBallotField, "case_015"), false);

console.log("Public case and navigation contracts passed 12 checks.");
