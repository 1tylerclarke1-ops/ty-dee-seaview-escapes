// Build-time guard against drift between the client pricing rules
// (src/lib/pricing.js) and the server pricing rules
// (base44/shared/bookingRules.ts + base44/shared/pricing.ts).
//
// The platform keeps base44/ (server) and src/ (client) in separate module
// trees — neither can import the other — so the season/rule data is
// duplicated by design. The server file is the canonical source of truth
// (it is what actually enforces the rules); the client is a mirror that
// MUST match it exactly. This script enforces that equality and is wired
// into vite.config.js so it runs on every `vite build` and dev start,
// failing loudly on any mismatch.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

// Extracts the first balanced {…} or […] block following `marker` in `src`,
// then evaluates it as a pure-data literal. The pricing/rule blocks contain
// only numbers, strings, arrays and objects, so this is safe at build time.
function extractBlock(src, marker) {
  const at = src.indexOf(marker);
  if (at === -1) throw new Error(`[pricing drift] marker not found in source: ${marker}`);
  let i = at + marker.length;
  while (i < src.length && src[i] !== "{" && src[i] !== "[") i++;
  if (i >= src.length) throw new Error(`[pricing drift] no opening delimiter after: ${marker}`);
  const open = src[i];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let j = i;
  let str = null;
  while (j < src.length) {
    const c = src[j];
    if (str) {
      if (c === "\\") { j += 2; continue; }
      if (c === str) str = null;
      j++;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { str = c; j++; continue; }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) { j++; break; } }
    j++;
  }
  if (depth !== 0) throw new Error(`[pricing drift] unbalanced block for: ${marker}`);
  return src.slice(i, j);
}

function evalBlock(block) {
  return new Function(`"use strict"; return (${block});`)();
}

function check(label, fn) {
  try {
    fn();
  } catch (e) {
    const err = new Error(`[pricing drift] ${label}\n${e.message}`);
    err.cause = e;
    throw err;
  }
}

// Pricing scalars that must match across client and server. booking_window_months
// is client-only (the server does not enforce a booking window), and seasons
// are compared separately, so both are excluded here.
const SHARED_SCALAR_KEYS = [
  "price_rounding",
  "short_break_supplement",
  "dog_fee",
  "dog_fee_per_dog",
  "max_dogs",
  "deposit_percentage",
  "balance_due_days_before_arrival",
];

export function checkPricingDrift() {
  const clientSrc = fs.readFileSync(path.join(root, "src/lib/pricing.js"), "utf8");
  const rulesSrc = fs.readFileSync(path.join(root, "base44/shared/bookingRules.ts"), "utf8");
  const pricingSrc = fs.readFileSync(path.join(root, "base44/shared/pricing.ts"), "utf8");

  // 1. Seasons — names, dates, nightly rates, weekend modifiers.
  const clientSeasons = evalBlock(extractBlock(clientSrc, "seasons:"));
  const serverSeasons = evalBlock(extractBlock(rulesSrc, "export const SEASONS ="));
  check("SEASONS — src/lib/pricing.js seasons ≠ base44/shared/bookingRules.ts SEASONS", () => {
    assert.deepStrictEqual(clientSeasons, serverSeasons);
  });

  // 2. Booking rules — rule type, multiples, max length, per-day fixed lengths,
  //    and season overrides (allowed lengths + arrival days).
  const clientRules = evalBlock(extractBlock(clientSrc, "export const BOOKING_RULES ="));
  const serverRules = evalBlock(extractBlock(rulesSrc, "export const BOOKING_RULES ="));
  check("BOOKING_RULES — src/lib/pricing.js ≠ base44/shared/bookingRules.ts", () => {
    assert.deepStrictEqual(clientRules, serverRules);
  });

  // 3. Shared pricing scalars (deposit %, dog fee, rounding, etc.).
  const clientSettings = evalBlock(extractBlock(clientSrc, "export const PRICING_SETTINGS ="));
  const serverSettings = evalBlock(extractBlock(pricingSrc, "export const PRICING_SETTINGS ="));
  for (const key of SHARED_SCALAR_KEYS) {
    check(`PRICING_SETTINGS.${key} — src/lib/pricing.js ≠ base44/shared/pricing.ts`, () => {
      assert.deepStrictEqual(clientSettings[key], serverSettings[key]);
    });
  }

  // 4. Runtime fingerprint function — must be byte-identical on client and
  //    server so the runtime hash comparison is meaningful. The client sends
  //    its fingerprint with each booking request; the server compares it with
  //    its own and refuses the booking on mismatch.
  const clientFpSrc = fs.readFileSync(path.join(root, "src/lib/pricingFingerprint.js"), "utf8");
  const serverFpSrc = fs.readFileSync(path.join(root, "base44/shared/pricingFingerprint.ts"), "utf8");
  const clientFp = extractBlock(clientFpSrc, "export function pricingFingerprint");
  const serverFp = extractBlock(serverFpSrc, "export function pricingFingerprint");
  check("pricingFingerprint — src/lib/pricingFingerprint.js ≠ base44/shared/pricingFingerprint.ts", () => {
    assert.strictEqual(clientFp, serverFp);
  });
}

// Allow `node scripts/checkPricingDrift.mjs` to run standalone.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    checkPricingDrift();
    console.log("[pricing drift] OK — client and server pricing rules match");
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}