import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  TrendingUp,
  Users,
  CheckCircle2,
  Smile,
  Ticket,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  acceptanceByTool,
  byDepartment,
  byJobFunction,
  governancePipeline,
  recommendationMix,
  requestsOverTime,
  riskBreakdown,
  sentimentBreakdown,
  summary,
  topBenefits,
  topUseCases,
} from "@/lib/insights/simulated";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Leadership insights — AI Solution Navigator" },
      {
        name: "description",
        content:
          "Adoption, recommendation mix, sentiment and governance pipeline across enterprise AI requests.",
      },
    ],
  }),
  component: InsightsPage,
});

const PRIMARY = "oklch(0.62 0.2 258)";
const COLORS = [
  "oklch(0.62 0.2 258)",
  "oklch(0.7 0.18 200)",
  "oklch(0.74 0.18 150)",
  "oklch(0.78 0.18 80)",
  "oklch(0.7 0.2 30)",
  "oklch(0.68 0.22 320)",
  "oklch(0.72 0.18 280)",
  "oklch(0.66 0.16 220)",
  "oklch(0.7 0.16 100)",
];

function InsightsPage() {
  const s = summary();
  const overTime = requestsOverTime();
  const dept = byDepartment();
  const jobs = byJobFunction();
  const mix = recommendationMix();
  const accept = acceptanceByTool().slice(0, 6);
  const useCases = topUseCases();
  const benefits = topBenefits();
  const sentiment = sentimentBreakdown();
  const pipeline = governancePipeline();
  const risk = riskBreakdown();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Admin · Leadership view
            <Badge variant="outline" className="ml-2 text-[10px] uppercase tracking-wide">
              Simulated data
            </Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Last 90 days
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            Leadership insights
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Adoption, recommendation mix, user sentiment and governance throughput
            across every AI request that comes through the Navigator.
          </p>
        </motion.div>

        {/* KPI strip */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Kpi
            icon={TrendingUp}
            label="Total requests"
            value={s.totalRequests.toLocaleString()}
          />
          <Kpi
            icon={Users}
            label="Active personas"
            value={s.activeUsers.toString()}
          />
          <Kpi
            icon={CheckCircle2}
            label="Acceptance rate"
            value={`${Math.round(s.acceptanceRate * 100)}%`}
            hint="Users who kept the recommended tool"
          />
          <Kpi
            icon={Smile}
            label="Positive sentiment"
            value={`${Math.round(s.positiveSentimentRate * 100)}%`}
          />
          <Kpi
            icon={Smile}
            label="Avg CSAT"
            value={s.avgCsat.toFixed(2)}
            hint="Out of 5"
          />
          <Kpi icon={Ticket} label="Open SNOW tasks" value={s.openTasks.toString()} />
        </section>

        {/* Adoption & volume */}
        <SectionTitle>Adoption & volume</SectionTitle>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Requests over time" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={overTime}>
                <defs>
                  <linearGradient id="adopt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={PRIMARY} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.18} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => d.slice(5)}
                  fontSize={11}
                  stroke="currentColor"
                  opacity={0.5}
                />
                <YAxis fontSize={11} stroke="currentColor" opacity={0.5} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={PRIMARY}
                  strokeWidth={2}
                  fill="url(#adopt)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card title="By department">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dept} layout="vertical" margin={{ left: 12 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.18} />
                <XAxis type="number" fontSize={11} stroke="currentColor" opacity={0.5} />
                <YAxis
                  dataKey="department"
                  type="category"
                  width={110}
                  fontSize={11}
                  stroke="currentColor"
                  opacity={0.7}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill={PRIMARY} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <div className="mt-4">
          <Card title="By job function">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={jobs}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.18} />
                <XAxis
                  dataKey="jobFunction"
                  fontSize={11}
                  stroke="currentColor"
                  opacity={0.6}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis fontSize={11} stroke="currentColor" opacity={0.5} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="oklch(0.7 0.18 200)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Recommendation mix */}
        <SectionTitle>Tool recommendation mix</SectionTitle>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Recommended tool distribution">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mix} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.18} />
                <XAxis type="number" fontSize={11} stroke="currentColor" opacity={0.5} />
                <YAxis
                  dataKey="tool"
                  type="category"
                  width={170}
                  fontSize={11}
                  stroke="currentColor"
                  opacity={0.7}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {mix.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Recommended vs. selected (top tools)" hint="Did users keep our pick?">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={accept}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.18} />
                <XAxis
                  dataKey="tool"
                  fontSize={10}
                  stroke="currentColor"
                  opacity={0.6}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={70}
                />
                <YAxis fontSize={11} stroke="currentColor" opacity={0.5} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="recommended"
                  name="Recommended"
                  fill="oklch(0.62 0.2 258)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="selected"
                  name="Selected"
                  fill="oklch(0.74 0.18 150)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <div className="mt-4">
          <Card title="Acceptance rate by tool" hint="Share of recommendations the user accepted">
            <div className="divide-y">
              {accept.map((a) => (
                <div key={a.toolId} className="flex items-center gap-4 py-3">
                  <div className="w-48 shrink-0 text-sm font-medium">{a.tool}</div>
                  <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round(a.acceptanceRate * 100)}%`,
                        background: "var(--gradient-primary)",
                      }}
                    />
                  </div>
                  <div className="w-12 text-right text-sm tabular-nums text-muted-foreground">
                    {Math.round(a.acceptanceRate * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Use cases & benefits */}
        <SectionTitle>Use cases & anticipated benefits</SectionTitle>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Top use cases">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={useCases} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.18} />
                <XAxis type="number" fontSize={11} stroke="currentColor" opacity={0.5} />
                <YAxis
                  dataKey="useCase"
                  type="category"
                  width={170}
                  fontSize={11}
                  stroke="currentColor"
                  opacity={0.7}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="oklch(0.78 0.18 80)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Anticipated benefits">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={benefits} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.18} />
                <XAxis type="number" fontSize={11} stroke="currentColor" opacity={0.5} />
                <YAxis
                  dataKey="benefit"
                  type="category"
                  width={170}
                  fontSize={11}
                  stroke="currentColor"
                  opacity={0.7}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="oklch(0.68 0.22 320)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Sentiment & governance */}
        <SectionTitle>Sentiment & governance pipeline</SectionTitle>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="User sentiment on selected tool">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={sentiment}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {sentiment.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={
                        entry.key === "positive"
                          ? "oklch(0.74 0.18 150)"
                          : entry.key === "neutral"
                            ? "oklch(0.78 0.06 258)"
                            : "oklch(0.65 0.22 25)"
                      }
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card title="ServiceNow task pipeline">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={pipeline}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.18} />
                <XAxis
                  dataKey="state"
                  fontSize={10}
                  stroke="currentColor"
                  opacity={0.6}
                />
                <YAxis fontSize={11} stroke="currentColor" opacity={0.5} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {pipeline.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Risk rating of selected tools">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={risk}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {risk.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={
                        entry.key === "low"
                          ? "oklch(0.74 0.18 150)"
                          : entry.key === "medium"
                            ? "oklch(0.78 0.18 80)"
                            : "oklch(0.65 0.22 25)"
                      }
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <p className="mt-12 text-center text-xs text-muted-foreground">
          Showing simulated data for demo purposes. Wire to real session aggregations once
          production volume is available.
        </p>
      </main>
    </div>
  );
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
} as const;

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-12 mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h2>
  );
}

function Card({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`min-w-0 rounded-2xl border bg-card p-5 shadow-[var(--shadow-elegant)] ${className ?? ""}`}
    >
      <div className="mb-4 flex items-baseline justify-between">
        <div className="text-sm font-medium">{title}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" /> {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}