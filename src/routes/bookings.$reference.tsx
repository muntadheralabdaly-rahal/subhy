import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DownloadSimple, Receipt, WhatsappLogo, XCircle } from "@phosphor-icons/react";
import { toast } from "sonner";

import { AppShell } from "@/components/rahal/AppShell";
import {
  EmptyState,
  Price,
  Section,
  SectionHeading,
  StatusBadge,
  btnGhost,
  cardShell,
} from "@/components/rahal/ui";
import { airport } from "@/data/reference";
import { airlineName } from "@/components/flights/FlightCard";
import { useI18n } from "@/lib/i18n";
import { formatDate, formatTime } from "@/lib/format";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { bookingByRef, cancelBooking } from "@/services/store";
import type { Booking } from "@/services/types";

export const Route = createFileRoute("/bookings/$reference")({
  head: () => ({
    meta: [
      { title: "تفاصيل الحجز | رحال Rahal" },
      { name: "description", content: "راجع تفاصيل حجزك، المسافرين، الدفع والمستندات وإمكانية الإلغاء." },
      { property: "og:title", content: "تفاصيل الحجز | رحال Rahal" },
      { property: "og:description", content: "تفاصيل الحجز والمستندات." },
    ],
  }),
  component: BookingDetail,
});

function BookingDetail() {
  const { reference } = Route.useParams();
  const { t, lang, p } = useI18n();
  const [booking, setBooking] = useState<Booking | null | undefined>(undefined);

  useEffect(() => setBooking(bookingByRef(reference) ?? null), [reference]);

  if (booking === undefined) return null;

  if (!booking) {
    return (
      <AppShell>
        <Section className="pt-10">
          <EmptyState
            title={p("لم نجد هذا الحجز", "Booking not found", "ئەم حیجزە نەدۆزرایەوە")}
            description={t("no_bookings_cta")}
            actionLabel={t("nav_bookings")}
            actionTo="/bookings"
          />
        </Section>
      </AppShell>
    );
  }

  const dep = airport(booking.offer.from);
  const arr = airport(booking.offer.to);
  const city = (a: typeof dep) => (lang === "en" ? a.cityEn : lang === "ku" ? (a.cityKu ?? a.cityAr) : a.cityAr);

  function cancel() {
    cancelBooking(booking!.reference);
    setBooking(bookingByRef(reference) ?? null);
    track("booking_cancelled", { reference });
    toast.success(t("cancelled"));
  }

  return (
    <AppShell>
      <Section className="pt-6">
        <SectionHeading
          eyebrow={`${t("booking_ref")} ${booking.reference}`}
          title={`${city(dep)} → ${city(arr)}`}
          description={`${formatDate(booking.travelDate, lang)} · ${airlineName(booking.offer.airline, lang)}`}
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="grid gap-4">
            <div className={cn(cardShell, "p-6")}>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={booking.status} />
                <StatusBadge status={booking.paymentStatus} />
              </div>
              <div className="mt-5 grid gap-2 text-base text-text-secondary">
                <p>
                  {t("f_depart")}: <span dir="ltr">{formatTime(booking.offer.departAt, lang)}</span> ·{" "}
                  {formatDate(booking.offer.departAt, lang)}
                </p>
                <p>
                  {t("flight_no")}:{" "}
                  <span dir="ltr">{booking.offer.segments.map((s) => s.flightNumber).join(" · ")}</span>
                </p>
                <p>
                  {t("baggage")}: {booking.offer.checkedBaggageKg} kg · {t("cabin_bag")}:{" "}
                  {booking.offer.cabinBaggageKg} kg
                </p>
              </div>
            </div>

            <div className={cn(cardShell, "p-6")}>
              <p className="text-lg font-bold text-brand">{t("travelers_title")}</p>
              <ul className="mt-3 grid gap-2 text-base text-text-secondary">
                {booking.travelers.map((tr) => (
                  <li key={tr.id} dir="ltr" className="text-start">
                    {tr.firstName} {tr.lastName} · {tr.passportNumber} · {tr.nationality}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-text-placeholder" dir="ltr">
                {booking.contact.phone} · {booking.contact.email}
              </p>
            </div>

            <div className={cn(cardShell, "p-6")}>
              <p className="text-lg font-bold text-brand">{t("documents")}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => toast.success(t("ticket"))} className={cn(btnGhost, "gap-2")}>
                  <DownloadSimple className="h-5 w-5" />
                  {t("ticket")}
                </button>
                <button type="button" onClick={() => toast.success(t("invoice"))} className={cn(btnGhost, "gap-2")}>
                  <Receipt className="h-5 w-5" />
                  {t("invoice")}
                </button>
              </div>
            </div>
          </div>

          <aside className={cn(cardShell, "h-fit p-6 lg:sticky lg:top-24")}>
            <p className="text-lg font-bold text-brand">{t("price_breakdown")}</p>
            <dl className="mt-4 grid gap-3 text-base">
              <div className="flex justify-between">
                <dt className="text-text-tertiary">{t("base_fare")}</dt>
                <dd><Price value={booking.price.base} size="sm" /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-tertiary">{t("taxes")}</dt>
                <dd><Price value={booking.price.taxes} size="sm" /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-tertiary">{t("service_fee")}</dt>
                <dd><Price value={booking.price.serviceFee} size="sm" /></dd>
              </div>
              {booking.price.discount > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-brand-mid">{t("discount")}</dt>
                  <dd><Price value={-booking.price.discount} size="sm" className="text-brand-mid" /></dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between border-t border-hairline pt-4">
                <dt className="text-lg font-bold text-brand">{t("total")}</dt>
                <dd><Price value={booking.price.total} /></dd>
              </div>
            </dl>

            {booking.installments ? (
              <p className="mt-4 text-xs text-text-tertiary">
                {booking.installments} {t("bnpl_months")} · {t("bnpl_monthly")}:{" "}
                <Price value={Math.round(booking.price.total / booking.installments)} size="sm" />
              </p>
            ) : null}

            <a
              href="https://wa.me/9647700000000"
              target="_blank"
              rel="noreferrer"
              className={cn(btnGhost, "mt-5 w-full gap-2")}
            >
              <WhatsappLogo className="h-5 w-5" />
              {t("need_help_booking")}
            </a>

            {booking.status !== "CANCELLED" ? (
              <button
                type="button"
                onClick={cancel}
                className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 px-5 text-base font-bold text-destructive transition-colors hover:bg-destructive/8"
              >
                <XCircle className="h-5 w-5" />
                {t("cancel_rules")}
              </button>
            ) : null}
          </aside>
        </div>
      </Section>
    </AppShell>
  );
}
