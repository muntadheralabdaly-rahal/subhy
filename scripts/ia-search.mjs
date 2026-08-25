#!/usr/bin/env node
/**
 * Live Iraqi Airways fare search - prints real offers from the airline gateway.
 *
 * Needs a device token captured from a real browser session. Get one with:
 *   node scripts/capture-ia-api.mjs --headed     # writes capture/tokens.txt
 *
 * Then:
 *   export IA_D_TOKEN=...            # required, from capture/tokens.txt
 *   export IA_CLIENT_ID=...          # booking SPA client id
 *   export IA_CLIENT_SECRET=...      # matching secret
 *   node scripts/ia-search.mjs BGW DXB 2026-09-14 [returnDate]
 *
 * Without IA_CLIENT_ID/SECRET it falls back to IA_BEARER_TOKEN (a bearer
 * lifted from a browser session - expires within the hour).
 *
 * Must run from a network that can reach the airline. The Claude Code remote
 * sandbox cannot: every *.iraqiairways.com.iq host is refused by egress policy.
 */
const [from = "BGW", to = "DXB", departDate, returnDate] = process.argv.slice(2);
if (!departDate) {
  console.error("usage: node scripts/ia-search.mjs <FROM> <TO> <YYYY-MM-DD> [RETURN]");
  process.exit(1);
}

const BASE = process.env["IA_API_BASE"] ?? "https://api-des.iraqiairways.com.iq";
const D_TOKEN = process.env["IA_D_TOKEN"];
if (!D_TOKEN) {
  console.error("IA_D_TOKEN is required - capture one with scripts/capture-ia-api.mjs --headed");
  process.exit(1);
}
const UA =
  "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36";
const browserish = {
  origin: "https://online.iraqiairways.com.iq",
  referer: "https://online.iraqiairways.com.iq/",
  "user-agent": UA,
};

async function mintToken() {
  const clientId = process.env["IA_CLIENT_ID"];
  const clientSecret = process.env["IA_CLIENT_SECRET"];
  if (!clientId || !clientSecret) {
    const fallback = process.env["IA_BEARER_TOKEN"];
    if (!fallback) throw new Error("set IA_CLIENT_ID + IA_CLIENT_SECRET, or IA_BEARER_TOKEN");
    return fallback;
  }
  const res = await fetch(`${BASE}/v1/security/oauth2/token/initialization`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
      "x-d-token": D_TOKEN,
      ...browserish,
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      fact: JSON.stringify({}),
    }).toString(),
  });
  if (!res.ok) throw new Error(`token mint failed [${res.status}] ${(await res.text()).slice(0, 200)}`);
  const { access_token: token } = await res.json();
  if (!token) throw new Error("token mint returned no access_token");
  return token;
}

const itineraries = [
  {
    departureDateTime: `${departDate}T00:00:00.000`,
    originLocationCode: from,
    destinationLocationCode: to,
    isRequestedBound: true,
  },
  ...(returnDate
    ? [{
        departureDateTime: `${returnDate}T00:00:00.000`,
        originLocationCode: to,
        destinationLocationCode: from,
        isRequestedBound: false,
      }]
    : []),
];

const bearer = await mintToken();
const res = await fetch(`${BASE}/v2/search/air-bounds`, {
  method: "POST",
  headers: {
    accept: "application/json",
    "content-type": "application/json",
    authorization: `Bearer ${bearer}`,
    "x-d-token": D_TOKEN,
    "ama-client-ref": `${crypto.randomUUID()}:0`,
    ...browserish,
  },
  body: JSON.stringify({
    commercialFareFamilies: ["eco"],
    itineraries,
    travelers: [{ passengerTypeCode: "ADT" }],
    searchPreferences: { showMilesPrice: false },
  }),
});

const text = await res.text();
if (!res.ok) {
  console.error(`air-bounds failed [${res.status}]`);
  console.error(text.slice(0, 400));
  if (res.status === 403) console.error("\n-> 403 usually means IA_D_TOKEN is stale. Re-capture it.");
  process.exit(1);
}

let json;
try {
  json = JSON.parse(text);
} catch {
  console.error("Non-JSON response - Imperva challenge. Re-capture IA_D_TOKEN.");
  process.exit(1);
}

if (json.errors?.length) {
  const noFlights = json.errors.some((e) => e.code === "7959");
  console.error(noFlights ? `No inventory for ${from}-${to} on ${departDate}.` : JSON.stringify(json.errors, null, 2));
  process.exit(noFlights ? 0 : 1);
}

const flights = json.dictionaries?.flight ?? {};
const families = json.dictionaries?.fareFamilyWithServices ?? {};
const currencies = json.dictionaries?.currency ?? {};
const rows = [];

for (const group of json.data?.airBoundGroups ?? []) {
  const legs = (group.boundDetails?.segments ?? [])
    .map((s) => flights[s.flightId])
    .filter(Boolean);
  const head = legs[0];
  const tail = legs[legs.length - 1];
  if (!head || !tail) continue;

  for (const bound of group.airBounds ?? []) {
    const price = bound.prices?.totalPrices?.[0];
    if (!price) continue;
    const scale = 10 ** (currencies[price.currencyCode]?.decimalPlaces ?? 0);
    rows.push({
      flight: legs.map((f) => `${f.marketingAirlineCode}${f.marketingFlightNumber}`).join(" + "),
      route: `${head.departure.locationCode}-${tail.arrival.locationCode}`,
      depart: head.departure.dateTime.replace("T", " ").slice(0, 16),
      arrive: tail.arrival.dateTime.replace("T", " ").slice(0, 16),
      stops: Math.max(0, legs.length - 1),
      fare: families[bound.fareFamilyCode ?? ""]?.fareFamilyName ?? bound.fareFamilyCode ?? "-",
      seats: bound.availabilityDetails?.[0]?.quota ?? "-",
      total: `${Math.round(price.total / scale).toLocaleString()} ${price.currencyCode}`,
    });
  }
}

if (!rows.length) {
  console.log("No offers returned.");
  process.exit(0);
}
console.log(`\n${rows.length} live offer(s) — ${from} → ${to} on ${departDate}\n`);
console.table(rows);
