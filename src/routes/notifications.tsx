import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AirplaneTakeoff, BellRinging, TagSimple } from "@phosphor-icons/react";

import { AppShell } from "@/components/rahal/AppShell";
import { EmptyState, Section, SectionHeading, cardShell } from "@/components/rahal/ui";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { bookings as readBookings } from "@/services/store";
import type { Booking } from "@/services/types";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "التنبيهات | رحال Rahal" },
      { name: "description", content: "تنبيهات حالة الحجز، تغييرات الرحلات والعروض الترويجية من رحال." },
      { property: "og:title", content: "التنبيهات | رحال Rahal" },
      { property: "og:description", content: "تنبيهات الحجز والعروض." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { t, lang, p } = useI18n();
  const [list, setList] = useState<Booking[]>([]);

  useEffect(() => setList(readBookings()), []);

  const items = [
    {
      id: "promo",
      icon: TagSimple,
      title: p("خصم 50,000 د.ع بكود RAHAL50", "50,000 IQD off with RAHAL50", "داشکاندن بە RAHAL50"),
      body: p("صالح على رحلات دبي وإستانبول هذا الشهر.", "Valid on Dubai and Istanbul flights this month.", "بۆ دوبەی و ئەستەنبۆل ئەم مانگە."),
    },
    ...list.slice(0, 4).map((b) => ({
      id: b.id,
      icon: AirplaneTakeoff,
      title: p(`حجزك ${b.reference} مؤكد`, `Booking ${b.reference} confirmed`, `حیجزی ${b.reference} پشتڕاست کرا`),
      body: `${formatDate(b.travelDate, lang)} · ${b.offer.from} → ${b.offer.to}`,
    })),
  ];

  return (
    <AppShell>
      <Section className="pt-6">
        <SectionHeading title={t("nav_notifications")} />
        {items.length === 0 ? (
          <EmptyState
            icon={<BellRinging className="h-8 w-8" />}
            title={t("nav_notifications")}
            description={t("no_bookings_cta")}
            actionLabel={t("nav_flights")}
            actionTo="/flights"
          />
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <div key={item.id} className={cn(cardShell, "flex items-start gap-4 p-5")}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-mid/12 text-brand-mid">
                  <item.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-base font-bold text-brand">{item.title}</p>
                  <p className="mt-1 text-xs text-text-tertiary">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </AppShell>
  );
}
