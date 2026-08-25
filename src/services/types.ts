export type Cabin = "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";
export type TripType = "ROUND" | "ONEWAY" | "MULTI";

export type Airport = {
  code: string;
  cityAr: string;
  cityEn: string;
  cityKu: string;
  nameAr: string;
  nameEn: string;
  countryAr: string;
  countryEn: string;
};

export type Airline = {
  code: string;
  nameAr: string;
  nameEn: string;
  nameKu: string;
  tint: string;
};

export type TravelerCounts = { adults: number; children: number; infants: number };

export type FlightSearch = {
  tripType: TripType;
  from: string;
  to: string;
  departDate: string;
  returnDate?: string;
  travelers: TravelerCounts;
  cabin: Cabin;
};

export type FlightSegment = {
  airline: string;
  flightNumber: string;
  aircraft: string;
  from: string;
  to: string;
  departAt: string;
  arriveAt: string;
  durationMinutes: number;
  layoverMinutes?: number;
};

/** Free allowance exactly as the airline expresses it (weight or pieces). */
export type BaggageAllowance = {
  type: "weight" | "piece";
  quantity: number;
  unit?: "kilogram" | "pound";
};

export type BaggagePolicies = {
  /** e.g. "IATA RESO 302" */
  regulations: string[];
  checked?: BaggageAllowance;
  carryOn?: BaggageAllowance;
};

export type FlightOffer = {
  id: string;
  airline: string;
  segments: FlightSegment[];
  from: string;
  to: string;
  departAt: string;
  arriveAt: string;
  durationMinutes: number;
  stops: number;
  cabin: Cabin;
  checkedBaggageKg: number;
  cabinBaggageKg: number;
  refundable: boolean;
  changeable: boolean;
  basePrice: number;
  taxes: number;
  currency: "IQD";
  seatsLeft: number;
  score: number;
  /** Where the offer came from: live airline API or the simulated engine. */
  source?: "IA_LIVE" | "MOCK";
  /** Provider-side identifier (e.g. Amadeus airBoundId) for continuing the booking. */
  providerRef?: string;
  /** Airline fare family label, e.g. "Business Platinum" / "Economy Silver". */
  fareFamily?: string;
  /** Free allowance as returned by the airline for this fare family. */
  baggage?: BaggagePolicies;
};

export type FareDay = { date: string; price: number };

/** Matches the carrier's traveler record: title + names + DOB + passenger type. */
export type TravelerTitle = "MR" | "MRS" | "MS";
export type PassengerTypeCode = "ADT" | "CHD" | "INF";

export type Traveler = {
  id: string;
  title?: TravelerTitle;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "M" | "F";
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  phone?: string;
  email?: string;
};

/** Carrier passenger type derived from DOB against the departure date. */
export function passengerTypeCode(dateOfBirth: string, departDate: string): PassengerTypeCode {
  if (!dateOfBirth || !departDate) return "ADT";
  const dob = new Date(dateOfBirth);
  const dep = new Date(departDate);
  let years = dep.getFullYear() - dob.getFullYear();
  const m = dep.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && dep.getDate() < dob.getDate())) years -= 1;
  if (years < 2) return "INF";
  if (years < 12) return "CHD";
  return "ADT";
}

export type BookingStatus =
  | "SEARCHING"
  | "SELECTED"
  | "PENDING"
  | "PAYMENT_PENDING"
  | "CONFIRMED"
  | "FAILED"
  | "CANCELLED"
  | "REFUND_PENDING"
  | "REFUNDED";

export type PaymentStatus = "UNPAID" | "PAID" | "INSTALLMENTS" | "REFUNDED" | "FAILED";
export type PaymentMethod = "CARD" | "LOCAL" | "BNPL";

export type PriceBreakdown = {
  base: number;
  taxes: number;
  serviceFee: number;
  discount: number;
  total: number;
  currency: "IQD";
};

export type Booking = {
  id: string;
  reference: string;
  type: "FLIGHT" | "HOTEL" | "PACKAGE";
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  installments?: number;
  offer: FlightOffer;
  search: FlightSearch;
  travelers: Traveler[];
  price: PriceBreakdown;
  contact: { phone: string; email: string };
  createdAt: string;
  travelDate: string;
};

export type Promotion = {
  code: string;
  discount: number;
  kind: "FLAT" | "PERCENT";
  labelAr: string;
  labelEn: string;
};
