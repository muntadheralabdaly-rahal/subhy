import { createFileRoute } from "@tanstack/react-router";
import { Phone, WhatsappLogo, EnvelopeSimple } from "@phosphor-icons/react";

import { AppShell } from "@/components/rahal/AppShell";
import { Section, SectionHeading, cardShell } from "@/components/rahal/ui";
import { useI18n } from "@/lib/i18n";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "الدعم | رحال Rahal" },
      { name: "description", content: "تواصل مع فريق رحال عبر واتساب أو الهاتف أو البريد للمساعدة في حجزك." },
      { property: "og:title", content: "الدعم | رحال Rahal" },
      { property: "og:description", content: "دعم بالعربية والكردية والإنكليزية." },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  const { t, p } = useI18n();

  const channels = [
    {
      icon: WhatsappLogo,
      label: p("واتساب", "WhatsApp", "واتساپ"),
      value: "+964 770 000 0000",
      href: "https://wa.me/9647700000000",
      channel: "whatsapp",
    },
    {
      icon: Phone,
      label: p("هاتف", "Phone", "تەلەفۆن"),
      value: "+964 780 000 0000",
      href: "tel:+9647800000000",
      channel: "phone",
    },
    {
      icon: EnvelopeSimple,
      label: p("بريد", "Email", "ئیمەیل"),
      value: "help@rahal.iq",
      href: "mailto:help@rahal.iq",
      channel: "email",
    },
  ];

  const faqs = [
    {
      q: p("هل الأسعار نهائية؟", "Are prices final?", "نرخەکان کۆتاییە؟"),
      a: p(
        "نعم، السعر المعروض يشمل الضرائب ورسوم الخدمة بالدينار العراقي.",
        "Yes, the displayed price includes taxes and the service fee in Iraqi dinar.",
        "بەڵێ، نرخ باج و کرێی خزمەتگوزاری لەخۆ دەگرێت.",
      ),
    },
    {
      q: p("كيف أدفع؟", "How can I pay?", "چۆن پارە بدەم؟"),
      a: p(
        "بطاقة، محفظة محلية مثل زين كاش، أو تقسيط على 3 إلى 9 أشهر.",
        "Card, a local wallet such as ZainCash, or installments over 3 to 9 months.",
        "کارت، جزدانی ناوخۆیی، یان قیست بۆ ٣ بۆ ٩ مانگ.",
      ),
    },
    {
      q: p("هل يمكن الإلغاء؟", "Can I cancel?", "دەتوانم بسڕمەوە؟"),
      a: p(
        "يعتمد على قواعد الأجرة الظاهرة في صفحة الرحلة قبل الدفع.",
        "It depends on the fare rules shown on the flight page before payment.",
        "بەپێی یاساکانی نرخ کە پێش پارەدان دەردەکەوێت.",
      ),
    },
  ];

  return (
    <AppShell>
      <Section className="pt-6">
        <SectionHeading
          title={t("nav_support")}
          description={p("نجاوب خلال دقائق، 24/7.", "We reply within minutes, 24/7.", "لە چەند خولەکێک وەڵام دەدەینەوە.")}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          {channels.map((c) => (
            <a
              key={c.channel}
              href={c.href}
              target="_blank"
              rel="noreferrer"
              onClick={() => track("support_opened", { channel: c.channel })}
              className={cn(cardShell, "p-6 transition-colors hover:bg-surface-light")}
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-mid/12 text-brand-mid">
                <c.icon className="h-6 w-6" />
              </span>
              <p className="mt-4 text-base font-bold text-brand">{c.label}</p>
              <p className="mt-1 text-xs text-text-tertiary" dir="ltr">
                {c.value}
              </p>
            </a>
          ))}
        </div>

        <div className="mt-6 grid gap-3">
          {faqs.map((f) => (
            <div key={f.q} className={cn(cardShell, "p-6")}>
              <p className="text-lg font-bold text-brand">{f.q}</p>
              <p className="mt-2 text-base leading-relaxed text-text-tertiary">{f.a}</p>
            </div>
          ))}
        </div>
      </Section>
    </AppShell>
  );
}
