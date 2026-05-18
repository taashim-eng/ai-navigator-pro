import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeft, Sparkles, User, CheckCircle2, Search, ShieldCheck, MessageCircle, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { QUESTIONS, QUESTION_BY_ID, DEPARTMENTS, JOB_FUNCTIONS } from "@/lib/engine/questions";
import { rankTools, selectNextQuestion } from "@/lib/engine/scoring";
import type { AnswerValue, SessionState } from "@/lib/engine/types";
import {
  startSession,
  updateIdentity,
  recordEvent,
  finalizeSession,
  lookupSnowUser,
} from "@/lib/navigator.functions";

export const Route = createFileRoute("/navigator")({
  head: () => ({
    meta: [
      { title: "AI Navigator — guided AI request" },
      { name: "description", content: "Answer a few questions and get the right approved AI tool." },
    ],
  }),
  component: Navigator,
});

// ── Custom nodes ────────────────────────────────────────────────────────
type NodeData = { label: string; sub?: string; kind: "prompt" | "question" | "answer" | "rec" };

function MapNode({ data }: { data: NodeData }) {
  const styles: Record<NodeData["kind"], string> = {
    prompt: "border-primary/40 bg-card",
    question: "border-primary bg-card shadow-[var(--shadow-elegant)]",
    answer: "border-border bg-secondary",
    rec: "border-primary/60 text-primary-foreground",
  };
  const wrapStyle =
    data.kind === "rec" ? { background: "var(--gradient-primary)" } : undefined;
  return (
    <div
      className={`min-w-[120px] max-w-[180px] rounded-lg border px-2.5 py-1.5 text-[11px] leading-tight ${styles[data.kind]}`}
      style={wrapStyle}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      {data.sub && <div className="mb-0.5 text-[9px] uppercase tracking-wide opacity-70">{data.sub}</div>}
      <div className="font-medium line-clamp-2">{data.label}</div>
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
}

const nodeTypes = { map: MapNode };

// ── Component ────────────────────────────────────────────────────────────
function Navigator() {
  const navigate = useNavigate();
  const startFn = useServerFn(startSession);
  const updateIdFn = useServerFn(updateIdentity);
  const recordFn = useServerFn(recordEvent);
  const finalizeFn = useServerFn(finalizeSession);
  const snowLookupFn = useServerFn(lookupSnowUser);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [browserToken, setBrowserToken] = useState<string | null>(null);
  const [state, setState] = useState<SessionState>({
    sessionId: "",
    identity: {},
    answers: {},
    tags: {},
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    startFn({})
      .then((r) => {
        if (cancelled) return;
        setSessionId(r.sessionId);
        setBrowserToken(r.browserToken);
        setState((s) => ({ ...s, sessionId: r.sessionId }));
        try {
          sessionStorage.setItem(`nav_token_${r.sessionId}`, r.browserToken);
        } catch {
          /* sessionStorage may be unavailable; results page will show empty state */
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [startFn]);

  const currentQid = useMemo(() => selectNextQuestion(state, QUESTIONS), [state]);
  const currentQ = currentQid ? QUESTION_BY_ID[currentQid] : null;
  const ranked = useMemo(() => rankTools(state), [state]);
  const top = ranked[0];
  const answeredCount = Object.keys(state.answers).length + (state.identity.email ? 1 : 0);
  const progress = Math.min(100, (answeredCount / QUESTIONS.length) * 100);

  // Build mind-map nodes/edges from state
  const { nodes, edges } = useMemo(() => buildGraph(state, currentQid), [state, currentQid]);
  const commentary = useMemo(() => buildCommentary(state, ranked), [state, ranked]);

  async function handleAnswer(qid: string, value: AnswerValue) {
    setState((s) => ({ ...s, answers: { ...s.answers, [qid]: value } }));
    if (sessionId && browserToken) {
      recordFn({
        data: {
          sessionId,
          browserToken,
          nodeId: `q-${qid}`,
          questionId: qid,
          answerValue: value as never,
        },
      }).catch(() => {});
    }
  }

  async function handleIdentity(identity: SessionState["identity"]) {
    setState((s) => ({ ...s, identity: { ...s.identity, ...identity } }));
    if (
      sessionId &&
      browserToken &&
      identity.email &&
      identity.department &&
      identity.jobFunction
    ) {
      updateIdFn({
        data: {
          sessionId,
          browserToken,
          email: identity.email,
          department: identity.department,
          jobFunction: identity.jobFunction,
        },
      }).catch(() => {});
    }
  }

  async function handleFinish() {
    if (!sessionId || !browserToken || submitting) return;
    setSubmitting(true);
    try {
      await finalizeFn({
        data: {
          sessionId,
          browserToken,
          mainUseCase: String(state.answers.main_use_case ?? "general"),
          anticipatedBenefits: Array.isArray(state.answers.anticipated_benefits)
            ? (state.answers.anticipated_benefits as string[])
            : [],
          recommendations: ranked.slice(0, 4).map((r) => ({
            toolId: r.tool.id,
            score: r.score,
            rank: r.rank,
            reasoning: r.reasoning,
          })),
        },
      });
      navigate({ to: "/results/$sessionId", params: { sessionId } });
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Exit
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <div className="hidden h-1.5 w-40 overflow-hidden rounded-full bg-muted md:block">
            <div
              className="h-full transition-all"
              style={{ width: `${progress}%`, background: "var(--gradient-primary)" }}
            />
          </div>
          <span className="text-muted-foreground">
            {Math.round(progress)}% complete
          </span>
        </div>
      </header>

      <div className="flex flex-1 flex-row overflow-hidden">
        {/* Mind map (left) */}
        <div className="relative flex-1 min-w-0 min-h-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            defaultViewport={{ x: 480, y: 24, zoom: 0.85 }}
            minZoom={0.2}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
            nodesDraggable
            zoomOnScroll
          >
            <Background gap={24} size={1} />
            <Controls position="bottom-left" />
            <MiniMap
              pannable
              zoomable
              className="!bg-card !border-border"
              nodeColor={(n) => {
                const k = (n.data as NodeData | undefined)?.kind;
                if (k === "rec") return "oklch(0.55 0.2 258)";
                if (k === "question") return "oklch(0.7 0.15 258)";
                if (k === "answer") return "oklch(0.85 0.04 258)";
                return "oklch(0.6 0.15 258)";
              }}
              nodeStrokeWidth={3}
              maskColor="oklch(0.95 0.01 258 / 0.6)"
            />
          </ReactFlow>

          {top && top.score > 0 && (
            <div className="pointer-events-none absolute right-4 top-4 max-w-xs rounded-xl border bg-card/90 p-4 backdrop-blur shadow-[var(--shadow-elegant)]">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Live top match
              </div>
              <div className="mt-1 font-semibold">{top.tool.name}</div>
              <div className="text-xs text-muted-foreground">{top.tool.category}</div>
            </div>
          )}

          {/* Reasoning commentary bubbles */}
          <div className="pointer-events-none absolute left-4 top-4 flex max-w-sm flex-col gap-2">
            <AnimatePresence initial={false}>
              {commentary.map((c: Commentary) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, x: -16, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -16, scale: 0.96 }}
                  transition={{ duration: 0.25 }}
                  className="pointer-events-auto rounded-2xl rounded-tl-sm border bg-card/90 px-3 py-2 text-xs shadow-[var(--shadow-elegant)] backdrop-blur"
                >
                  <div className="mb-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-primary">
                    <Brain className="h-3 w-3" /> {c.label}
                  </div>
                  <div className="text-foreground/90 leading-snug">{c.text}</div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Right dock: active question / chat */}
        <aside
          className={`flex h-full flex-col overflow-hidden border-l bg-card/30 px-4 py-3 transition-[width] duration-300 ease-out ${
            state.identity.email
              ? "w-[360px] shrink-0"
              : "w-[420px] shrink-0"
          }`}
        >
          <div className="flex w-full flex-1 flex-col gap-4 overflow-hidden">
          <AnimatePresence mode="wait">
            {currentQ ? (
              <motion.div
                key={currentQ.id + "-prompt"}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex shrink-0 flex-col gap-2 overflow-y-auto pr-1"
              >
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <MessageCircle className="h-3.5 w-3.5" /> Navigator · {currentQ.category}
                </div>
                <h2 className="text-lg font-semibold leading-snug">{currentQ.prompt}</h2>
                {currentQ.helper && (
                  <p className="text-xs text-muted-foreground">{currentQ.helper}</p>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="done-prompt"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex shrink-0 flex-col gap-2 overflow-y-auto pr-1"
              >
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <MessageCircle className="h-3.5 w-3.5" /> Navigator
                </div>
                <CheckCircle2 className="h-6 w-6 text-primary" />
                <h2 className="text-lg font-semibold">Ready for your recommendation</h2>
                <p className="text-xs text-muted-foreground">
                  We've matched your answers against the approved catalog.
                </p>
                {top && (
                  <div className="rounded-lg border bg-card p-3">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Top match
                    </div>
                    <div className="mt-0.5 text-sm font-semibold">{top.tool.name}</div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{top.reasoning}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Right column: answer options */}
          <div className="flex min-h-0 flex-col overflow-y-auto">
            <AnimatePresence mode="wait">
              {currentQ ? (
                <motion.div
                  key={currentQ.id + "-opts"}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-3"
                >
                  {currentQ.type === "identity" && (
                    <IdentityForm
                      initial={state.identity}
                      onSubmit={handleIdentity}
                      onLookup={async (email) => {
                        const r = await snowLookupFn({ data: { email } });
                        return r.user;
                      }}
                    />
                  )}

                  {currentQ.type === "single" && currentQ.options && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {currentQ.options.map((o) => (
                        <button
                          key={o.value}
                          onClick={() => handleAnswer(currentQ.id, o.value)}
                          className="rounded-lg border bg-card px-3 py-2 text-left text-sm transition hover:border-primary hover:shadow-[var(--shadow-elegant)]"
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {currentQ.type === "multi" && currentQ.options && (
                    <MultiChips
                      options={currentQ.options}
                      onConfirm={(vals) => handleAnswer(currentQ.id, vals)}
                    />
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="done-opts"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex h-full flex-col justify-center"
                >
                  {top && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {top.matchedTags.slice(0, 6).map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px]">
                          {t.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={submitting || !sessionId}
                    onClick={handleFinish}
                  >
                    {submitting ? "Saving…" : "See full recommendation"}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Identity form ────────────────────────────────────────────────────────
function IdentityForm({
  initial,
  onSubmit,
  onLookup,
}: {
  initial: SessionState["identity"];
  onSubmit: (id: SessionState["identity"]) => void;
  onLookup: (email: string) => Promise<{
    sysId: string;
    name: string;
    department: string;
    jobFunction: string;
    managerEmail: string | null;
  } | null>;
}) {
  const [email, setEmail] = useState(initial.email ?? "");
  const [department, setDepartment] = useState(initial.department ?? "");
  const [jobFunction, setJobFunction] = useState(initial.jobFunction ?? "");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupHit, setLookupHit] = useState<null | { name: string; managerEmail: string | null }>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const valid = /.+@.+\..+/.test(email) && department && jobFunction;
  const emailValid = /.+@.+\..+/.test(email);

  async function handleLookup() {
    if (!emailValid) return;
    setLookupBusy(true);
    setLookupError(null);
    try {
      const u = await onLookup(email);
      if (!u) {
        setLookupError("No directory match — fill in your details below.");
        setLookupHit(null);
        return;
      }
      setDepartment(u.department);
      setJobFunction(u.jobFunction);
      setLookupHit({ name: u.name, managerEmail: u.managerEmail });
    } catch {
      setLookupError("ServiceNow lookup failed. Fill in your details below.");
    } finally {
      setLookupBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled
        title="Entra ID SAML SSO will be wired up by IT"
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground"
      >
        <ShieldCheck className="h-4 w-4" /> Sign in with Entra ID
        <span className="ml-1 rounded-full border bg-background px-2 py-0.5 text-[10px] uppercase tracking-wide">
          Coming soon
        </span>
      </button>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or look up via ServiceNow{" "}
        <span className="h-px flex-1 bg-border" />
      </div>

      <div>
        <Label htmlFor="email">Work email</Label>
        <div className="mt-1 flex gap-2">
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setLookupHit(null);
              setLookupError(null);
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={!emailValid || lookupBusy}
            onClick={handleLookup}
          >
            <Search className="mr-1.5 h-4 w-4" />
            {lookupBusy ? "Looking up…" : "Look up"}
          </Button>
        </div>
        {lookupHit && (
          <div className="mt-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground">
            <div className="font-medium">ServiceNow match: {lookupHit.name}</div>
            {lookupHit.managerEmail && (
              <div className="text-muted-foreground">
                Reports to {lookupHit.managerEmail}
              </div>
            )}
          </div>
        )}
        {lookupError && (
          <div className="mt-2 text-xs text-muted-foreground">{lookupError}</div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Department</Label>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Job function</Label>
          <Select value={jobFunction} onValueChange={setJobFunction}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {JOB_FUNCTIONS.map((j) => (
                <SelectItem key={j} value={j}>{j}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button
        disabled={!valid}
        onClick={() => onSubmit({ email, department, jobFunction })}
        className="w-full"
      >
        <User className="mr-2 h-4 w-4" /> Continue
      </Button>
    </div>
  );
}

// ── Multi-select chips with confirm ──────────────────────────────────────
function MultiChips({
  options,
  onConfirm,
}: {
  options: { value: string; label: string }[];
  onConfirm: (vals: string[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (v: string) =>
    setPicked((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = picked.includes(o.value);
          return (
            <button
              key={o.value}
              onClick={() => toggle(o.value)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary"}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <Button
        disabled={picked.length === 0}
        onClick={() => onConfirm(picked)}
        className="w-full"
      >
        Continue
      </Button>
    </div>
  );
}

// ── Graph builder ────────────────────────────────────────────────────────
function buildGraph(state: SessionState, currentQid: string | null): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let y = 0;
  const xCenter = 0;
  const STEP = 80;

  nodes.push({
    id: "root",
    type: "map",
    position: { x: xCenter, y },
    data: { label: "AI Solution Navigator", sub: "Start", kind: "prompt" } satisfies NodeData,
  });

  let prevId = "root";

  // Identity node
  if (state.identity.email) {
    y += STEP;
    const id = "n-identity";
    nodes.push({
      id,
      type: "map",
      position: { x: xCenter, y },
      data: {
        label: `${state.identity.jobFunction} · ${state.identity.department}`,
        sub: "About you",
        kind: "answer",
      },
    });
    edges.push({ id: `e-root-${id}`, source: prevId, target: id, animated: true });
    prevId = id;
  }

  // Answered questions in their declaration order
  for (const q of QUESTIONS) {
    if (q.type === "identity") continue;
    const ans = state.answers[q.id];
    if (ans === undefined) continue;
    y += STEP;
    const qNodeId = `q-${q.id}`;
    nodes.push({
      id: qNodeId,
      type: "map",
      position: { x: xCenter - 110, y },
      data: { label: q.prompt, sub: q.category, kind: "question" },
    });
    edges.push({ id: `e-${prevId}-${qNodeId}`, source: prevId, target: qNodeId, animated: true });

    const labels = (Array.isArray(ans) ? ans : [ans]).map((v) => {
      const opt = q.options?.find((o) => o.value === v);
      return opt?.label ?? String(v);
    });
    const aNodeId = `a-${q.id}`;
    nodes.push({
      id: aNodeId,
      type: "map",
      position: { x: xCenter + 110, y },
      data: { label: labels.join(", "), sub: "Your answer", kind: "answer" },
    });
    edges.push({ id: `e-${qNodeId}-${aNodeId}`, source: qNodeId, target: aNodeId, animated: true });
    prevId = qNodeId;
  }

  // Active question (not yet answered)
  if (currentQid && currentQid !== "identity") {
    const q = QUESTION_BY_ID[currentQid];
    if (q && state.answers[q.id] === undefined) {
      y += STEP;
      const qNodeId = `q-${q.id}-pending`;
      nodes.push({
        id: qNodeId,
        type: "map",
        position: { x: xCenter, y },
        data: { label: q.prompt, sub: q.category, kind: "question" },
      });
      edges.push({ id: `e-${prevId}-${qNodeId}`, source: prevId, target: qNodeId, animated: true });
    }
  }

  // Live top recommendation
  const top = rankTools(state)[0];
  if (top && top.score > 0) {
    nodes.push({
      id: "rec",
      type: "map",
      position: { x: xCenter + 280, y: 0 },
      data: { label: top.tool.name, sub: "Live recommendation", kind: "rec" },
    });
    edges.push({
      id: "e-root-rec",
      source: "root",
      target: "rec",
      animated: true,
      style: { stroke: "oklch(0.7 0.2 258)" },
    });
  }

  return { nodes, edges };
}

// ── Reasoning commentary ─────────────────────────────────────────────────
type Commentary = { id: string; label: string; text: string };
type Ranked = ReturnType<typeof rankTools>;

function buildCommentary(state: SessionState, ranked: Ranked): Commentary[] {
  const out: Commentary[] = [];

  if (state.identity.email && state.identity.jobFunction) {
    out.push({
      id: "c-identity",
      label: "Anchoring",
      text: `Profiling tools approved for a ${state.identity.jobFunction} in ${state.identity.department}.`,
    });
  }

  const useCase = state.answers.main_use_case;
  if (useCase) {
    const q = QUESTION_BY_ID["main_use_case"];
    const label = q?.options?.find((o) => o.value === useCase)?.label ?? String(useCase);
    out.push({
      id: "c-use-case",
      label: "Filtering",
      text: `Narrowing the catalog to tools built for "${label}".`,
    });
  }

  const benefits = state.answers.anticipated_benefits;
  if (Array.isArray(benefits) && benefits.length) {
    out.push({
      id: "c-benefits",
      label: "Weighting",
      text: `Boosting tools that deliver ${benefits.slice(0, 2).join(" and ")}${benefits.length > 2 ? " (+more)" : ""}.`,
    });
  }

  const sensitivity = state.answers.data_sensitivity;
  if (sensitivity && sensitivity !== "public") {
    out.push({
      id: "c-risk",
      label: "Governance",
      text: `Restricting to options cleared for ${String(sensitivity).replace(/_/g, " ")} data.`,
    });
  }

  const top = ranked[0];
  const second = ranked[1];
  if (top && top.score > 0) {
    const tags = top.matchedTags.slice(0, 3).map((t) => t.replace(/_/g, " "));
    out.push({
      id: `c-top-${top.tool.id}`,
      label: "Top match",
      text: tags.length
        ? `${top.tool.name} leads — strong fit on ${tags.join(", ")}.`
        : `${top.tool.name} is currently the best fit.`,
    });
    if (second && second.score > 0 && top.score - second.score < 1.5) {
      out.push({
        id: `c-close-${second.tool.id}`,
        label: "Close call",
        text: `${second.tool.name} is close behind — a few more answers will break the tie.`,
      });
    }
  }

  return out.slice(-4);
}