import { createFileRoute } from "@tanstack/react-router";
import { Buildings } from "@phosphor-icons/react";

import { AppShell } from "@/components/rahal/AppShell";
import { EmptyState, Section, SectionHeading } from "@/components/rahal/ui";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/hotels")({
  head: () => ({
    meta: [
      { title: "الفنادق | رحال Rahal" },
      {
        name: "description",
        content: "حجز الفنادق عبر رحال قادم قريبًا: أسعار بالدينار العراقي ودفع محلي وإلغاء مجاني.",
      },
      { property: "og:title", content: "الفنادق | رحال Rahal" },
      { property: "og:description", content: "فنادق مختارة بأسعار بالدينار العراقي، قريبًا." },
    ],
  }),
  component: HotelsPage,
});

function HotelsPage() {
  const { t, p } = useI18n();
  return (
    <AppShell>
      <Section className="pt-6">
        <SectionHeading
          eyebrow={t("soon")}
          title={t("nav_hotels")}
          description={p(
            "نجهّز الآن مخزون فنادق دبي وإستانبول وبيروت مع دفع محلي.",
            "We are onboarding hotels in Dubai, Istanbul and Beirut with local payment.",
            "هوتێلەکانی دوبەی، ئەستەنبۆل و بەیرووت ئامادە دەکەین.",
          )}
        />
        <EmptyState
          icon={<Buildings className="h-8 w-8" />}
          title={t("soon")}
          description={p(
            "احجز طيرانك الآن، وسنضيف الفنادق إلى نفس الحساب قريبًا.",
            "Book your flight now; hotels will land in the same account soon.",
            "ئێستا گەشتەکەت حیجز بکە، هوتێل زوو زیاد دەکرێت.",
          )}
          actionLabel={t("nav_flights")}
          actionTo="/flights"
        />
      </Section>
    </AppShell>
  );
}
