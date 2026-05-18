export type AnswerValue = string | string[];

export interface Question {
  id: string;
  category: string;
  prompt: string;
  helper?: string;
  type: "single" | "multi" | "text" | "identity";
  options?: { value: string; label: string; tags?: string[] }[];
  /** Only show this question if predicate returns true */
  showIf?: (state: SessionState) => boolean;
}

export interface Identity {
  email: string;
  department: string;
  jobFunction: string;
  mainUseCase: string;
  anticipatedBenefits: string[];
}

export interface SessionState {
  sessionId: string;
  identity: Partial<Identity>;
  answers: Record<string, AnswerValue>;
  /** Accumulated capability tags from chosen answers */
  tags: Record<string, number>;
}

export interface ToolSeed {
  id: string;
  name: string;
  category: string;
  description: string;
  capabilities: string[];
  riskRating: "low" | "medium" | "high";
  licensing: string;
  integrations: string[];
  costEstimate: string;
  personas: string[];
  useCases: string[];
  complianceNotes: string;
  /** How the tool is delivered to employees (e.g. "Available internally", "Bundled in Claude desktop app"). */
  availability?: string;
  /** Where it can be accessed in addition to the primary surface. */
  deploymentOptions?: string[];
  /** When true, the tool is shown in the catalog but greyed out and excluded from recommendations. */
  excluded?: boolean;
}

export interface RankedTool {
  tool: ToolSeed;
  score: number;
  rank: number;
  confidence: number; // 0-1
  reasoning: string;
  matchedTags: string[];
}