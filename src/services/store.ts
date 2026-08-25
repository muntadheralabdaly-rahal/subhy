import type {
  Booking,
  BookingStatus,
  FlightOffer,
  FlightSearch,
  PaymentMethod,
  PaymentStatus,
  PriceBreakdown,
  Traveler,
} from "./types";
import { PROMOTIONS } from "@/data/reference";

/**
 * Browser-side persistence for the mock stage. Every reader goes through these
 * functions, so a real backend replaces this module and nothing else.
 */
const KEYS = {
  recent: "rahal.recentSearches",
  travelers: "rahal.travelers",
  bookings: "rahal.bookings",
  cart: "rahal.cart",
  me: "rahal.primaryTraveler",
  contact: "rahal.contact",
} as const;


function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export const SERVICE_FEE = 10000;

export function recentSearches(): FlightSearch[] {
  return read<FlightSearch[]>(KEYS.recent, []);
}

export function rememberSearch(search: FlightSearch): void {
  const list = recentSearches().filter(
    (s) => !(s.from === search.from && s.to === search.to && s.departDate === search.departDate),
  );
  write(KEYS.recent, [search, ...list].slice(0, 5));
}

export function savedTravelers(): Traveler[] {
  return read<Traveler[]>(KEYS.travelers, []);
}

export function saveTraveler(traveler: Traveler): void {
  const list = savedTravelers().filter((t) => t.id !== traveler.id);
  write(KEYS.travelers, [...list, traveler]);
}

export function removeTraveler(id: string): void {
  write(KEYS.travelers, savedTravelers().filter((t) => t.id !== id));
}

/** The account owner's own traveler record, reused to prefill booking forms. */
export function primaryTraveler(): Traveler | null {
  return read<Traveler | null>(KEYS.me, null);
}

export function setPrimaryTraveler(traveler: Traveler | null): void {
  write(KEYS.me, traveler);
}

export function savedContact(): { phone: string; email: string } {
  return read(KEYS.contact, { phone: "", email: "" });
}

export function setSavedContact(contact: { phone: string; email: string }): void {
  write(KEYS.contact, contact);
}



export type Cart = {
  offer: FlightOffer;
  search: FlightSearch;
  travelers: Traveler[];
  contact: { phone: string; email: string };
  promoCode?: string;
};

export function getCart(): Cart | null {
  return read<Cart | null>(KEYS.cart, null);
}

export function setCart(cart: Cart | null): void {
  write(KEYS.cart, cart);
}

export function seatCount(search: FlightSearch): number {
  return search.travelers.adults + search.travelers.children;
}

export function findPromotion(code: string) {
  return PROMOTIONS.find((p) => p.code.toUpperCase() === code.trim().toUpperCase());
}

export function priceCart(cart: Cart): PriceBreakdown {
  const seats = Math.max(1, seatCount(cart.search));
  const base = cart.offer.basePrice * seats;
  const taxes = cart.offer.taxes * seats;
  const promo = cart.promoCode ? findPromotion(cart.promoCode) : undefined;
  const discount = promo
    ? promo.kind === "FLAT"
      ? promo.discount
      : Math.round(((base + taxes) * promo.discount) / 100)
    : 0;
  return {
    base,
    taxes,
    serviceFee: SERVICE_FEE,
    discount,
    total: base + taxes + SERVICE_FEE - discount,
    currency: "IQD",
  };
}

export function bookings(): Booking[] {
  return read<Booking[]>(KEYS.bookings, []);
}

export function bookingByRef(reference: string): Booking | undefined {
  return bookings().find((b) => b.reference === reference);
}

function newReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < 3; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${out}${100 + Math.floor(Math.random() * 900)}`;
}

export function createBooking(
  cart: Cart,
  method: PaymentMethod,
  installments?: number,
): Booking {
  const price = priceCart(cart);
  const status: BookingStatus = "CONFIRMED";
  const paymentStatus: PaymentStatus = method === "BNPL" ? "INSTALLMENTS" : "PAID";
  const booking: Booking = {
    id: crypto.randomUUID(),
    reference: newReference(),
    type: "FLIGHT",
    status,
    paymentStatus,
    paymentMethod: method,
    ...(installments ? { installments } : {}),
    offer: cart.offer,
    search: cart.search,
    travelers: cart.travelers,
    price,
    contact: cart.contact,
    createdAt: new Date().toISOString(),
    travelDate: cart.search.departDate,
  };
  write(KEYS.bookings, [booking, ...bookings()]);
  return booking;
}

export function cancelBooking(reference: string): void {
  write(
    KEYS.bookings,
    bookings().map((b) =>
      b.reference === reference
        ? { ...b, status: "CANCELLED" as BookingStatus, paymentStatus: "REFUNDED" as PaymentStatus }
        : b,
    ),
  );
}

/** Mock BNPL underwriting limit for the signed-in traveler. */
export const BNPL_LIMIT = 750000;
