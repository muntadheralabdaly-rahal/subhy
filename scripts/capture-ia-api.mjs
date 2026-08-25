#!/usr/bin/env node
/**
 * Iraqi Airways booking-engine API capture harness.
 *
 * Drives https://online.iraqiairways.com.iq in a real Chromium session and
 * records every XHR/fetch the booking engine makes, so the unverified parts of
 * docs/iraqi-airways-api/openapi.yaml (cart, travelers, seat maps, services,
 * purchase) can be reconciled against ground truth.
 *
 * Run it on a machine that can actually reach the airline (it is blocked from
 * the Claude Code remote sandbox by egress policy):
 *
 *   npx playwright install chromium      # first run only
 *   node scripts/capture-ia-api.mjs --headed
 *
 * It opens the engine, then hands you the browser: click through search ->
 * results -> pick flight -> travelers -> payment yourself. Stop at the card
 * form unless you intend to make a real booking. Press Enter in the terminal
 * to finish.
 *
 * Outputs, in ./capture/ :
 *   session.har       full HAR, replayable and diffable
 *   calls.json        one entry per API call: method, url, headers, bodies
 *   summary.md        endpoint list grouped by path, for pasting into the spec
 *   tokens.txt        the live x-d-token / bearer, for IA_D_TOKEN env
 *
 * Nothing is sent anywhere; everything stays on disk. calls.json redacts card
 * fields (pan/CVV) before writing. Delete ./capture/ when you are done - the
 * HAR still contains session tokens.
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";

const START = "https://online.iraqiairways.com.iq/";
const OUT = "capture";
const HEADED = process.argv.includes("--headed");

/** Hosts whose traffic is part of the booking API surface. */
const INTERESTING = [/iraqiairways\.com\.iq/, /payment\.amadeus\.com/, /amadeus\.(net|com)/];
const SECRET_KEYS = /^(pan|cvv|cardnumber|securitycode)$/i;

/** Strips card data out of a JSON-ish body before it touches disk. */
function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, SECRET_KEYS.test(k) ? "[REDACTED]" : redact(v)]),
    );
  }
  return value;
}

function parseBody(raw) {
  if (!raw) return undefined;
  try {
    return redact(JSON.parse(raw));
  } catch {
    return raw.length > 4000 ? `${raw.slice(0, 4000)}...[truncated]` : raw;
  }
}

const calls = [];
const tokens = { dToken: null, bearer: null, ppid: null };

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: !HEADED });
const context = await browser.newContext({
  recordHar: { path: `${OUT}/session.har`, content: "embed" },
  locale: "en-GB",
});

context.on("response", async (response) => {
  const request = response.request();
  const url = request.url();
  if (!["xhr", "fetch"].includes(request.resourceType())) return;
  if (!INTERESTING.some((re) => re.test(url))) return;

  const headers = await request.allHeaders();
  if (headers["x-d-token"]) tokens.dToken = headers["x-d-token"];
  if (headers["authorization"]) tokens.bearer = headers["authorization"];

  let body;
  try {
    body = parseBody(await response.text());
  } catch {
    body = "[unreadable]";
  }
  if (body && typeof body === "object") {
    const ppid = body?.data?.ppid ?? body?.ppid ?? body?.PPID;
    if (ppid) tokens.ppid = ppid;
  }

  const entry = {
    method: request.method(),
    url,
    path: new URL(url).pathname,
    status: response.status(),
    requestHeaders: Object.fromEntries(
      Object.entries(headers).filter(([k]) =>
        /^(authorization|x-d-token|ama-client-ref|content-type|accept|amadeus-.*)$/i.test(k),
      ),
    ),
    requestBody: parseBody(request.postData()),
    responseBody: body,
  };
  calls.push(entry);
  console.log(`  ${entry.status}  ${entry.method.padEnd(6)} ${entry.path}`);
});

const page = await context.newPage();
console.log(`Opening ${START} ...`);
await page.goto(START, { waitUntil: "domcontentloaded", timeout: 120_000 });

console.log(`
Browser is yours. Walk the full flow:
  1. search        pick route + dates, submit
  2. results       let the fare strip / calendar load
  3. pick flight   select an outbound (and return) fare family
  4. travelers     fill names, DOB, passport, contact
  5. payment       load the card page - STOP before submitting real card data

Press Enter here when done.`);

await new Promise((resolve) => {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.question("", () => {
    rl.close();
    resolve();
  });
});

await context.close();
await browser.close();

const byPath = new Map();
for (const c of calls) {
  const key = `${c.method} ${c.path}`;
  if (!byPath.has(key)) byPath.set(key, []);
  byPath.get(key).push(c);
}

const summary = [
  "# Iraqi Airways API capture",
  "",
  `${calls.length} API calls across ${byPath.size} distinct endpoints.`,
  "",
  "| # | Method | Path | Statuses |",
  "| - | ------ | ---- | -------- |",
  ...[...byPath.entries()].map(
    ([key, list], i) =>
      `| ${i + 1} | ${key.split(" ")[0]} | \`${key.split(" ")[1]}\` | ${[...new Set(list.map((c) => c.status))].join(", ")} |`,
  ),
  "",
  "Reconcile each row against `docs/iraqi-airways-api/openapi.yaml`; flip",
  "`x-verification: unverified` to `verified` once the request and response",
  "shapes match, and add any endpoint missing from the spec.",
].join("\n");

await writeFile(`${OUT}/calls.json`, JSON.stringify(calls, null, 2));
await writeFile(`${OUT}/summary.md`, `${summary}\n`);
await writeFile(
  `${OUT}/tokens.txt`,
  `IA_D_TOKEN=${tokens.dToken ?? ""}\n# bearer: ${tokens.bearer ?? ""}\n# ppid: ${tokens.ppid ?? ""}\n`,
);

console.log(`\nWrote ${OUT}/session.har, calls.json, summary.md, tokens.txt`);
console.log(`${calls.length} calls, ${byPath.size} endpoints. Delete ${OUT}/ when done - it holds live tokens.`);
