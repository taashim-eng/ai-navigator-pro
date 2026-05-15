
-- Lock down tables: all access goes through service-role server functions.
-- Service role bypasses RLS, so dropping anon policies removes public exposure
-- without breaking the app.

DROP POLICY IF EXISTS "Anyone can view sessions" ON public.sessions;
DROP POLICY IF EXISTS "Anyone can create sessions" ON public.sessions;
DROP POLICY IF EXISTS "Anyone can update sessions" ON public.sessions;

DROP POLICY IF EXISTS "Anyone can view session events" ON public.session_events;
DROP POLICY IF EXISTS "Anyone can create session events" ON public.session_events;

DROP POLICY IF EXISTS "Anyone can view recommendations" ON public.recommendations;
DROP POLICY IF EXISTS "Anyone can create recommendations" ON public.recommendations;

DROP POLICY IF EXISTS "Anyone can view snow tasks" ON public.snow_tasks;
DROP POLICY IF EXISTS "Anyone can create snow tasks" ON public.snow_tasks;
DROP POLICY IF EXISTS "Anyone can insert snow tasks" ON public.snow_tasks;
