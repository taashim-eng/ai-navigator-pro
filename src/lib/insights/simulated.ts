// Deterministic simulated leadership-insights data.
// Replace with real aggregations once we have meaningful production volume.

import { TOOLS } from "@/lib/engine/tools";

// Tiny seedable PRNG so charts are stable across renders.
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260515);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)]!;
const between = (min: number, max: number) =>
  Math.floor(rand() * (max - min + 1)) + min;

const DEPARTMENTS = [
  "Engineering",
  "Sales",
  "Marketing",
  "Finance",
  "Legal",
  "HR",
  "Operations",
  "Customer Success",
];
const JOB_FUNCTIONS = [
  "Software Engineer",
  "Product Manager",
  "Account Executive",
  "Analyst",
  "Designer",
  "Counsel",
  "Recruiter",
  "Operations Lead",
];
const USE_CASES = [
  "Drafting documents",
  "Code generation",
  "Meeting summaries",
  "Customer email replies",
  "Data analysis",
  "Research & briefings",
  "Knowledge search",
  "Slide creation",
];
const BENEFITS = [
  "Time savings",
  "Higher quality",
  "Faster onboarding",
  "Better decisions",
  "Reduced toil",
  "Increased revenue",
  "Reduced risk",
  "Customer satisfaction",
];

const TOOL_IDS = TOOLS.map((t) => t.id);
const TOOL_NAME: Record<string, string> = Object.fromEntries(
  TOOLS.map((t) => [t.id, t.name]),
);

export type SimRow = {
  id: string;
  date: string; // YYYY-MM-DD
  department: string;
  jobFunction: string;
  recommendedToolId: string;
  selectedToolId: string;
  accepted: boolean;
  confidence: number; // 0-100
  sentiment: "positive" | "neutral" | "negative";
  csat: number; // 1-5
  useCase: string;
  benefit: string;
  taskState: "Open" | "In Progress" | "Closed Complete" | "Closed Incomplete";
  riskRating: "low" | "medium" | "high";
};

function buildRows(): SimRow[] {
  const rows: SimRow[] = [];
  const today = new Date("2026-05-14T00:00:00Z");
  for (let dayOffset = 89; dayOffset >= 0; dayOffset--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - dayOffset);
    // gentle upward trend
    const base = 4 + Math.round((90 - dayOffset) / 12);
    const count = Math.max(1, base + between(-2, 4));
    for (let i = 0; i < count; i++) {
      const recommendedToolId = weightedPick();
      const accepted = rand() < 0.74;
      const selectedToolId = accepted
        ? recommendedToolId
        : pick(TOOL_IDS.filter((id) => id !== recommendedToolId));
      const tool = TOOLS.find((t) => t.id === selectedToolId)!;
      const sentRoll = rand();
      const sentiment: SimRow["sentiment"] =
        sentRoll < 0.62 ? "positive" : sentRoll < 0.88 ? "neutral" : "negative";
      rows.push({
        id: `sim-${dayOffset}-${i}`,
        date: d.toISOString().slice(0, 10),
        department: pick(DEPARTMENTS),
        jobFunction: pick(JOB_FUNCTIONS),
        recommendedToolId,
        selectedToolId,
        accepted,
        confidence: between(58, 96),
        sentiment,
        csat:
          sentiment === "positive"
            ? between(4, 5)
            : sentiment === "neutral"
              ? between(3, 4)
              : between(1, 3),
        useCase: pick(USE_CASES),
        benefit: pick(BENEFITS),
        taskState: pick([
          "Open",
          "In Progress",
          "Closed Complete",
          "Closed Complete",
          "Closed Complete",
          "Closed Incomplete",
        ]),
        riskRating: tool.riskRating,
      });
    }
  }
  return rows;
}

// Skew recommendations toward the platform leaders.
function weightedPick(): string {
  const weights: Record<string, number> = {
    "m365-copilot": 28,
    "github-copilot": 18,
    "chatgpt": 14,
    "claude-ai": 12,
    "claude-code": 8,
    "perplexity": 8,
    "amazon-q": 5,
    "gemini-enterprise": 5,
    "claude-chatbot": 2,
  };
  const entries = TOOL_IDS.map((id) => [id, weights[id] ?? 5] as const);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [id, w] of entries) {
    r -= w;
    if (r <= 0) return id;
  }
  return entries[0]![0];
}

export const ROWS: SimRow[] = buildRows();

// ---------- aggregations ----------

export function summary() {
  const total = ROWS.length;
  const accepted = ROWS.filter((r) => r.accepted).length;
  const avgCsat =
    ROWS.reduce((s, r) => s + r.csat, 0) / Math.max(1, total);
  const positive = ROWS.filter((r) => r.sentiment === "positive").length;
  const open = ROWS.filter(
    (r) => r.taskState === "Open" || r.taskState === "In Progress",
  ).length;
  return {
    totalRequests: total,
    acceptanceRate: total ? accepted / total : 0,
    avgCsat,
    positiveSentimentRate: total ? positive / total : 0,
    openTasks: open,
    activeUsers: new Set(ROWS.map((r) => r.jobFunction + r.department)).size,
  };
}

export function requestsOverTime() {
  const map = new Map<string, number>();
  for (const r of ROWS) map.set(r.date, (map.get(r.date) ?? 0) + 1);
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

export function byDepartment() {
  const map = new Map<string, number>();
  for (const r of ROWS) map.set(r.department, (map.get(r.department) ?? 0) + 1);
  return [...map.entries()]
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);
}

export function byJobFunction() {
  const map = new Map<string, number>();
  for (const r of ROWS)
    map.set(r.jobFunction, (map.get(r.jobFunction) ?? 0) + 1);
  return [...map.entries()]
    .map(([jobFunction, count]) => ({ jobFunction, count }))
    .sort((a, b) => b.count - a.count);
}

export function recommendationMix() {
  const map = new Map<string, number>();
  for (const r of ROWS)
    map.set(r.recommendedToolId, (map.get(r.recommendedToolId) ?? 0) + 1);
  return [...map.entries()]
    .map(([toolId, count]) => ({
      toolId,
      tool: TOOL_NAME[toolId] ?? toolId,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

export function acceptanceByTool() {
  type Agg = { rec: number; selected: number; accepted: number };
  const map = new Map<string, Agg>();
  const ensure = (id: string) => {
    if (!map.has(id)) map.set(id, { rec: 0, selected: 0, accepted: 0 });
    return map.get(id)!;
  };
  for (const r of ROWS) {
    ensure(r.recommendedToolId).rec += 1;
    ensure(r.selectedToolId).selected += 1;
    if (r.accepted) ensure(r.recommendedToolId).accepted += 1;
  }
  return [...map.entries()]
    .map(([toolId, a]) => ({
      toolId,
      tool: TOOL_NAME[toolId] ?? toolId,
      recommended: a.rec,
      selected: a.selected,
      acceptanceRate: a.rec ? a.accepted / a.rec : 0,
    }))
    .sort((a, b) => b.recommended - a.recommended);
}

export function topUseCases() {
  const map = new Map<string, number>();
  for (const r of ROWS) map.set(r.useCase, (map.get(r.useCase) ?? 0) + 1);
  return [...map.entries()]
    .map(([useCase, count]) => ({ useCase, count }))
    .sort((a, b) => b.count - a.count);
}

export function topBenefits() {
  const map = new Map<string, number>();
  for (const r of ROWS) map.set(r.benefit, (map.get(r.benefit) ?? 0) + 1);
  return [...map.entries()]
    .map(([benefit, count]) => ({ benefit, count }))
    .sort((a, b) => b.count - a.count);
}

export function sentimentBreakdown() {
  const counts = { positive: 0, neutral: 0, negative: 0 };
  for (const r of ROWS) counts[r.sentiment] += 1;
  return [
    { name: "Positive", value: counts.positive, key: "positive" },
    { name: "Neutral", value: counts.neutral, key: "neutral" },
    { name: "Negative", value: counts.negative, key: "negative" },
  ];
}

export function governancePipeline() {
  const counts: Record<SimRow["taskState"], number> = {
    Open: 0,
    "In Progress": 0,
    "Closed Complete": 0,
    "Closed Incomplete": 0,
  };
  for (const r of ROWS) counts[r.taskState] += 1;
  return Object.entries(counts).map(([state, count]) => ({ state, count }));
}

export function riskBreakdown() {
  const counts = { low: 0, medium: 0, high: 0 };
  for (const r of ROWS) counts[r.riskRating] += 1;
  return [
    { name: "Low", value: counts.low, key: "low" },
    { name: "Medium", value: counts.medium, key: "medium" },
    { name: "High", value: counts.high, key: "high" },
  ];
}