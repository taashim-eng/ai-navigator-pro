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
      className={`min-w-[180px] max-w-[260px] rounded-xl border px-4 py-3 text-sm ${styles[data.kind]}`}
      style={wrapStyle}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      {data.sub && <div className="mb-1 text-[10px] uppercase tracking-wide opacity-70">{data.sub}</div>}
      <div className="font-medium">{data.label}</div>
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
        setState((s) => ({ ...s, sessionId: r.sessionId }));
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
    if (sessionId) {
      recordFn({
        data: {
          sessionId,
          nodeId: `q-${qid}`,
          questionId: qid,
          answerValue: value as never,
        },
      }).catch(() => {});
    }
  }

  async function handleIdentity(identity: SessionState["identity"]) {
    setState((s) => ({ ...s, identity: { ...s.identity, ...identity } }));
    if (sessionId && identity.email && identity.department && identity.jobFunction) {
      updateIdFn({
        data: {
          sessionId,
          email: identity.email,
          department: identity.department,
          jobFunction: identity.jobFunction,
        },
      }).catch(() => {});
    }
  }

  async function handleFinish() {
    if (!sessionId || submitting) return;
    setSubmitting(true);
    try {
      await finalizeFn({
        data: {
          sessionId,
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

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mind map (top) */}
        <div className="relative flex-1 min-h-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            proOptions={{ hideAttribution: true }}
            nodesDraggable
            zoomOnScroll
          >
            <Background gap={24} size={1} />
            <Controls position="bottom-left" />
            <MiniMap pannable zoomable className="!bg-card !border-border" />
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
              {commentary.map((c) => (
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

        {/* Bottom dock: active question / chat */}
        <aside className="flex max-h-[44vh] min-h-[260px] flex-col overflow-y-auto border-t bg-card/30 px-6 py-5">
          <div className="mx-auto w-full max-w-3xl">
          <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            <MessageCircle className="h-3.5 w-3.5" /> Navigator
          </div>
          <AnimatePresence mode="wait">
            {currentQ ? (
              <motion.div
                key={currentQ.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {currentQ.category}
                </div>
                <h2 className="text-2xl font-semibold leading-tight">{currentQ.prompt}</h2>
                {currentQ.helper && (
                  <p className="text-sm text-muted-foreground">{currentQ.helper}</p>
                )}

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
                  <div className="grid gap-2">
                    {currentQ.options.map((o) => (
                      <button
                        key={o.value}
                        onClick={() => handleAnswer(currentQ.id, o.value)}
                        className="rounded-lg border bg-card px-4 py-3 text-left text-sm transition hover:border-primary hover:shadow-[var(--shadow-elegant)]"
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
                key="done"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <CheckCircle2 className="h-8 w-8 text-primary" />
                <h2 className="text-2xl font-semibold">Ready for your recommendation</h2>
                <p className="text-sm text-muted-foreground">
                  We've matched your answers against the approved catalog.
                </p>
                {top && (
                  <div className="rounded-xl border bg-card p-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Top match
                    </div>
                    <div className="mt-1 font-semibold">{top.tool.name}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{top.reasoning}</p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {top.matchedTags.slice(0, 4).map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px]">
                          {t.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
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

  nodes.push({
    id: "root",
    type: "map",
    position: { x: xCenter, y },
    data: { label: "AI Solution Navigator", sub: "Start", kind: "prompt" } satisfies NodeData,
  });

  let prevId = "root";

  // Identity node
  if (state.identity.email) {
    y += 130;
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
    y += 130;
    const qNodeId = `q-${q.id}`;
    nodes.push({
      id: qNodeId,
      type: "map",
      position: { x: xCenter - 140, y },
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
      position: { x: xCenter + 160, y },
      data: { label: labels.join(", "), sub: "Your answer", kind: "answer" },
    });
    edges.push({ id: `e-${qNodeId}-${aNodeId}`, source: qNodeId, target: aNodeId, animated: true });
    prevId = qNodeId;
  }

  // Active question (not yet answered)
  if (currentQid && currentQid !== "identity") {
    const q = QUESTION_BY_ID[currentQid];
    if (q && state.answers[q.id] === undefined) {
      y += 130;
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
      position: { x: xCenter + 360, y: 0 },
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