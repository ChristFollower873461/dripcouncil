#!/usr/bin/env sh
# Regenerates the shipped images in assets/hashed/ from the masters in assets-src/.
# Developer tool only; CI and scripts/build.sh never run it. Needs ImageMagick (magick), cwebp and avifenc.
#
# Every output name carries the first 8 hex characters of its own SHA-256, so a changed file
# always gets a new URL. That is what makes the long immutable cache in _headers safe.
# After running, update the <picture>/<img> references to the printed names.
set -eu

src=assets-src
out=assets/hashed
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$out"

emit() { # emit <built-file> <base-name> <extension>
  hash=$(shasum -a 256 "$1" | cut -c1-8)
  cp "$1" "$out/$2.$hash.$3"
  printf '%s %s bytes\n' "$out/$2.$hash.$3" "$(wc -c < "$1" | tr -d ' ')"
}

photo() { # photo <master.png> <base-name> <width>
  magick "$src/$1" -resize "$3x" -strip "$tmp/$2-$3.png"
  cwebp -quiet -q 78 -m 6 "$tmp/$2-$3.png" -o "$tmp/$2-$3.webp"
  avifenc -q 60 -s 4 "$tmp/$2-$3.png" "$tmp/$2-$3.avif" > /dev/null
  emit "$tmp/$2-$3.webp" "$2-$3" webp
  emit "$tmp/$2-$3.avif" "$2-$3" avif
}

rm -f "$out"/*

# Masters are 960 and 900 px wide, so those are the largest honest sizes.
photo council-chamber.png council-chamber 960
photo council-chamber.png council-chamber 640
photo fifth-seat-studio.png fifth-seat-studio 900
photo fifth-seat-studio.png fifth-seat-studio 600

# Small logo for the 30-38 px header and footer slots (96 px covers 2x and 3x screens).
magick assets/drip-mark.png -resize 96x96 -strip "$tmp/drip-mark-96.png"
cwebp -quiet -q 90 -m 6 "$tmp/drip-mark-96.png" -o "$tmp/drip-mark-96.webp"
emit "$tmp/drip-mark-96.webp" drip-mark-96 webp
emit "$tmp/drip-mark-96.png" drip-mark-96 png
