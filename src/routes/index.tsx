import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Network, ShieldCheck, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Solution Navigator — find the right enterprise AI tool" },
      {
        name: "description",
        content:
          "An intelligent mind-map assistant that recommends the right approved AI tool for your work.",
      },
      { property: "og:title", content: "AI Solution Navigator" },
      {
        property: "og:description",
        content:
          "Describe what you want AI to help you do. We'll guide you to the right approved tool.",
      },
    ],
  }),
  component: Landing,
});

function NodeBackdrop() {
  // Decorative animated node graph
  const nodes = [
    { x: 12, y: 18, d: 0 },
    { x: 78, y: 22, d: 0.3 },
    { x: 30, y: 70, d: 0.6 },
    { x: 70, y: 78, d: 0.9 },
    { x: 50, y: 40, d: 0.2 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-60"
        style={{ background: "var(--gradient-surface)" }}
      />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.7 0.2 258)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="oklch(0.78 0.22 250)" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        {nodes.flatMap((a, i) =>
          nodes.slice(i + 1).map((b, j) => (
            <line
              key={`${i}-${j}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="url(#edge)"
              strokeWidth="0.15"
            />
          )),
        )}
      </svg>
      {nodes.map((n, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: n.d, duration: 0.8 }}
          className="absolute h-3 w-3 rounded-full"
          style={{
            left: `${n.x}%`,
            top: `${n.y}%`,
            background: "var(--gradient-primary)",
            boxShadow: "var(--shadow-glow)",
          }}
        />
      ))}
    </div>
  );
}

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <NodeBackdrop />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div
            className="grid h-8 w-8 place-items-center rounded-lg text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-semibold tracking-tight">AI Solution Navigator</span>
        </div>
        <Link to="/catalog" className="text-sm text-muted-foreground hover:text-foreground">
          Approved tools
        </Link>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-6 pt-16 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur"
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
          Enterprise AI intake · governance-ready
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="text-balance text-5xl font-semibold tracking-tight md:text-6xl"
        >
          Describe what you want AI{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "var(--gradient-primary)" }}
          >
            to help you do.
          </span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground"
        >
          A guided mind-map assistant that turns your goal into the right approved enterprise
          AI tool — with reasoning, risk and licensing all explained.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          <Button asChild size="lg" className="h-12 px-6 text-base shadow-[var(--shadow-elegant)]">
            <Link to="/navigator">
              Start AI Request <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
            <Link to="/catalog">Explore approved AI tools</Link>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mx-auto mt-20 grid max-w-3xl grid-cols-1 gap-4 text-left md:grid-cols-3"
        >
          {[
            { Icon: Network, title: "Conversational mind map", body: "Branching nodes adapt to your answers in real time." },
            { Icon: ShieldCheck, title: "Governance built-in", body: "Risk, compliance and licensing captured invisibly." },
            { Icon: BarChart3, title: "Leadership insights", body: "Every request feeds enterprise-wide analytics." },
          ].map(({ Icon, title, body }) => (
            <div
              key={title}
              className="rounded-xl border bg-card/60 p-4 backdrop-blur"
            >
              <Icon className="mb-2 h-5 w-5 text-primary" />
              <div className="font-medium">{title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{body}</div>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
