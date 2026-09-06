import { describe, expect, test } from "bun:test";

import fixture from "./__fixtures__/ia-air-bounds-bgw-ebl.json";
import {
  mapAirBoundsResponse,
  type IaFareService,
  type IaResponse,
} from "./ia.server";
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

  test("falls back to the published allowance when the fare ships no services", () => {
    // The BGW→EBL fixture carries no `services`, so the offer keeps Rahal's
    // published economy numbers and the detail screen asks the cart-based
    // policy endpoint instead.
    expect(offers[0]!.baggage).toBeUndefined();
    expect(offers[0]!.checkedBaggageKg).toBe(30);
    expect(offers[0]!.cabinBaggageKg).toBe(7);
  });

  test("shows Baghdad departure time whatever the viewer's timezone", () => {
    const departAt = offers[0]!.departAt;
    expect(airportHour(departAt)).toBe(18);
    expect(formatTime(departAt, "en")).toBe("18:30");
  });
});

/**
 * The `services` block is optional and absent from the captured response, so
 * this exercises the parser against the shape the dictionary type declares:
 * weight vs piece allowances, and carry-on told apart by its service code.
 */
describe("fare family allowances", () => {
  function withServices(services: IaFareService[]) {
    const json = structuredClone(fixture) as unknown as IaResponse;
    const family = json.dictionaries?.fareFamilyWithServices?.["YGOLD"];
    if (!family) throw new Error("fixture lost its YGOLD fare family");
    family.services = services;
    return mapAirBoundsResponse(json, search)[0]!;
  }

  test("reads checked weight and carry-on pieces off the fare family", () => {
    const offer = withServices([
      {
        type: "BAGGAGE",
        code: "BAG",
        allowance: { quantity: 40, unit: "KG", type: "WEIGHT" },
      },
      {
        type: "BAGGAGE",
        code: "CBBG",
        allowance: { quantity: 1, type: "PIECE" },
      },
      { type: "MEAL", code: "MEAL" },
    ]);
    expect(offer.baggage?.checked).toEqual({
      type: "weight",
      quantity: 40,
      unit: "kilogram",
    });
    expect(offer.baggage?.carryOn).toEqual({ type: "piece", quantity: 1 });
    // A weight allowance also corrects the number the results card shows.
    expect(offer.checkedBaggageKg).toBe(40);
    // A piece allowance cannot, so the published cabin figure stands.
    expect(offer.cabinBaggageKg).toBe(7);
  });

  test("converts pounds to kilograms for the card figure", () => {
    const offer = withServices([
      {
        type: "BAGGAGE",
        code: "BAG",
        allowance: { quantity: 50, unit: "POUND", type: "WEIGHT" },
      },
    ]);
    expect(offer.baggage?.checked).toEqual({
      type: "weight",
      quantity: 50,
      unit: "pound",
    });
    expect(offer.checkedBaggageKg).toBe(23);
  });
});
