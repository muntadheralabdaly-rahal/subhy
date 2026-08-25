import type { Cabin, FlightSearch, TravelerCounts } from "./types";

/**
 * Iraqi Airways (IA) integration.
 *
 * Iraqi Airways publishes no third-party API: iraqiairways.com.iq only hands off
 * to its Amadeus-powered engine at online.iraqiairways.com.iq, which is protected
 * by Imperva and rejects any non-browser client. So the supported integration is a
 * deep link: we build the exact `search` payload their engine expects from the
 * traveler's Rahal search, and continue the booking on the airline's own site.
 */

export const IA_AIRLINE_CODE = "IA";
const IA_BOOKING_BASE = "https://online.iraqiairways.com.iq/booking";
const IA_POINT_OF_SALE = "iq";

const CABIN_TO_FARE_FAMILY: Record<Cabin, string | null> = {
  ECONOMY: null,
  PREMIUM_ECONOMY: null,
  BUSINESS: "BUSINESS",
  FIRST: "FIRST",
};

const IA_LANG: Record<string, string> = {
  ar: "ar-IQ",
  en: "en-GB",
  ku: "en-GB",
};

type IaItinerary = {
  departureDateTime: string;
  originLocationCode: string;
  destinationLocationCode: string;
};

function travelerList(travelers: TravelerCounts) {
  const list: { passengerTypeCode: "ADT" | "CHD" | "INF" }[] = [];
  for (let i = 0; i < Math.max(1, travelers.adults); i += 1)
    list.push({ passengerTypeCode: "ADT" });
  for (let i = 0; i < travelers.children; i += 1) list.push({ passengerTypeCode: "CHD" });
  for (let i = 0; i < travelers.infants; i += 1) list.push({ passengerTypeCode: "INF" });
  return list;
}

/** Builds the airline's own booking URL, prefilled with the Rahal search. */
export function buildIraqiAirwaysBookingUrl(search: FlightSearch, lang = "ar"): string {
  const engineLang = IA_LANG[lang] ?? IA_LANG["en"]!;
  const itineraries: IaItinerary[] = [
    {
      departureDateTime: search.departDate,
      originLocationCode: search.from,
      destinationLocationCode: search.to,
    },
  ];

  if (search.tripType === "ROUND" && search.returnDate) {
    itineraries.push({
      departureDateTime: search.returnDate,
      originLocationCode: search.to,
      destinationLocationCode: search.from,
    });
  }

  const fareFamily = CABIN_TO_FARE_FAMILY[search.cabin];
  const payload = {
    commercialFareFamilies: fareFamily ? [fareFamily] : null,
    itineraries,
    travelers: travelerList(search.travelers),
    lang: engineLang,
  };

  const params = new URLSearchParams({
    lang: engineLang,
    search: JSON.stringify(payload),
    pointOfSale: IA_POINT_OF_SALE,
  });

  return `${IA_BOOKING_BASE}?${params.toString()}`;
}

export function isIraqiAirways(airlineCode: string): boolean {
  return airlineCode.toUpperCase() === IA_AIRLINE_CODE;
}
