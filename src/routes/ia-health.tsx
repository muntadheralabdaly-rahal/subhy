import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/rahal/AppShell";
import {
  CardSkeleton,
  Section,
  SectionHeading,
  cardShell,
} from "@/components/rahal/ui";
import { iaHealth } from "@/lib/ia.functions";
import { todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Internal diagnostic: probes the Iraqi Airways gateway with a fixed BGW→DXB
 * search and reports exactly which credential or edge check failed. Without it
 * an empty results page and expired credentials look the same to an operator.
 */
export const Route = createFileRoute("/ia-health")({
  head: () => ({
    meta: [
      { title: "IA gateway health | Rahal" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: IaHealthPage,
});

function Row({
  label,
  ok,
  value,
}: {
  label: string;
  ok: boolean;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-hairline py-2 last:border-0">
      <span className="text-sm text-text-secondary">{label}</span>
      <span
        className={cn(
          "text-sm font-bold tabular-nums",
          ok ? "text-semantic-success-strong" : "text-semantic-error-strong",
        )}
        dir="ltr"
      >
        {value}
      </span>
    </div>
  );
}

function IaHealthPage() {
  const search = {
    tripType: "ONEWAY" as const,
    from: "BGW",
    to: "DXB",
    departDate: todayISO(14),
    travelers: { adults: 1, children: 0, infants: 0 },
    cabin: "ECONOMY" as const,
  };

  const health = useQuery({
    queryKey: ["ia-health"],
    queryFn: () => iaHealth({ data: search }),
    staleTime: 0,
    retry: false,
  });

  return (
    <AppShell>
      <Section className="pt-6">
        <SectionHeading title="Iraqi Airways gateway" />
        {health.isLoading ? (
          <CardSkeleton rows={1} />
        ) : health.isError ? (
          <div
            className={cn(cardShell, "p-5 text-sm text-semantic-error-strong")}
          >
            {health.error instanceof Error
              ? health.error.message
              : "probe failed"}
          </div>
        ) : health.data ? (
          <div className="grid gap-4">
            <div className={cn(cardShell, "p-5")}>
              <p className="mb-3 text-xs font-bold uppercase text-text-placeholder">
                Configuration
              </p>
              <Row label="IA_API_BASE" ok value={health.data.base} />
              <Row
                label="IA_CLIENT_ID"
                ok={health.data.env.clientId}
                value={health.data.env.clientId ? "set" : "missing"}
              />
              <Row
                label="IA_CLIENT_SECRET"
                ok={health.data.env.clientSecret}
                value={health.data.env.clientSecret ? "set" : "missing"}
              />
              <Row
                label="IA_D_TOKEN"
                ok={health.data.env.dToken}
                value={health.data.env.dToken ? "set" : "missing"}
              />
              <Row
                label="IA_BEARER_TOKEN (optional)"
                ok
                value={health.data.env.bearerToken ? "set" : "not set"}
              />
            </div>
            <div className={cn(cardShell, "p-5")}>
              <p className="mb-3 text-xs font-bold uppercase text-text-placeholder">
                Probe · {health.data.probe.from}→{health.data.probe.to} ·{" "}
                {health.data.probe.date}
              </p>
              <Row
                label="Live search"
                ok={health.data.probe.ok}
                value={
                  health.data.probe.ok
                    ? `ok · ${health.data.probe.offers} offers`
                    : (health.data.probe.code ?? "failed")
                }
              />
              {health.data.probe.detail ? (
                <p
                  className="mt-3 break-words text-xs text-text-placeholder"
                  dir="ltr"
                >
                  {health.data.probe.detail}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => health.refetch()}
              className="h-12 rounded-xl border border-hairline bg-white px-5 text-base font-bold text-brand hover:bg-surface-light"
            >
              Re-run probe
            </button>
          </div>
        ) : null}
      </Section>
    </AppShell>
  );
}
