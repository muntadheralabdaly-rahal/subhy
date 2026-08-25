/**
 * Analytics abstraction. Swap the sink for a real provider later; every call
 * site stays unchanged.
 */
export type AnalyticsEvent =
  | "home_viewed"
  | "flight_search_started"
  | "flight_search_completed"
  | "flight_selected"
  | "flight_offer_selected"
  | "flight_details_viewed"
  | "hotel_search_started"
  | "hotel_selected"
  | "checkout_started"
  | "traveler_added"
  | "payment_started"
  | "payment_completed"
  | "booking_confirmed"
  | "booking_failed"
  | "booking_cancelled"
  | "promo_applied"
  | "language_changed"
  | "support_opened";

type Payload = Record<string, unknown>;

const buffer: { event: AnalyticsEvent; payload: Payload; at: string }[] = [];

export function track(event: AnalyticsEvent, payload: Payload = {}): void {
  const entry = { event, payload, at: new Date().toISOString() };
  buffer.push(entry);
  if (import.meta.env.DEV) console.debug("[analytics]", event, payload);
}

export function funnelSnapshot() {
  return [...buffer];
}
