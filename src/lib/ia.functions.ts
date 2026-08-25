import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { BaggagePolicies, FareDay, FlightOffer, FlightSearch } from "@/services/types";

const searchSchema = z.object({
  tripType: z.enum(["ROUND", "ONEWAY", "MULTI"]),
  from: z.string().regex(/^[A-Z]{3}$/),
  to: z.string().regex(/^[A-Z]{3}$/),
  departDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  travelers: z.object({
    adults: z.number().int().min(1).max(9),
    children: z.number().int().min(0).max(8),
    infants: z.number().int().min(0).max(8),
  }),
  cabin: z.enum(["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"]),
});

export type IaSearchResponse = {
  offers: FlightOffer[];
  /** false when the airline session expired or the API refused the call */
  live: boolean;
};

export const searchIraqiAirways = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => searchSchema.parse(input) as FlightSearch)
  .handler(async ({ data }): Promise<IaSearchResponse> => {
    const { searchIraqiAirwaysLive } = await import("@/services/ia.server");
    const offers = await searchIraqiAirwaysLive(data);
    if (!offers) throw new Error("Iraqi Airways live search is temporarily unavailable");
    return { offers, live: true };
  });

export type IaFareCalendarResponse = { days: FareDay[]; live: boolean };

export const fareCalendarIraqiAirways = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => searchSchema.parse(input) as FlightSearch)
  .handler(async ({ data }): Promise<IaFareCalendarResponse> => {
    const { fareCalendarIraqiAirwaysLive } = await import("@/services/ia.server");
    const days = await fareCalendarIraqiAirwaysLive(data);
    return days ? { days, live: true } : { days: [], live: false };
  });


export const baggagePoliciesIraqiAirways = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ cartId: z.string().min(4).max(64), lang: z.string().max(4).optional() }).parse(input),
  )
  .handler(async ({ data }): Promise<BaggagePolicies | null> => {
    const { baggagePoliciesIraqiAirwaysLive } = await import("@/services/ia.server");
    return baggagePoliciesIraqiAirwaysLive(data.cartId, data.lang ?? "GB");
  });
