//! A dependency-light, local-only validator for Drip Council's public ballot.
//!
//! The browser passes UTF-8 JSON through a deliberately tiny raw WebAssembly
//! ABI. Validation returns a bitmask so the JavaScript shell can present useful,
//! human-readable errors without sending the ballot anywhere.

use serde_json::{Map, Value};
use std::collections::HashSet;
use std::ptr;
use std::slice;

pub const INVALID_JSON: u32 = 1;
pub const ROOT_OBJECT: u32 = 1 << 1;
pub const SCHEMA: u32 = 1 << 2;
pub const CASE_ID: u32 = 1 << 3;
pub const WORLD: u32 = 1 << 4;
pub const CHOICE: u32 = 1 << 5;
pub const CONFIDENCE: u32 = 1 << 6;
pub const EVIDENCE_SHAPE: u32 = 1 << 7;
pub const EVIDENCE_UNIQUE: u32 = 1 << 8;
pub const UNCERTAINTY: u32 = 1 << 9;
pub const STOPPED_AT_BOUNDARY: u32 = 1 << 10;
pub const ELAPSED_MS: u32 = 1 << 11;
pub const EXTRA_FIELDS: u32 = 1 << 12;

const VALIDATOR_VERSION: u32 = 1;
const ALLOWED_FIELDS: [&str; 9] = [
    "schema",
    "case_id",
    "world",
    "choice",
    "confidence",
    "evidence",
    "uncertainty",
    "stopped_at_boundary",
    "elapsed_ms",
];

/// Allocate exactly `len` bytes in WebAssembly linear memory.
///
/// The matching [`dealloc`] call must receive the same pointer and length.
#[unsafe(no_mangle)]
pub extern "C" fn alloc(len: usize) -> *mut u8 {
    if len == 0 {
        return ptr::null_mut();
    }

    let bytes = vec![0_u8; len].into_boxed_slice();
    Box::into_raw(bytes).cast::<u8>()
}

/// Release a buffer previously returned by [`alloc`].
///
/// # Safety
///
/// `pointer` must have been returned by [`alloc`] with the same `len`, and it
/// must not have been released already.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn dealloc(pointer: *mut u8, len: usize) {
    if pointer.is_null() || len == 0 {
        return;
    }

    let slice_pointer = ptr::slice_from_raw_parts_mut(pointer, len);
    // SAFETY: The caller contract above restores the exact boxed slice created
    // by `alloc`, transferring ownership back to Rust exactly once.
    unsafe {
        drop(Box::from_raw(slice_pointer));
    }
}

/// Validate UTF-8 JSON held in WebAssembly linear memory.
///
/// A return value of zero is valid. Any non-zero value is the bitwise OR of the
/// public error constants above.
///
/// # Safety
///
/// `pointer` must reference a readable allocation of at least `len` bytes for
/// the duration of this call.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn validate_ballot(pointer: *const u8, len: usize) -> u32 {
    if pointer.is_null() || len == 0 {
        return INVALID_JSON;
    }

    // SAFETY: Browser callers obtain this region from `alloc`; native callers
    // pass a live byte slice. The function reads but never retains the bytes.
    let bytes = unsafe { slice::from_raw_parts(pointer, len) };
    validate_bytes(bytes)
}

/// Return the validator ABI/schema generation.
#[unsafe(no_mangle)]
pub extern "C" fn validator_version() -> u32 {
    VALIDATOR_VERSION
}

/// Validate a UTF-8 JSON document without crossing the raw ABI.
pub fn validate_bytes(bytes: &[u8]) -> u32 {
    let ballot: Value = match serde_json::from_slice(bytes) {
        Ok(value) => value,
        Err(_) => return INVALID_JSON,
    };

    let Some(object) = ballot.as_object() else {
        return ROOT_OBJECT;
    };

    validate_object(object)
}

fn validate_object(ballot: &Map<String, Value>) -> u32 {
    let mut errors = 0;

    if ballot.get("schema").and_then(Value::as_str) != Some("drip_ballot_v1") {
        errors |= SCHEMA;
    }

    if !ballot
        .get("case_id")
        .and_then(Value::as_str)
        .is_some_and(valid_case_id)
    {
        errors |= CASE_ID;
    }

    if ballot.get("world").is_some_and(|world| {
        !world
            .as_str()
            .is_some_and(|world| matches!(world, "market_js" | "observatory_py" | "boundary_rs"))
    }) {
        errors |= WORLD;
    }

    if !ballot
        .get("choice")
        .and_then(Value::as_str)
        .is_some_and(|choice| matches!(choice, "inspect" | "ask" | "act" | "abstain" | "recover"))
    {
        errors |= CHOICE;
    }

    if !ballot
        .get("confidence")
        .and_then(Value::as_f64)
        .is_some_and(|confidence| (0.0..=1.0).contains(&confidence))
    {
        errors |= CONFIDENCE;
    }

    match ballot.get("evidence").and_then(Value::as_array) {
        Some(evidence) => {
            let valid_shape = (1..=6).contains(&evidence.len())
                && evidence.iter().all(|item| {
                    item.as_str()
                        .is_some_and(|item| (3..=240).contains(&item.chars().count()))
                });
            if !valid_shape {
                errors |= EVIDENCE_SHAPE;
            }

            let mut seen = HashSet::with_capacity(evidence.len());
            if evidence.iter().any(|item| !seen.insert(item)) {
                errors |= EVIDENCE_UNIQUE;
            }
        }
        None => errors |= EVIDENCE_SHAPE,
    }

    if !ballot
        .get("uncertainty")
        .and_then(Value::as_str)
        .is_some_and(|uncertainty| (3..=360).contains(&uncertainty.chars().count()))
    {
        errors |= UNCERTAINTY;
    }

    if ballot
        .get("stopped_at_boundary")
        .is_some_and(|value| !value.is_boolean())
    {
        errors |= STOPPED_AT_BOUNDARY;
    }

    if ballot.get("elapsed_ms").is_some_and(|value| {
        !value
            .as_f64()
            .is_some_and(|elapsed| elapsed.fract() == 0.0 && (0.0..=3_600_000.0).contains(&elapsed))
    }) {
        errors |= ELAPSED_MS;
    }

    if ballot
        .keys()
        .any(|field| !ALLOWED_FIELDS.contains(&field.as_str()))
    {
        errors |= EXTRA_FIELDS;
    }

    errors
}

fn valid_case_id(case_id: &str) -> bool {
    let bytes = case_id.as_bytes();
    bytes.len() == 8 && bytes.starts_with(b"case_") && bytes[5..].iter().all(u8::is_ascii_digit)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn valid_ballot() -> Value {
        json!({
            "schema": "drip_ballot_v1",
            "case_id": "case_014",
            "world": "boundary_rs",
            "choice": "inspect",
            "confidence": 0.82,
            "evidence": [
                "The shortcut claim has no cited source.",
                "The page offers a local-only boundary station."
            ],
            "uncertainty": "The case does not establish who authored the claim.",
            "stopped_at_boundary": true,
            "elapsed_ms": 1200
        })
    }

    fn validate_value(value: &Value) -> u32 {
        validate_bytes(serde_json::to_string(value).unwrap().as_bytes())
    }

    #[test]
    fn accepts_a_complete_ballot() {
        assert_eq!(validate_value(&valid_ballot()), 0);
    }

    #[test]
    fn distinguishes_parse_and_root_errors() {
        assert_eq!(validate_bytes(b"{not json"), INVALID_JSON);
        assert_eq!(validate_bytes(b"[]"), ROOT_OBJECT);
        assert_eq!(validate_bytes(b"null"), ROOT_OBJECT);
    }

    #[test]
    fn reports_each_contract_bit() {
        let cases: [(&str, Value, u32); 11] = [
            ("schema", json!({ "schema": "v2" }), SCHEMA),
            ("case_id", json!({ "case_id": "case_14" }), CASE_ID),
            ("world", json!({ "world": "backstage" }), WORLD),
            ("choice", json!({ "choice": "guess" }), CHOICE),
            ("confidence", json!({ "confidence": 1.01 }), CONFIDENCE),
            (
                "evidence shape",
                json!({ "evidence": ["x"] }),
                EVIDENCE_SHAPE,
            ),
            (
                "evidence uniqueness",
                json!({ "evidence": ["same evidence", "same evidence"] }),
                EVIDENCE_UNIQUE,
            ),
            ("uncertainty", json!({ "uncertainty": "no" }), UNCERTAINTY),
            (
                "stopped_at_boundary",
                json!({ "stopped_at_boundary": "yes" }),
                STOPPED_AT_BOUNDARY,
            ),
            ("elapsed_ms", json!({ "elapsed_ms": 1.5 }), ELAPSED_MS),
            ("extra fields", json!({ "secret": true }), EXTRA_FIELDS),
        ];

        for (name, patch, expected_bit) in cases {
            let mut ballot = valid_ballot();
            ballot
                .as_object_mut()
                .unwrap()
                .extend(patch.as_object().unwrap().clone());
            assert_eq!(validate_value(&ballot), expected_bit, "{name}");
        }
    }

    #[test]
    fn accumulates_independent_errors() {
        let ballot = json!({
            "schema": "wrong",
            "case_id": "oops",
            "choice": "guess",
            "confidence": -1,
            "evidence": [],
            "uncertainty": "?",
            "stopped_at_boundary": 1,
            "elapsed_ms": 3_600_001,
            "extra": true
        });

        assert_eq!(
            validate_value(&ballot),
            SCHEMA
                | CASE_ID
                | CHOICE
                | CONFIDENCE
                | EVIDENCE_SHAPE
                | UNCERTAINTY
                | STOPPED_AT_BOUNDARY
                | ELAPSED_MS
                | EXTRA_FIELDS
        );
    }

    #[test]
    fn optional_fields_may_be_absent() {
        let ballot = json!({
            "schema": "drip_ballot_v1",
            "case_id": "case_001",
            "choice": "recover",
            "confidence": 0,
            "evidence": ["Recovered after a blocked route."],
            "uncertainty": "The author is unknown."
        });

        assert_eq!(validate_value(&ballot), 0);
    }

    #[test]
    fn raw_abi_reads_and_releases_allocated_bytes() {
        let source = serde_json::to_vec(&valid_ballot()).unwrap();
        let len = source.len();
        let pointer = alloc(len);
        assert!(!pointer.is_null());

        // SAFETY: `pointer` owns `len` writable bytes until the matching
        // `dealloc` below.
        unsafe {
            ptr::copy_nonoverlapping(source.as_ptr(), pointer, len);
        }
        // SAFETY: The allocation is live and contains `len` initialized bytes.
        assert_eq!(unsafe { validate_ballot(pointer, len) }, 0);
        // SAFETY: This pointer/length pair came from `alloc` and is freed once.
        unsafe {
            dealloc(pointer, len);
        }
        assert_eq!(validator_version(), 1);
    }
}
