import { useMemo, useState } from "react";
import { Tag } from "@phosphor-icons/react";

import { airport } from "@/data/reference";
import { useI18n } from "@/lib/i18n";
import { formatDate, formatDuration, formatTime } from "@/lib/format";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { Price, cardShell, inputClass } from "./ui";
import { airlineName } from "@/components/flights/FlightCard";
import { findPromotion, priceCart, seatCount, type Cart } from "@/services/store";

export function TripSummary({
  cart,
  onPromo,
  editablePromo = true,
}: {
  cart: Cart;
  onPromo?: (code: string | undefined) => void;
  editablePromo?: boolean;
}) {
  const { t, lang, p } = useI18n();
  const [code, setCode] = useState(cart.promoCode ?? "");
  const [status, setStatus] = useState<"idle" | "ok" | "bad">(cart.promoCode ? "ok" : "idle");

  const price = useMemo(() => priceCart(cart), [cart]);
  const seats = Math.max(1, seatCount(cart.search));
  const dep = airport(cart.offer.from);
  const arr = airport(cart.offer.to);
  const city = (a: typeof dep) => (lang === "en" ? a.cityEn : lang === "ku" ? (a.cityKu ?? a.cityAr) : a.cityAr);

  function apply() {
    const promo = findPromotion(code);
    if (promo) {
      setStatus("ok");
      track("promo_applied", { code: promo.code });
      onPromo?.(promo.code);
    } else {
      setStatus("bad");
      onPromo?.(undefined);
    }
  }

  return (
    <aside className={cn(cardShell, "h-fit p-6 lg:sticky lg:top-24")}>
      <h2 className="text-xl font-bold text-brand">{t("trip_summary")}</h2>

      <div className="mt-4 rounded-2xl bg-surface-light p-4">
        <p className="text-base font-bold text-brand">
          {city(dep)} → {city(arr)}
        </p>
        <p className="mt-1 text-xs text-text-tertiary">
          {formatDate(cart.offer.departAt, lang)} · <span dir="ltr">{formatTime(cart.offer.departAt, lang)}</span> →{" "}
          <span dir="ltr">{formatTime(cart.offer.arriveAt, lang)}</span>
        </p>
        <p className="mt-1 text-xs text-text-tertiary">
          {airlineName(cart.offer.airline, lang)} · {formatDuration(cart.offer.durationMinutes, lang)} ·{" "}
          {p(`${seats} مسافر`, `${seats} travelers`, `${seats} گەشتیار`)}
        </p>
      </div>

      {editablePromo ? (
        <div className="mt-5">
          <label className="mb-2 block text-xs font-bold text-text-secondary">{t("promo_code")}</label>
          <div className="flex gap-2">
            <input
              className={cn(inputClass, "flex-1")}
              dir="ltr"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="RAHAL50"
            />
            <button
              type="button"
              onClick={apply}
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-brand bg-brand px-4 text-base font-bold text-white"
            >
              <Tag className="h-4 w-4" />
              {t("promo_apply")}
            </button>
          </div>
          {status === "ok" ? (
            <p className="mt-2 text-xs font-bold text-brand-mid">{t("promo_ok")}</p>
          ) : status === "bad" ? (
            <p className="mt-2 text-xs font-bold text-destructive">{t("promo_bad")}</p>
          ) : null}
        </div>
      ) : null}

      <dl className="mt-5 grid gap-3 text-base">
        <div className="flex justify-between">
          <dt className="text-text-tertiary">{t("base_fare")}</dt>
          <dd><Price value={price.base} size="sm" /></dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-tertiary">{t("taxes")}</dt>
          <dd><Price value={price.taxes} size="sm" /></dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-tertiary">{t("service_fee")}</dt>
          <dd><Price value={price.serviceFee} size="sm" /></dd>
        </div>
        {price.discount > 0 ? (
          <div className="flex justify-between">
            <dt className="text-brand-mid">{t("discount")}</dt>
            <dd><Price value={-price.discount} size="sm" className="text-brand-mid" /></dd>
          </div>
        ) : null}
        <div className="mt-2 flex items-center justify-between border-t border-hairline pt-4">
          <dt className="text-lg font-bold text-brand">{t("total")}</dt>
          <dd><Price value={price.total} /></dd>
        </div>
      </dl>
    </aside>
  );
}
