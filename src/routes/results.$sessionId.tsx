import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  ShieldQuestion,
  ShieldAlert,
  Printer,
  TrendingUp,
  PlugZap,
  AlertTriangle,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getResults } from "@/lib/navigator.functions";
import { TOOL_BY_ID } from "@/lib/engine/tools";

export const Route = createFileRoute("/results/$sessionId")({
  head: () => ({
    meta: [
      { title: "Your AI recommendation — AI Solution Navigator" },
      { name: "description", content: "Your tailored enterprise AI tool recommendation." },
    ],
  }),
  component: ResultsPage,
});

const RISK = {
  low: { Icon: ShieldCheck, label: "Low risk", color: "text-emerald-600 dark:text-emerald-400" },
  medium: { Icon: ShieldQuestion, label: "Medium risk", color: "text-amber-600 dark:text-amber-400" },
  high: { Icon: ShieldAlert, label: "High risk", color: "text-destructive" },
} as const;

function ResultsPage() {
  const { sessionId } = useParams({ from: "/results/$sessionId" });
  const fetchResults = useServerFn(getResults);
  const { data, isLoading } = useQuery({
    queryKey: ["results", sessionId],
    queryFn: () => fetchResults({ data: { sessionId } }),
  });

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        Generating your recommendation…
      </div>
    );
  }

  const session = data?.session;
  const recs = (data?.recommendations ?? []).filter((r) => TOOL_BY_ID[r.tool_id]);
  const top = recs[0];
  const alternatives = recs.slice(1, 4);

  if (!top || !session) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold">No recommendation found</h1>
          <p className="mt-2 text-muted-foreground">This session may have expired.</p>
          <Button asChild className="mt-4">
            <Link to="/navigator">Start a new request</Link>
          </Button>
        </div>
      </div>
    );
  }

  const topTool = TOOL_BY_ID[top.tool_id]!;
  const R = RISK[topTool.riskRating];
  const maxScore = Math.max(1, ...recs.map((r) => Number(r.score)));
  const confidence = Math.round((Number(top.score) / maxScore) * 100);

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6 print:hidden">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Export summary
          </Button>
          <Button asChild size="sm">
            <Link to="/navigator">New request</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border bg-card p-8 shadow-[var(--shadow-elegant)]"
        >
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Top recommendation
          </div>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight">{topTool.name}</h1>
              <div className="mt-1 text-sm text-muted-foreground">{topTool.category}</div>
            </div>
            <div className="flex items-center gap-4">
              <div className={`inline-flex items-center gap-1 text-sm ${R.color}`}>
                <R.Icon className="h-4 w-4" /> {R.label}
              </div>
              <div className="rounded-full border px-3 py-1 text-sm">
                Confidence <span className="font-semibold">{confidence}%</span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-muted-foreground">{topTool.description}</p>
          <div className="mt-5 rounded-lg border bg-muted/40 p-4 text-sm">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Why this fits you</div>
            <p className="mt-1">{top.reasoning}</p>
          </div>
        </motion.div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Block icon={TrendingUp} title="Estimated productivity impact">
            Based on your stated benefits ({(session.anticipated_benefits ?? []).join(", ") || "—"}),
            expect time savings on {session.main_use_case ?? "your selected workflow"}.
          </Block>
          <Block icon={PlugZap} title="Integration readiness">
            Connects with {topTool.integrations.slice(0, 4).map((i) => i.replace(/_/g, " ")).join(", ")}.
          </Block>
          <Block icon={AlertTriangle} title="Risk considerations">
            {topTool.complianceNotes}
          </Block>
          <Block icon={ListChecks} title="Licensing & cost">
            {topTool.licensing} · {topTool.costEstimate}
          </Block>
        </div>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Recommended next steps</h2>
          <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>1. Confirm your team has the required {topTool.name} license.</li>
            <li>2. Review the compliance notes with your governance lead.</li>
            <li>3. Schedule a 30-minute enablement session for your team.</li>
            <li>4. Pilot with a low-sensitivity workflow before broader rollout.</li>
          </ol>
        </section>

        {alternatives.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Alternatives worth considering</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {alternatives.map((a) => {
                const t = TOOL_BY_ID[a.tool_id]!;
                return (
                  <div key={a.tool_id} className="rounded-xl border bg-card p-4">
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.category}</div>
                    <p className="mt-2 text-sm text-muted-foreground">{a.reasoning}</p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {t.capabilities.slice(0, 3).map((c) => (
                        <Badge key={c} variant="secondary" className="text-[10px]">
                          {c.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-10 rounded-xl border bg-muted/30 p-5 text-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Request summary</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div><span className="text-muted-foreground">Email:</span> {session.email}</div>
            <div><span className="text-muted-foreground">Department:</span> {session.department}</div>
            <div><span className="text-muted-foreground">Job function:</span> {session.job_function}</div>
            <div><span className="text-muted-foreground">Use case:</span> {session.main_use_case}</div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Block({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </div>
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
  );
}