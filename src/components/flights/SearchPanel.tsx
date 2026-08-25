import { useNavigate } from "@tanstack/react-router";
import {
  AirplaneTakeoff,
  ArrowsLeftRight,
  CalendarBlank,
  MagnifyingGlass,
  MapPin,
  Users,
} from "@phosphor-icons/react";
import { useState } from "react";

import { AIRPORTS, airport } from "@/data/reference";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { todayISO } from "@/lib/format";
import { track } from "@/lib/analytics";
import { rememberSearch } from "@/services/store";
import { searchToParams } from "@/services/searchParams";
import type { Cabin, FlightSearch, TripType } from "@/services/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { btnPrimary, inputClass } from "@/components/rahal/ui";

export function cityName(code: string, lang: "ar" | "en" | "ku"): string {
  const a = airport(code);
  return lang === "en" ? a.cityEn : lang === "ku" ? a.cityKu : a.cityAr;
}

export function airportName(code: string, lang: "ar" | "en" | "ku"): string {
  const a = airport(code);
  return lang === "en" ? a.nameEn : a.nameAr;
}

function AirportPicker({
  label,
  value,
  onChange,
  icon,
}: {
  label: string;
  value: string;
  onChange: (code: string) => void;
  icon: React.ReactNode;
}) {
  const { lang, p } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const list = AIRPORTS.filter((a) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [a.code, a.cityAr, a.cityEn, a.cityKu, a.nameEn, a.nameAr]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex min-h-[68px] w-full flex-col items-start gap-0.5 rounded-2xl border border-hairline bg-surface-lighter px-4 py-3 text-start transition-colors hover:border-brand-mid">
        <span className="flex items-center gap-1.5 text-xs font-medium text-text-tertiary">
          {icon}
          {label}
        </span>
        <span className="text-lg font-bold text-brand">
          {cityName(value, lang)} <span className="text-text-placeholder">({value})</span>
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,22rem)] rounded-2xl p-3">
        <input
          className={cn(inputClass, "mb-2")}
          placeholder={p("دوّر مدينة أو مطار", "Search a city or airport", "شار یان فڕۆکەخانە بگەڕێ")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="max-h-64 overflow-y-auto">
          {list.map((a) => (
            <button
              key={a.code}
              type="button"
              onClick={() => {
                onChange(a.code);
                setOpen(false);
                setQuery("");
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start hover:bg-surface-light"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-light text-brand">
                <MapPin className="h-5 w-5" />
              </span>
              <span className="flex flex-col">
                <span className="text-base font-bold text-brand">
                  {cityName(a.code, lang)} ({a.code})
                </span>
                <span className="text-xs text-text-placeholder">{airportName(a.code, lang)}</span>
              </span>
            </button>
          ))}
          {list.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-text-placeholder">
              {p("ماكو نتيجة", "No match", "ئەنجام نییە")}
            </p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 9,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-base font-medium text-brand">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="-"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="h-10 w-10 rounded-full border border-hairline text-lg font-bold text-brand disabled:opacity-40"
          disabled={value <= min}
        >
          -
        </button>
        <span className="w-6 text-center text-lg font-bold tabular-nums text-brand">{value}</span>
        <button
          type="button"
          aria-label="+"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="h-10 w-10 rounded-full border border-hairline text-lg font-bold text-brand disabled:opacity-40"
          disabled={value >= max}
        >
          +
        </button>
      </div>
    </div>
  );
}

const CABINS: { value: Cabin; key: "cabin_economy" | "cabin_premium" | "cabin_business" | "cabin_first" }[] = [
  { value: "ECONOMY", key: "cabin_economy" },
  { value: "PREMIUM_ECONOMY", key: "cabin_premium" },
  { value: "BUSINESS", key: "cabin_business" },
  { value: "FIRST", key: "cabin_first" },
];

export function SearchPanel({
  initial,
  variant = "hero",
  onSubmitted,
}: {
  initial?: FlightSearch;
  variant?: "hero" | "inline";
  onSubmitted?: () => void;
}) {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [search, setSearch] = useState<FlightSearch>(
    initial ?? {
      tripType: "ROUND",
      from: "BGW",
      to: "DXB",
      departDate: todayISO(14),
      returnDate: todayISO(19),
      travelers: { adults: 1, children: 0, infants: 0 },
      cabin: "ECONOMY",
    },
  );

  const trips: { value: TripType; label: string }[] = [
    { value: "ROUND", label: t("trip_round") },
    { value: "ONEWAY", label: t("trip_one") },
    { value: "MULTI", label: t("trip_multi") },
  ];

  const paxCount = search.travelers.adults + search.travelers.children + search.travelers.infants;

  function submit() {
    rememberSearch(search);
    track("flight_search_started", { from: search.from, to: search.to, cabin: search.cabin });
    navigate({ to: "/flights", search: searchToParams(search) });
    onSubmitted?.();
  }

  return (
    <div className="rounded-4xl border border-hairline bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar">
        {trips.map((tr) => (
          <button
            key={tr.value}
            type="button"
            onClick={() =>
              setSearch((s) => {
                const { returnDate, ...rest } = s;
                return tr.value === "ROUND"
                  ? { ...rest, tripType: tr.value, returnDate: returnDate ?? todayISO(19) }
                  : { ...rest, tripType: tr.value };
              })
            }
            className={cn(
              "h-10 shrink-0 rounded-full px-4 text-sm font-bold transition-colors",
              search.tripType === tr.value
                ? "bg-brand text-white"
                : "bg-surface-light text-text-tertiary hover:bg-hairline",
            )}
          >
            {tr.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
        <div className="relative grid gap-3 sm:grid-cols-2">
          <AirportPicker
            label={t("f_from")}
            value={search.from}
            onChange={(from) => setSearch((s) => ({ ...s, from }))}
            icon={<AirplaneTakeoff className="h-4 w-4" />}
          />
          <AirportPicker
            label={t("f_to")}
            value={search.to}
            onChange={(to) => setSearch((s) => ({ ...s, to }))}
            icon={<MapPin className="h-4 w-4" />}
          />
          <button
            type="button"
            aria-label={t("change")}
            onClick={() => setSearch((s) => ({ ...s, from: s.to, to: s.from }))}
            className="absolute start-1/2 top-1/2 hidden h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-hairline bg-white text-brand shadow-sm hover:bg-surface-light sm:inline-flex"
          >
            <ArrowsLeftRight className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex min-h-[68px] flex-col gap-0.5 rounded-2xl border border-hairline bg-surface-lighter px-4 py-3">
            <span className="flex items-center gap-1.5 text-xs font-medium text-text-tertiary">
              <CalendarBlank className="h-4 w-4" />
              {t("f_depart")}
            </span>
            <input
              type="date"
              dir="ltr"
              value={search.departDate}
              min={todayISO()}
              onChange={(e) => setSearch((s) => ({ ...s, departDate: e.target.value }))}
              className="bg-transparent text-lg font-bold text-brand outline-none"
            />
          </label>
          <label
            className={cn(
              "flex min-h-[68px] flex-col gap-0.5 rounded-2xl border border-hairline bg-surface-lighter px-4 py-3",
              search.tripType !== "ROUND" && "opacity-50",
            )}
          >
            <span className="flex items-center gap-1.5 text-xs font-medium text-text-tertiary">
              <CalendarBlank className="h-4 w-4" />
              {t("f_return")}
            </span>
            <input
              type="date"
              dir="ltr"
              disabled={search.tripType !== "ROUND"}
              value={search.returnDate ?? ""}
              min={search.departDate}
              onChange={(e) => setSearch((s) => ({ ...s, returnDate: e.target.value }))}
              className="bg-transparent text-lg font-bold text-brand outline-none"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 lg:gap-3">
          <Popover>
            <PopoverTrigger className="flex min-h-[68px] w-full flex-col items-start gap-0.5 rounded-2xl border border-hairline bg-surface-lighter px-4 py-3 text-start hover:border-brand-mid lg:min-w-[220px]">
              <span className="flex items-center gap-1.5 text-xs font-medium text-text-tertiary">
                <Users className="h-4 w-4" />
                {t("f_travelers")}
              </span>
              <span className="text-lg font-bold text-brand">
                {paxCount} {t("f_travelers")} · {t(CABINS.find((c) => c.value === search.cabin)!.key)}
              </span>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[min(92vw,20rem)] rounded-2xl p-4">
              <Stepper
                label={t("adults")}
                min={1}
                value={search.travelers.adults}
                onChange={(adults) => setSearch((s) => ({ ...s, travelers: { ...s.travelers, adults } }))}
              />
              <Stepper
                label={t("children")}
                value={search.travelers.children}
                onChange={(children) => setSearch((s) => ({ ...s, travelers: { ...s.travelers, children } }))}
              />
              <Stepper
                label={t("infants")}
                max={4}
                value={search.travelers.infants}
                onChange={(infants) => setSearch((s) => ({ ...s, travelers: { ...s.travelers, infants } }))}
              />
              <div className="mt-3 border-t border-hairline pt-3">
                <span className="mb-2 block text-xs font-medium text-text-tertiary">{t("f_cabin")}</span>
                <div className="grid grid-cols-2 gap-2">
                  {CABINS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setSearch((s) => ({ ...s, cabin: c.value }))}
                      className={cn(
                        "h-11 rounded-xl border px-3 text-xs font-bold transition-colors",
                        search.cabin === c.value
                          ? "border-brand bg-brand text-white"
                          : "border-hairline bg-white text-text-secondary hover:bg-surface-light",
                      )}
                    >
                      {t(c.key)}
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <button
            type="button"
            onClick={submit}
            className={cn(btnPrimary, "w-full")}
          >
            <MagnifyingGlass className="h-5 w-5" />
            {t("search")}
          </button>
        </div>
      </div>

      <p className="mt-3 text-xs text-text-placeholder">
        {cityName(search.from, lang)} → {cityName(search.to, lang)}
      </p>
    </div>
  );
}
