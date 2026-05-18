import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/lib/engine/tools";
import type { ToolSeed } from "@/lib/engine/types";

export const Route = createFileRoute("/catalog")({
  head: () => ({
    meta: [
      { title: "Approved AI tools — AI Solution Navigator" },
      {
        name: "description",
        content: "Browse the catalog of enterprise-approved AI tools.",
      },
      { property: "og:title", content: "Approved AI tools" },
      {
        property: "og:description",
        content: "Browse the catalog of enterprise-approved AI tools.",
      },
    ],
  }),
  component: Catalog,
});

const RISK_META = {
  low: { Icon: ShieldCheck, label: "Low risk", color: "text-emerald-600 dark:text-emerald-400" },
  medium: { Icon: ShieldQuestion, label: "Medium risk", color: "text-amber-600 dark:text-amber-400" },
  high: { Icon: ShieldAlert, label: "High risk", color: "text-destructive" },
} as const;

function Catalog() {
  const [active, setActive] = useState<ToolSeed | null>(null);
  const categories = Array.from(new Set(TOOLS.map((t) => t.category)));
  const [filter, setFilter] = useState<string | null>(null);
  const filtered = filter ? TOOLS.filter((t) => t.category === filter) : TOOLS;

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <Button asChild size="sm">
          <Link to="/navigator">Start AI request</Link>
        </Button>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-20">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Approved AI tools</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          The current catalog of AI tools cleared for enterprise use. Each entry includes risk
          posture, licensing and ideal personas.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter(null)}
            className={`rounded-full border px-3 py-1 text-sm transition ${!filter ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`rounded-full border px-3 py-1 text-sm transition ${filter === c ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t, i) => {
            const R = RISK_META[t.riskRating];
            const isExcluded = t.excluded;
            return (
              <motion.button
                key={t.id}
                onClick={() => setActive(t)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`group relative rounded-xl border bg-card p-5 text-left transition hover:shadow-[var(--shadow-elegant)] ${
                  isExcluded ? "opacity-50 grayscale" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.category}</div>
                  </div>
                  <div className={`inline-flex items-center gap-1 text-xs ${R.color}`}>
                    <R.Icon className="h-3.5 w-3.5" /> {R.label}
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{t.description}</p>
                {t.availability && (
                  <div className="mt-3">
                    <Badge
                      variant={isExcluded ? "outline" : "default"}
                      className="text-[10px]"
                    >
                      {t.availability}
                    </Badge>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-1">
                  {t.capabilities.slice(0, 4).map((c) => (
                    <Badge key={c} variant="secondary" className="text-[10px]">
                      {c.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </motion.button>
            );
          })}
        </div>
      </main>

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-4 backdrop-blur md:items-center"
          onClick={() => setActive(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl border bg-card p-6 shadow-[var(--shadow-elegant)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{active.name}</h2>
                <div className="text-sm text-muted-foreground">{active.category}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setActive(null)}>
                Close
              </Button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{active.description}</p>
            {active.availability && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant={active.excluded ? "outline" : "default"} className="text-[10px]">
                  {active.availability}
                </Badge>
                {active.deploymentOptions?.map((d) => (
                  <Badge key={d} variant="secondary" className="text-[10px]">
                    {d}
                  </Badge>
                ))}
              </div>
            )}
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Field label="Risk" value={RISK_META[active.riskRating].label} />
              <Field label="Cost" value={active.costEstimate} />
              <Field label="Licensing" value={active.licensing} className="col-span-2" />
              <Field label="Compliance" value={active.complianceNotes} className="col-span-2" />
            </dl>
            <Section title="Capabilities" items={active.capabilities} />
            <Section title="Integrations" items={active.integrations} />
            <Section title="Ideal personas" items={active.personas} />
          </motion.div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="mt-2 flex flex-wrap gap-1">
        {items.map((i) => (
          <Badge key={i} variant="secondary" className="text-[10px]">
            {i.replace(/_/g, " ")}
          </Badge>
        ))}
      </div>
    </div>
  );
}