import { AirplaneInFlight, ArrowRight, ArrowLeft, Suitcase, Clock } from "@phosphor-icons/react";

import { airline } from "@/data/reference";
import { useI18n } from "@/lib/i18n";
import { formatDuration, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { cardShell, Price } from "@/components/rahal/ui";
import type { FlightOffer } from "@/services/types";

export function AirlineMark({ code, className }: { code: string; className?: string }) {
  const a = airline(code);
  return (
    <span
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xs font-semibold text-white",
        className,
      )}
      style={{ backgroundColor: a.tint }}
      aria-hidden
    >
      {a.code}
    </span>
  );
}

export function airlineName(code: string, lang: "ar" | "en" | "ku"): string {
  const a = airline(code);
  return lang === "en" ? a.nameEn : lang === "ku" ? a.nameKu : a.nameAr;
}

export function FlightLeg({ offer, compact = false }: { offer: FlightOffer; compact?: boolean }) {
  const { lang, dir, t } = useI18n();
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <div className="flex flex-1 items-center gap-3 sm:gap-5">
      <div className="text-start">
        <p className="text-xl font-bold tabular-nums text-brand sm:text-2xl" dir="ltr">
          {formatTime(offer.departAt, lang)}
        </p>
        <p className="text-xs font-medium text-text-placeholder">{offer.from}</p>
      </div>

      <div className="flex flex-1 flex-col items-center gap-1">
        <span className="text-xs font-medium text-text-placeholder">
          {formatDuration(offer.durationMinutes, lang)}
        </span>
        <div className="flex w-full items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green-muted" />
          <span className="h-px flex-1 bg-hairline" />
          <Arrow className="h-4 w-4 text-green-muted" />
          <span className="h-px flex-1 bg-hairline" />
          <span className="h-1.5 w-1.5 rounded-full bg-green-muted" />
        </div>
        <span className={cn("text-xs font-bold", offer.stops === 0 ? "text-brand-mid" : "text-text-placeholder")}>
          {offer.stops === 0 ? t("direct") : offer.stops === 1 ? t("one_stop") : t("two_stops")}
        </span>
      </div>

      <div className="text-end">
        <p className="text-xl font-bold tabular-nums text-brand sm:text-2xl" dir="ltr">
          {formatTime(offer.arriveAt, lang)}
        </p>
        <p className="text-xs font-medium text-text-placeholder">{offer.to}</p>
      </div>

      {compact ? null : null}
    </div>
  );
}

export function FlightCard({
  offer,
  seats,
  onSelect,
}: {
  offer: FlightOffer;
  seats: number;
  onSelect: () => void;
}) {
  const { t, lang, p } = useI18n();
  const total = (offer.basePrice + offer.taxes) * seats;

  return (
    <article className={cn(cardShell, "p-5 sm:p-8")}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-8">
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center gap-3">
            <AirlineMark code={offer.airline} />
            <div>
              <p className="text-base font-bold text-brand">{airlineName(offer.airline, lang)}</p>
              <p className="text-xs text-text-placeholder" dir="ltr">
                {offer.segments.map((s) => s.flightNumber).join(" · ")}
              </p>
            </div>
          </div>

          {import.meta.env.DEV ? (
            <div className="rounded-2xl bg-surface-light px-3 py-2 text-[11px] leading-relaxed text-text-secondary" dir="ltr">
              <p className="flex items-center gap-2 font-bold text-brand">
                <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">DEV</span>
                {p("معرّفات الناقل", "Carrier identifiers", "ناسنامەکانی کۆمپانیا")}
              </p>
              <p className="break-all">offerId: {offer.id}</p>
              {offer.providerRef ? <p className="break-all">airBoundId: {offer.providerRef}</p> : null}
              <p className="break-all">
                segments:{" "}
                {offer.segments
                  .map((s) => `${s.flightNumber} ${s.from}→${s.to} ${s.departAt}${s.aircraft ? ` (${s.aircraft})` : ""}`)
                  .join(" | ")}
              </p>
            </div>
          ) : null}


          <FlightLeg offer={offer} />

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-light px-3 text-xs font-bold text-text-secondary">
              <Suitcase className="h-4 w-4" />
              {offer.checkedBaggageKg} kg
            </span>
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-light px-3 text-xs font-bold text-text-secondary">
              <AirplaneInFlight className="h-4 w-4" />
              {t(
                offer.cabin === "ECONOMY"
                  ? "cabin_economy"
                  : offer.cabin === "PREMIUM_ECONOMY"
                    ? "cabin_premium"
                    : offer.cabin === "BUSINESS"
                      ? "cabin_business"
                      : "cabin_first",
              )}
            </span>
            {offer.source === "IA_LIVE" ? (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-brand px-3 text-xs font-bold text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-mint" />
                {p("سعر مباشر من الناقل", "Live airline fare", "نرخی ڕاستەوخۆ")}
              </span>
            ) : null}
            {offer.refundable ? (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-brand-mid/12 px-3 text-xs font-bold text-brand-mid">
                {p("قابل للإلغاء", "Refundable", "گەڕانەوەی پارە")}
              </span>
            ) : null}
            {offer.seatsLeft <= 4 ? (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-mint/25 px-3 text-xs font-bold text-brand">
                <Clock className="h-4 w-4" />
                {p(`باقي ${offer.seatsLeft} مقاعد`, `${offer.seatsLeft} seats left`, `${offer.seatsLeft} کورسی ماوە`)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-end justify-between gap-3 border-t border-hairline pt-4 lg:w-56 lg:flex-col lg:items-stretch lg:border-0 lg:border-s lg:ps-8 lg:pt-0">
          <div className="text-start lg:text-end">
            <Price value={total} size="lg" />
            <p className="text-xs text-text-placeholder">
              {seats > 1
                ? p(`لـ ${seats} مسافرين`, `for ${seats} travelers`, `بۆ ${seats} گەشتیار`)
                : p("للمسافر الواحد", "per traveler", "بۆ هەر گەشتیارێک")}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={onSelect} className="h-12 rounded-full border border-surface-accent-stronger bg-surface-accent-stronger px-6 text-base font-bold text-white transition-colors hover:bg-brand-mid-hover">
              {t("select")}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
