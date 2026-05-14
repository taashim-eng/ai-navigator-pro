import { TOOLS } from "./tools";
import type { RankedTool, SessionState, ToolSeed } from "./types";
import { QUESTION_BY_ID } from "./questions";

/**
 * Build the running tag map from a session's chosen answers.
 * Each matched tag accumulates a weight of 1.
 */
export function computeTags(state: SessionState): Record<string, number> {
  const tags: Record<string, number> = {};
  for (const [qid, value] of Object.entries(state.answers)) {
    const q = QUESTION_BY_ID[qid];
    if (!q || !q.options) continue;
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      const opt = q.options.find((o) => o.value === v);
      if (!opt?.tags) continue;
      for (const t of opt.tags) tags[t] = (tags[t] ?? 0) + 1;
    }
  }
  // Identity boost: persona match from job function
  const jf = state.identity.jobFunction?.toLowerCase() ?? "";
  if (jf.includes("engineer") || jf.includes("developer")) {
    tags["engineer"] = (tags["engineer"] ?? 0) + 1;
    tags["developer"] = (tags["developer"] ?? 0) + 1;
  }
  if (jf.includes("analyst")) tags["analyst"] = (tags["analyst"] ?? 0) + 1;
  if (jf.includes("executive") || jf.includes("director")) tags["executive"] = (tags["executive"] ?? 0) + 1;
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
  const bits: string[] = [];
  if (ecosystem === "m365" && tool.id === "m365-copilot")
    bits.push("you live inside Microsoft 365");
  if (ecosystem === "google" && tool.id === "gemini-enterprise")
    bits.push("you live inside Google Workspace");
  if (ecosystem === "aws" && tool.id === "amazon-q") bits.push("you operate on AWS");
  if (useCase === "coding" && (tool.id === "github-copilot" || tool.id === "claude-code"))
    bits.push(`it matches your coding workflow`);
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
      return { tool, score, matched };
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