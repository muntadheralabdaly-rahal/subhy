import { Link } from "@tanstack/react-router";
import { ArrowClockwise, MagnifyingGlass, Warning } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { formatMoney } from "@/lib/format";
import type { BookingStatus, PaymentStatus } from "@/services/types";

/*
 * Buttons follow the design system: pill shape, bold label on contained and
 * outlined, 150ms colour transition, no drop shadow.
 */
export const btnBase =
  "h-12 sm:h-13 px-6 rounded-full border font-bold text-base inline-flex items-center justify-center gap-2.5 whitespace-nowrap transition-colors duration-150 click-animate disabled:opacity-100 disabled:bg-surface-disabled-accent-strong disabled:border-surface-disabled-accent-strong disabled:text-white disabled:pointer-events-none";

export const btnPrimary = cn(
  btnBase,
  "bg-surface-accent-stronger border-surface-accent-stronger text-text-inverted hover:bg-brand-deep",
);
export const btnPrimaryDark = btnPrimary;
export const btnGhost = cn(
  btnBase,
  "bg-transparent border-stroke-interactive-strong text-text-interactive hover:bg-surface-accent-softer disabled:bg-transparent disabled:border-stroke-neutral-medium disabled:text-text-disabled-interactive",
);
export const btnOnDark = cn(
  btnBase,
  "bg-transparent border-white/40 text-text-inverted hover:bg-white/10 disabled:bg-transparent disabled:border-white/20 disabled:text-white/40",
);

export const heroBtnBase =
  "h-12 sm:h-13 px-6 sm:px-8 rounded-full font-bold text-base inline-flex items-center justify-center gap-2 sm:gap-2.5 whitespace-nowrap sm:min-w-[210px] transition-colors duration-150 click-animate group";
export const heroBtnPrimary = cn(
  heroBtnBase,
  "bg-surface-accent-medium text-surface-accent-stronger hover:bg-surface-accent-soft",
);
export const heroBtnSecondary = cn(
  heroBtnBase,
  "border border-white/40 text-text-inverted hover:bg-white/10",
);

export const container = "max-w-7xl mx-auto px-main sm:px-6 lg:px-8";
export const cardShell = "rounded-4xl border border-stroke-neutral-soft bg-white";

export function Section({
  tone = "light",
  className,
  children,
}: {
  tone?: "light" | "white" | "dark";
  className?: string;
  children: ReactNode;
}) {
  const bg = tone === "dark" ? "bg-brand text-white" : tone === "white" ? "bg-white" : "bg-surface-light";
  return (
    <section className={cn("py-14 sm:py-24", bg, className)}>
      <div className={container}>{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  tone = "light",
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  tone?: "light" | "dark";
  action?: ReactNode;
}) {
  const dark = tone === "dark";
  return (
    <div className="mb-8 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col">
        {eyebrow ? (
          <span className={cn("mb-1.5 text-sm font-medium", dark ? "text-mint" : "text-green-muted")}>
            {eyebrow}
          </span>
        ) : null}
        <h2
          className={cn(
            "mb-2.5 text-3xl font-bold leading-tight md:text-4xl",
            dark ? "text-white" : "text-brand",
          )}
        >
          {title}
        </h2>
        {description ? (
          <p className={cn("max-w-2xl text-lg leading-[1.65]", dark ? "text-white/60" : "text-text-tertiary")}>
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Price({
  value,
  currency = "IQD",
  className,
  size = "md",
}: {
  value: number;
  currency?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const { lang } = useI18n();
  const sizes = { sm: "text-base", md: "text-lg", lg: "text-heading-h3 md:text-heading-h2" };
  return (
    <span
      className={cn(
        "whitespace-nowrap font-semibold tabular-nums text-surface-accent-stronger",
        sizes[size],
        className,
      )}
      dir="ltr"
    >
      {formatMoney(value, lang, currency)}
    </span>
  );
}

/* Chip semantics from the design system: success mint, warning yellow, error soft red. */
const STATUS_TONE: Record<string, string> = {
  CONFIRMED: "bg-core-rahal-100 text-core-rahal-600",
  PAID: "bg-core-rahal-100 text-core-rahal-600",
  PENDING: "bg-semantic-warning-soft text-semantic-warning-strong",
  PAYMENT_PENDING: "bg-semantic-warning-soft text-semantic-warning-strong",
  INSTALLMENTS: "bg-surface-accent-softer text-surface-accent-stronger",
  UNPAID: "bg-surface-neutral-medium text-text-secondary",
  CANCELLED: "bg-surface-neutral-medium text-text-secondary",
  REFUNDED: "bg-surface-neutral-medium text-text-secondary",
  REFUND_PENDING: "bg-surface-neutral-medium text-text-secondary",
  FAILED: "bg-semantic-error-soft text-semantic-error-strong",
};

export function StatusBadge({ status }: { status: BookingStatus | PaymentStatus }) {
  const { t } = useI18n();
  const translate = t as unknown as (k: string) => string;
  const label = translate(`status_${status}`) || status;
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center rounded-full px-3 text-xs font-medium",
        STATUS_TONE[status] ?? "bg-surface-neutral-medium text-text-secondary",
      )}
    >
      {label}
    </span>
  );
}

/* Empty / error panel: 64px illustration well, medium title, placeholder subtitle,
 * one outlined recovery button. */
export function EmptyState({
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  icon,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  icon?: ReactNode;
}) {
  return (
    <div className={cn(cardShell, "flex flex-col items-center gap-3 px-6 py-12 text-center")}>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-accent-softer text-surface-accent-stronger">
        {icon ?? <MagnifyingGlass className="h-8 w-8" />}
      </div>
      <h3 className="text-base font-medium text-text-title">{title}</h3>
      <p className="max-w-md text-sm text-text-placeholder">{description}</p>
      {actionLabel && actionTo ? (
        <Link to={actionTo} className={cn(btnGhost, "mt-2")}>
          {actionLabel}
        </Link>
      ) : actionLabel && onAction ? (
        <button type="button" onClick={onAction} className={cn(btnGhost, "mt-2")}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function ErrorState({ onRetry, message }: { onRetry: () => void; message?: string }) {
  const { t } = useI18n();
  return (
    <div className={cn(cardShell, "flex flex-col items-center gap-3 px-6 py-12 text-center")}>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-semantic-error-soft text-semantic-error-strong">
        <Warning className="h-8 w-8" />
      </div>
      <h3 className="text-base font-medium text-text-title">{t("error_title")}</h3>
      <p className="max-w-md text-sm text-text-placeholder">{message ?? t("empty_results_cta")}</p>
      <button type="button" onClick={onRetry} className={cn(btnGhost, "mt-2")}>
        <ArrowClockwise className="h-5 w-5" />
        {t("retry")}
      </button>
    </div>
  );
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={cn(cardShell, "animate-pulse p-4 sm:p-6")}>
          <div className="mb-4 h-4 w-28 rounded-full bg-surface-neutral-medium" />
          <div className="mb-3 h-6 w-2/3 rounded-full bg-surface-neutral-medium" />
          <div className="h-4 w-1/3 rounded-full bg-surface-neutral-medium" />
        </div>
      ))}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | undefined;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex flex-col gap-1.5 text-start",
        error ? "[&_input]:border-semantic-error-strong [&_select]:border-semantic-error-strong" : "",
      )}
    >
      <span className="text-sm font-medium text-text-tertiary">{label}</span>
      {children}
      {hint ? (
        <span className={cn("text-sm", error ? "text-semantic-error-strong" : "text-text-tertiary")}>
          {hint}
        </span>
      ) : null}
    </label>
  );
}

/* TextField chrome: white, 16px radius, soft stroke turning brand green on focus. */
export const inputClass =
  "h-13.5 w-full rounded-2xl border border-stroke-neutral-soft bg-white px-4 font-sans-input text-base font-medium text-text-label outline-none transition-colors duration-150 placeholder:text-text-placeholder hover:border-stroke-interactive-strong focus:border-stroke-interactive-strong disabled:bg-surface-disabled-base disabled:text-text-disabled-placeholder";
