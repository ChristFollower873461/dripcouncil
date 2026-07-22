#!/usr/bin/env sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
project_root=$(CDPATH= cd -- "$script_dir/.." && pwd)
manifest="$project_root/rust/boundary-validator/Cargo.toml"
target="wasm32-unknown-unknown"
artifact="$project_root/rust/boundary-validator/target/$target/release/boundary_validator.wasm"
destination="$project_root/wasm/boundary_validator.wasm"

if ! command -v rustup >/dev/null 2>&1 || ! rustup target list --installed | grep -qx "$target"; then
  echo "Missing Rust target: $target" >&2
  echo "Install it with: rustup target add $target" >&2
  exit 1
fi

cargo build --locked --release --target "$target" --manifest-path "$manifest"
mkdir -p "$project_root/wasm"
cp "$artifact" "$destination"
chmod 644 "$destination"

byte_count=$(wc -c < "$destination" | tr -d ' ')
echo "Built wasm/boundary_validator.wasm ($byte_count bytes)"
