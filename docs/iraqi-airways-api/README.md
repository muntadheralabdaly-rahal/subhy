# Iraqi Airways booking API

`openapi.yaml` in this folder is an unofficial OpenAPI 3.0.3 description of the
private APIs behind the Iraqi Airways online booking engine.

## What the platform actually is

`www.iraqiairways.com.iq` is a marketing site. Booking is handed off to
`online.iraqiairways.com.iq`, a **Amadeus Digital Experience Suite (Digital
Commerce)** deployment, which talks to a REST/JSON gateway at
`api-des.iraqiairways.com.iq`. Card capture is handed off again, to **Amadeus
Checkout** at `paypages.payment.amadeus.com`. Iraqi Airways publishes no
third-party API — this is the engine's own traffic.

Two hosts, two credentials:

| Host | Auth | Notes |
| ---- | ---- | ----- |
| `api-des.iraqiairways.com.iq` | OAuth2 bearer + `x-d-token` | Behind Imperva |
| `paypages.payment.amadeus.com` | `PPID` payment session only | No bearer |

## The flow

| Step | Operation | Status |
| ---- | --------- | ------ |
| 0. auth | `POST /v1/security/oauth2/token/initialization` | verified |
| 1. search | `POST /v2/search/air-bounds` | verified |
| 1b. fare strip | `POST /v2/search/air-calendars` | verified |
| 2. pick flight | `POST /v2/shopping/carts` | unverified |
| 2b. baggage quote | `GET /v2/shopping/baggage-policies` | verified |
| 3. add traveler | `PUT /v2/shopping/carts/{cartId}/travelers` | unverified |
| 3b. seats | `GET /v2/shopping/carts/{cartId}/air-offers/seat-maps` | unverified |
| 3c. ancillaries | `POST /v2/shopping/carts/{cartId}/services` | unverified |
| 4. purchase | `POST /v2/shopping/carts/{cartId}/purchase` | unverified |
| 4b. retrieve | `GET /v2/booking/flight-orders/{orderId}` | unverified |
| 5. pay / OTP | `POST /1ASIATP/ARIAPP/pay` | verified |

**`verified`** means the path, headers, request body and response mapping are
implemented and exercised in this repository — `src/services/ia.server.ts` and
`src/services/amadeusPay.server.ts` are the source of truth for those five.

**`unverified`** means the step exists in the UI flow and the path follows the
Amadeus Digital Commerce convention, but it has not been confirmed against a
live capture. Treat those as a template to reconcile, not as fact.

## Filling in the unverified half

The airline's hosts are blocked from the Claude Code remote sandbox by egress
policy, so the live walkthrough has to happen on a machine that can reach them:

```sh
npm i -D playwright                 # not a project dependency; install on demand
npx playwright install chromium     # the browser Playwright drives
node scripts/capture-ia-api.mjs --headed
```

It opens the booking engine and hands you the browser. Click search → results →
pick flight → travelers → payment yourself, stopping before you submit real card
data, then press Enter. You get `capture/session.har`, `capture/calls.json`,
`capture/summary.md` (an endpoint table to diff against this spec) and
`capture/tokens.txt` (a fresh `IA_D_TOKEN`). Card fields are redacted from
`calls.json`; the HAR is not redacted, so delete `capture/` when you are done.

## Running subhy against live inventory

`flightService` is live-Iraqi-Airways-only — no simulated carriers are mixed in
— so the results page shows its error state until the gateway answers. Three
env vars make it answer:

```sh
export IA_D_TOKEN=...        # required; from capture/tokens.txt or DevTools
export IA_CLIENT_ID=...      # booking SPA client id
export IA_CLIENT_SECRET=...  # matching secret
# or, instead of the client pair, a browser-lifted bearer (expires within the hour):
# export IA_BEARER_TOKEN=...

npm install
npm run dev                  # http://localhost:8080
```

Confirm the credentials work before opening the app — this prints real offers
straight from the gateway and fails loudly if the device token is stale:

```sh
node scripts/ia-search.mjs BGW DXB 2026-09-14
```

To get `IA_D_TOKEN` in the first place, run the capture harness and let it walk
a real session; it writes the live token to `capture/tokens.txt`. Or grab it by
hand from DevTools → Network → any `api-des` request → the `x-d-token` request
header.

The token dies with the browser session it came from. A `403`, or a non-JSON
response body, means re-capture it.

### If a script will not start

`Cannot find module .../scripts/capture-ia-api.mjs` means you are on another
branch — these scripts live on the branch that introduced them:

```sh
git fetch origin claude/iraqi-airways-api-swagger-g1s3v4
git checkout claude/iraqi-airways-api-swagger-g1s3v4
```

`Cannot find package 'playwright'` means the package is missing: run
`npm i -D playwright`. `npx playwright install` only fetches browsers, not the
package itself. `scripts/ia-search.mjs` has no dependencies and needs neither.

### If the install or dev server misbehaves

- `bun install` may 403 against Lovable's private registry when you are not
  authenticated to it. `npm install --registry https://registry.npmjs.org`
  works from package.json and sidesteps the pinned lockfile URLs.
- The dev server binds `::` by default. On an IPv4-only host that fails with
  `EAFNOSUPPORT`; run `npm run dev -- --host 127.0.0.1 --port 8080`.

## Gotchas worth knowing before you integrate

- **Dictionary compression.** Search responses reference flights and fare
  families by id; the objects live under `dictionaries`. You must join.
- **Scaled money.** Divide amounts by `10 ** dictionaries.currency[code].decimalPlaces`.
  IQD is 0 decimal places — never assume 2.
- **Empty results arrive as errors.** Error code `7959` ("NO FLIGHTS FOUND") is
  a valid zero-inventory answer, not a transport failure.
- **`flexibility` is outbound-only** on `air-calendars`; the gateway rejects it
  on the return bound.
- **`fact` is mandatory** on token minting, but `{}` is accepted.
- **Durations are seconds**, not minutes.
- **Travelers are a list, not counts** — one entry per passenger.
- **Imperva 403s are HTML**, not JSON. Parse defensively, and re-capture
  `x-d-token` from a browser when they start.
- **Payment status is inconsistent.** Normalise across `status` / `state` /
  `action`, and the reference across `reference` / `challenge.reference` /
  `transactionId` / `paymentId`. Iraqi issuers challenge by default — treat an
  unrecognised status as OTP-required, never as approved.
- **Never log or persist PAN/CVV.** Forward straight to Amadeus.

## Viewing the spec

```sh
npx @redocly/cli preview-docs docs/iraqi-airways-api/openapi.yaml
```

## Legal note

These are private, unpublished APIs behind bot protection. Reverse-engineered
access is not a supported integration and may breach the airline's terms —
`src/services/iraqiAirways.ts` keeps a deep-link handoff as the supported path.
Get a commercial agreement before shipping anything that depends on this.
