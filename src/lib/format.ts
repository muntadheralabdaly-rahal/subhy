import type { Lang } from "./i18n";

/**
 * Western digits everywhere, in all three languages. The `-u-nu-latn` subtag is
 * the guard for Arabic and Kurdish locales, which default to Arabic-Indic.
 */
function localeOf(lang: Lang): string {
  if (lang === "en") return "en-GB";
  if (lang === "ku") return "ckb-IQ-u-nu-latn";
  return "ar-IQ-u-nu-latn";
}

export function formatNumber(value: number, lang: Lang): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function currencySuffix(currency: string, lang: Lang): string {
  if (currency === "IQD") return lang === "en" ? "IQD" : "د.ع";
  if (currency === "USD") return "$";
  return currency;
}

export function formatMoney(value: number, lang: Lang, currency = "IQD"): string {
  return `${formatNumber(value, lang)} ${currencySuffix(currency, lang)}`;
}

/**
 * The airline stamps every timestamp with the airport's own offset
 * ("2026-09-09T18:30:00.000+03:00" for a Baghdad departure). Travellers read
 * schedules in airport-local time, so render the wall clock carried in the
 * string instead of letting the viewer's (or the server's) timezone shift it.
 * Date-only strings land at midday for the same reason: no day can slip.
 */
function wallClock(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(iso);
  if (!m) return new Date(iso);
  return new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4] ?? "12"),
    Number(m[5] ?? "0"),
  );
}

/** Departure hour at the airport, for time-of-day filters. */
export function airportHour(iso: string): number {
  return wallClock(iso).getHours();
}

export function formatDate(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(localeOf(lang), {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(wallClock(iso));
}

export function formatDayShort(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(localeOf(lang), {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(wallClock(iso));
}

export function formatTime(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(localeOf(lang), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(wallClock(iso));
}

export function formatDuration(minutes: number, lang: Lang): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hu = lang === "en" ? "h" : "س";
  const mu = lang === "en" ? "m" : "د";
  return m === 0 ? `${h}${hu}` : `${h}${hu} ${String(m).padStart(2, "0")}${mu}`;
}

export function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function shiftISO(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
