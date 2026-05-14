import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const identitySchema = z.object({
  sessionId: z.string().uuid(),
  email: z.string().trim().email().max(255),
  department: z.string().trim().min(1).max(100),
  jobFunction: z.string().trim().min(1).max(100),
});

const eventSchema = z.object({
  sessionId: z.string().uuid(),
  nodeId: z.string().trim().min(1).max(120),
  questionId: z.string().trim().min(1).max(120),
  answerValue: z.unknown(),
});

const finalizeSchema = z.object({
  sessionId: z.string().uuid(),
  mainUseCase: z.string().trim().min(1).max(120),
  anticipatedBenefits: z.array(z.string().trim().min(1).max(60)).max(15),
  intentText: z.string().trim().max(2000).optional(),
  recommendations: z
    .array(
      z.object({
        toolId: z.string().min(1).max(60),
        score: z.number(),
        rank: z.number().int(),
        reasoning: z.string().max(2000),
      }),
    )
    .max(20),
});

export const startSession = createServerFn({ method: "POST" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .insert({})
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { sessionId: data.id as string };
});

export const updateIdentity = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => identitySchema.parse(input))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("sessions")
      .update({
        email: data.email,
        department: data.department,
        job_function: data.jobFunction,
      })
      .eq("id", data.sessionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const recordEvent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => eventSchema.parse(input))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("session_events").insert({
      session_id: data.sessionId,
      node_id: data.nodeId,
      question_id: data.questionId,
      answer_value: data.answerValue as never,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const finalizeSession = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => finalizeSchema.parse(input))
  .handler(async ({ data }) => {
    const { error: sErr } = await supabaseAdmin
      .from("sessions")
      .update({
        main_use_case: data.mainUseCase,
        anticipated_benefits: data.anticipatedBenefits,
        intent_text: data.intentText ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", data.sessionId);
    if (sErr) throw new Error(sErr.message);

    if (data.recommendations.length) {
      const { error: rErr } = await supabaseAdmin.from("recommendations").insert(
        data.recommendations.map((r) => ({
          session_id: data.sessionId,
          tool_id: r.toolId,
          score: r.score,
          rank: r.rank,
          reasoning: r.reasoning,
        })),
      );
      if (rErr) throw new Error(rErr.message);
    }
    return { ok: true };
  });

export const getResults = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ sessionId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const [{ data: session }, { data: recs }] = await Promise.all([
      supabaseAdmin.from("sessions").select("*").eq("id", data.sessionId).maybeSingle(),
      supabaseAdmin
        .from("recommendations")
        .select("*")
        .eq("session_id", data.sessionId)
        .order("rank", { ascending: true }),
    ]);
    return { session, recommendations: recs ?? [] };
  });