import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  ArrowUUpLeft,
  Clock,
  Suitcase,
  Armchair,
  Info,
  Warning,
  ArrowSquareOut,
} from "@phosphor-icons/react";

import { AppShell } from "@/components/rahal/AppShell";
import { AirlineMark, airlineName } from "@/components/flights/FlightCard";
import {
  CardSkeleton,
  EmptyState,
  ErrorState,
  Price,
  Section,
  btnPrimary,
  cardShell,
} from "@/components/rahal/ui";
import { airport } from "@/data/reference";
import { useI18n } from "@/lib/i18n";
import { formatDate, formatDuration, formatTime } from "@/lib/format";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { flightService } from "@/services/flightService";
import { baggageForOffer } from "@/lib/ia.functions";
import type { BaggageAllowance } from "@/services/types";
import { flightSearchSchema, paramsToSearch } from "@/services/searchParams";
import { SERVICE_FEE, seatCount, setCart } from "@/services/store";

export const Route = createFileRoute("/flights/$offerId")({
  validateSearch: flightSearchSchema,
  head: () => ({
    meta: [
      { title: "تفاصيل الرحلة | رحال Rahal" },
      {
        name: "description",
        content: "تفاصيل مسار الرحلة، الأمتعة، نوع الطائرة وقواعد التغيير والإلغاء قبل الحجز.",
      },
      { property: "og:title", content: "تفاصيل الرحلة | رحال Rahal" },
      { property: "og:description", content: "مسار الرحلة، الأمتعة وقواعد الأجرة بالتفصيل." },
    ],
  }),
  component: Details,
});

const POLICY_LINKS = [
  {
    href: "https://www.iraqiairways.com.iq/en/baggage",
    ar: "سياسة الأمتعة التفصيلية",
    en: "Detailed baggage policy",
    ku: "سیاسەتى بار",
  },
  {
    href: "https://www.iraqiairways.com.iq/en/terms-and-conditions",
    ar: "مراجعة الشروط",
    en: "Review conditions",
    ku: "پێداچوونەوەى مەرجەکان",
  },
  {
    href: "https://www.iraqiairways.com.iq/en/dangerous-goods",
    ar: "سياسة المواد الخطرة",
    en: "Dangerous goods policy",
    ku: "سیاسەتى کەلوپەلى مەترسیدار",
  },
] as const;

function Details() {
  const { offerId } = Route.useParams();
  const params = Route.useSearch();
  const navigate = useNavigate();
  const { t, lang, p } = useI18n();

  const cityName = (code: string) => {
    const a = airport(code);
    return lang === "en" ? a.cityEn : lang === "ku" ? (a.cityKu ?? a.cityAr) : a.cityAr;
  };

  const allowanceText = (
    live: BaggageAllowance | undefined,
    fallback: BaggageAllowance,
  ) => {
    const a = live ?? fallback;
    if (a.type === "piece")
      return p(
        `${a.quantity} ${a.quantity === 1 ? "قطعة" : "قطع"}`,
        `${a.quantity} ${a.quantity === 1 ? "piece" : "pieces"}`,
        `${a.quantity} پارچە`,
      );
    return p(`${a.quantity} كغم`, `${a.quantity} kg`, `${a.quantity} کگم`);
  };

  const search = useMemo(() => paramsToSearch(params), [params]);
  const seats = Math.max(1, seatCount(search));

  const query = useQuery({
    queryKey: ["offer", offerId, params],
    queryFn: () => flightService.offerById(search, offerId),
  });

  const offer = query.data;

  // The airline quotes the real free allowance per fare family, but only for a
  // bound sitting in a cart. Skip the round trip when the search response
  // already advertised it.
  const airBoundId = offer && !offer.baggage ? offer.providerRef : undefined;
  const baggageQuery = useQuery({
    queryKey: ["offer-baggage", airBoundId],
    enabled: Boolean(airBoundId),
    queryFn: () => baggageForOffer({ data: { airBoundId: airBoundId! } }),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const baggage = offer?.baggage ?? baggageQuery.data?.baggage ?? undefined;

  function book() {
    if (!offer) return;
    track("flight_offer_selected", { offer: offer.id, source: "details" });
    setCart({ offer, search, travelers: [], contact: { phone: "", email: "" } });
    navigate({ to: "/book/travelers" });
  }

  return (
    <AppShell>
      <Section className="pt-6">
        <button
          type="button"
          onClick={() => navigate({ to: "/flights", search: params })}
          className="mb-5 inline-flex h-11 items-center gap-2 rounded-xl border border-hairline bg-white px-4 text-base font-bold text-brand hover:bg-surface-light"
        >
          <ArrowUUpLeft className="h-5 w-5" />
          {t("back")}
        </button>

        {query.isLoading ? (
          <CardSkeleton rows={5} />
        ) : query.isError ? (
          <ErrorState onRetry={() => query.refetch()} />
        ) : !offer ? (
          <EmptyState
            title={t("empty_results")}
            description={t("empty_results_cta")}
            actionLabel={t("back")}
            onAction={() => navigate({ to: "/flights", search: params })}
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="grid gap-4">
              <div className={cn(cardShell, "px-6 py-5 text-center sm:px-8")}>
                <h1 className="text-2xl font-bold text-brand">
                  {p("اختيارك", "Your selection", "هەڵبژاردەت")}
                </h1>
                <p className="mt-1 text-base text-text-tertiary">
                  {cityName(offer.from)} → {cityName(offer.to)}
                </p>
              </div>

              {offer.seatsLeft <= 4 ? (
                <div className="flex items-start gap-3 rounded-2xl border border-hairline border-s-4 border-s-semantic-error-strong bg-white p-5">
                  <Warning className="mt-0.5 h-5 w-5 shrink-0 text-semantic-error-strong" />
                  <div>
                    <p className="text-base font-bold text-semantic-error-strong">
                      {p("تنبيه واحد", "1 warning", "١ ئاگادارکردنەوە")}
                    </p>
                    <p className="mt-1 text-base text-text-tertiary">
                      {p(
                        `أسرع! آخر ${offer.seatsLeft} مقاعد بهذا السعر.`,
                        `Hurry up! Last ${offer.seatsLeft} seats available at this price.`,
                        `خێرا بکە! دوا ${offer.seatsLeft} کورسی بەم نرخە.`,
                      )}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className={cn(cardShell, "p-6 sm:p-8")}>
                <div className="flex items-center gap-3">
                  <AirlineMark code={offer.airline} />
                  <div>
                    <p className="text-lg font-bold text-brand">{airlineName(offer.airline, lang)}</p>
                    <p className="text-xs text-text-placeholder">{formatDate(offer.departAt, lang)}</p>
                  </div>
                  {offer.fareFamily ? (
                    <span className="ms-auto inline-flex h-9 items-center rounded-full bg-core-rahal-100 px-3 text-xs font-bold text-brand">
                      {offer.fareFamily}
                    </span>
                  ) : null}
                </div>

                <h2 className="mt-7 text-xl font-bold text-brand">{t("journey")}</h2>
                <ol className="mt-4 grid gap-6">
                  {offer.segments.map((seg, i) => {
                    const dep = airport(seg.from);
                    const arr = airport(seg.to);
                    const city = (a: typeof dep) =>
                      lang === "en" ? a.cityEn : lang === "ku" ? (a.cityKu ?? a.cityAr) : a.cityAr;
                    return (
                      <li key={seg.flightNumber} className="relative ps-8">
                        <span className="absolute start-0 top-1.5 h-3 w-3 rounded-full border-2 border-brand-mid bg-white" />
                        {i < offer.segments.length - 1 ? (
                          <span className="absolute start-[5px] top-6 h-[calc(100%+0.75rem)] w-0.5 bg-hairline" />
                        ) : null}
                        <div className="flex flex-wrap items-baseline gap-2">
                          <p className="text-lg font-bold tabular-nums text-brand" dir="ltr">
                            {formatTime(seg.departAt, lang)}
                          </p>
                          <p className="text-base font-bold text-brand">
                            {city(dep)} ({seg.from})
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-text-placeholder">
                          {t("flight_no")}: <span dir="ltr">{seg.flightNumber}</span> · {t("aircraft")}:{" "}
                          {seg.aircraft} · {formatDuration(seg.durationMinutes, lang)}
                        </p>
                        <div className="mt-2 flex flex-wrap items-baseline gap-2">
                          <p className="text-lg font-bold tabular-nums text-brand" dir="ltr">
                            {formatTime(seg.arriveAt, lang)}
                          </p>
                          <p className="text-base font-bold text-brand">
                            {city(arr)} ({seg.to})
                          </p>
                        </div>
                        {seg.layoverMinutes ? (
                          <p className="mt-3 inline-flex h-9 items-center gap-2 rounded-full bg-surface-light px-3 text-xs font-bold text-text-secondary">
                            <Clock className="h-4 w-4" />
                            {p("توقف", "Layover", "وەستان")} {formatDuration(seg.layoverMinutes, lang)}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              </div>

              <div className={cn(cardShell, "grid gap-4 p-6 sm:grid-cols-2 sm:p-8")}>
                <div className="flex items-start gap-3">
                  <Suitcase className="mt-0.5 h-5 w-5 text-brand-mid" />
                  <div>
                    <p className="text-base font-bold text-brand">
                      {p("أمتعة مسجّلة مجانية", "Free checked baggage", "بارى خۆڕایی")}
                    </p>
                    <p className="text-base text-text-tertiary">
                      {allowanceText(baggage?.checked, {
                        type: "weight",
                        quantity: offer.checkedBaggageKg,
                        unit: "kilogram",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Armchair className="mt-0.5 h-5 w-5 text-brand-mid" />
                  <div>
                    <p className="text-base font-bold text-brand">
                      {p("أمتعة يد مجانية", "Free carry-on", "بارى دەست")}
                    </p>
                    <p className="text-base text-text-tertiary">
                      {allowanceText(baggage?.carryOn, {
                        type: "weight",
                        quantity: offer.cabinBaggageKg,
                        unit: "kilogram",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:col-span-2">
                  <Info className="mt-0.5 h-5 w-5 text-brand-mid" />
                  <div>
                    <p className="text-base font-bold text-brand">{t("fare_rules")}</p>
                    <p className="mt-1 text-base leading-relaxed text-text-tertiary">
                      {t("change_rules")}:{" "}
                      {offer.changeable
                        ? p("مسموح برسوم", "Allowed with a fee", "بە کرێ ڕێگەپێدراوە")
                        : p("غير مسموح", "Not allowed", "ڕێگە پێنەدراو")}
                    </p>
                    <p className="text-base leading-relaxed text-text-tertiary">
                      {t("cancel_rules")}:{" "}
                      {offer.refundable
                        ? p("قابل للاسترداد جزئيًا", "Partially refundable", "بەشێکی دەگەڕێتەوە")
                        : p("غير قابل للاسترداد", "Non-refundable", "ناگەڕێتەوە")}
                    </p>
                    {baggage?.regulations.length ? (
                      <p className="mt-1 text-xs text-text-placeholder" dir="ltr">
                        {baggage.regulations.join(" · ")}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-hairline pt-4 sm:col-span-2">
                  {POLICY_LINKS.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline"
                    >
                      {p(link.ar, link.en, link.ku)}
                      <ArrowSquareOut className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <aside className={cn(cardShell, "h-fit p-6 lg:sticky lg:top-24")}>
              <h2 className="text-xl font-bold text-brand">{t("price_breakdown")}</h2>
              <dl className="mt-4 grid gap-3 text-base">
                <div className="flex justify-between">
                  <dt className="text-text-tertiary">{t("base_fare")}</dt>
                  <dd><Price value={offer.basePrice * seats} size="sm" /></dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-tertiary">{t("taxes")}</dt>
                  <dd><Price value={offer.taxes * seats} size="sm" /></dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-tertiary">{t("service_fee")}</dt>
                  <dd><Price value={SERVICE_FEE} size="sm" /></dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-tertiary">
                    {p("سعر الرحلة الإجمالي", "Total price for flight", "نرخى گشتى گەشتەکە")}
                  </dt>
                  <dd><Price value={(offer.basePrice + offer.taxes) * seats} size="sm" /></dd>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-hairline pt-4">
                  <dt className="text-lg font-bold text-brand">{t("total")}</dt>
                  <dd><Price value={(offer.basePrice + offer.taxes) * seats + SERVICE_FEE} /></dd>
                </div>
              </dl>
              <p className="mt-2 text-xs leading-relaxed text-text-placeholder">
                {p(
                  "السعر لجميع المسافرين ويشمل الضرائب والرسوم والخصومات.",
                  "Price for all passengers, including taxes, fees and discounts.",
                  "نرخ بۆ هەموو گەشتیارەکان، لەگەڵ باج و کرێ.",
                )}
              </p>
              <button type="button" onClick={book} className={cn(btnPrimary, "mt-6 w-full")}>
                {p("أكمل بيانات المسافرين", "Fill passenger details", "زانیارى گەشتیاران پڕبکە")}
              </button>
            </aside>
          </div>
        )}
      </Section>
    </AppShell>
  );
}
