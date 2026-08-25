import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CheckCircle, DownloadSimple, ShareNetwork, WhatsappLogo } from "@phosphor-icons/react";
import { toast } from "sonner";

import { AppShell } from "@/components/rahal/AppShell";
import {
  EmptyState,
  Price,
  Section,
  StatusBadge,
  btnGhost,
  btnPrimary,
  cardShell,
} from "@/components/rahal/ui";
import { airport } from "@/data/reference";
import { useI18n } from "@/lib/i18n";
import { formatDate, formatTime } from "@/lib/format";
import { scaleIn } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { bookingByRef } from "@/services/store";
import type { Booking } from "@/services/types";

export const Route = createFileRoute("/book/confirmation/$reference")({
  head: () => ({
    meta: [
      { title: "تأكيد الحجز | رحال Rahal" },
      { name: "description", content: "تم تأكيد حجزك. احفظ رقم الحجز وحمّل قسيمة السفر." },
      { property: "og:title", content: "تأكيد الحجز | رحال Rahal" },
      { property: "og:description", content: "حجزك مؤكد مع رحال." },
    ],
  }),
  component: Confirmation,
});

function Confirmation() {
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
            description={p("تحقق من رقم الحجز أو راجع حجوزاتك.", "Check the reference or review your bookings.", "ژمارەکە بپشکنە.")}
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

  return (
    <AppShell>
      <Section className="pt-10">
        <motion.div variants={scaleIn} initial="hidden" animate="visible" className="mx-auto max-w-2xl">
          <div className={cn(cardShell, "overflow-hidden")}>
            <div className="flex flex-col items-center gap-3 bg-brand px-6 py-10 text-center">
              <CheckCircle weight="fill" className="h-16 w-16 text-mint" />
              <h1 className="text-2xl font-bold text-white">{t("confirmed_title")}</h1>
              <p className="text-base text-white/65">{t("confirmed_sub")}</p>
              <div className="mt-3 rounded-2xl bg-white/10 px-6 py-3">
                <p className="text-xs text-white/60">{t("booking_ref")}</p>
                <p className="text-2xl font-semibold tracking-[0.2em] text-mint" dir="ltr">
                  {booking.reference}
                </p>
              </div>
            </div>

            <div className="grid gap-4 p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-lg font-bold text-brand">
                  {city(dep)} → {city(arr)}
                </p>
                <div className="flex gap-2">
                  <StatusBadge status={booking.status} />
                  <StatusBadge status={booking.paymentStatus} />
                </div>
              </div>
              <p className="text-base text-text-tertiary">
                {formatDate(booking.offer.departAt, lang)} ·{" "}
                <span dir="ltr">{formatTime(booking.offer.departAt, lang)}</span>
              </p>
              <ul className="grid gap-1 text-base text-text-secondary">
                {booking.travelers.map((tr) => (
                  <li key={tr.id} dir="ltr" className="text-start">
                    {tr.firstName} {tr.lastName} · {tr.passportNumber}
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-hairline pt-4">
                <span className="text-base font-bold text-brand">{t("total")}</span>
                <Price value={booking.price.total} />
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => toast.success(t("download_voucher"))}
                  className={cn(btnGhost, "gap-2")}
                >
                  <DownloadSimple className="h-5 w-5" />
                  {t("download_voucher")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(booking.reference);
                    toast.success(t("share_booking"));
                  }}
                  className={cn(btnGhost, "gap-2")}
                >
                  <ShareNetwork className="h-5 w-5" />
                  {t("share_booking")}
                </button>
                <a href="https://wa.me/9647700000000" target="_blank" rel="noreferrer" className={cn(btnGhost, "gap-2")}>
                  <WhatsappLogo className="h-5 w-5" />
                  {t("contact_support")}
                </a>
              </div>

              <Link
                to="/bookings/$reference"
                params={{ reference: booking.reference }}
                className={cn(btnPrimary, "mt-2 w-full")}
              >
                {t("view_booking")}
              </Link>
            </div>
          </div>
        </motion.div>
      </Section>
    </AppShell>
  );
}
