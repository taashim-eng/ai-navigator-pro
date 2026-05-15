import { TOOLS } from "./tools";
import type { RankedTool, SessionState, ToolSeed } from "./types";
import { QUESTION_BY_ID } from "./questions";

/**
 * Per-question weight applied to every tag matched from that question.
 * Higher weight = stronger signal.
 */
const QUESTION_WEIGHT: Record<string, number> = {
  main_use_case: 3,
  ecosystem: 3,
  coding_depth: 4,
  research_style: 3,
  data_sensitivity: 2,
  sophistication: 2,
  anticipated_benefits: 1,
};

/**
 * Build the running tag map from a session's chosen answers.
 * Each matched tag accumulates the weight of the question it came from.
 */
export function computeTags(state: SessionState): Record<string, number> {
  const tags: Record<string, number> = {};
  for (const [qid, value] of Object.entries(state.answers)) {
    const q = QUESTION_BY_ID[qid];
    if (!q || !q.options) continue;
    const w = QUESTION_WEIGHT[qid] ?? 1;
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      const opt = q.options.find((o) => o.value === v);
      if (!opt?.tags) continue;
      for (const t of opt.tags) tags[t] = (tags[t] ?? 0) + w;
    }
  }
  // Identity boost: persona match from job function
  const jf = state.identity.jobFunction?.toLowerCase() ?? "";
  if (jf.includes("engineer") || jf.includes("developer")) {
    tags["engineer"] = (tags["engineer"] ?? 0) + 2;
    tags["developer"] = (tags["developer"] ?? 0) + 2;
  }
  if (jf.includes("analyst")) tags["analyst"] = (tags["analyst"] ?? 0) + 2;
  if (jf.includes("executive") || jf.includes("director"))
    tags["executive"] = (tags["executive"] ?? 0) + 2;
  return tags;
}

function scoreTool(tool: ToolSeed, tags: Record<string, number>): { score: number; matched: string[] } {
  let score = 0;
  const matched: string[] = [];
  const tagSet = new Set([...tool.capabilities, ...tool.integrations, ...tool.personas, ...tool.useCases]);
  for (const [tag, weight] of Object.entries(tags)) {
    if (tagSet.has(tag)) {
      score += weight;
      matched.push(tag);
    }
  }
  return { score, matched };
}

/**
 * Contextual boosts/penalties that the flat tag-match cannot express.
 * These encode expert preferences so the recommendation is not biased
 * toward whichever tool happens to share the most generic tags.
 */
function contextualAdjustment(tool: ToolSeed, state: SessionState): number {
  const a = state.answers;
  const useCase = a.main_use_case;
  const ecosystem = a.ecosystem;
  const depth = a.coding_depth;
  const soph = a.sophistication;
  const sens = a.data_sensitivity;
  const research = a.research_style;
  const jf = state.identity.jobFunction?.toLowerCase() ?? "";
  const isDev = jf.includes("engineer") || jf.includes("developer");
  const advanced = soph === "advanced" || soph === "technical";

  let delta = 0;

  // ── Coding routing ────────────────────────────────────────────────
  if (useCase === "coding" || ecosystem === "ide") {
    if (tool.id === "claude-code") {
      if (depth === "agentic") delta += 8;
      if (depth === "review") delta += 4;
      if (depth === "inline") delta -= 3;
      if (advanced) delta += 4;
      if (isDev) delta += 2;
    }
    if (tool.id === "github-copilot") {
      if (depth === "inline") delta += 6;
      if (depth === "agentic") delta -= 4;
      if (depth === "review") delta += 1;
      if (soph === "beginner" || soph === "intermediate") delta += 2;
      if (advanced && depth !== "inline") delta -= 2;
    }
    if (tool.id === "amazon-q" && ecosystem === "aws") delta += 5;
    // Penalize non-coding tools for coding flows
    if (
      ["m365-copilot", "gemini-enterprise", "claude-chatbot", "perplexity"].includes(tool.id)
    ) {
      delta -= 5;
    }
  }

  // ── Ecosystem alignment (only when not coding) ────────────────────
  if (useCase !== "coding") {
    if (ecosystem === "m365" && tool.id === "m365-copilot") delta += 6;
    if (ecosystem === "google" && tool.id === "gemini-enterprise") delta += 6;
    if (ecosystem === "aws" && tool.id === "amazon-q") delta += 6;
    // Don't let m365-copilot win generic flows it doesn't fit
    if (ecosystem !== "m365" && tool.id === "m365-copilot") delta -= 3;
    if (ecosystem !== "google" && tool.id === "gemini-enterprise") delta -= 3;
  }

  // ── Research routing ──────────────────────────────────────────────
  if (useCase === "research") {
    if (tool.id === "perplexity" && research === "must_cite") delta += 6;
    if (tool.id === "claude-ai" && research === "long_doc") delta += 6;
    if (tool.id === "chatgpt") delta += 1;
  }

  // ── Sophistication bias for general assistants ────────────────────
  if (soph === "beginner" && tool.id === "chatgpt") delta += 2;
  if (advanced && tool.id === "claude-ai") delta += 2;

  // ── Data sensitivity: prefer low-risk, enterprise-boundary tools ──
  if (sens === "confidential" || sens === "regulated") {
    if (tool.riskRating === "low") delta += 2;
    if (tool.riskRating === "high") delta -= 4;
  }

  return delta;
}

/**
 * Apply hard filters: regulated/confidential data requires low risk rating.
 */
function passesFilters(tool: ToolSeed, state: SessionState): boolean {
  const sensitivity = state.answers.data_sensitivity;
  if (sensitivity === "regulated" && tool.riskRating !== "low") return false;
  return true;
}

function reasoningFor(tool: ToolSeed, matched: string[], state: SessionState): string {
  const top = matched.slice(0, 3);
  const ecosystem = state.answers.ecosystem;
  const useCase = state.answers.main_use_case;
  const depth = state.answers.coding_depth;
  const soph = state.answers.sophistication;
  const bits: string[] = [];
  if (tool.id === "claude-code" && depth === "agentic")
    bits.push("you want an agent that edits files in your repo");
  if (tool.id === "claude-code" && (soph === "advanced" || soph === "technical"))
    bits.push("your AI sophistication suits an agentic CLI workflow");
  if (tool.id === "github-copilot" && depth === "inline")
    bits.push("you want inline IDE completions");
  if (ecosystem === "m365" && tool.id === "m365-copilot")
    bits.push("you live inside Microsoft 365");
  if (ecosystem === "google" && tool.id === "gemini-enterprise")
    bits.push("you live inside Google Workspace");
  if (ecosystem === "aws" && tool.id === "amazon-q") bits.push("you operate on AWS");
  if (useCase === "research" && tool.id === "perplexity")
    bits.push("it returns cited research");
  if (top.length) bits.push(`covers ${top.join(", ")}`);
  if (!bits.length) bits.push(`broad fit for your use case`);
  return `Recommended because ${bits.join(" and ")}.`;
}

export function rankTools(state: SessionState): RankedTool[] {
  const tags = computeTags(state);
  const scored = TOOLS
    .filter((t) => passesFilters(t, state))
    .map((tool) => {
      const { score, matched } = scoreTool(tool, tags);
      const adjusted = score + contextualAdjustment(tool, state);
      return { tool, score: Math.max(0, adjusted), matched };
    })
    .sort((a, b) => b.score - a.score);

  const maxScore = Math.max(1, scored[0]?.score ?? 1);
  return scored.map((s, i) => ({
    tool: s.tool,
    score: s.score,
    rank: i + 1,
    confidence: Math.min(1, s.score / maxScore),
    matchedTags: s.matched,
    reasoning: reasoningFor(s.tool, s.matched, state),
  }));
}

/**
 * Decide the next question id given the current session state.
 * Returns null when the flow is complete.
 */
export function selectNextQuestion(state: SessionState, ordered: { id: string }[]): string | null {
  for (const q of ordered) {
    const def = QUESTION_BY_ID[q.id];
    if (!def) continue;
    if (def.showIf && !def.showIf(state)) continue;
    if (def.type === "identity") {
      const i = state.identity;
      if (!i.email || !i.department || !i.jobFunction) return q.id;
      continue;
    }
    if (state.answers[q.id] === undefined) return q.id;
  }
  return null;
}