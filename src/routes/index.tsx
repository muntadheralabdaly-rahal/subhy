import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Headset,
  CurrencyCircleDollar,
  MapPinLine,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/rahal/AppShell";
import { SearchPanel } from "@/components/flights/SearchPanel";
import { Section, SectionHeading, cardShell, container, Price, btnGhost } from "@/components/rahal/ui";
import { DESTINATIONS, PROMOTIONS, airport } from "@/data/reference";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import { fadeUp, staggerContainer, viewportOnce } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { recentSearches } from "@/services/store";
import { searchToParams } from "@/services/searchParams";
import type { FlightSearch } from "@/services/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "رحال Rahal — طيران وفنادق وباقات سفر من العراق" },
      {
        name: "description",
        content:
          "ابحث واحجز تذاكر الطيران والفنادق والباقات من بغداد والبصرة وأربيل والنجف بالدينار العراقي، بالعربية والإنكليزية والكردية.",
      },
      { property: "og:title", content: "رحال Rahal — حجز سفر بالدينار العراقي" },
      {
        property: "og:description",
        content: "طيران، فنادق، وباقات مختارة مع دعم واتساب على مدار الساعة.",
      },
    ],
  }),
  component: Home,
});

function cityName(code: string, lang: "ar" | "en" | "ku"): string {
  const a = airport(code);
  return lang === "en" ? a.cityEn : lang === "ku" ? (a.cityKu ?? a.cityAr) : a.cityAr;
}

function Hero() {
  const { t, dir } = useI18n();
  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <section className="relative overflow-hidden bg-brand pb-32 pt-28 sm:pt-36">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -top-32 end-[-10%] h-[520px] w-[520px] rounded-full bg-brand-mid/40 blur-3xl" />
        <div className="absolute bottom-[-20%] start-[-10%] h-[420px] w-[420px] rounded-full bg-mint/15 blur-3xl" />
      </div>

      <div className={cn(container, "relative")}>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="max-w-3xl"
        >
          <motion.span
            variants={fadeUp}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-white/10 px-4 text-xs font-bold text-mint"
          >
            <MapPinLine className="h-4 w-4" />
            {t("tagline")}
          </motion.span>
          <motion.h1
            variants={fadeUp}
            className="mt-5 text-4xl font-bold leading-[1.15] text-white sm:text-5xl lg:text-6xl"
          >
            {t("hero_title")}
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-4 max-w-xl text-lg text-white/70">
            {t("hero_sub")}
          </motion.p>
          <motion.div variants={fadeUp} className="mt-6 flex flex-wrap gap-2">
            {PROMOTIONS.map((p) => (
              <span
                key={p.code}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-dashed border-mint/50 px-4 text-xs font-bold text-mint"
              >
                {p.code}
                <Arrow className="h-4 w-4" />
                <span className="text-white/70">{p.labelAr}</span>
              </span>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function RecentSearches() {
  const { t, lang } = useI18n();
  const [items, setItems] = useState<FlightSearch[]>([]);
  useEffect(() => setItems(recentSearches()), []);
  if (items.length === 0) return null;

  return (
    <Section>
      <SectionHeading title={t("recent_searches")} />
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
        {items.map((s, i) => (
          <Link
            key={`${s.from}${s.to}${s.departDate}${i}`}
            to="/flights"
            search={searchToParams(s)}
            className={cn(cardShell, "min-w-64 shrink-0 p-5 transition-colors hover:bg-surface-light")}
          >
            <p className="text-base font-bold text-brand">
              {cityName(s.from, lang)} → {cityName(s.to, lang)}
            </p>
            <p className="mt-1 text-xs text-text-placeholder">{formatDate(s.departDate, lang)}</p>
          </Link>
        ))}
      </div>
    </Section>
  );
}

function Destinations() {
  const { t, lang, p } = useI18n();
  return (
    <Section>
      <SectionHeading title={t("popular_dest")} description={p("أسعار الذهاب من بغداد", "One-way prices from Baghdad", "نرخی چوون لە بەغدا")} />
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {DESTINATIONS.map((d) => (
          <motion.div key={d.code} variants={fadeUp}>
            <Link
              to="/flights"
              search={{ from: "BGW", to: d.code }}
              className="group block overflow-hidden rounded-4xl border border-hairline bg-white"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={d.image}
                  alt={cityName(d.code, lang)}
                  loading="lazy"
                  width={1024}
                  height={768}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <span className="absolute top-4 start-4 inline-flex h-8 items-center rounded-full bg-white/90 px-3 text-xs font-bold text-brand">
                  {lang === "en" ? d.tagEn : lang === "ku" ? d.tagKu : d.tagAr}
                </span>
              </div>
              <div className="flex items-end justify-between gap-3 p-5">
                <div>
                  <p className="text-lg font-bold text-brand">{cityName(d.code, lang)}</p>
                  <p className="text-xs text-text-placeholder">
                    {p(`${d.nights} ليالٍ مقترحة`, `${d.nights} nights suggested`, `${d.nights} شەو پێشنیار`)}
                  </p>
                </div>
                <div className="text-end">
                  <p className="text-xs text-text-placeholder">{t("from_price")}</p>
                  <Price value={d.fromPrice} size="sm" />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );
}

function Trust() {
  const { p } = useI18n();
  const items = [
    {
      icon: CurrencyCircleDollar,
      title: p("أسعار بالدينار العراقي", "Prices in Iraqi dinar", "نرخ بە دیناری عێراقی"),
      body: p("بدون رسوم مخفية، والدفع محلي أو بالتقسيط.", "No hidden fees, local payment or installments.", "بێ کرێی نادیار، پارەدانی ناوخۆیی یان قیست."),
    },
    {
      icon: Headset,
      title: p("دعم عربي وكردي", "Arabic and Kurdish support", "پشتگیری عەرەبی و کوردی"),
      body: p("فريق واتساب يجاوبك خلال دقائق.", "A WhatsApp team replies within minutes.", "تیمی واتساپ لە چەند خولەکێک وەڵام دەداتەوە."),
    },
    {
      icon: ShieldCheck,
      title: p("حجز مضمون", "Guaranteed booking", "حیجزی دڵنیا"),
      body: p("تذاكر مصدرة فورًا مع تأكيد رسمي.", "Tickets issued instantly with official confirmation.", "بلیت خێرا دەردەچێت بە پشتڕاستکردنی فەرمی."),
    },
  ];

  return (
    <Section className="pb-20">
      <div className="grid gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.title} className={cn(cardShell, "p-6")}>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-mid/12 text-brand-mid">
              <item.icon className="h-6 w-6" />
            </span>
            <p className="mt-4 text-lg font-bold text-brand">{item.title}</p>
            <p className="mt-1 text-base leading-relaxed text-text-tertiary">{item.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Home() {
  const { t, p } = useI18n();
  return (
    <AppShell headerTone="float" className="bg-surface-page">
      <Hero />
      <div className={cn(container, "relative -mt-24 z-10")}>
        <SearchPanel />
      </div>
      <RecentSearches />
      <Destinations />
      <Section>
        <div className={cn(cardShell, "flex flex-col items-start gap-4 bg-brand p-8 sm:flex-row sm:items-center sm:justify-between")}>
          <div>
            <h2 className="text-2xl font-bold text-white">{t("nav_trips")}</h2>
            <p className="mt-1 text-base text-white/65">
              {p("باقات طيران وفندق بسعر واحد.", "Flight and hotel packages at one price.", "پاکێجی گەشت و هوتێل بە یەک نرخ.")}
            </p>
          </div>
          <Link to="/trips" className={cn(btnGhost, "border-white/30 bg-transparent text-white hover:bg-white/10")}>
            {t("details")}
          </Link>
        </div>
      </Section>
      <Trust />
    </AppShell>
  );
}
