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

export function formatDate(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(localeOf(lang), {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDayShort(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(localeOf(lang), {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

export function formatTime(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(localeOf(lang), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
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
