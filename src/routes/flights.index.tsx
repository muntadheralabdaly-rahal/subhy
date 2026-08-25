import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

import { AppShell } from "@/components/rahal/AppShell";
import { SearchPanel } from "@/components/flights/SearchPanel";
import { FlightCard } from "@/components/flights/FlightCard";
import { FiltersSheet, FiltersSidebar } from "@/components/flights/Filters";
import {
  CardSkeleton,
  EmptyState,
  ErrorState,
  Section,
  cardShell,
  container,
} from "@/components/rahal/ui";
import { airport } from "@/data/reference";
import { useI18n } from "@/lib/i18n";
import { formatDayShort, formatMoney } from "@/lib/format";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import {
  applyFilters,
  emptyFilters,
  flightService,
  sortOffers,
  type FlightFilters,
  type SortKey,
} from "@/services/flightService";
import { flightSearchSchema, paramsToSearch, searchToParams } from "@/services/searchParams";
import { seatCount, setCart } from "@/services/store";
import type { FareDay, FlightOffer } from "@/services/types";

export const Route = createFileRoute("/flights/")({
  validateSearch: flightSearchSchema,
  head: () => ({
    meta: [
      { title: "نتائج الطيران | رحال Rahal" },
      {
        name: "description",
        content: "قارن أسعار الطيران من وإلى العراق، رتّب حسب الأرخص أو الأسرع وفلتر حسب الأمتعة والتوقيت.",
      },
      { property: "og:title", content: "نتائج الطيران | رحال Rahal" },
      { property: "og:description", content: "أسعار طيران محدثة بالدينار العراقي مع فلاتر ذكية." },
    ],
  }),
  component: Results,
});

const SORTS: { key: SortKey; label: "sort_recommended" | "sort_cheapest" | "sort_fastest" | "sort_earliest" }[] = [
  { key: "recommended", label: "sort_recommended" },
  { key: "cheapest", label: "sort_cheapest" },
  { key: "fastest", label: "sort_fastest" },
  { key: "earliest", label: "sort_earliest" },
];

function FareStrip({
  days,
  active,
  onPick,
}: {
  days: FareDay[];
  active: string;
  onPick: (date: string) => void;
}) {
  const { t, lang } = useI18n();
  const cheapest = days.reduce((min, d) => (d.price < min.price ? d : min), days[0]!);

  return (
    <div className={cn(cardShell, "p-4")}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-base font-bold text-brand">{t("fare_calendar")}</p>
        <p className="text-xs font-bold text-brand-mid">
          {t("cheapest_day")}: {formatDayShort(cheapest.date, lang)}
        </p>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {days.map((d) => (
          <button
            key={d.date}
            type="button"
            onClick={() => onPick(d.date)}
            className={cn(
              "flex min-w-24 shrink-0 flex-col items-center gap-1 rounded-2xl border px-3 py-3 transition-colors",
              d.date === active
                ? "border-brand bg-brand text-white"
                : "border-hairline bg-white hover:bg-surface-light",
            )}
          >
            <span className={cn("text-xs font-medium", d.date === active ? "text-white/70" : "text-text-placeholder")}>
              {formatDayShort(d.date, lang)}
            </span>
            <span
              className={cn(
                "text-xs font-bold tabular-nums",
                d.date === active ? "text-mint" : d.date === cheapest.date ? "text-brand-mid" : "text-brand",
              )}
              dir="ltr"
            >
              {formatMoney(d.price, lang)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Results() {
  const params = Route.useSearch();
  const navigate = useNavigate();
  const { t, lang, p, dir } = useI18n();
  const [sort, setSort] = useState<SortKey>("recommended");
  const [filters, setFilters] = useState<FlightFilters>({ ...emptyFilters });
  const [editing, setEditing] = useState(false);

  const search = useMemo(() => paramsToSearch(params), [params]);
  const seats = Math.max(1, seatCount(search));

  const offersQuery = useQuery({
    queryKey: ["flights-live-v2", params],
    queryFn: () => flightService.search(search),
    staleTime: 0,
    retry: false,
  });
  const calendarQuery = useQuery({
    queryKey: ["fare-calendar-live-v2", params.from, params.to, params.depart, params.cabin],
    queryFn: () => flightService.fareCalendar(search),
    staleTime: 0,
    retry: false,
  });

  const offers = offersQuery.data ?? [];
  const priceBounds = useMemo<[number, number]>(() => {
    if (offers.length === 0) return [0, 1000000];
    const totals = offers.map((o) => o.basePrice + o.taxes);
    return [Math.min(...totals), Math.max(...totals)];
  }, [offers]);

  const airlineCodes = useMemo(
    () => Array.from(new Set(offers.map((o) => o.airline))),
    [offers],
  );

  const cabinCodes = useMemo(
    () => Array.from(new Set(offers.map((o) => o.cabin))),
    [offers],
  );

  const visible = useMemo(
    () => sortOffers(applyFilters(offers, filters), sort),
    [offers, filters, sort],
  );


  const activeCount =
    filters.airlines.length +
    filters.stops.length +
    filters.departWindows.length +
    filters.cabins.length +
    (filters.refundableOnly ? 1 : 0) +
    (filters.minBaggageKg ? 1 : 0) +
    (filters.maxPrice ? 1 : 0);

  function select(offer: FlightOffer) {
    track("flight_offer_selected", { offer: offer.id, airline: offer.airline });
    setCart({ offer, search, travelers: [], contact: { phone: "", email: "" } });
    navigate({
      to: "/flights/$offerId",
      params: { offerId: offer.id },
      search: searchToParams(search),
    });
  }

  const Caret = dir === "rtl" ? CaretLeft : CaretRight;
  const from = airport(params.from);
  const to = airport(params.to);
  const label = (a: typeof from) => (lang === "en" ? a.cityEn : lang === "ku" ? (a.cityKu ?? a.cityAr) : a.cityAr);

  return (
    <AppShell>
      <div className="border-b border-hairline bg-white">
        <div className={cn(container, "py-5")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="flex-1 rounded-2xl text-start transition-colors hover:bg-surface-light"
            >
              <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold text-brand">
                {label(from)}
                <span className="text-sm font-bold text-text-placeholder" dir="ltr">
                  ({params.from})
                </span>
                <Caret className="h-5 w-5 text-brand-mid" />
                {label(to)}
                <span className="text-sm font-bold text-text-placeholder" dir="ltr">
                  ({params.to})
                </span>
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {[
                  params.trip === "ROUND"
                    ? p("ذهاب وعودة", "Round trip", "چوون و گەڕان")
                    : p("ذهاب فقط", "One way", "تەنها چوون"),
                  params.ret
                    ? `${formatDayShort(params.depart, lang)} → ${formatDayShort(params.ret, lang)}`
                    : formatDayShort(params.depart, lang),
                  params.cabin === "BUSINESS"
                    ? p("درجة الأعمال", "Business", "پلەی بازرگانی")
                    : p("الاقتصادية", "Economy", "ئابووری"),
                  [
                    `${params.adults} ${p("بالغ", "adult", "گەورە")}`,
                    params.children ? `${params.children} ${p("طفل", "child", "منداڵ")}` : null,
                    params.infants ? `${params.infants} ${p("رضيع", "infant", "ساوا")}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · "),
                ].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-hairline bg-surface-light px-3 py-1 text-xs font-bold text-brand"
                  >
                    {chip}
                  </span>
                ))}
                <span className="text-xs text-text-placeholder">
                  {p(
                    `${visible.length} نتيجة`,
                    `${visible.length} results`,
                    `${visible.length} ئەنجام`,
                  )}
                </span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="h-12 rounded-xl border border-hairline px-5 text-base font-bold text-brand hover:bg-surface-light"
            >
              {editing ? t("back") : t("change")}
            </button>
          </div>
          {editing ? (
            <div className="mt-5">
              <SearchPanel initial={search} onSubmitted={() => setEditing(false)} />
            </div>
          ) : null}

        </div>
      </div>

      <Section className="pt-6">
        {calendarQuery.data && calendarQuery.data.length > 0 ? (
          <div className="mb-5">
            <FareStrip
              days={calendarQuery.data}
              active={params.depart}
              onPick={(depart) =>
                navigate({ to: "/flights", search: { ...searchToParams(search), depart } })
              }
            />
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <FiltersSidebar
            filters={filters}
            onChange={setFilters}
            priceBounds={priceBounds}
            airlineCodes={airlineCodes}
            cabins={cabinCodes}
          />

          <div>
            <div className="mb-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <FiltersSheet
                filters={filters}
                onChange={setFilters}
                priceBounds={priceBounds}
                activeCount={activeCount}
                airlineCodes={airlineCodes}
                cabins={cabinCodes}
              />
              {activeCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setFilters({ ...emptyFilters })}
                  className="h-12 shrink-0 rounded-xl border border-hairline bg-white px-4 text-base font-bold text-brand-mid hover:bg-surface-light"
                >
                  {t("reset")} ({activeCount})
                </button>
              ) : null}
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSort(s.key)}
                  className={cn(
                    "h-12 shrink-0 rounded-xl border px-4 text-base font-bold transition-colors",
                    sort === s.key
                      ? "border-brand bg-brand text-white"
                      : "border-hairline bg-white text-text-secondary hover:bg-surface-light",
                  )}
                >
                  {t(s.label)}
                </button>
              ))}
            </div>

            {!offersQuery.isLoading && !offersQuery.isError && visible.length > 0 ? (
              <p className="mb-3 text-sm font-bold text-text-secondary">
                {visible.length} · {t(SORTS.find((s) => s.key === sort)!.label)}
              </p>
            ) : null}


            {offersQuery.isLoading ? (
              <div className="grid gap-4">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : offersQuery.isError ? (
              <ErrorState onRetry={() => offersQuery.refetch()} />
            ) : visible.length === 0 ? (
              <EmptyState
                title={t("empty_results")}
                description={t("empty_results_cta")}
                actionLabel={t("reset")}
                onAction={() => setFilters({ ...emptyFilters })}
              />
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid gap-4"
              >
                {visible.map((offer, i) => (
                  <motion.div key={offer.id} variants={fadeUp}>
                    {i === 0 && sort !== "recommended" ? (
                      <span className="mb-2 inline-flex rounded-full bg-brand px-3 py-1 text-[11px] font-bold text-white">
                        {t(SORTS.find((s) => s.key === sort)!.label)}
                      </span>
                    ) : null}
                    <FlightCard
                      offer={offer}
                      seats={seats}
                      onSelect={() => select(offer)}
                    />
                  </motion.div>
                ))}

              </motion.div>
            )}
          </div>
        </div>
      </Section>
    </AppShell>
  );
}
