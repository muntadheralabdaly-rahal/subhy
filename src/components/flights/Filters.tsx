import { FunnelSimple } from "@phosphor-icons/react";

import { AIRLINES } from "@/data/reference";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { emptyFilters, type FlightFilters } from "@/services/flightService";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { airlineName } from "./FlightCard";
import { btnGhost, btnPrimary, cardShell } from "@/components/rahal/ui";

const WINDOWS = [
  { id: "morning", ar: "صباح", en: "Morning", ku: "بەیانی" },
  { id: "afternoon", ar: "ظهر", en: "Afternoon", ku: "نیوەڕۆ" },
  { id: "evening", ar: "مساء", en: "Evening", ku: "ئێوارە" },
  { id: "night", ar: "ليل", en: "Night", ku: "شەو" },
];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-11 rounded-xl border px-4 text-xs font-bold transition-colors",
        active
          ? "border-brand bg-brand text-white"
          : "border-hairline bg-white text-text-secondary hover:bg-surface-light",
      )}
    >
      {children}
    </button>
  );
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

const CABIN_LABELS = {
  ECONOMY: "cabin_economy",
  PREMIUM_ECONOMY: "cabin_premium",
  BUSINESS: "cabin_business",
  FIRST: "cabin_first",
} as const;

export function FiltersForm({
  filters,
  onChange,
  priceBounds,
  airlineCodes,
  cabins,
}: {
  filters: FlightFilters;
  onChange: (f: FlightFilters) => void;
  priceBounds: [number, number];
  /** Carriers actually present in the results; defaults to the full catalog. */
  airlineCodes?: string[];
  /** Fare cabins actually present in the results. */
  cabins?: string[];
}) {
  const { t, lang, p } = useI18n();
  const [min, max] = priceBounds;
  const current = filters.maxPrice ?? max;
  const codes = airlineCodes ?? AIRLINES.map((a) => a.code);
  const cabinCodes = cabins ?? [];



  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 text-base font-bold text-brand">{t("price_range")}</p>
        <input
          type="range"
          min={min}
          max={max}
          step={5000}
          value={current}
          onChange={(e) => onChange({ ...filters, maxPrice: Number(e.target.value) })}
          className="w-full accent-[#0b8757]"
        />
        <p className="mt-1 text-xs font-medium text-text-tertiary" dir="ltr">
          {formatMoney(min, lang)} — {formatMoney(current, lang)}
        </p>
      </div>

      <div>
        <p className="mb-2 text-base font-bold text-brand">{t("stops")}</p>
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2].map((s) => (
            <Chip
              key={s}
              active={filters.stops.includes(s)}
              onClick={() => onChange({ ...filters, stops: toggle(filters.stops, s) })}
            >
              {s === 0 ? t("direct") : s === 1 ? t("one_stop") : t("two_stops")}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-base font-bold text-brand">{t("depart_time")}</p>
        <div className="flex flex-wrap gap-2">
          {WINDOWS.map((w) => (
            <Chip
              key={w.id}
              active={filters.departWindows.includes(w.id)}
              onClick={() => onChange({ ...filters, departWindows: toggle(filters.departWindows, w.id) })}
            >
              {p(w.ar, w.en, w.ku)}
            </Chip>
          ))}
        </div>
      </div>

      {cabinCodes.length > 1 ? (
        <div>
          <p className="mb-2 text-base font-bold text-brand">
            {p("نوع التذكرة", "Fare type", "جۆری بلیت")}
          </p>
          <div className="flex flex-wrap gap-2">
            {cabinCodes.map((c) => (
              <Chip
                key={c}
                active={filters.cabins.includes(c)}
                onClick={() => onChange({ ...filters, cabins: toggle(filters.cabins, c) })}
              >
                {t(CABIN_LABELS[c as keyof typeof CABIN_LABELS] ?? "cabin_economy")}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-base font-bold text-brand">
          {p("الاسترجاع", "Refunds", "گەڕاندنەوە")}
        </p>
        <Chip
          active={Boolean(filters.refundableOnly)}
          onClick={() => onChange({ ...filters, refundableOnly: !filters.refundableOnly })}
        >
          {p("قابل للإلغاء فقط", "Refundable only", "تەنها گەڕاندنەوە")}
        </Chip>
      </div>

      <div className={codes.length > 1 ? "" : "hidden"}>
        <p className="mb-2 text-base font-bold text-brand">{t("airlines")}</p>
        <div className="flex flex-col gap-2">
          {codes.map((code) => (
            <label key={code} className="flex min-h-11 items-center gap-3 text-base text-brand">
              <input
                type="checkbox"
                checked={filters.airlines.includes(code)}
                onChange={() => onChange({ ...filters, airlines: toggle(filters.airlines, code) })}
                className="h-5 w-5 accent-[#0b8757]"
              />
              {airlineName(code, lang)}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-base font-bold text-brand">{t("baggage")}</p>
        <div className="flex flex-wrap gap-2">
          {[20, 30, 40].map((kg) => (
            <Chip
              key={kg}
              active={filters.minBaggageKg === kg}
              onClick={() =>
                {
                  if (filters.minBaggageKg === kg) {
                    const { minBaggageKg, ...rest } = filters;
                    onChange(rest);
                  } else {
                    onChange({ ...filters, minBaggageKg: kg });
                  }
                }
              }
            >
              {kg}+ kg
            </Chip>
          ))}
        </div>
      </div>

      <button type="button" onClick={() => onChange({ ...emptyFilters })} className={btnGhost}>
        {t("reset")}
      </button>
    </div>
  );
}

export function FiltersSidebar(props: {
  filters: FlightFilters;
  onChange: (f: FlightFilters) => void;
  priceBounds: [number, number];
  airlineCodes?: string[];
  cabins?: string[];
}) {
  const { t } = useI18n();
  return (
    <aside className={cn(cardShell, "hidden h-fit p-6 lg:block")}>
      <h2 className="mb-5 text-xl font-bold text-brand">{t("filters")}</h2>
      <FiltersForm {...props} />
    </aside>
  );
}

export function FiltersSheet(props: {
  filters: FlightFilters;
  onChange: (f: FlightFilters) => void;
  priceBounds: [number, number];
  activeCount: number;
  airlineCodes?: string[];
  cabins?: string[];
}) {
  const { t, dir } = useI18n();
  return (
    <Sheet>
      <SheetTrigger className="inline-flex h-12 items-center gap-2 rounded-xl border border-hairline bg-white px-4 text-base font-bold text-brand lg:hidden">
        <FunnelSimple className="h-5 w-5" />
        {t("filters")}
        {props.activeCount > 0 ? (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-mid px-1.5 text-xs text-white">
            {props.activeCount}
          </span>
        ) : null}
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl" dir={dir}>
        <SheetTitle className="text-start text-xl font-bold text-brand">{t("filters")}</SheetTitle>
        <div className="px-4 pb-8">
          <FiltersForm {...props} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
