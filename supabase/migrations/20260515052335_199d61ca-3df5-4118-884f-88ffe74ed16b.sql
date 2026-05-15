-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snow_tasks ENABLE ROW LEVEL SECURITY;

-- Drop any prior policies to start from a clean deny-by-default baseline
DROP POLICY IF EXISTS "Deny all access to sessions" ON public.sessions;
DROP POLICY IF EXISTS "Deny all access to session_events" ON public.session_events;
DROP POLICY IF EXISTS "Deny all access to recommendations" ON public.recommendations;
DROP POLICY IF EXISTS "Deny all access to snow_tasks" ON public.snow_tasks;

-- Explicit deny-all policies for anon + authenticated roles.
-- Service-role (used by server functions via supabaseAdmin) bypasses RLS.
CREATE POLICY "Deny all access to sessions"
  ON public.sessions
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny all access to session_events"
  ON public.session_events
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny all access to recommendations"
  ON public.recommendations
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny all access to snow_tasks"
  ON public.snow_tasks
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
