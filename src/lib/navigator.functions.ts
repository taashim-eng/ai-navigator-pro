import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  createMockSnowTask,
  lookupSnowUserByEmail,
} from "@/lib/integrations/servicenow.mock";

type AuditEntry = {
  sessionId?: string | null;
  actorEmail?: string | null;
  actorIdentity?: string;
  entityType: string;
  entityId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
};

async function writeAudit(entry: AuditEntry) {
  try {
    await supabaseAdmin.from("audit_logs").insert({
      session_id: entry.sessionId ?? null,
      actor_email: entry.actorEmail ?? null,
      actor_identity: entry.actorIdentity ?? "anonymous",
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      action: entry.action,
      metadata: (entry.metadata ?? {}) as never,
    });
  } catch (err) {
    console.error("[audit_logs] write failed", err);
  }
}

/**
 * Authorize a session-scoped request by matching the caller-supplied
 * browser token against the value stored at startSession. Returns the
 * session row on success, throws on failure.
 *
 * This is the only thing standing between any visitor with a session
 * UUID and the PII / write access on that session, so failures must be
 * opaque (no UUID-vs-token distinction).
 */
async function authorizeSession(sessionId: string, browserToken: string) {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("id, browser_token, email, department, job_function, snow_user_sys_id, manager_email")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw new Error("Session lookup failed");
  if (!data || !data.browser_token || data.browser_token !== browserToken) {
    throw new Error("Unauthorized");
  }
  return data;
}

const tokenField = z.string().min(20).max(128);

const identitySchema = z.object({
  sessionId: z.string().uuid(),
  browserToken: tokenField,
  email: z.string().trim().email().max(255),
  department: z.string().trim().min(1).max(100),
  jobFunction: z.string().trim().min(1).max(100),
});

const eventSchema = z.object({
  sessionId: z.string().uuid(),
  browserToken: tokenField,
  nodeId: z.string().trim().min(1).max(120),
  questionId: z.string().trim().min(1).max(120),
  answerValue: z.unknown(),
});

const finalizeSchema = z.object({
  sessionId: z.string().uuid(),
  browserToken: tokenField,
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

const snowLookupSchema = z.object({
  email: z.string().trim().email().max(255),
});

export const startSession = createServerFn({ method: "POST" }).handler(async () => {
  // Opaque per-session secret. Caller must echo this on every follow-up
  // call. Stored only server-side; never put in the URL.
  const browserToken = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .insert({ browser_token: browserToken })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await writeAudit({
    sessionId: data.id as string,
    entityType: "session",
    entityId: data.id as string,
    action: "create",
  });
  return { sessionId: data.id as string, browserToken };
});

export const updateIdentity = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => identitySchema.parse(input))
  .handler(async ({ data }) => {
    await authorizeSession(data.sessionId, data.browserToken);
    const snow = lookupSnowUserByEmail(data.email);
    const { error } = await supabaseAdmin
      .from("sessions")
      .update({
        email: data.email,
        department: data.department,
        job_function: data.jobFunction,
        manager_email: snow?.managerEmail ?? null,
        snow_user_sys_id: snow?.sysId ?? null,
      })
      .eq("id", data.sessionId);
    if (error) throw new Error(error.message);
    await writeAudit({
      sessionId: data.sessionId,
      actorEmail: data.email,
      actorIdentity: snow ? "servicenow_sys_user" : "self_reported",
      entityType: "session",
      entityId: data.sessionId,
      action: "update_identity",
      metadata: {
        department: data.department,
        jobFunction: data.jobFunction,
        snowSysId: snow?.sysId ?? null,
      },
    });
    return { ok: true };
  });

/**
 * Mock ServiceNow `sys_user` lookup. Used by the Navigator to pre-fill
 * department / job function from the corporate directory once the user
 * enters their email — mirrors how the real call to
 * `/api/now/table/sys_user?sysparm_query=email=...` will behave.
 */
export const lookupSnowUser = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => snowLookupSchema.parse(input))
  .handler(async ({ data }) => {
    const user = lookupSnowUserByEmail(data.email);
    if (!user) return { user: null };
    return { user };
  });

export const recordEvent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => eventSchema.parse(input))
  .handler(async ({ data }) => {
    await authorizeSession(data.sessionId, data.browserToken);
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
    await authorizeSession(data.sessionId, data.browserToken);
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

    // Create a (mock) ServiceNow governance task for this AI request.
    const { data: session } = await supabaseAdmin
      .from("sessions")
      .select("email, department, job_function, snow_user_sys_id")
      .eq("id", data.sessionId)
      .maybeSingle();

    const topToolId = data.recommendations[0]?.toolId ?? "unknown";
    const requesterEmail = session?.email ?? "unknown@contoso.com";
    const requesterName =
      requesterEmail.split("@")[0]?.replace(/[._-]+/g, " ") ?? "AI Requester";

    const actorIdentity = session?.snow_user_sys_id
      ? "servicenow_sys_user"
      : "self_reported";

    await writeAudit({
      sessionId: data.sessionId,
      actorEmail: requesterEmail,
      actorIdentity,
      entityType: "session",
      entityId: data.sessionId,
      action: "finalize",
      metadata: {
        mainUseCase: data.mainUseCase,
        anticipatedBenefits: data.anticipatedBenefits,
      },
    });

    for (const r of data.recommendations) {
      await writeAudit({
        sessionId: data.sessionId,
        actorEmail: requesterEmail,
        actorIdentity,
        entityType: "recommendation",
        entityId: r.toolId,
        action: "create",
        metadata: { score: r.score, rank: r.rank },
      });
    }

    const task = createMockSnowTask({
      sessionId: data.sessionId,
      requesterEmail,
      requesterName,
      shortDescription: `AI tool request: ${topToolId} for ${data.mainUseCase}`,
      description:
        `Requester: ${requesterEmail}\n` +
        `Department: ${session?.department ?? "—"}\n` +
        `Job function: ${session?.job_function ?? "—"}\n` +
        `Main use case: ${data.mainUseCase}\n` +
        `Anticipated benefits: ${data.anticipatedBenefits.join(", ") || "—"}\n` +
        `Top recommendation: ${topToolId}\n` +
        `Session: ${data.sessionId}`,
      payload: {
        recommendations: data.recommendations,
        anticipatedBenefits: data.anticipatedBenefits,
        mainUseCase: data.mainUseCase,
      },
    });

    await supabaseAdmin.from("snow_tasks").insert({
      session_id: data.sessionId,
      task_number: task.taskNumber,
      sys_id: task.sysId,
      short_description: `AI tool request: ${topToolId} for ${data.mainUseCase}`,
      description: `Generated by AI Solution Navigator for ${requesterEmail}`,
      assignment_group: task.assignmentGroup,
      assigned_to_email: requesterEmail,
      state: task.state,
      payload: {
        recommendations: data.recommendations,
        anticipatedBenefits: data.anticipatedBenefits,
        mainUseCase: data.mainUseCase,
      },
    });

    await writeAudit({
      sessionId: data.sessionId,
      actorEmail: requesterEmail,
      actorIdentity,
      entityType: "snow_task",
      entityId: task.taskNumber,
      action: "create",
      metadata: {
        sysId: task.sysId,
        state: task.state,
        assignmentGroup: task.assignmentGroup,
        topToolId,
      },
    });

    await supabaseAdmin
      .from("sessions")
      .update({
        snow_task_number: task.taskNumber,
        snow_task_state: task.state,
      })
      .eq("id", data.sessionId);

    return { ok: true, snowTaskNumber: task.taskNumber };
  });

export const getResults = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({ sessionId: z.string().uuid(), browserToken: tokenField })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await authorizeSession(data.sessionId, data.browserToken);
    const [{ data: session }, { data: recs }, { data: tasks }] = await Promise.all([
      supabaseAdmin.from("sessions").select("*").eq("id", data.sessionId).maybeSingle(),
      supabaseAdmin
        .from("recommendations")
        .select("*")
        .eq("session_id", data.sessionId)
        .order("rank", { ascending: true }),
      supabaseAdmin
        .from("snow_tasks")
        .select("*")
        .eq("session_id", data.sessionId)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);
    // Never leak the per-session token back to the client.
    if (session && "browser_token" in session) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (session as any).browser_token;
    }
    return {
      session,
      recommendations: recs ?? [],
      snowTask: tasks?.[0] ?? null,
    };
  });