import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";

import { AppShell } from "@/components/rahal/AppShell";
import {
  EmptyState,
  Price,
  Section,
  SectionHeading,
  StatusBadge,
  cardShell,
} from "@/components/rahal/ui";
import { airport } from "@/data/reference";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { bookings as readBookings } from "@/services/store";
import type { Booking } from "@/services/types";

export const Route = createFileRoute("/bookings")({
  head: () => ({
    meta: [
      { title: "حجوزاتي | رحال Rahal" },
      { name: "description", content: "تابع حجوزاتك القادمة والمكتملة والملغاة، وحمّل التذاكر والفواتير." },
      { property: "og:title", content: "حجوزاتي | رحال Rahal" },
      { property: "og:description", content: "كل تذاكرك وفواتيرك في مكان واحد." },
    ],
  }),
  component: BookingsPage,
});

type TabKey = "upcoming" | "completed" | "cancelled";

function BookingsPage() {
  const { t, lang, p } = useI18n();
  const [tab, setTab] = useState<TabKey>("upcoming");
  const [list, setList] = useState<Booking[]>([]);

  useEffect(() => setList(readBookings()), []);

  const grouped = useMemo(() => {
    const now = Date.now();
    return {
      upcoming: list.filter((b) => b.status !== "CANCELLED" && +new Date(b.travelDate) >= now),
      completed: list.filter((b) => b.status !== "CANCELLED" && +new Date(b.travelDate) < now),
      cancelled: list.filter((b) => b.status === "CANCELLED"),
    };
  }, [list]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "upcoming", label: t("upcoming") },
    { key: "completed", label: t("completed") },
    { key: "cancelled", label: t("cancelled") },
  ];

  const visible = grouped[tab];

  return (
    <AppShell>
      <Section className="pt-6">
        <SectionHeading
          title={t("nav_bookings")}
          description={p("كل تذاكرك وقسائمك محفوظة هنا.", "All your tickets and vouchers live here.", "هەموو بلیت و ڤاوچەرەکانت لێرەن.")}
        />

        <div className="mb-5 flex gap-2 overflow-x-auto no-scrollbar">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                "h-12 shrink-0 rounded-xl border px-5 text-base font-bold transition-colors",
                tab === item.key
                  ? "border-brand bg-brand text-white"
                  : "border-hairline bg-white text-text-secondary hover:bg-surface-light",
              )}
            >
              {item.label} ({grouped[item.key].length})
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <EmptyState
            title={t("no_bookings")}
            description={t("no_bookings_cta")}
            actionLabel={t("nav_flights")}
            actionTo="/flights"
          />
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid gap-4">
            {visible.map((b) => {
              const dep = airport(b.offer.from);
              const arr = airport(b.offer.to);
              const city = (a: typeof dep) =>
                lang === "en" ? a.cityEn : lang === "ku" ? (a.cityKu ?? a.cityAr) : a.cityAr;
              return (
                <motion.div key={b.id} variants={fadeUp}>
                  <Link
                    to="/bookings/$reference"
                    params={{ reference: b.reference }}
                    className={cn(cardShell, "flex flex-wrap items-center justify-between gap-4 p-6 transition-colors hover:bg-surface-light")}
                  >
                    <div>
                      <p className="text-lg font-bold text-brand">
                        {city(dep)} → {city(arr)}
                      </p>
                      <p className="mt-1 text-xs text-text-placeholder">
                        {formatDate(b.travelDate, lang)} · {t("booking_ref")}{" "}
                        <span dir="ltr" className="font-bold">
                          {b.reference}
                        </span>
                      </p>
                      <div className="mt-3 flex gap-2">
                        <StatusBadge status={b.status} />
                        <StatusBadge status={b.paymentStatus} />
                      </div>
                    </div>
                    <Price value={b.price.total} />
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </Section>
    </AppShell>
  );
}
