-- Extend session_analytics with full Tavus perception data

ALTER TABLE public.session_analytics
  ADD COLUMN IF NOT EXISTS user_appearance jsonb,
  ADD COLUMN IF NOT EXISTS user_behavior jsonb,
  ADD COLUMN IF NOT EXISTS gestures jsonb,
  ADD COLUMN IF NOT EXISTS screen_activities jsonb,
  ADD COLUMN IF NOT EXISTS network_diagnostics jsonb,
  ADD COLUMN IF NOT EXISTS perception_summary text,
  ADD COLUMN IF NOT EXISTS appearance_description text,
  ADD COLUMN IF NOT EXISTS behavior_description text,
  ADD COLUMN IF NOT EXISTS gesture_observations text[],
  ADD COLUMN IF NOT EXISTS emotional_summary text,
  ADD COLUMN IF NOT EXISTS notable_moments jsonb;
