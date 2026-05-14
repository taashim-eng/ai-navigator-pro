
# AI Solution Navigator — MVP Plan

Scope: landing page, branching node-based questionnaire on a mind-map canvas, live scoring engine, executive-grade results page, seeded tool catalog limited to 9 approved tools, and structured user-identity capture for governance/analytics. Auth, admin UI, and analytics dashboards deferred.

## Approved tool catalog (seed)

Only these are recommended:

1. Microsoft 365 Copilot — M365/Teams/SharePoint productivity
2. Claude.ai — long-context reasoning, writing
3. Claude Code (desktop) — agentic coding in local repos
4. ChatGPT — general assistant
5. GitHub Copilot — IDE inline coding
6. Claude (chatbot) — conversational assistant for business users
7. Amazon Q — AWS-aware assistant (business + dev)
8. Gemini Enterprise — Google Workspace, multimodal
9. Perplexity — cited research

Each catalog entry: category, capabilities[], approved, risk rating, compliance notes, licensing, integrations[], cost estimate, ideal personas[], supported use cases[].

## Required intake fields (captured invisibly via the mind-map flow)

Every session captures:

- **User ID** — auto-assigned UUID; if auth is later enabled, linked to `auth.users.id`
- **Email** — required field (validated)
- **Department** — select (e.g. Finance, HR, IT, Sales, Marketing, Operations, Legal, R&D, Customer Support, Executive, Other)
- **Job function** — select (e.g. Analyst, Engineer/Developer, Manager, Director, Executive, Specialist, Consultant, Administrator, Other)
- **Main use case** — short free-text + suggested chips drawn from the use-case taxonomy (coding, document generation, analytics, automation, research, summarization, customer support, presentations, transcription/meeting intelligence, image generation, predictive modeling)
- **Anticipated benefits** — multi-select chips (save time, reduce manual work, improve quality, reduce errors, automate workflows, increase speed, improve insights) + optional free-text

These are presented as the **first three nodes** of the mind map ("About you" → "What you want to do" → "Expected benefits") so they feel conversational, not like a form. They feed both persistence (governance/analytics) and the scoring engine (job function + use case heavily influence ranking).

## What we're building

1. **Landing page** (`/`) — animated node-graph hero, CTAs to `/navigator` and `/catalog`.
2. **Mind-map questionnaire** (`/navigator`) — React Flow canvas with custom nodes (`IdentityNode`, `PromptNode`, `QuestionNode`, `AnswerNode`, `RecommendationNode`), zoom/pan/minimap, animated edges (Framer Motion), live "Top match" card, side panel for the active question with chip answers.
3. **Tool catalog** (`/catalog`) — filterable grid of the 9 tools with detail drawer.
4. **Results page** (`/results/$sessionId`) — top tool + confidence + reasoning; sections for Why this fits · Alternatives · Risks · Licensing · Implementation complexity · Next steps · Integration readiness; browser print-to-PDF.

## Technical architecture

### Stack
TanStack Start + React + TypeScript + Tailwind v4, `@xyflow/react`, `framer-motion`, `lucide-react`, shadcn/ui, Lovable Cloud (Supabase). Auth scaffolded but routes public for MVP (anonymous sessions).

### Decision engine (`src/lib/engine/`)
Pure TypeScript:
```
types.ts        // Question, Answer, Tool, Score, SessionState, Identity
questions.ts    // Typed decision tree (identity questions first)
tools.ts        // 9-tool seed
scoring.ts      // weighted tag-overlap + hard filters (data sensitivity vs risk)
selectNext.ts   // next question given state
recommend.ts    // ranked tools + reasoning strings
```

Routing intent examples: IDE coding → GitHub Copilot / Claude Code · M365/Teams/SharePoint → M365 Copilot · Google Workspace → Gemini Enterprise · AWS context → Amazon Q · cited research → Perplexity · general reasoning/writing → Claude.ai or ChatGPT (tie-break on data sensitivity + integrations).

### Data model (Lovable Cloud)
```
sessions         (id, user_id nullable, email, department, job_function,
                  main_use_case, anticipated_benefits text[],
                  intent_text, started_at, completed_at)
session_events   (id, session_id, node_id, question_id, answer_value, created_at)
recommendations  (id, session_id, tool_id, score, rank, reasoning, created_at)
tools            (id, name, category, capabilities[], risk_rating, approved,
                  licensing, integrations[], cost_estimate, personas[],
                  use_cases[], compliance_notes)
```

`email`, `department`, `job_function`, `main_use_case`, `anticipated_benefits` are NOT NULL on `finalizeSession` (allowed null while session is in progress).

RLS: `tools` publicly readable; `sessions`/`session_events`/`recommendations` writable anonymously via server functions keyed by client-generated session id stored in `localStorage`. When auth is later enabled we tighten RLS to `user_id = auth.uid()`.

Server functions: `startSession`, `updateIdentity`, `recordEvent`, `finalizeSession`, `getResults`, `listTools`. All inputs Zod-validated (email format, enum membership, length caps).

### Routes
```
src/routes/
  __root.tsx
  index.tsx
  navigator.tsx
  catalog.tsx
  results.$sessionId.tsx
```

### Design tokens
Extend `src/styles.css` with Fluent-inspired enterprise palette (deep navy primary, electric blue accent, soft surfaces), gradient + glow tokens for the node-graph aesthetic, dark-mode parity. All component colors via semantic tokens.

## Out of scope this iteration (architecture supports)
Auth-gated routes & Entra ID · admin tool/rule management · leadership analytics dashboards (Sankey, heatmaps, KPIs) · CSV/Power BI/PDF export beyond browser print · SharePoint SPFx packaging · LLM-backed intent classification.

## Build order
1. Design tokens + landing page
2. Engine module (questions incl. identity, tools, scoring) — pure functions
3. Lovable Cloud schema + seed + server functions with Zod validation
4. React Flow navigator wired to engine + persistence
5. Catalog page
6. Results page
7. QA pass (flows, validation, dark mode, mobile)
