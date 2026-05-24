import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REQUIRED_CSP_PARTS = [
  "default-src 'self'",
  "img-src 'self' data:",
  "connect-src 'none'",
  "form-action 'none'",
  "base-uri 'self'",
  "object-src 'none'"
];
const STRIPE_NAVIGATE = "navigate-to 'self' https://buy.stripe.com https://checkout.stripe.com";
const STRIPE_URL_PATTERN = /^https:\/\/(buy|checkout)\.stripe\.com\//;
const SUPPORT_ACTIONS = ["found", "consent-demo", "handoff-demo", "paid", "reset"];

function read(relativePath) {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function listHtmlFiles(directory = ROOT, files = []) {
  for (const entry of readdirSync(directory)) {
    if (entry === ".git" || entry === "dist" || entry === "node_modules") continue;
    const fullPath = path.join(directory, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      listHtmlFiles(fullPath, files);
    } else if (entry.endsWith(".html")) {
      files.push(path.relative(ROOT, fullPath));
    }
  }
  return files.sort();
}

function assertCsp(relativePath, csp) {
  assert.ok(csp, `${relativePath} is missing CSP`);
  for (const part of REQUIRED_CSP_PARTS) {
    assert.ok(csp.includes(part), `${relativePath} CSP missing ${part}`);
  }
}

const headersCsp = /Content-Security-Policy:\s*(.+)/.exec(read("_headers"))?.[1]?.trim();
assertCsp("_headers", headersCsp);
assert.ok(headersCsp.includes("frame-ancestors 'none'"), "_headers CSP must block framing");
assert.ok(headersCsp.includes(STRIPE_NAVIGATE), "_headers CSP must limit Stripe navigation targets");

for (const htmlPath of listHtmlFiles()) {
  const html = read(htmlPath);
  const csp = /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i.exec(html)?.[1]?.trim();
  assertCsp(htmlPath, csp);
  assert.ok(!/connect-src\s+(?!'none')/.test(csp), `${htmlPath} must not allow network connections`);
  assert.ok(!/form-action\s+(?!'none')/.test(csp), `${htmlPath} must not allow form posts`);
}

const support = read("support.html");
assert.equal((support.match(/data-support-consent=/g) || []).length, 4, "support consent gate must keep four acknowledgements");
assert.equal((support.match(/data-donation-option=/g) || []).length, 4, "support page must expose four donation options");
assert.equal((support.match(/<a\s+href="#"\s+class="donation-link"/g) || []).length, 4, "donation links must render locked before consent");
assert.ok(support.includes("Agents must not choose an option"), "support page must state agent payment boundary");
assert.ok(support.includes("No Stripe keys"), "support page must state no Stripe keys are stored");
for (const action of SUPPORT_ACTIONS) {
  assert.ok(support.includes(`data-support-action="${action}"`), `support timing demo missing ${action}`);
}

const stripeLinksBlock = /const STRIPE_PAYMENT_LINKS = \{([\s\S]+?)\n    \};/.exec(support)?.[1] || "";
const stripeLinks = [...stripeLinksBlock.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
assert.equal(stripeLinks.length, 4, "support page must configure exactly four Stripe-hosted links");
for (const url of stripeLinks) {
  assert.ok(STRIPE_URL_PATTERN.test(url), `support link must stay on Stripe-hosted domains: ${url}`);
}

const outboundPatterns = [
  new RegExp(["f", "etch"].join("") + "\\s*\\("),
  /navigator\s*\.\s*sendBeacon/,
  /XMLHttpRequest/,
  /localStorage/,
  /sessionStorage/
];
for (const pattern of outboundPatterns) {
  assert.ok(!pattern.test(support), `support page must stay local/static for ${pattern}`);
}

const agent = JSON.parse(read("agent.json"));
const wellKnownAgent = JSON.parse(read(".well-known/agent.json"));
assert.deepEqual(agent, wellKnownAgent, "agent manifests must match");
assert.ok(agent.safety.human_support_policy.includes("must not pressure"), "agent support policy must block pressure");
assert.ok(agent.safety.support_timing_policy.includes("local-demo-only"), "agent timing policy must remain local-only");
assert.ok(agent.safety.disallowed.includes("agent-initiated payments"), "agent disallowed list must block payment initiation");

const supportCommands = agent.commands.filter((command) => command.name.includes("support"));
assert.ok(supportCommands.length >= 2, "agent manifest must describe support commands");
for (const command of supportCommands) {
  assert.ok(/do not|no payment/i.test(command.description), `support command must include a clear boundary: ${command.name}`);
  assert.ok(!/(may|can|should)\s+(open|choose|complete|initiate)/i.test(command.description), `support command overclaims: ${command.name}`);
}

console.log("boundary-check-ok");
