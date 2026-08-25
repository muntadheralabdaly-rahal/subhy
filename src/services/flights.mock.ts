import { AIRLINES, airport } from "@/data/reference";
import type { Cabin, FareDay, FlightOffer, FlightSearch, FlightSegment } from "./types";

/** Deterministic pseudo random so the same search always returns the same fares. */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const CABIN_MULTIPLIER: Record<Cabin, number> = {
  ECONOMY: 1,
  PREMIUM_ECONOMY: 1.45,
  BUSINESS: 2.6,
  FIRST: 3.9,
};

const BASE_ROUTE_MINUTES: Record<string, number> = {
  DXB: 165,
  DOH: 150,
  IST: 210,
  CAI: 230,
  BEY: 175,
  AMM: 135,
  JED: 165,
  THR: 105,
  LHR: 380,
};

const AIRCRAFT = ["Boeing 737-800", "Airbus A320neo", "Boeing 787-9", "Airbus A330-300"];

function roundTo(value: number, step: number) {
  return Math.round(value / step) * step;
}

function buildSegments(
  rand: () => number,
  search: FlightSearch,
  airlineCode: string,
  stops: number,
  baseMinutes: number,
): FlightSegment[] {
  const departHour = 5 + Math.floor(rand() * 17);
  const departMinute = [0, 10, 20, 30, 40, 50][Math.floor(rand() * 6)] ?? 0;
  const start = new Date(`${search.departDate}T00:00:00`);
  start.setHours(departHour, departMinute, 0, 0);

  const legs = stops + 1;
  const segments: FlightSegment[] = [];
  let cursor = new Date(start);
  const stopover = stops === 0 ? 0 : 70 + Math.floor(rand() * 110);
  const legMinutes = Math.round((baseMinutes + (stops > 0 ? 70 : 0)) / legs);
  const hubs = ["DXB", "DOH", "AMM", "IST"].filter(
    (h) => h !== search.from && h !== search.to,
  );

  for (let i = 0; i < legs; i += 1) {
    const from = i === 0 ? search.from : (hubs[(i - 1) % hubs.length] ?? "DXB");
    const to = i === legs - 1 ? search.to : (hubs[i % hubs.length] ?? "DXB");
    const arrive = new Date(cursor.getTime() + legMinutes * 60000);
    segments.push({
      airline: airlineCode,
      flightNumber: `${airlineCode} ${200 + Math.floor(rand() * 780)}`,
      aircraft: AIRCRAFT[Math.floor(rand() * AIRCRAFT.length)] ?? "Airbus A320neo",
      from,
      to,
      departAt: cursor.toISOString(),
      arriveAt: arrive.toISOString(),
      durationMinutes: legMinutes,
    });
    cursor = new Date(arrive.getTime() + stopover * 60000);
  }
  return segments;
}

export function generateOffers(search: FlightSearch): FlightOffer[] {
  const rand = seeded(`${search.from}${search.to}${search.departDate}${search.cabin}`);
  const baseMinutes =
    BASE_ROUTE_MINUTES[search.to] ?? BASE_ROUTE_MINUTES[search.from] ?? 180;
  const distanceFactor = baseMinutes / 165;
  const count = 9 + Math.floor(rand() * 5);
  const offers: FlightOffer[] = [];

  for (let i = 0; i < count; i += 1) {
    const air = AIRLINES[Math.floor(rand() * AIRLINES.length)] ?? AIRLINES[0]!;
    const stops = rand() < 0.55 ? 0 : rand() < 0.85 ? 1 : 2;
    const segments = buildSegments(rand, search, air.code, stops, baseMinutes);
    const first = segments[0]!;
    const last = segments[segments.length - 1]!;
    const durationMinutes = Math.round(
      (new Date(last.arriveAt).getTime() - new Date(first.departAt).getTime()) / 60000,
    );
    const raw =
      (185000 + rand() * 120000) * distanceFactor * CABIN_MULTIPLIER[search.cabin] -
      stops * 26000;
    const basePrice = roundTo(Math.max(95000, raw), 5000);
    const taxes = roundTo(basePrice * (0.07 + rand() * 0.05), 1000);
    const checked = search.cabin === "ECONOMY" ? (rand() < 0.3 ? 20 : 30) : 40;
    const cheapness = 1 - Math.min(1, (basePrice - 95000) / 600000);
    const quickness = 1 - Math.min(1, (durationMinutes - baseMinutes) / 420);

    offers.push({
      id: `${air.code}-${search.from}${search.to}-${search.departDate}-${i}`,
      airline: air.code,
      segments,
      from: search.from,
      to: search.to,
      departAt: first.departAt,
      arriveAt: last.arriveAt,
      durationMinutes,
      stops,
      cabin: search.cabin,
      checkedBaggageKg: checked,
      cabinBaggageKg: 7,
      refundable: rand() < 0.55,
      changeable: rand() < 0.75,
      basePrice,
      taxes,
      currency: "IQD",
      seatsLeft: 1 + Math.floor(rand() * 8),
      score: Number((cheapness * 0.55 + quickness * 0.3 + (stops === 0 ? 0.15 : 0)).toFixed(4)),
    });
  }

  void airport(search.from);
  return offers;
}

export function generateFareCalendar(search: FlightSearch, days = 7): FareDay[] {
  const out: FareDay[] = [];
  const start = new Date(`${search.departDate}T12:00:00`);
  start.setDate(start.getDate() - Math.floor(days / 2));
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const date = d.toISOString().slice(0, 10);
    const offers = generateOffers({ ...search, departDate: date });
    const cheapest = offers.reduce(
      (min, o) => Math.min(min, o.basePrice + o.taxes),
      Number.POSITIVE_INFINITY,
    );
    out.push({ date, price: cheapest });
  }
  return out;
}
