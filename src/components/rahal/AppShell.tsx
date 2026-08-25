import { Link, useRouterState } from "@tanstack/react-router";
import {
  AirplaneTilt,
  Bell,
  Buildings,
  Confetti,
  House,
  List,
  SuitcaseRolling,
  UserCircle,
  WhatsappLogo,
  X,
} from "@phosphor-icons/react";
import { useEffect, useState, type ReactNode } from "react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { track } from "@/lib/analytics";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { btnPrimary, container } from "./ui";

const NAV = [
  { to: "/flights", key: "nav_flights", icon: AirplaneTilt },
  { to: "/hotels", key: "nav_hotels", icon: Buildings },
  { to: "/trips", key: "nav_trips", icon: Confetti },
  { to: "/bookings", key: "nav_bookings", icon: SuitcaseRolling },
] as const;

const TABS = [
  { to: "/", key: "nav_home", icon: House },
  { to: "/trips", key: "nav_trips", icon: Confetti },
  { to: "/bookings", key: "nav_bookings", icon: SuitcaseRolling },
  { to: "/profile", key: "nav_profile", icon: UserCircle },
] as const;

function Wordmark({ tone }: { tone: "dark" | "light" }) {
  const { t } = useI18n();
  return (
    <Link to="/" className="inline-flex items-center gap-2">
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-2xl text-lg font-semibold",
          tone === "dark" ? "bg-mint text-brand" : "bg-brand text-mint",
        )}
      >
        ر
      </span>
      <span className={cn("text-xl font-semibold", tone === "dark" ? "text-white" : "text-brand")}>
        {t("brand")}
      </span>
    </Link>
  );
}

export function Header({ tone = "solid" }: { tone?: "solid" | "float" }) {
  const { t, p } = useI18n();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dark = tone === "float";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "sticky top-0 z-50 transition-shadow duration-150",
        dark
          ? scrolled
            ? "bg-surface-accent-stronger shadow-sm"
            : "bg-transparent"
          : cn("bg-surface-background", scrolled && "shadow-sm"),
      )}
    >
      <div className={cn(container, "flex h-16 items-center gap-4 sm:h-20")}>
        <Wordmark tone={dark ? "dark" : "light"} />

        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "rounded-full px-4 py-2 text-base font-medium transition-colors duration-150",
                dark
                  ? "text-white/90 hover:bg-white/10"
                  : "text-text-secondary hover:bg-surface-neutral-medium",
              )}
              activeProps={{
                className: dark ? "text-surface-accent-medium" : "text-text-interactive font-bold",
              }}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2 lg:ms-0">
          <Link
            to="/notifications"
            aria-label={t("nav_notifications")}
            className={cn(
              "hidden h-11 w-11 items-center justify-center rounded-full click-animate sm:inline-flex",
              dark
                ? "glass text-white"
                : "border border-stroke-neutral-soft bg-white text-text-interactive hover:bg-surface-accent-softer",
            )}
          >
            <Bell className="h-5 w-5" />
          </Link>
          <LanguageSwitcher tone={dark ? "dark" : "light"} />
          <Link
            to="/profile"
            aria-label={t("nav_profile")}
            className={cn(
              "hidden h-11 w-11 items-center justify-center rounded-full click-animate lg:inline-flex",
              dark
                ? "glass text-white"
                : "border border-stroke-neutral-soft bg-white text-text-interactive hover:bg-surface-accent-softer",
            )}
          >
            <UserCircle className="h-5 w-5" />
          </Link>
          <button
            type="button"
            aria-label={p("القائمة", "Menu", "پێڕست")}
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-full click-animate lg:hidden",
              dark
                ? "glass text-white"
                : "border border-stroke-neutral-soft bg-white text-text-interactive",
            )}
          >
            {open ? <X className="h-5 w-5" /> : <List className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-hairline bg-white lg:hidden">
          <div className={cn(container, "grid gap-1 py-3")}>
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium text-text-primary hover:bg-surface-neutral-soft"
              >
                <item.icon className="h-5 w-5" />
                {t(item.key)}
              </Link>
            ))}
            <Link
              to="/support"
              onClick={() => setOpen(false)}
              className={cn(btnPrimary, "mt-2 w-full")}
            >
              {t("nav_support")}
            </Link>
          </div>
        </div>
      ) : null}
    </motion.header>
  );
}

export function BottomNav() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed bottom-0 z-20 w-full rounded-t-2xl border-t border-stroke-neutral-soft bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map((tab) => {
          const active = tab.to === "/" ? pathname === "/" : pathname.startsWith(tab.to);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                "flex min-h-20 flex-col items-center justify-center gap-1 text-xs transition-colors duration-150",
                active ? "font-bold text-text-interactive" : "text-text-tertiary",
              )}
            >
              <tab.icon className="h-6 w-6" weight={active ? "fill" : "regular"} />
              {t(tab.key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function SupportFab() {
  const { t } = useI18n();
  return (
    <a
      href="https://wa.me/9647700000000"
      target="_blank"
      rel="noreferrer"
      aria-label={t("nav_support")}
      onClick={() => track("support_opened", { channel: "whatsapp" })}
      className="fixed bottom-28 end-4 z-[1100] inline-flex h-14 w-14 items-center justify-center rounded-full bg-surface-accent-stronger text-text-inverted shadow-md click-animate lg:bottom-8"
    >
      <WhatsappLogo className="h-7 w-7" />
    </a>
  );
}

export function AppShell({
  children,
  headerTone = "solid",
  className,
}: {
  children: ReactNode;
  headerTone?: "solid" | "float";
  className?: string;
}) {
  const { dir } = useI18n();
  return (
    <div dir={dir} className={cn("min-h-screen bg-surface-background pb-24 lg:pb-0", className)}>
      <Header tone={headerTone} />
      <main className={cn(headerTone === "float" && "-mt-16 sm:-mt-20")}>{children}</main>
      <SupportFab />
      <BottomNav />
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="bg-surface-accent-stronger pb-10 pt-8 sm:pb-14 sm:pt-12">
      <div className={container}>
        <h1 className="text-heading-h3 font-semibold text-text-inverted md:text-heading-h2">{title}</h1>
        {subtitle ? <p className="mt-2 text-base text-white/70">{subtitle}</p> : null}
        {children}
      </div>
    </div>
  );
}
