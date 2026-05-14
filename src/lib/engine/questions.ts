import type { Question } from "./types";

export const DEPARTMENTS = [
  "Finance",
  "HR",
  "IT",
  "Sales",
  "Marketing",
  "Operations",
  "Legal",
  "R&D",
  "Customer Support",
  "Executive",
  "Other",
];

export const JOB_FUNCTIONS = [
  "Analyst",
  "Engineer / Developer",
  "Manager",
  "Director",
  "Executive",
  "Specialist",
  "Consultant",
  "Administrator",
  "Other",
];

export const USE_CASE_CHIPS = [
  { value: "coding", label: "Coding & development", tags: ["coding", "ide_completion"] },
  { value: "documents", label: "Document generation", tags: ["document_generation", "writing"] },
  { value: "analytics", label: "Analytics & data", tags: ["analytics", "data_science"] },
  { value: "automation", label: "Workflow automation", tags: ["automation", "workflow_automation"] },
  { value: "research", label: "Research", tags: ["research", "citations"] },
  { value: "summarize", label: "Summarization", tags: ["summarization"] },
  { value: "support", label: "Customer support", tags: ["customer_support", "conversational"] },
  { value: "presentations", label: "Presentations", tags: ["presentations"] },
  { value: "meetings", label: "Meetings & transcription", tags: ["meeting_intelligence"] },
  { value: "images", label: "Image generation", tags: ["image_generation"] },
  { value: "predictive", label: "Predictive modeling", tags: ["data_science"] },
];

export const BENEFIT_CHIPS = [
  { value: "save_time", label: "Save time" },
  { value: "reduce_manual", label: "Reduce manual work" },
  { value: "improve_quality", label: "Improve quality" },
  { value: "reduce_errors", label: "Reduce errors" },
  { value: "automate", label: "Automate workflows" },
  { value: "speed", label: "Increase speed" },
  { value: "insights", label: "Improve insights" },
];

/**
 * Branching decision tree. Identity questions surface first as conversational
 * "About you" nodes, then capability + governance questions follow.
 */
export const QUESTIONS: Question[] = [
  // ── Identity (captured invisibly as the first three nodes) ───────────────
  {
    id: "identity",
    category: "About you",
    prompt: "Tell us a bit about you",
    helper: "Used to route your request and inform leadership analytics.",
    type: "identity",
  },
  {
    id: "main_use_case",
    category: "What you want to do",
    prompt: "What's the main thing you want AI to help with?",
    helper: "Pick the closest match — we'll go deeper from here.",
    type: "single",
    options: USE_CASE_CHIPS,
  },
  {
    id: "anticipated_benefits",
    category: "Expected benefits",
    prompt: "What outcomes are you hoping for?",
    helper: "Select all that apply.",
    type: "multi",
    options: BENEFIT_CHIPS,
  },

  // ── Capability branching ────────────────────────────────────────────────
  {
    id: "ecosystem",
    category: "Where you work",
    prompt: "Which ecosystem do you live in most of the day?",
    type: "single",
    options: [
      { value: "m365", label: "Microsoft 365 (Teams, Outlook, SharePoint)", tags: ["m365_native", "microsoft_365"] },
      { value: "google", label: "Google Workspace", tags: ["google_native", "google_workspace"] },
      { value: "aws", label: "AWS / cloud engineering", tags: ["aws_operations", "aws"] },
      { value: "ide", label: "An IDE / code editor", tags: ["ide_completion", "coding"] },
      { value: "browser", label: "Mostly the browser", tags: [] },
    ],
  },
  {
    id: "coding_depth",
    category: "Coding context",
    prompt: "How deep does the coding work go?",
    type: "single",
    showIf: (s) =>
      s.answers.main_use_case === "coding" || s.answers.ecosystem === "ide",
    options: [
      { value: "inline", label: "Inline completions while I type", tags: ["ide_completion", "code_completion"] },
      { value: "agentic", label: "Agent that edits files in my repo", tags: ["agentic_coding", "automation"] },
      { value: "review", label: "Code review & explanation", tags: ["code_review", "reasoning"] },
    ],
  },
  {
    id: "research_style",
    category: "Research style",
    prompt: "When you research, how important are cited sources?",
    type: "single",
    showIf: (s) =>
      s.answers.main_use_case === "research" ||
      (Array.isArray(s.answers.anticipated_benefits) &&
        s.answers.anticipated_benefits.includes("insights")),
    options: [
      { value: "must_cite", label: "Must cite live web sources", tags: ["citations", "web_search", "research"] },
      { value: "long_doc", label: "Analyzing long internal documents", tags: ["long_context", "research"] },
      { value: "either", label: "Either is fine", tags: ["research"] },
    ],
  },
  {
    id: "data_sensitivity",
    category: "Data sensitivity",
    prompt: "What kind of data will you put into the tool?",
    helper: "We use this to filter tools by their risk posture.",
    type: "single",
    options: [
      { value: "public", label: "Public information only", tags: [] },
      { value: "internal", label: "Internal company data", tags: [] },
      { value: "confidential", label: "Confidential / customer data", tags: ["enterprise_required"] },
      { value: "regulated", label: "Regulated (PHI, PII, financial)", tags: ["enterprise_required"] },
    ],
  },
  {
    id: "sophistication",
    category: "Your AI sophistication",
    prompt: "How would you describe your AI experience?",
    type: "single",
    options: [
      { value: "beginner", label: "Brand new to AI", tags: ["beginner"] },
      { value: "intermediate", label: "I use ChatGPT-type tools weekly", tags: ["intermediate"] },
      { value: "advanced", label: "Power user / build with AI", tags: ["advanced"] },
      { value: "technical", label: "Engineer comfortable with APIs", tags: ["technical", "engineer"] },
    ],
  },
];

export const QUESTION_BY_ID: Record<string, Question> = Object.fromEntries(
  QUESTIONS.map((q) => [q.id, q]),
);