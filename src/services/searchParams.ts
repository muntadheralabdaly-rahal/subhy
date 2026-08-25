import { z } from "zod";

import { todayISO } from "@/lib/format";
import type { FlightSearch } from "./types";

export const flightSearchSchema = z.object({
  from: z.string().default("BGW"),
  to: z.string().default("DXB"),
  depart: z.string().default(todayISO(14)),
  ret: z.string().optional(),
  adults: z.coerce.number().min(1).max(9).default(1),
  children: z.coerce.number().min(0).max(8).default(0),
  infants: z.coerce.number().min(0).max(4).default(0),
  cabin: z.enum(["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"]).default("ECONOMY"),
  trip: z.enum(["ROUND", "ONEWAY", "MULTI"]).default("ROUND"),
});

export type FlightSearchParams = z.infer<typeof flightSearchSchema>;

export function paramsToSearch(p: FlightSearchParams): FlightSearch {
  return {
    tripType: p.trip,
    from: p.from,
    to: p.to,
    departDate: p.depart,
    ...(p.ret ? { returnDate: p.ret } : {}),
    travelers: { adults: p.adults, children: p.children, infants: p.infants },
    cabin: p.cabin,
  };
}

export function searchToParams(s: FlightSearch): FlightSearchParams {
  return {
    from: s.from,
    to: s.to,
    depart: s.departDate,
    ...(s.returnDate ? { ret: s.returnDate } : {}),
    adults: s.travelers.adults,
    children: s.travelers.children,
    infants: s.travelers.infants,
    cabin: s.cabin,
    trip: s.tripType,
  };
}
