CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_id UUID,
  actor_email TEXT,
  actor_identity TEXT NOT NULL DEFAULT 'anonymous',
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_audit_logs_session ON public.audit_logs(session_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, action);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- No public client policies: audit logs are written/read only by trusted server code (service role bypasses RLS).
