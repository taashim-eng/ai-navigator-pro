
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS manager_email text,
  ADD COLUMN IF NOT EXISTS snow_user_sys_id text,
  ADD COLUMN IF NOT EXISTS snow_task_number text,
  ADD COLUMN IF NOT EXISTS snow_task_state text;

CREATE TABLE IF NOT EXISTS public.snow_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  task_number text NOT NULL,
  sys_id text NOT NULL,
  short_description text NOT NULL,
  description text,
  assignment_group text NOT NULL DEFAULT 'AI Governance',
  assigned_to_email text,
  state text NOT NULL DEFAULT 'Open',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.snow_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view snow tasks"
  ON public.snow_tasks FOR SELECT USING (true);

CREATE POLICY "Anyone can create snow tasks"
  ON public.snow_tasks FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_snow_tasks_session ON public.snow_tasks(session_id);
