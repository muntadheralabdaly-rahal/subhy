import { describe, expect, test } from "bun:test";

import fixture from "./__fixtures__/ia-air-bounds-bgw-ebl.json";
import { mapAirBoundsResponse, type IaResponse } from "./ia.server";
import { airportHour, formatTime } from "@/lib/format";
import type { FlightSearch } from "./types";

/**
 * Pinned to a real /v2/search/air-bounds response (BGW→EBL, one adult, eco).
 * The gateway's shape is undocumented, so this fixture is the contract: if the
 * mapper drifts, prices or times silently go wrong on live inventory.
 */
const search: FlightSearch = {
  tripType: "ONEWAY",
  from: "BGW",
  to: "EBL",
  departDate: "2026-09-09",
  travelers: { adults: 1, children: 0, infants: 0 },
  cabin: "ECONOMY",
};

describe("mapAirBoundsResponse", () => {
  const offers = mapAirBoundsResponse(fixture as unknown as IaResponse, search);

  test("maps one offer per fare family", () => {
    expect(offers).toHaveLength(2);
    expect(offers.map((o) => o.fareFamily)).toEqual(["YGOLD", "YPLAT"]);
  });

  test("scales minor units with the currency dictionary (IQD, 2 decimals)", () => {
    const gold = offers[0]!;
    expect(gold.basePrice).toBe(100320);
    expect(gold.taxes).toBe(11880);
    expect(gold.basePrice + gold.taxes).toBe(112200);
    expect(gold.currency).toBe("IQD");
  });

  test("keeps the airline's own schedule", () => {
    const gold = offers[0]!;
    expect(gold.airline).toBe("IA");
    expect(gold.segments[0]!.flightNumber).toBe("IA943");
    expect(gold.segments[0]!.aircraft).toBe("CRJ");
    expect(gold.from).toBe("BGW");
    expect(gold.to).toBe("EBL");
    expect(gold.stops).toBe(0);
    expect(gold.durationMinutes).toBe(60);
    expect(gold.cabin).toBe("ECONOMY");
    expect(gold.seatsLeft).toBe(9);
    expect(gold.source).toBe("IA_LIVE");
    expect(gold.providerRef).toBe("BC1-1-1I1IAZ_X32WYY4BKZCXFDWCYRGK6JNXXL5K");
  });

  test("ranks the cheapest bound above the rest", () => {
    expect(offers[0]!.score).toBeGreaterThan(offers[1]!.score);
  });

  test("shows Baghdad departure time whatever the viewer's timezone", () => {
    const departAt = offers[0]!.departAt;
    expect(airportHour(departAt)).toBe(18);
    expect(formatTime(departAt, "en")).toBe("18:30");
  });
});
