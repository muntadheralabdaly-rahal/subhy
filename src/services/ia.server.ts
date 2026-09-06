/**
 * Iraqi Airways live availability + fare calendar (Amadeus Digital Experience
 * Suite, the engine behind online.iraqiairways.com.iq).
 *
 * Server-only. Two credentials are involved:
 *  - the OAuth2 access token: we mint it ourselves from the booking engine's
 *    public client credentials (IA_CLIENT_ID / IA_CLIENT_SECRET), cached in
 *    memory until shortly before it expires. No manual refresh needed.
 *  - the Imperva device token (IA_D_TOKEN): rotates with a real browser
 *    session and must be refreshed by hand. When it goes stale the airline
 *    edge answers 403; every call here then reports an EDGE_BLOCKED failure
 *    that the results screen shows verbatim instead of an empty list.
 */
import type {
  BaggageAllowance,
  BaggagePolicies,
  Cabin,
  FareDay,
  FlightOffer,
  FlightSearch,
  FlightSegment,
} from "./types";

const UA =
  "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36";

const TOKEN_URL_PATH = "/v1/security/oauth2/token/initialization";

type CachedToken = { value: string; expiresAt: number };
let tokenCache: CachedToken | null = null;

/**
 * Mints an access token the same way their booking SPA does. `fact` is
 * mandatory (the gateway rejects the request without it) but may be empty.
 */
async function accessToken(base: string, forceMint = false): Promise<string | null> {
  if (!forceMint && tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.value;

  const explicit = process.env["IA_BEARER_TOKEN"];
  const clientId = process.env["IA_CLIENT_ID"];
  const clientSecret = process.env["IA_CLIENT_SECRET"];
  const dToken = process.env["IA_D_TOKEN"];
  // Captured browser bearer tokens expire quickly. Prefer a freshly minted
  // token whenever the booking engine credentials are configured.
  if (!clientId || !clientSecret) return forceMint ? null : explicit ?? null;


  try {
    const res = await fetch(`${base}${TOKEN_URL_PATH}`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
        origin: "https://online.iraqiairways.com.iq",
        referer: "https://online.iraqiairways.com.iq/",
        "user-agent": UA,
        ...(dToken ? { "x-d-token": dToken } : {}),
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
        fact: JSON.stringify({}),
      }).toString(),
    });
    if (!res.ok) {
      console.error(`[IA] token mint failed [${res.status}]`);
      return forceMint ? null : explicit ?? null;
    }
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) return forceMint ? null : explicit ?? null;
    tokenCache = {
      value: json.access_token,
      expiresAt: Date.now() + (json.expires_in ?? 1800) * 1000,
    };
    return tokenCache.value;
  } catch (error) {
    console.error("[IA] token mint threw", error);
    return forceMint ? null : explicit ?? null;
  }
}

async function postWithBearer<T>(
  base: string,
  path: string,
  body: unknown,
  dToken: string,
  bearer: string,
): Promise<{ data: T | null; status: number; detail: string }> {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "accept-language": "en-US,en;q=0.9",
      "content-type": "application/json",
      authorization: `Bearer ${bearer}`,
      "x-d-token": dToken,
      "ama-client-ref": `${crypto.randomUUID()}:0`,
      origin: "https://online.iraqiairways.com.iq",
      referer: "https://online.iraqiairways.com.iq/",
      "user-agent": UA,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`[IA] ${path} failed [${res.status}]: ${text.slice(0, 200)}`);
    return { data: null, status: res.status, detail: text.slice(0, 200) };
  }
  try {
    return { data: JSON.parse(text) as T, status: res.status, detail: "" };
  } catch {
    console.error(`[IA] ${path} returned non-JSON (edge challenge)`);
    return {
      data: null,
      status: res.status,
      detail: "non-JSON body (Imperva challenge page)",
    };
  }
}

/**
 * Why a live call could not be served. Surfaced all the way to the results
 * screen so an empty page is never ambiguous: "no seats on this date" and
 * "our airline credentials expired" look identical otherwise.
 */
export type IaFailureCode =
  | "NO_D_TOKEN"
  | "NO_CREDENTIALS"
  | "TOKEN_MINT_FAILED"
  | "EDGE_BLOCKED"
  | "UPSTREAM_ERROR"
  | "NETWORK_ERROR";

export type IaFailure = { code: IaFailureCode; detail: string };
export type IaOutcome<T> =
  { ok: true; value: T } | { ok: false; failure: IaFailure };

function fail(
  code: IaFailureCode,
  detail: string,
): { ok: false; failure: IaFailure } {
  console.error(`[IA] ${code}: ${detail}`);
  return { ok: false, failure: { code, detail } };
}

/** Shared transport for the airline gateway. */
async function iaPost<T>(path: string, body: unknown): Promise<IaOutcome<T>> {
  const base =
    process.env["IA_API_BASE"] ?? "https://api-des.iraqiairways.com.iq";
  const dToken = process.env["IA_D_TOKEN"];
  if (!dToken) return fail("NO_D_TOKEN", "IA_D_TOKEN is not set on the server");
  if (!process.env["IA_CLIENT_ID"] && !process.env["IA_BEARER_TOKEN"]) {
    return fail(
      "NO_CREDENTIALS",
      "neither IA_CLIENT_ID/IA_CLIENT_SECRET nor IA_BEARER_TOKEN is set",
    );
  }
  const bearer = await accessToken(base);
  if (!bearer)
    return fail(
      "TOKEN_MINT_FAILED",
      "the gateway refused to mint an access token",
    );

  try {
    let res = await postWithBearer<T>(base, path, body, dToken, bearer);
    if (res.data) return { ok: true, value: res.data };
    if (res.status === 401) {
      tokenCache = null;
      const refreshed = await accessToken(base, true);
      if (refreshed) {
        res = await postWithBearer<T>(base, path, body, dToken, refreshed);
        if (res.data) return { ok: true, value: res.data };
      }
    }
    if (res.status === 401 || res.status === 403) {
      return fail(
        "EDGE_BLOCKED",
        `${path} → ${res.status}. The Imperva device token (IA_D_TOKEN) is stale; capture a fresh one from a real browser session.`,
      );
    }
    return fail("UPSTREAM_ERROR", `${path} → ${res.status}: ${res.detail}`);
  } catch (error) {
    return fail("NETWORK_ERROR", `${path} threw: ${String(error)}`);
  }
}

const CABIN_FAMILY: Record<Cabin, string> = {
  ECONOMY: "eco",
  PREMIUM_ECONOMY: "eco",
  BUSINESS: "business",
  FIRST: "business",
};

type IaFlight = {
  marketingAirlineCode: string;
  operatingAirlineCode?: string;
  marketingFlightNumber: string;
  departure: { locationCode: string; dateTime: string };
  arrival: { locationCode: string; dateTime: string };
  aircraftCode?: string;
  duration?: number;
};

type IaPrice = { base: number; total: number; currencyCode: string; totalTaxes?: number };

type IaAirBound = {
  airBoundId: string;
  fareFamilyCode?: string;
  isCheapestOffer?: boolean;
  availabilityDetails?: { flightId: string; cabin?: string; quota?: number }[];
  prices?: { totalPrices?: IaPrice[] };
};

export type IaResponse = {
  data?: {
    airBoundGroups?: {
      boundDetails?: { segments?: { flightId: string }[]; duration?: number };
      airBounds?: IaAirBound[];
    }[];
  };
  dictionaries?: {
    flight?: Record<string, IaFlight>;
    currency?: Record<string, { decimalPlaces?: number }>;
    fareFamilyWithServices?: Record<
      string,
      {
        cabin?: string;
        commercialFareFamily?: string;
        fareFamilyName?: string;
        services?: {
          type?: string;
          code?: string;
          bookingInstruction?: { text?: string };
          allowance?: { quantity?: number; unit?: string; type?: string };
        }[];
      }
    >;
  };
  errors?: { code: string; title: string; detail?: string }[];
};

export type IaSearchResult = {
  offers: FlightOffer[];
  source: "IA_LIVE";
};

function travelerPayload(search: FlightSearch) {
  const list: { passengerTypeCode: "ADT" | "CHD" | "INF" }[] = [];
  for (let i = 0; i < Math.max(1, search.travelers.adults); i += 1)
    list.push({ passengerTypeCode: "ADT" });
  for (let i = 0; i < search.travelers.children; i += 1) list.push({ passengerTypeCode: "CHD" });
  for (let i = 0; i < search.travelers.infants; i += 1) list.push({ passengerTypeCode: "INF" });
  return list;
}

function mapCabin(raw: string | undefined, requested: Cabin): Cabin {
  const v = (raw ?? "").toLowerCase();
  if (v === "business") return "BUSINESS";
  if (v === "first") return "FIRST";
  if (v === "premium" || v === "premiumeco") return "PREMIUM_ECONOMY";
  if (v === "eco") return "ECONOMY";
  return requested;
}

function minutesBetween(a: string, b: string) {
  return Math.max(0, Math.round((+new Date(b) - +new Date(a)) / 60000));
}

/** Exported for the fixture test that pins us to a real gateway response. */
export function mapAirBoundsResponse(
  json: IaResponse,
  search: FlightSearch,
): FlightOffer[] {
  const flights = json.dictionaries?.flight ?? {};
  const families = json.dictionaries?.fareFamilyWithServices ?? {};
  const offers: FlightOffer[] = [];

  for (const group of json.data?.airBoundGroups ?? []) {
    const flightIds = (group.boundDetails?.segments ?? []).map((s) => s.flightId);
    const segments: FlightSegment[] = [];

    flightIds.forEach((id, index) => {
      const f = flights[id];
      if (!f) return;
      const departAt = f.departure.dateTime;
      const arriveAt = f.arrival.dateTime;
      const prev = segments[index - 1];
      segments.push({
        airline: f.marketingAirlineCode,
        flightNumber: `${f.marketingAirlineCode}${f.marketingFlightNumber}`,
        aircraft: f.aircraftCode ?? "",
        from: f.departure.locationCode,
        to: f.arrival.locationCode,
        departAt,
        arriveAt,
        durationMinutes: f.duration ? Math.round(f.duration / 60) : minutesBetween(departAt, arriveAt),
        ...(prev ? { layoverMinutes: minutesBetween(prev.arriveAt, departAt) } : {}),
      });
    });

    const first = segments[0];
    const last = segments[segments.length - 1];
    if (!first || !last) continue;

    for (const bound of group.airBounds ?? []) {
      // totalPrices can carry several currencies; Rahal sells in IQD only.
      const totals = bound.prices?.totalPrices ?? [];
      const price = totals.find((p) => p.currencyCode === "IQD") ?? totals[0];
      if (!price) continue;
      if (price.currencyCode !== "IQD") {
        console.error(
          `[IA] skipping bound ${bound.airBoundId}: priced in ${price.currencyCode}, not IQD`,
        );
        continue;
      }
      const decimals = json.dictionaries?.currency?.[price.currencyCode]?.decimalPlaces ?? 0;
      const scale = 10 ** decimals;
      const base = Math.round(price.base / scale);
      const total = Math.round(price.total / scale);
      const family = families[bound.fareFamilyCode ?? ""];
      const cabin = mapCabin(family?.cabin ?? bound.availabilityDetails?.[0]?.cabin, search.cabin);
      const business = cabin === "BUSINESS" || cabin === "FIRST";
      // The airline usually ships no fareFamilyName and one shared
      // commercialFareFamily ("ECO") for every bound, so the branded code
      // (YGOLD / YPLAT) is what actually tells two fares apart.
      const fareFamily =
        family?.fareFamilyName ??
        bound.fareFamilyCode ??
        family?.commercialFareFamily;
      const durationMinutes = group.boundDetails?.duration
        ? Math.round(group.boundDetails.duration / 60)
        : minutesBetween(first.departAt, last.arriveAt);

      offers.push({
        id: `IA-${flightIds.join("_")}-${bound.fareFamilyCode ?? "STD"}`,
        airline: first.airline,
        segments,
        from: first.from,
        to: last.to,
        departAt: first.departAt,
        arriveAt: last.arriveAt,
        durationMinutes,
        stops: Math.max(0, segments.length - 1),
        cabin,
        checkedBaggageKg: business ? 40 : 30,
        cabinBaggageKg: business ? 10 : 7,
        refundable: business,
        changeable: true,
        basePrice: base,
        taxes: Math.max(0, total - base),
        currency: "IQD",
        seatsLeft: bound.availabilityDetails?.[0]?.quota ?? 9,
        score: (bound.isCheapestOffer ? 95 : 85) - Math.max(0, segments.length - 1) * 6,
        source: "IA_LIVE",
        providerRef: bound.airBoundId,
        ...(fareFamily ? { fareFamily } : {}),
      });
    }
  }

  return offers;
}

function itinerariesPayload(search: FlightSearch) {
  return [
    {
      departureDateTime: `${search.departDate}T00:00:00.000`,
      originLocationCode: search.from,
      destinationLocationCode: search.to,
      isRequestedBound: true,
    },
    ...(search.tripType === "ROUND" && search.returnDate
      ? [
          {
            departureDateTime: `${search.returnDate}T00:00:00.000`,
            originLocationCode: search.to,
            destinationLocationCode: search.from,
            isRequestedBound: false,
          },
        ]
      : []),
  ];
}

async function airBounds(
  search: FlightSearch,
  fareFamily: string | null,
): Promise<IaOutcome<FlightOffer[]>> {
  const res = await iaPost<IaResponse>("/v2/search/air-bounds", {
    ...(fareFamily ? { commercialFareFamilies: [fareFamily] } : {}),
    itineraries: itinerariesPayload(search),
    travelers: travelerPayload(search),
    searchPreferences: { showMilesPrice: false },
  });
  if (!res.ok) return res;
  const json = res.value;

  if (json.errors?.length) {
    // NO FLIGHTS FOUND is a valid empty result, not a transport failure.
    if (json.errors.some((e) => e.code === "7959")) {
      console.info(
        `[IA] no inventory for ${search.from}-${search.to} on ${search.departDate} (fareFamily=${fareFamily ?? "any"})`,
      );
      return { ok: true, value: [] };
    }
    return fail(
      "UPSTREAM_ERROR",
      `air-bounds errors: ${JSON.stringify(json.errors).slice(0, 300)}`,
    );
  }

  return { ok: true, value: mapAirBoundsResponse(json, search) };
}

/** Calls the airline availability API. */
export async function searchIraqiAirwaysLive(
  search: FlightSearch,
): Promise<IaOutcome<FlightOffer[]>> {
  const family = CABIN_FAMILY[search.cabin];
  const filtered = await airBounds(search, family);
  // A wrong/renamed commercial fare family silently yields zero bounds, which
  // is indistinguishable from a sold-out date. Retry unfiltered before we tell
  // the traveller there is nothing to fly.
  if (filtered.ok && filtered.value.length === 0) {
    const unfiltered = await airBounds(search, null);
    if (unfiltered.ok) {
      // Keep the cabin the traveller actually asked for; an unfiltered call
      // also returns the other cabin's bounds.
      const wanted = unfiltered.value.filter(
        (o) => CABIN_FAMILY[o.cabin] === family,
      );
      if (wanted.length > 0) {
        console.info(
          `[IA] fare family "${family}" returned nothing; unfiltered search recovered ${wanted.length} bound(s)`,
        );
        return { ok: true, value: wanted };
      }
    }
  }
  return filtered;
}

/**
 * One-shot credential/connectivity probe for the airline gateway, used by the
 * /ia-health page so a blank results screen can be told apart from expired
 * credentials without reading server logs.
 */
export type IaHealth = {
  base: string;
  env: {
    clientId: boolean;
    clientSecret: boolean;
    dToken: boolean;
    bearerToken: boolean;
  };
  probe: {
    from: string;
    to: string;
    date: string;
    ok: boolean;
    offers: number;
    code?: IaFailureCode;
    detail?: string;
  };
};

export async function iaHealthLive(search: FlightSearch): Promise<IaHealth> {
  const res = await searchIraqiAirwaysLive(search);
  return {
    base: process.env["IA_API_BASE"] ?? "https://api-des.iraqiairways.com.iq",
    env: {
      clientId: Boolean(process.env["IA_CLIENT_ID"]),
      clientSecret: Boolean(process.env["IA_CLIENT_SECRET"]),
      dToken: Boolean(process.env["IA_D_TOKEN"]),
      bearerToken: Boolean(process.env["IA_BEARER_TOKEN"]),
    },
    probe: {
      from: search.from,
      to: search.to,
      date: search.departDate,
      ok: res.ok,
      offers: res.ok ? res.value.length : 0,
      ...(res.ok ? {} : { code: res.failure.code, detail: res.failure.detail }),
    },
  };
}

type IaCalendarResponse = {
  data?: {
    airCalendars?: {
      departureDateTime?: string;
      prices?: { totalPrices?: IaPrice[] };
      isCheapestOffer?: boolean;
    }[];
  };
  dictionaries?: { currency?: Record<string, { decimalPlaces?: number }> };
  errors?: { code: string; title: string }[];
};

/**
 * Real ±N-day fare spread from the airline, used by the results fare strip.
 * Returns null when the live gateway is unavailable.
 */
export async function fareCalendarIraqiAirwaysLive(
  search: FlightSearch,
  flexibility = 3,
): Promise<FareDay[] | null> {
  const res = await iaPost<IaCalendarResponse>("/v2/search/air-calendars", {
    commercialFareFamilies: [CABIN_FAMILY[search.cabin]],
    // The gateway rejects `flexibility` on the non-requested (return) bound.
    itineraries: itinerariesPayload(search).map((it) =>
      it.isRequestedBound ? { ...it, flexibility } : it,
    ),
    travelers: travelerPayload(search),
    searchPreferences: { showMilesPrice: false },
  });
  if (!res.ok) return null;
  const json = res.value;
  if (json.errors?.length) return null;

  const days: FareDay[] = [];
  for (const entry of json.data?.airCalendars ?? []) {
    const price = entry.prices?.totalPrices?.[0];
    const date = entry.departureDateTime?.slice(0, 10);
    if (!price || !date) continue;
    const decimals = json.dictionaries?.currency?.[price.currencyCode]?.decimalPlaces ?? 0;
    days.push({ date, price: Math.round(price.total / 10 ** decimals) });
  }
  return days.length ? days.sort((a, b) => a.date.localeCompare(b.date)) : null;
}


/* ------------------------------------------------------------------ *
 * Baggage policies (/v2/shopping/baggage-policies)
 * The airline exposes the free allowance for a priced cart. We map it to
 * Rahal's BaggagePolicies shape so the selection screen can quote the exact
 * numbers the carrier quotes (e.g. 40 kg checked + 1 carry-on piece).
 * ------------------------------------------------------------------ */

type IaAllowanceEntry = {
  airlineCode?: string;
  details?: { type?: string; weightUnit?: string; quantity?: number };
};

type IaBaggagePoliciesResponse = {
  data?: {
    policyRegulations?: string[];
    freeCheckedBaggageAllowance?: IaAllowanceEntry[];
    freeCarryOnAllowance?: IaAllowanceEntry[];
  };
  errors?: { code: string; title: string }[];
};

function mapAllowance(entry: IaAllowanceEntry | undefined): BaggageAllowance | undefined {
  const d = entry?.details;
  if (!d || typeof d.quantity !== "number") return undefined;
  const type = d.type === "weight" ? "weight" : "piece";
  return {
    type,
    quantity: d.quantity,
    ...(type === "weight"
      ? { unit: d.weightUnit === "pound" ? ("pound" as const) : ("kilogram" as const) }
      : {}),
  };
}

async function iaGet<T>(path: string): Promise<T | null> {
  const base = process.env["IA_API_BASE"] ?? "https://api-des.iraqiairways.com.iq";
  const dToken = process.env["IA_D_TOKEN"];
  if (!dToken) return null;

  const call = async (bearer: string) => {
    const res = await fetch(`${base}${path}`, {
      headers: {
        accept: "application/json",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/json",
        authorization: `Bearer ${bearer}`,
        "x-d-token": dToken,
        "ama-client-ref": `${crypto.randomUUID()}:0`,
        origin: "https://online.iraqiairways.com.iq",
        referer: "https://online.iraqiairways.com.iq/",
        "user-agent": UA,
      },
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`[IA] GET ${path} failed [${res.status}]: ${text.slice(0, 200)}`);
      return { data: null as T | null, status: res.status };
    }
    try {
      return { data: JSON.parse(text) as T, status: res.status };
    } catch {
      return { data: null as T | null, status: res.status };
    }
  };

  try {
    const bearer = await accessToken(base);
    if (!bearer) return null;
    const first = await call(bearer);
    if (first.data) return first.data;
    if (first.status === 401) {
      tokenCache = null;
      const refreshed = await accessToken(base, true);
      if (refreshed) return (await call(refreshed)).data;
    }
    return null;
  } catch (error) {
    console.error(`[IA] GET ${path} threw`, error);
    return null;
  }
}

/** Live free-baggage allowance for a priced cart. Null when unavailable. */
export async function baggagePoliciesIraqiAirwaysLive(
  cartId: string,
  lang = "GB",
): Promise<BaggagePolicies | null> {
  const json = await iaGet<IaBaggagePoliciesResponse>(
    `/v2/shopping/baggage-policies?cartId=${encodeURIComponent(cartId)}&lang=${encodeURIComponent(lang)}`,
  );
  if (!json?.data || json.errors?.length) return null;
  const checked = mapAllowance(json.data.freeCheckedBaggageAllowance?.[0]);
  const carryOn = mapAllowance(json.data.freeCarryOnAllowance?.[0]);
  return {
    regulations: json.data.policyRegulations ?? [],
    ...(checked ? { checked } : {}),
    ...(carryOn ? { carryOn } : {}),
  };
}
