
-- Sessions table - one per user request flow
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email TEXT,
  department TEXT,
  job_function TEXT,
  main_use_case TEXT,
  anticipated_benefits TEXT[],
  intent_text TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Each answer/event captured as the user traverses the mind map
CREATE TABLE public.session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  answer_value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX session_events_session_id_idx ON public.session_events(session_id);

-- Final ranked recommendations per session
CREATE TABLE public.recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL,
  score NUMERIC NOT NULL,
  rank INT NOT NULL,
  reasoning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX recommendations_session_id_idx ON public.recommendations(session_id);

-- Approved tool catalog
CREATE TABLE public.tools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  capabilities TEXT[] NOT NULL DEFAULT '{}',
  risk_rating TEXT NOT NULL DEFAULT 'medium',
  approved BOOLEAN NOT NULL DEFAULT true,
  licensing TEXT,
  integrations TEXT[] NOT NULL DEFAULT '{}',
  cost_estimate TEXT,
  personas TEXT[] NOT NULL DEFAULT '{}',
  use_cases TEXT[] NOT NULL DEFAULT '{}',
  compliance_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;

-- Tools: public read
CREATE POLICY "Anyone can view tools" ON public.tools FOR SELECT USING (true);

-- Sessions: anonymous-friendly MVP - allow anyone to insert/select/update sessions
-- (tightened in a future iteration when auth is enabled)
CREATE POLICY "Anyone can create sessions" ON public.sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view sessions" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can update sessions" ON public.sessions FOR UPDATE USING (true);

CREATE POLICY "Anyone can create session events" ON public.session_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view session events" ON public.session_events FOR SELECT USING (true);

CREATE POLICY "Anyone can create recommendations" ON public.recommendations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view recommendations" ON public.recommendations FOR SELECT USING (true);

-- Seed approved tool catalog (9 tools)
INSERT INTO public.tools (id, name, category, description, capabilities, risk_rating, licensing, integrations, cost_estimate, personas, use_cases, compliance_notes) VALUES
('m365-copilot', 'Microsoft 365 Copilot', 'Enterprise productivity',
 'AI assistant embedded in Word, Excel, PowerPoint, Outlook, Teams and SharePoint.',
 ARRAY['document_generation','summarization','meeting_intelligence','email_drafting','presentations','analytics','workflow_automation'],
 'low', 'Enterprise license required (per user/month)',
 ARRAY['microsoft_365','teams','sharepoint','outlook','onedrive','power_automate','power_bi'],
 '$30 / user / month',
 ARRAY['executive','manager','analyst','specialist','administrator'],
 ARRAY['summarize_meetings','draft_emails','generate_documents','analyze_spreadsheets','build_presentations','automate_workflows'],
 'Enterprise data boundary. Inherits M365 compliance (SOC2, ISO 27001, HIPAA, GDPR).'),

('claude-ai', 'Claude.ai', 'General reasoning',
 'Anthropic''s flagship assistant for long-context analysis, writing and reasoning.',
 ARRAY['document_generation','summarization','research','analytics','writing','long_context'],
 'medium', 'Team / Enterprise plans available',
 ARRAY['api','web'],
 '$25–60 / user / month (Team/Enterprise)',
 ARRAY['analyst','consultant','specialist','executive'],
 ARRAY['analyze_long_documents','draft_strategy','research','summarization','writing'],
 'Enterprise plan offers SSO, audit logs, no training on customer data.'),

('claude-code', 'Claude Code (desktop)', 'Developer tooling',
 'Agentic coding assistant that operates on local repositories from the terminal/desktop.',
 ARRAY['coding','refactoring','code_review','automation','testing'],
 'medium', 'Pro / Team subscription',
 ARRAY['github','local_filesystem','cli'],
 '$20–40 / user / month',
 ARRAY['engineer','developer','technical'],
 ARRAY['agentic_coding','refactor_repo','code_review','generate_tests'],
 'Runs locally; review which repos and secrets it can access.'),

('chatgpt', 'ChatGPT', 'General assistant',
 'OpenAI''s general-purpose assistant for writing, brainstorming and analysis.',
 ARRAY['document_generation','summarization','research','writing','image_generation','analytics'],
 'medium', 'Team / Enterprise plans available',
 ARRAY['api','web','microsoft_365_basic'],
 '$25–60 / user / month (Team/Enterprise)',
 ARRAY['beginner','intermediate','analyst','specialist','executive'],
 ARRAY['draft_content','brainstorm','summarize','research','generate_images'],
 'Enterprise plan offers SSO, audit logs, no training on customer data.'),

('github-copilot', 'GitHub Copilot', 'Developer tooling',
 'Inline AI pair programmer for IDEs (VS Code, JetBrains, Visual Studio).',
 ARRAY['coding','code_completion','code_review','testing'],
 'low', 'Business / Enterprise per seat',
 ARRAY['github','vscode','jetbrains','visual_studio'],
 '$19–39 / user / month',
 ARRAY['engineer','developer','technical'],
 ARRAY['inline_code_completion','generate_tests','code_review','explain_code'],
 'Business plan: no code retention, IP indemnity, SSO.'),

('claude-chatbot', 'Claude (chatbot)', 'Conversational assistant',
 'Conversational Claude experience for business users — Q&A, writing, summarization.',
 ARRAY['summarization','writing','research','customer_support','conversational'],
 'medium', 'Team / Enterprise',
 ARRAY['web','api'],
 '$25 / user / month (Team)',
 ARRAY['beginner','intermediate','specialist'],
 ARRAY['q_and_a','summarize','draft_responses','customer_support_drafts'],
 'Same governance as Claude.ai Enterprise.'),

('amazon-q', 'Amazon Q', 'AWS-aware assistant',
 'Assistant tuned for AWS environments and business data on AWS.',
 ARRAY['analytics','coding','automation','aws_operations','data_science'],
 'low', 'Per user / month (Business or Developer)',
 ARRAY['aws','quicksight','s3','redshift'],
 '$20–25 / user / month',
 ARRAY['engineer','analyst','administrator','developer'],
 ARRAY['query_aws_data','aws_operations','code_in_aws','data_analysis'],
 'Operates inside AWS account; respects IAM and data residency.'),

('gemini-enterprise', 'Gemini Enterprise', 'Enterprise productivity',
 'Google''s enterprise assistant integrated with Workspace and multimodal inputs.',
 ARRAY['document_generation','summarization','meeting_intelligence','image_generation','analytics','multimodal'],
 'low', 'Enterprise license per user',
 ARRAY['google_workspace','gmail','google_meet','google_drive'],
 '$30 / user / month',
 ARRAY['executive','manager','analyst','specialist'],
 ARRAY['summarize_meetings','draft_docs','analyze_sheets','image_generation'],
 'Enterprise data boundary; inherits Workspace compliance posture.'),

('perplexity', 'Perplexity', 'Research',
 'AI search with cited sources for fast, verifiable research.',
 ARRAY['research','summarization','citations','web_search'],
 'medium', 'Pro / Enterprise plans',
 ARRAY['web','api','slack'],
 '$20–40 / user / month',
 ARRAY['analyst','consultant','specialist','researcher'],
 ARRAY['cited_research','market_research','competitive_intel','quick_facts'],
 'Enterprise plan offers SSO, no training on prompts.');
