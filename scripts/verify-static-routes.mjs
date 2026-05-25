import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { handleHealth, handleRooms, handleTracks } from "../src/race-api/handlers.mjs";

const ROOT = process.cwd();
const SITE_ORIGIN = "https://dripcouncil.org";
const INTENTIONAL_COURSE_LINKS = new Set(["index.html#not-a-real-station"]);
const API_ROUTES = new Set(["/api/race/health", "/api/race/tracks", "/api/race/rooms"]);

function read(relativePath) {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function fileForRoute(routePath) {
  if (routePath === "/") return "index.html";
  const cleanPath = routePath.replace(/^\/+/, "");
  if (cleanPath === "") return "index.html";
  return cleanPath;
}

function htmlHasAnchor(relativePath, anchor) {
  if (!anchor) return true;
  const html = read(relativePath);
  const safe = escapeRegex(anchor);
  return new RegExp(`\\bid=[\"']${safe}[\"']`).test(html) || new RegExp(`\\bname=[\"']${safe}[\"']`).test(html);
}

function normalizeLink(href, sourceFile) {
  if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) return null;
  if (href.startsWith("https://buy.stripe.com/") || href.startsWith("https://checkout.stripe.com/")) return null;
  if (href.startsWith("http://") || href.startsWith("https://")) {
    const url = new URL(href);
    assert.equal(url.origin, SITE_ORIGIN, `${sourceFile} links outside the reviewed public site: ${href}`);
    return `${url.pathname}${url.hash}`;
  }
  return href;
}

function resolveRoute(href, sourceFile) {
  const normalized = normalizeLink(href, sourceFile);
  if (!normalized) return null;

  if (normalized.startsWith("#")) {
    return {
      routePath: `/${sourceFile}`,
      file: sourceFile,
      anchor: normalized.slice(1),
      href: normalized
    };
  }

  const base = new URL(`https://local.test/${sourceFile}`);
  const url = new URL(normalized, base);
  return {
    routePath: url.pathname,
    file: fileForRoute(url.pathname),
    anchor: url.hash.slice(1),
    href: normalized
  };
}

function assertRoute(route, sourceFile) {
  if (!route) return;
  const intentionalKey = `${sourceFile}#${route.anchor}`;
  if (INTENTIONAL_COURSE_LINKS.has(intentionalKey)) return;
  if (API_ROUTES.has(route.routePath)) return;

  assert.ok(existsSync(path.join(ROOT, route.file)), `${sourceFile} links to missing route ${route.href}`);
  if (route.file.endsWith(".html")) {
    assert.ok(htmlHasAnchor(route.file, route.anchor), `${sourceFile} links to missing anchor ${route.href}`);
  }
}

function extractAnchorHrefs(html) {
  return [...html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)].map((match) => match[1]);
}

const sitemap = read("sitemap.xml");
const sitemapRoutes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
for (const routePath of sitemapRoutes) {
  assert.equal(new URL(`${SITE_ORIGIN}${routePath}`).origin, SITE_ORIGIN, `bad sitemap route ${routePath}`);
  assert.ok(existsSync(path.join(ROOT, fileForRoute(routePath))), `sitemap links to missing route ${routePath}`);
}

const htmlFiles = [
  "index.html",
  "support.html",
  "race.html",
  "race-broadcast.html",
  "race-lab.html",
  "gallery.html",
  "hall-of-fame.html",
  "collab.html",
  "seasons/summer-2026.html",
  "challenges.html",
  "template.html",
  "changelog.html",
  "observability.html",
  "runbook.html",
  "intake.html",
  "404.html"
];

for (const sourceFile of htmlFiles) {
  const html = read(sourceFile);
  for (const href of extractAnchorHrefs(html)) {
    assertRoute(resolveRoute(href, sourceFile), sourceFile);
  }
}

async function readJson(response) {
  return JSON.parse(await response.text());
}

function context(routePath, init = {}) {
  return {
    request: new Request(`${SITE_ORIGIN}${routePath}`, init)
  };
}

const health = await handleHealth(context("/api/race/health"));
assert.equal(health.status, 200, "race health route should respond");
assert.equal((await readJson(health)).backend_status.persistence, "not_enabled");

const tracks = await handleTracks(context("/api/race/tracks"));
assert.equal(tracks.status, 200, "race tracks route should respond");
assert.equal((await readJson(tracks)).safety.persistence_enabled, false);

const rooms = await handleRooms(context("/api/race/rooms"));
assert.equal(rooms.status, 200, "race rooms route should respond");
assert.equal((await readJson(rooms)).durable_object.websocket_enabled, false);

console.log("static-routes-ok");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
