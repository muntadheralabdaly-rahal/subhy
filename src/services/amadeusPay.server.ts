/**
 * Amadeus Checkout (paypages.payment.amadeus.com) card submission — the same
 * endpoint the Iraqi Airways checkout SDK posts to.
 *
 * Server-only. Card data is forwarded straight to Amadeus and never stored or
 * logged here.
 *
 * Flow:
 *  1. POST /pay with { PPID, data: { mopid, mopdata }, action: "add" }
 *  2. The gateway answers with either a final status or an OTP/3DS challenge
 *  3. POST the OTP back with action: "authenticate"
 *
 * PPID is minted by the airline's checkout session; it is passed in from the
 * cart (or IA_PAY_PPID while testing against a captured session).
 */

const PAY_BASE = "https://paypages.payment.amadeus.com";
const PAY_PATH = "/1ASIATP/ARIAPP/pay";
const SDK_HOST = "online.iraqiairways.com.iq";
const SDK_VERSION = "WEB/5.7.0/1cb83a3";
const UA =
  "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36";

export type CardInput = {
  pan: string;
  cvv: string;
  holderName: string;
  expMonth: string;
  expYear: string;
  vendor: string;
  address: { line1: string; city: string; country: string; zipcode: string };
  tdsSessionId?: string;
};

export type PayResult =
  | { kind: "otp_required"; reference: string; message?: string }
  | { kind: "approved"; reference: string }
  | { kind: "declined"; message: string };

type GatewayResponse = {
  status?: string;
  state?: string;
  action?: string;
  reference?: string;
  transactionId?: string;
  paymentId?: string;
  challenge?: { type?: string; reference?: string };
  errors?: { title?: string; detail?: string }[];
  message?: string;
};

function payHeaders() {
  return {
    accept: "*/*",
    "accept-language": "en-US,en;q=0.9",
    "amadeus-checkout-sdk-flavor": "Core-Sdk",
    "amadeus-checkout-sdk-host": SDK_HOST,
    "amadeus-checkout-sdk-version": SDK_VERSION,
    "content-type": "text/plain;charset=UTF-8",
    origin: "https://prd.payment.amadeus.com",
    referer: "https://prd.payment.amadeus.com/",
    "user-agent": UA,
  };
}

async function postPay(payload: unknown): Promise<GatewayResponse | null> {
  const base = process.env["IA_PAY_BASE"] ?? PAY_BASE;
  const path = process.env["IA_PAY_PATH"] ?? PAY_PATH;
  try {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: payHeaders(),
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`[IA pay] ${path} failed [${res.status}]: ${text.slice(0, 200)}`);
      return null;
    }
    try {
      return JSON.parse(text) as GatewayResponse;
    } catch {
      return null;
    }
  } catch (error) {
    console.error("[IA pay] request threw", error);
    return null;
  }
}

function interpret(json: GatewayResponse | null): PayResult {
  if (!json) return { kind: "declined", message: "Payment gateway unavailable" };
  const err = json.errors?.[0];
  if (err) return { kind: "declined", message: err.detail ?? err.title ?? "Payment refused" };

  const reference =
    json.reference ?? json.challenge?.reference ?? json.transactionId ?? json.paymentId ?? "";
  const state = (json.status ?? json.state ?? json.action ?? "").toUpperCase();

  if (state.includes("OTP") || state.includes("CHALLENGE") || state.includes("AUTHENTICATION")) {
    return {
      kind: "otp_required",
      reference,
      ...(json.message ? { message: json.message } : {}),
    };
  }
  if (state.includes("SUCCESS") || state.includes("APPROVED") || state.includes("AUTHORISED")) {
    return { kind: "approved", reference };
  }
  // The SDK challenges by default for Iraqi issuers; treat unknown as OTP step.
  return { kind: "otp_required", reference, ...(json.message ? { message: json.message } : {}) };
}

export async function submitCardPayment(ppid: string, card: CardInput): Promise<PayResult> {
  const json = await postPay({
    PPID: ppid,
    data: {
      mopid: "creditcard",
      mopdata: {
        pan: card.pan,
        CVV: card.cvv,
        holdername: card.holderName,
        expmonth: card.expMonth,
        expyear: card.expYear,
        vendor: card.vendor,
        address: {
          address_line1: card.address.line1,
          country: card.address.country,
          city: card.address.city,
          zipcode: card.address.zipcode,
        },
        ...(card.tdsSessionId ? { tdsSessionId: card.tdsSessionId } : {}),
      },
    },
    action: "add",
  });
  return interpret(json);
}

export async function submitPaymentOtp(
  ppid: string,
  reference: string,
  otp: string,
): Promise<PayResult> {
  const json = await postPay({
    PPID: ppid,
    data: { mopid: "creditcard", mopdata: { otp, reference } },
    action: "authenticate",
  });
  return interpret(json);
}
