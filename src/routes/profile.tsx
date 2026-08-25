import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash, UserCircle } from "@phosphor-icons/react";

import { AppShell } from "@/components/rahal/AppShell";
import { LanguageSwitcher } from "@/components/rahal/LanguageSwitcher";
import { Section, SectionHeading, cardShell } from "@/components/rahal/ui";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { removeTraveler, savedTravelers } from "@/services/store";
import type { Traveler } from "@/services/types";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "حسابي | رحال Rahal" },
      { name: "description", content: "إدارة المسافرين المحفوظين ولغة الواجهة وتفضيلات الحساب في رحال." },
      { property: "og:title", content: "حسابي | رحال Rahal" },
      { property: "og:description", content: "المسافرون المحفوظون وتفضيلات اللغة." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { t, p } = useI18n();
  const [travelers, setTravelers] = useState<Traveler[]>([]);

  useEffect(() => setTravelers(savedTravelers()), []);

  return (
    <AppShell>
      <Section className="pt-6">
        <SectionHeading
          title={t("nav_profile")}
          description={p("بياناتك محفوظة على جهازك فقط.", "Your details are stored on this device only.", "زانیاریت تەنها لەم ئامێرەدا هەڵگیراوە.")}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <div className={cn(cardShell, "p-6")}>
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-light text-brand">
                <UserCircle className="h-8 w-8" />
              </span>
              <div>
                <p className="text-lg font-bold text-brand">{t("brand")}</p>
                <p className="text-xs text-text-placeholder">
                  {p("مسافر ضيف", "Guest traveler", "گەشتیاری میوان")}
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-hairline pt-5">
              <span className="text-base font-bold text-brand">{p("اللغة", "Language", "زمان")}</span>
              <LanguageSwitcher tone="light" />
            </div>
          </div>

          <div className={cn(cardShell, "p-6")}>
            <p className="text-lg font-bold text-brand">{t("saved_travelers")}</p>
            {travelers.length === 0 ? (
              <p className="mt-3 text-base text-text-tertiary">
                {p("لا يوجد مسافرون محفوظون بعد.", "No saved travelers yet.", "هێشتا گەشتیار هەڵنەگیراوە.")}
              </p>
            ) : (
              <ul className="mt-4 grid gap-2">
                {travelers.map((tr) => (
                  <li
                    key={tr.id}
                    className="flex items-center justify-between rounded-xl bg-surface-light px-4 py-3"
                  >
                    <span className="text-base font-medium text-brand" dir="ltr">
                      {tr.firstName} {tr.lastName}
                    </span>
                    <button
                      type="button"
                      aria-label={t("reset")}
                      onClick={() => {
                        removeTraveler(tr.id);
                        setTravelers(savedTravelers());
                      }}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-text-tertiary hover:bg-white hover:text-destructive"
                    >
                      <Trash className="h-5 w-5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Section>
    </AppShell>
  );
}
