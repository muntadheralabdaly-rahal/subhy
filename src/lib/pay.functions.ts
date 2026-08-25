import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { PayResult } from "@/services/amadeusPay.server";

const cardSchema = z.object({
  ppid: z.string().min(8).max(64).optional(),
  pan: z.string().regex(/^\d{12,19}$/),
  cvv: z.string().regex(/^\d{3,4}$/),
  holderName: z.string().min(2).max(40),
  expMonth: z.string().regex(/^\d{2}$/),
  expYear: z.string().regex(/^\d{2}$/),
  vendor: z.enum(["visa", "mastercard", "amex", "unknown"]),
  city: z.string().min(2).max(40),
  country: z.string().regex(/^[A-Z]{2}$/),
  zipcode: z.string().max(10),
  tdsSessionId: z.string().max(80).optional(),
});

const otpSchema = z.object({
  ppid: z.string().min(8).max(64).optional(),
  reference: z.string().max(80),
  otp: z.string().regex(/^\d{4,8}$/),
});

export const payWithCard = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => cardSchema.parse(input))
  .handler(async ({ data }): Promise<PayResult> => {
    const ppid = data.ppid ?? process.env["IA_PAY_PPID"];
    if (!ppid) return { kind: "declined", message: "Missing checkout session (PPID)" };
    const { submitCardPayment } = await import("@/services/amadeusPay.server");
    return submitCardPayment(ppid, {
      pan: data.pan,
      cvv: data.cvv,
      holderName: data.holderName,
      expMonth: data.expMonth,
      expYear: data.expYear,
      vendor: data.vendor,
      address: { line1: "Baghdad", city: data.city, country: data.country, zipcode: data.zipcode },
      ...(data.tdsSessionId ? { tdsSessionId: data.tdsSessionId } : {}),
    });
  });

export const confirmPaymentOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => otpSchema.parse(input))
  .handler(async ({ data }): Promise<PayResult> => {
    const ppid = data.ppid ?? process.env["IA_PAY_PPID"];
    if (!ppid) return { kind: "declined", message: "Missing checkout session (PPID)" };
    const { submitPaymentOtp } = await import("@/services/amadeusPay.server");
    return submitPaymentOtp(ppid, data.reference, data.otp);
  });
