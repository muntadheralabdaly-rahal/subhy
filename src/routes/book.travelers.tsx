import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { UserPlus, FloppyDisk, UserCircle } from "@phosphor-icons/react";
import { toast } from "sonner";

import { AppShell } from "@/components/rahal/AppShell";
import { TripSummary } from "@/components/rahal/TripSummary";
import {
  EmptyState,
  Field,
  Section,
  SectionHeading,
  btnGhost,
  btnPrimary,
  cardShell,
  inputClass,
} from "@/components/rahal/ui";
import { useI18n } from "@/lib/i18n";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import {
  getCart,
  primaryTraveler,
  saveTraveler,
  savedContact,
  savedTravelers,
  seatCount,
  setCart,
  setPrimaryTraveler,
  setSavedContact,
} from "@/services/store";

import type { Cart } from "@/services/store";
import { passengerTypeCode } from "@/services/types";
import type { Traveler } from "@/services/types";

export const Route = createFileRoute("/book/travelers")({
  head: () => ({
    meta: [
      { title: "بيانات المسافرين | رحال Rahal" },
      { name: "description", content: "أدخل بيانات المسافرين وجهة الاتصال لإكمال حجز تذاكر الطيران." },
      { property: "og:title", content: "بيانات المسافرين | رحال Rahal" },
      { property: "og:description", content: "خطوة المسافرين قبل الدفع." },
    ],
  }),
  component: TravelersPage,
});

function blankTraveler(index: number): Traveler {
  return {
    id: `t-${index}-${Math.random().toString(36).slice(2, 8)}`,
    title: "MR",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "M",
    nationality: "IQ",
    passportNumber: "",
    passportExpiry: "",
  };
}

/** Carrier rule: passport must stay valid 6 months past departure. */
function passportTooShort(expiry: string, departDate: string): boolean {
  if (!expiry || !departDate) return false;
  const limit = new Date(departDate);
  limit.setMonth(limit.getMonth() + 6);
  return new Date(expiry) < limit;
}

function TravelersPage() {
  const navigate = useNavigate();
  const { t, p } = useI18n();
  const [cart, setCartState] = useState<Cart | null>(null);
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [contact, setContact] = useState({ phone: "", email: "" });
  const [saved, setSaved] = useState<Traveler[]>([]);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const c = getCart();
    setCartState(c);
    setSaved(savedTravelers());
    const me = primaryTraveler();
    if (c) {
      const seats = Math.max(1, seatCount(c.search));
      const base =
        c.travelers.length === seats ? c.travelers : Array.from({ length: seats }, (_, i) => blankTraveler(i));
      // Prefill traveler 1 with the account owner's saved details.
      setTravelers(
        me && !base[0]?.firstName ? base.map((tr, i) => (i === 0 ? { ...me, id: tr.id } : tr)) : base,
      );
      const stored = savedContact();
      setContact({
        phone: c.contact.phone || me?.phone || stored.phone,
        email: c.contact.email || me?.email || stored.email,
      });
      track("checkout_started", { offer: c.offer.id });
    }
  }, []);

  const seats = useMemo(() => (cart ? Math.max(1, seatCount(cart.search)) : 0), [cart]);

  function update(index: number, patch: Partial<Traveler>) {
    setTravelers((list) => list.map((tr, i) => (i === index ? { ...tr, ...patch } : tr)));
  }

  function validate(): boolean {
    const next: Record<string, boolean> = {};
    travelers.forEach((tr, i) => {
      if (!tr.firstName.trim()) next[`${i}.firstName`] = true;
      if (!tr.lastName.trim()) next[`${i}.lastName`] = true;
      if (!tr.dateOfBirth) next[`${i}.dateOfBirth`] = true;
      if (!tr.passportNumber.trim()) next[`${i}.passportNumber`] = true;
      if (!tr.passportExpiry) next[`${i}.passportExpiry`] = true;
    });
    if (!/^07\d{8,9}$/.test(contact.phone.replace(/\s/g, ""))) next["phone"] = true;
    if (!/^\S+@\S+\.\S+$/.test(contact.email)) next["email"] = true;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit() {
    if (!cart) return;
    if (!validate()) {
      toast.error(p("يرجى إكمال الحقول المطلوبة", "Please complete the required fields", "تکایە خانەکان پڕ بکە"));
      return;
    }
    setCart({ ...cart, travelers, contact });
    setSavedContact(contact);
    track("traveler_added", { count: travelers.length });
    navigate({ to: "/book/payment" });
  }


  if (!cart) {
    return (
      <AppShell>
        <Section className="pt-10">
          <EmptyState
            title={p("لا توجد رحلة محددة", "No selected flight", "هیچ گەشتێک هەڵنەبژێردراوە")}
            description={p("ابحث عن رحلة واختر العرض المناسب للمتابعة.", "Search for a flight and select an offer to continue.", "گەشت بگەڕێ و پێشکەشێک هەڵبژێرە.")}
            actionLabel={t("nav_flights")}
            actionTo="/flights"
          />
        </Section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Section className="pt-6">
        <SectionHeading
          eyebrow={p("الخطوة 1 من 2", "Step 1 of 2", "هەنگاوی 1 لە 2")}
          title={t("travelers_title")}
          description={p(
            "الأسماء يجب أن تطابق جواز السفر تمامًا.",
            "Names must match the passport exactly.",
            "ناوەکان دەبێت وەک پاسپۆرت بن.",
          )}
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-4">
            {saved.length > 0 ? (
              <div className={cn(cardShell, "p-5")}>
                <p className="mb-3 text-base font-bold text-brand">{t("saved_travelers")}</p>
                <div className="flex flex-wrap gap-2">
                  {saved.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        setTravelers((list) => {
                          const idx = list.findIndex((tr) => !tr.firstName);
                          const target = idx === -1 ? 0 : idx;
                          return list.map((tr, i) => (i === target ? { ...s, id: tr.id } : tr));
                        })
                      }
                      className="inline-flex h-11 items-center gap-2 rounded-xl border border-hairline px-4 text-xs font-bold text-brand hover:bg-surface-light"
                    >
                      <UserPlus className="h-4 w-4" />
                      {s.firstName} {s.lastName}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {travelers.map((tr, i) => (
              <div key={tr.id} className={cn(cardShell, "p-6")}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-lg font-bold text-brand">
                    {t("traveler")} {i + 1} / {seats}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const me = primaryTraveler();
                        if (!me) {
                          toast.error(
                            p(
                              "أضف بياناتك في صفحة حسابي أولاً",
                              "Add your details in Profile first",
                              "سەرەتا زانیاریت لە پرۆفایل زیاد بکە",
                            ),
                          );
                          return;
                        }
                        update(i, { ...me, id: tr.id });
                        setContact((c) => ({
                          phone: c.phone || me.phone || "",
                          email: c.email || me.email || "",
                        }));
                        toast.success(p("تم ملء بياناتك", "Filled with your details", "بە زانیاریت پڕ کرا"));
                      }}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-hairline px-3 text-xs font-bold text-brand hover:bg-surface-light"
                    >
                      <UserCircle className="h-4 w-4" />
                      {p("املأ ببياناتي", "Use my details", "زانیاری من")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPrimaryTraveler({ ...tr, phone: contact.phone, email: contact.email });
                        toast.success(
                          p("حُفظت كبياناتي", "Saved as my details", "وەک زانیاری من هەڵگیرا"),
                        );
                      }}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-hairline px-3 text-xs font-bold text-brand hover:bg-surface-light"
                    >
                      <UserCircle className="h-4 w-4" />
                      {p("اجعلها بياناتي", "Set as my details", "بکە زانیاری من")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        saveTraveler(tr);
                        setSaved(savedTravelers());
                        toast.success(t("save_traveler"));
                      }}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-hairline px-3 text-xs font-bold text-brand hover:bg-surface-light"
                    >
                      <FloppyDisk className="h-4 w-4" />
                      {t("save_traveler")}
                    </button>
                  </div>
                </div>


                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-surface-light px-3 py-1 text-[11px] font-bold text-brand" dir="ltr">
                    {passengerTypeCode(tr.dateOfBirth, cart.search.departDate)}
                  </span>
                  {passportTooShort(tr.passportExpiry, cart.search.departDate) ? (
                    <span className="rounded-full bg-semantic-error-soft px-3 py-1 text-[11px] font-bold text-semantic-error-strong">
                      {p(
                        "صلاحية الجواز يجب أن تتجاوز 6 أشهر من تاريخ السفر",
                        "Passport validity must exceed 6 months from departure",
                        "بەسەرچوونی پاسپۆرت دەبێت لە 6 مانگ زیاتر بێت",
                      )}
                    </span>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={p("اللقب", "Title", "ناونیشان")}>
                    <div className="flex gap-2">
                      {(["MR", "MRS", "MS"] as const).map((tt) => (
                        <button
                          key={tt}
                          type="button"
                          onClick={() => update(i, { title: tt })}
                          className={cn(
                            "h-12 flex-1 rounded-xl border text-sm font-bold transition-colors",
                            tr.title === tt
                              ? "border-brand bg-brand text-white"
                              : "border-hairline bg-white text-text-secondary",
                          )}
                          dir="ltr"
                        >
                          {tt}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label={t("first_name")} error={errors[`${i}.firstName`] ? " " : undefined}>
                    <input
                      className={inputClass}
                      value={tr.firstName}
                      onChange={(e) => update(i, { firstName: e.target.value })}
                      autoComplete="given-name"
                    />
                  </Field>
                  <Field label={t("last_name")} error={errors[`${i}.lastName`] ? " " : undefined}>
                    <input
                      className={inputClass}
                      value={tr.lastName}
                      onChange={(e) => update(i, { lastName: e.target.value })}
                      autoComplete="family-name"
                    />
                  </Field>
                  <Field label={t("dob")} error={errors[`${i}.dateOfBirth`] ? " " : undefined}>
                    <input
                      type="date"
                      className={inputClass}
                      value={tr.dateOfBirth}
                      onChange={(e) => update(i, { dateOfBirth: e.target.value })}
                    />
                  </Field>
                  <Field label={t("gender")}>
                    <div className="flex gap-2">
                      {(["M", "F"] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => update(i, { gender: g })}
                          className={cn(
                            "h-12 flex-1 rounded-xl border text-base font-bold transition-colors",
                            tr.gender === g
                              ? "border-brand bg-brand text-white"
                              : "border-hairline bg-white text-text-secondary",
                          )}
                        >
                          {g === "M" ? t("male") : t("female")}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label={t("nationality")}>
                    <input
                      className={inputClass}
                      value={tr.nationality}
                      onChange={(e) => update(i, { nationality: e.target.value })}
                    />
                  </Field>
                  <Field label={t("passport")} error={errors[`${i}.passportNumber`] ? " " : undefined}>
                    <input
                      className={inputClass}
                      dir="ltr"
                      value={tr.passportNumber}
                      onChange={(e) => update(i, { passportNumber: e.target.value.toUpperCase() })}
                    />
                  </Field>
                  <Field label={t("passport_exp")} error={errors[`${i}.passportExpiry`] ? " " : undefined}>
                    <input
                      type="date"
                      className={inputClass}
                      value={tr.passportExpiry}
                      onChange={(e) => update(i, { passportExpiry: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
            ))}

            <div className={cn(cardShell, "grid gap-4 p-6 sm:grid-cols-2")}>
              <Field
                label={t("phone")}
                hint={p("مثال: 07701234567", "e.g. 07701234567", "نموونە: 07701234567")}
                error={errors["phone"] ? " " : undefined}
              >
                <input
                  className={inputClass}
                  dir="ltr"
                  inputMode="tel"
                  value={contact.phone}
                  onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
                />
              </Field>
              <Field label={t("email")} error={errors["email"] ? " " : undefined}>
                <input
                  className={inputClass}
                  dir="ltr"
                  inputMode="email"
                  value={contact.email}
                  onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                />
              </Field>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={submit} className={cn(btnPrimary, "flex-1")}>
                {t("continue_")}
              </button>
              <button type="button" onClick={() => navigate({ to: "/flights" })} className={btnGhost}>
                {t("back")}
              </button>
            </div>
          </div>

          <TripSummary cart={{ ...cart, travelers, contact }} />
        </div>
      </Section>
    </AppShell>
  );
}
