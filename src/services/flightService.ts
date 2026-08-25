import { fareCalendarIraqiAirways, searchIraqiAirways } from "@/lib/ia.functions";
import type { FareDay, FlightOffer, FlightSearch } from "./types";

/**
 * Supply is exclusively live Iraqi Airways inventory returned by their gateway.
 * No simulated carriers are mixed in.
 */


export type SortKey = "recommended" | "cheapest" | "fastest" | "earliest";

export type FlightFilters = {
  maxPrice?: number;
  airlines: string[];
  stops: number[];
  departWindows: string[];
  cabins: string[];
  refundableOnly?: boolean;
  minBaggageKg?: number;
  maxDurationMinutes?: number;
};

export const emptyFilters: FlightFilters = {
  airlines: [],
  stops: [],
  departWindows: [],
  cabins: [],
};

/** Live Iraqi Airways inventory only — nothing else is shown. */
async function collectOffers(search: FlightSearch): Promise<FlightOffer[]> {
  const res = await searchIraqiAirways({ data: search });
  if (!res.live) {
    throw new Error("Iraqi Airways live search is temporarily unavailable");
  }
  return res.offers.filter((o) => o.airline === "IA");
}

export const flightService = {
  async search(search: FlightSearch): Promise<FlightOffer[]> {
    return collectOffers(search);
  },
  /** Real airline fare spread from the carrier; empty when unavailable. */
  async fareCalendar(search: FlightSearch): Promise<FareDay[]> {
    try {
      const res = await fareCalendarIraqiAirways({ data: search });
      if (res.live && res.days.length) return res.days;
    } catch (error) {
      console.error("Iraqi Airways fare calendar unavailable", error);
    }
    return [];
  },
  async offerById(search: FlightSearch, id: string): Promise<FlightOffer | undefined> {
    return (await collectOffers(search)).find((o) => o.id === id);
  },

};

export function totalPrice(offer: FlightOffer, seats = 1): number {
  return (offer.basePrice + offer.taxes) * seats;
}

function windowOf(iso: string): string {
  const h = new Date(iso).getHours();
  if (h < 6) return "night";
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

export function applyFilters(offers: FlightOffer[], f: FlightFilters): FlightOffer[] {
  return offers.filter((o) => {
    if (f.maxPrice && o.basePrice + o.taxes > f.maxPrice) return false;
    if (f.airlines.length && !f.airlines.includes(o.airline)) return false;
    if (f.stops.length && !f.stops.includes(Math.min(o.stops, 2))) return false;
    if (f.departWindows.length && !f.departWindows.includes(windowOf(o.departAt))) return false;
    if (f.cabins.length && !f.cabins.includes(o.cabin)) return false;
    if (f.refundableOnly && !o.refundable) return false;
    if (f.minBaggageKg && o.checkedBaggageKg < f.minBaggageKg) return false;
    if (f.maxDurationMinutes && o.durationMinutes > f.maxDurationMinutes) return false;
    return true;
  });
}

export function sortOffers(offers: FlightOffer[], key: SortKey): FlightOffer[] {
  const list = [...offers];
  const price = (o: FlightOffer) => o.basePrice + o.taxes;
  switch (key) {
    case "cheapest":
      return list.sort((a, b) => price(a) - price(b) || a.durationMinutes - b.durationMinutes);
    case "fastest":
      return list.sort((a, b) => a.durationMinutes - b.durationMinutes || price(a) - price(b));
    case "earliest":
      return list.sort(
        (a, b) => +new Date(a.departAt) - +new Date(b.departAt) || price(a) - price(b),
      );
    default:
      return list.sort((a, b) => b.score - a.score || price(a) - price(b));
  }
}
