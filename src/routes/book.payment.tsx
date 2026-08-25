import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CreditCard, Money, CalendarCheck, LockKey } from "@phosphor-icons/react";
import { toast } from "sonner";

import { AppShell } from "@/components/rahal/AppShell";
import { TripSummary } from "@/components/rahal/TripSummary";
import {
  EmptyState,
  Field,
  Price,
  Section,
  SectionHeading,
  btnGhost,
  btnPrimary,
  cardShell,
  inputClass,
} from "@/components/rahal/ui";
import { useI18n } from "@/lib/i18n";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { confirmPaymentOtp, payWithCard } from "@/lib/pay.functions";
import { BNPL_LIMIT, createBooking, getCart, priceCart, setCart, type Cart } from "@/services/store";
import type { PaymentMethod } from "@/services/types";

export const Route = createFileRoute("/book/payment")({
  head: () => ({
    meta: [
      { title: "الدفع | رحال Rahal" },
      { name: "description", content: "ادفع بالبطاقة أو محفظة محلية أو بالتقسيط لإتمام حجزك بالدينار العراقي." },
      { property: "og:title", content: "الدفع | رحال Rahal" },
      { property: "og:description", content: "طرق دفع محلية وتقسيط مرن." },
    ],
  }),
  component: PaymentPage,
});

/** Card scheme exactly as the carrier's checkout SDK labels it. */
function cardVendor(pan: string): "visa" | "mastercard" | "amex" | "unknown" {
  const n = pan.replace(/\D/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  return "unknown";
}

function PaymentPage() {
  const navigate = useNavigate();
  const { t, p } = useI18n();
  const [cart, setCartState] = useState<Cart | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("CARD");
  const [months, setMonths] = useState(3);
  const [card, setCard] = useState({ number: "", name: "", exp: "", cvc: "", city: "Baghdad" });
  const [busy, setBusy] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [payRef, setPayRef] = useState("");

  const runPayWithCard = useServerFn(payWithCard);
  const runConfirmOtp = useServerFn(confirmPaymentOtp);

  useEffect(() => setCartState(getCart()), []);

  const price = useMemo(() => (cart ? priceCart(cart) : null), [cart]);
  const bnplEligible = price ? price.total <= BNPL_LIMIT : false;

  const methods: { key: PaymentMethod; label: string; icon: typeof CreditCard; hint: string }[] = [
    { key: "CARD", label: t("pay_card"), icon: CreditCard, hint: "Visa · Mastercard" },
    { key: "LOCAL", label: t("pay_local"), icon: Money, hint: p("زين كاش · آسيا حوالة", "ZainCash · AsiaHawala", "زەین کاش · ئاسیا") },
    { key: "BNPL", label: t("pay_bnpl"), icon: CalendarCheck, hint: t("bnpl_available") },
  ];


  /** Mock channels (wallet / installments) settle instantly. */
  function finish() {
    if (!cart || !price) return;
    const booking = createBooking(cart, method, method === "BNPL" ? months : undefined);
    track("payment_completed", { method, reference: booking.reference });
    track("booking_confirmed", { reference: booking.reference });
    setCart(null);
    setBusy(false);
    navigate({ to: "/book/confirmation/$reference", params: { reference: booking.reference } });
  }

  async function pay() {
    if (!cart || !price) return;
    if (method === "CARD" && (card.number.replace(/\s/g, "").length < 12 || !card.name || !card.exp || card.cvc.length < 3)) {
      toast.error(p("تحقق من بيانات البطاقة", "Check the card details", "زانیاری کارتەکە بپشکنە"));
      return;
    }
    if (method === "BNPL" && !bnplEligible) {
      toast.error(t("bnpl_over"));
      return;
    }
    setBusy(true);
    track("payment_started", { method, total: price.total });

    if (method !== "CARD") {
      setTimeout(finish, 1100);
      return;
    }

    const pan = card.number.replace(/\D/g, "");
    const [mm = "", yy = ""] = card.exp.split("/").map((s) => s.trim());
    try {
      const res = await runPayWithCard({
        data: {
          pan,
          cvv: card.cvc,
          holderName: card.name,
          expMonth: mm.padStart(2, "0"),
          expYear: yy.slice(-2),
          vendor: cardVendor(pan),
          city: card.city || "Baghdad",
          country: "IQ",
          zipcode: "00000",
        },
      });
      if (res.kind === "approved") {
        finish();
        return;
      }
      if (res.kind === "otp_required") {
        setPayRef(res.reference);
        setOtp("");
        setOtpOpen(true);
        setBusy(false);
        toast.info(res.message ?? p("أدخل رمز التحقق المرسل من مصرفك", "Enter the OTP sent by your bank", "کۆدی OTP بنووسە"));
        return;
      }
      setBusy(false);
      toast.error(res.message);
    } catch {
      setBusy(false);
      toast.error(p("تعذّر الاتصال ببوابة الدفع", "Could not reach the payment gateway", "پەیوەندی بە دەروازەی پارەدان نەکرا"));
    }
  }

  async function submitOtp() {
    if (otp.replace(/\D/g, "").length < 4) {
      toast.error(p("أدخل رمز التحقق", "Enter the OTP code", "کۆدی OTP بنووسە"));
      return;
    }
    setBusy(true);
    try {
      const res = await runConfirmOtp({ data: { reference: payRef, otp: otp.replace(/\D/g, "") } });
      if (res.kind === "approved") {
        setOtpOpen(false);
        finish();
        return;
      }
      setBusy(false);
      if (res.kind === "declined") toast.error(res.message);
      else toast.error(p("رمز غير صحيح، حاول مرة أخرى", "Invalid code, try again", "کۆد هەڵەیە، دووبارە هەوڵ بدە"));
    } catch {
      setBusy(false);
      toast.error(p("تعذّر التحقق من الرمز", "Could not verify the code", "کۆد پشکنین نەکرا"));
    }
  }


  if (!cart || !price) {
    return (
      <AppShell>
        <Section className="pt-10">
          <EmptyState
            title={p("لا توجد عملية حجز جارية", "No booking in progress", "هیچ حیجزێک بەردەوام نییە")}
            description={p("ابدأ بحثًا جديدًا لاختيار رحلة.", "Start a new search to pick a flight.", "گەڕانێکی نوێ دەست پێ بکە.")}
            actionLabel={t("nav_flights")}
            actionTo="/flights"
          />
        </Section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Section className="pt-6">
        <SectionHeading
          eyebrow={p("الخطوة 2 من 2", "Step 2 of 2", "هەنگاوی 2 لە 2")}
          title={t("payment")}
          description={p("جميع المبالغ بالدينار العراقي.", "All amounts are in Iraqi dinar.", "هەموو بڕەکان بە دیناری عێراقین.")}
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-4">
            <div className={cn(cardShell, "grid gap-3 p-6 sm:grid-cols-3")}>
              {methods.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMethod(m.key)}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-2xl border p-4 text-start transition-colors",
                    method === m.key
                      ? "border-brand-mid bg-brand-mid/8"
                      : "border-hairline hover:bg-surface-light",
                  )}
                >
                  <m.icon className="h-6 w-6 text-brand-mid" />
                  <span className="text-base font-bold text-brand">{m.label}</span>
                  <span className="text-xs text-text-placeholder">{m.hint}</span>
                </button>
              ))}
            </div>

            {method === "CARD" ? (
              <div className={cn(cardShell, "grid gap-4 p-6 sm:grid-cols-2")}>
                <div className="sm:col-span-2">
                  <Field label={t("card_number")}>
                    <input
                      className={inputClass}
                      dir="ltr"
                      inputMode="numeric"
                      placeholder="4242 4242 4242 4242"
                      value={card.number}
                      onChange={(e) => setCard((c) => ({ ...c, number: e.target.value }))}
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label={t("card_name")}>
                    <input
                      className={inputClass}
                      dir="ltr"
                      value={card.name}
                      onChange={(e) => setCard((c) => ({ ...c, name: e.target.value.toUpperCase() }))}
                    />
                  </Field>
                </div>
                <Field label={t("card_exp")}>
                  <input
                    className={inputClass}
                    dir="ltr"
                    placeholder="12/28"
                    value={card.exp}
                    onChange={(e) => setCard((c) => ({ ...c, exp: e.target.value }))}
                  />
                </Field>
                <Field label={t("card_cvc")}>
                  <input
                    className={inputClass}
                    dir="ltr"
                    inputMode="numeric"
                    value={card.cvc}
                    onChange={(e) => setCard((c) => ({ ...c, cvc: e.target.value }))}
                  />
                </Field>
              </div>
            ) : null}

            {method === "LOCAL" ? (
              <div className={cn(cardShell, "p-6")}>
                <p className="text-base leading-relaxed text-text-tertiary">
                  {p(
                    "سيصلك رمز دفع على رقم الهاتف لإكمال العملية عبر المحفظة المحلية خلال 30 دقيقة.",
                    "A payment code will be sent to your phone to complete the transfer through your local wallet within 30 minutes.",
                    "کۆدی پارەدان بۆ مۆبایلەکەت دەنێردرێت بۆ تەواوکردن لە ماوەی ٣٠ خولەک.",
                  )}
                </p>
              </div>
            ) : null}

            {method === "BNPL" ? (
              <div className={cn(cardShell, "p-6")}>
                <p className="text-base font-bold text-brand">
                  {bnplEligible ? t("bnpl_eligible") : t("bnpl_over")}
                </p>
                <p className="mt-1 text-xs text-text-tertiary">
                  {t("remaining")}: <Price value={BNPL_LIMIT} size="sm" />
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[3, 6, 9].map((m) => (
                    <button
                      key={m}
                      type="button"
                      disabled={!bnplEligible}
                      onClick={() => setMonths(m)}
                      className={cn(
                        "h-12 rounded-xl border px-5 text-base font-bold transition-colors disabled:opacity-40",
                        months === m ? "border-brand bg-brand text-white" : "border-hairline text-brand",
                      )}
                    >
                      {m} {t("bnpl_months")}
                    </button>
                  ))}
                </div>
                {bnplEligible ? (
                  <p className="mt-4 text-base text-text-tertiary">
                    {t("bnpl_monthly")}: <Price value={Math.round(price.total / months)} size="sm" />
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={pay}
                disabled={busy}
                className={cn(btnPrimary, "flex-1 gap-2 disabled:opacity-60")}
              >
                <LockKey className="h-5 w-5" />
                {busy ? t("loading") : t("pay_now")}
              </button>
              <button type="button" onClick={() => navigate({ to: "/book/travelers" })} className={btnGhost}>
                {t("back")}
              </button>
            </div>
          </div>

          <TripSummary
            cart={cart}
            onPromo={(code) => {
              const next: Cart = code ? { ...cart, promoCode: code } : (({ promoCode, ...rest }) => rest)(cart);
              setCart(next);
              setCartState(next);
            }}
          />
        </div>

        {otpOpen ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
            <div className={cn(cardShell, "w-full max-w-sm p-6")}>
              <p className="text-lg font-bold text-brand">
                {p("رمز التحقق (OTP)", "Verification code (OTP)", "کۆدی پشتڕاستکردنەوە (OTP)")}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                {p(
                  "أدخل الرمز المرسل من مصرفك لإكمال الدفع.",
                  "Enter the code sent by your bank to complete the payment.",
                  "کۆدەکەی بانکەکەت بنووسە بۆ تەواوکردنی پارەدان.",
                )}
              </p>
              <div className="mt-4">
                <Field label={p("الرمز", "Code", "کۆد")}>
                  <input
                    className={inputClass}
                    dir="ltr"
                    inputMode="numeric"
                    autoFocus
                    maxLength={8}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </Field>
              </div>
              <div className="mt-4 flex gap-3">
                <button type="button" onClick={submitOtp} disabled={busy} className={cn(btnPrimary, "flex-1 disabled:opacity-60")}>
                  {busy ? t("loading") : p("تأكيد", "Confirm", "پشتڕاستکردن")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOtpOpen(false);
                    setBusy(false);
                  }}
                  className={btnGhost}
                >
                  {p("إلغاء", "Cancel", "هەڵوەشاندن")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </Section>

    </AppShell>
  );
}
