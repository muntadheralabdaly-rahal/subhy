import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { AirplaneTilt, Buildings, Sparkle } from "@phosphor-icons/react";

import { AppShell } from "@/components/rahal/AppShell";
import { Price, Section, SectionHeading, btnPrimary, cardShell } from "@/components/rahal/ui";
import { DESTINATIONS, airport } from "@/data/reference";
import { useI18n } from "@/lib/i18n";
import { fadeUp, staggerContainer, viewportOnce } from "@/lib/motion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/trips")({
  head: () => ({
    meta: [
      { title: "الرحلات والباقات | رحال Rahal" },
      {
        name: "description",
        content: "باقات طيران وفندق مختارة من العراق بسعر واحد وبالدينار العراقي، مع مواعيد مغادرة مرنة.",
      },
      { property: "og:title", content: "الرحلات والباقات | رحال Rahal" },
      { property: "og:description", content: "باقة واحدة تشمل الطيران والفندق." },
    ],
  }),
  component: TripsPage,
});

function TripsPage() {
  const { t, lang, p } = useI18n();
  const city = (code: string) => {
    const a = airport(code);
    return lang === "en" ? a.cityEn : lang === "ku" ? (a.cityKu ?? a.cityAr) : a.cityAr;
  };

  return (
    <AppShell>
      <Section className="pt-6">
        <SectionHeading
          eyebrow={t("trending")}
          title={t("nav_trips")}
          description={p(
            "طيران وفندق ونقل من المطار في حزمة واحدة.",
            "Flight, hotel and airport transfer bundled together.",
            "گەشت، هوتێل و گواستنەوە پێکەوە.",
          )}
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {DESTINATIONS.map((d) => (
            <motion.article key={d.code} variants={fadeUp} className={cn(cardShell, "overflow-hidden")}>
              <img
                src={d.image}
                alt={city(d.code)}
                loading="lazy"
                width={1024}
                height={768}
                className="h-44 w-full object-cover"
              />
              <div className="p-5">
                <p className="text-lg font-bold text-brand">{city(d.code)}</p>
                <p className="mt-1 text-xs text-text-placeholder">
                  {lang === "en" ? d.tagEn : lang === "ku" ? d.tagKu : d.tagAr}
                </p>
                <ul className="mt-4 grid gap-2 text-xs text-text-tertiary">
                  <li className="flex items-center gap-2">
                    <AirplaneTilt className="h-4 w-4 text-brand-mid" />
                    {p("طيران ذهاب وعودة", "Return flight", "گەشتی چوون و گەڕان")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Buildings className="h-4 w-4 text-brand-mid" />
                    {p(`${d.nights} ليالٍ فندق 4 نجوم`, `${d.nights} nights, 4-star hotel`, `${d.nights} شەو هوتێلی ٤ ئەستێرە`)}
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkle className="h-4 w-4 text-brand-mid" />
                    {p("نقل من المطار", "Airport transfer", "گواستنەوەی فڕۆکەخانە")}
                  </li>
                </ul>
                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-text-placeholder">{t("from_price")}</p>
                    <Price value={Math.round(d.fromPrice * 2.4)} size="sm" />
                  </div>
                  <Link to="/flights" search={{ from: "BGW", to: d.code }} className={cn(btnPrimary, "h-11 px-5")}>
                    {t("book_now")}
                  </Link>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </Section>
    </AppShell>
  );
}
