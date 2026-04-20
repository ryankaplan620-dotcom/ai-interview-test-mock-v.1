/**
 * Folio database types.
 * Generated to match supabase/migrations/0001_initial_schema.sql
 *
 * In production, regenerate with:
 *   npx supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > types/supabase.ts
 */

export type SubscriptionTier = "cycle" | "pro" | "max";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

export type VerificationStatus = "pending" | "verified" | "rejected" | "expired";

export type SessionStatus = "scheduled" | "in_progress" | "completed" | "abandoned" | "failed";

export type PersonaId = "priya" | "marcus" | "sarah" | "david" | "jennifer";

export type InterviewType =
  | "behavioral"
  | "case"
  | "technical"
  | "product_sense"
  | "superday"
  | "hard_mode";

export type BillingCycle = "monthly" | "yearly";

// ==========================================================================
// Engine 2 — Practice drills (migration 0005)
// ==========================================================================

export type DrillType = "story_polishing" | "pitch_60s" | "pause_drill" | "pushback_drill";

export type DrillStatus = "in_progress" | "completed" | "abandoned";

export interface Drill {
  id: string;
  user_id: string;
  drill_type: DrillType;
  prompt_id: string;
  prompt_text: string;
  config: Record<string, unknown>;
  status: DrillStatus;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface DrillAttempt {
  id: string;
  drill_id: string;
  attempt_number: number;
  transcript: string;
  duration_seconds: number;
  overall_score: number | null;
  sub_scores: Record<string, number>;
  summary: string | null;
  strengths: string[] | null;
  improvements: string[] | null;
  filler_words: Record<string, number> | null;
  filler_count: number | null;
  words_per_minute: number | null;
  created_at: string;
}

/** @deprecated Use UserProfile instead */
export type Profile = UserProfile;

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  target_firms: string[];
  target_role: string | null;
  target_year: number | null;
  preferred_interview_type: InterviewType | null;
  timezone: string;
  created_at: string;
  updated_at: string;
  last_session_at: string | null;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_start: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  // Phase H: cycle pricing fields
  cycle_start: string | null;
  cycle_end: string | null;
  sessions_used_this_cycle: number;
  overages_used_this_cycle: number;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentVerification {
  id: string;
  user_id: string;
  method: "sheerid" | "edu_email";
  sheerid_verification_id: string | null;
  sheerid_program_id: string | null;
  edu_email: string | null;
  edu_email_verified_at: string | null;
  status: VerificationStatus;
  verified_at: string | null;
  expires_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type SessionMode = "easy" | "standard" | "hard";

export interface Session {
  id: string;
  user_id: string;
  persona: PersonaId;
  interview_type: InterviewType;
  mode: SessionMode;
  is_panel: boolean;
  target_firm: string | null;
  target_role: string | null;
  duration_seconds: number;
  status: SessionStatus;
  started_at: string | null;
  ended_at: string | null;
  actual_duration_seconds: number | null;
  recording_url: string | null;
  recording_size_bytes: number | null;
  transcript_url: string | null;
  pause_avg_seconds: number | null;
  words_per_minute: number | null;
  eye_contact_pct: number | null;
  filler_words_count: number | null;
  // Phase G.1: Tavus CVI integration
  tavus_conversation_id: string | null;
  tavus_conversation_url: string | null;
  // Phase H: cycle pricing — true when session is billed as overage
  is_overage: boolean;
  created_at: string;
  updated_at: string;
}

export interface SessionFeedback {
  id: string;
  session_id: string;
  overall_score: number | null;
  structure_score: number | null;
  specificity_score: number | null;
  delivery_score: number | null;
  summary: string | null;
  strengths: string[] | null;
  improvements: string[] | null;
  feedback_quotes: FeedbackQuote[] | null;
  created_at: string;
}

export interface FeedbackQuote {
  user_quote: string;
  stronger_version: string;
  reasoning: string;
  timestamp_seconds?: number;
}

export interface TranscriptTurn {
  id: string;
  session_id: string;
  speaker: "user" | "interviewer";
  text: string;
  started_at_seconds: number;
  ended_at_seconds: number | null;
  created_at: string;
}

export interface CoachReview {
  id: string;
  user_id: string;
  session_id: string | null;
  stripe_payment_intent_id: string;
  amount_cents: number;
  paid_at: string;
  status: "pending" | "assigned" | "in_progress" | "completed" | "refunded";
  coach_name: string | null;
  coach_email: string | null;
  assigned_at: string | null;
  completed_at: string | null;
  review_text: string | null;
  review_video_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface OveragePurchase {
  id: string;
  user_id: string;
  session_id: string | null;
  stripe_payment_intent_id: string;
  stripe_charge_id: string | null;
  amount: number;
  status: "pending" | "succeeded" | "failed" | "refunded";
  succeeded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionMessage {
  id: string;
  session_id: string;
  speaker: "user" | "interviewer" | "system";
  content: string;
  timestamp_seconds: number | null;
  created_at: string;
}

export interface SessionScorecard {
  id: string;
  session_id: string;
  dimension: string;
  score: number | null;
  notes: string | null;
  created_at: string;
}

export interface SkillHistory {
  id: string;
  user_id: string;
  skill: string;
  score: number | null;
  session_id: string | null;
  recorded_at: string;
  created_at: string;
}

export interface CompanyQuestion {
  id: string;
  company_slug: string;
  question_text: string;
  interview_type: InterviewType | null;
  role_level: string | null;
  source: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface OutreachContact {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  company: string | null;
  role: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutreachDraft {
  id: string;
  user_id: string;
  contact_id: string | null;
  subject: string | null;
  body: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface OutreachSequence {
  id: string;
  user_id: string;
  name: string;
  steps: Record<string, unknown>[];
  created_at: string;
  updated_at: string;
}

export interface UserStreak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyActivity {
  id: string;
  user_id: string;
  activity_date: string;
  sessions_completed: number;
  drills_completed: number;
  created_at: string;
}

export interface UserTier {
  user_id: string;
  email: string;
  effective_tier: SubscriptionTier;
  status: SubscriptionStatus;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  is_verified_student: boolean;
  // Cycle pricing fields (migration 0007)
  cycle_start: string | null;
  cycle_end: string | null;
  sessions_used_this_cycle: number;
  overages_used_this_cycle: number;
  sessions_remaining_this_cycle: number;
  included_sessions: number;
  auto_renew: boolean;
}

// ==========================================================================
// Supabase generated-style Database type — used by @supabase/ssr
// ==========================================================================

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfile;
        Insert: Partial<UserProfile> & { id: string; email: string };
        Update: Partial<UserProfile>;
        Relationships: [];
      };
      subscriptions: {
        Row: Subscription;
        Insert: Partial<Subscription> & { user_id: string; stripe_customer_id: string };
        Update: Partial<Subscription>;
        Relationships: [];
      };
      student_verifications: {
        Row: StudentVerification;
        Insert: Partial<StudentVerification> & { user_id: string; method: "sheerid" | "edu_email" };
        Update: Partial<StudentVerification>;
        Relationships: [];
      };
      sessions: {
        Row: Session;
        Insert: Partial<Session> & { user_id: string; persona: PersonaId };
        Update: Partial<Session>;
        Relationships: [];
      };
      session_feedback: {
        Row: SessionFeedback;
        Insert: Partial<SessionFeedback> & { session_id: string };
        Update: Partial<SessionFeedback>;
        Relationships: [];
      };
      transcript_turns: {
        Row: TranscriptTurn;
        Insert: Partial<TranscriptTurn> & {
          session_id: string;
          speaker: "user" | "interviewer";
          text: string;
          started_at_seconds: number;
        };
        Update: Partial<TranscriptTurn>;
        Relationships: [];
      };
      coach_reviews: {
        Row: CoachReview;
        Insert: Partial<CoachReview> & {
          user_id: string;
          stripe_payment_intent_id: string;
          amount_cents: number;
          paid_at: string;
        };
        Update: Partial<CoachReview>;
        Relationships: [];
      };
      waitlist: {
        Row: {
          id: string;
          email: string;
          referral_source: string | null;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          notes: string | null;
          invited_at: string | null;
          converted_user_id: string | null;
          created_at: string;
        };
        Insert: {
          email: string;
          referral_source?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          notes?: string | null;
        };
        Update: Partial<{
          email: string;
          referral_source: string | null;
          notes: string | null;
          invited_at: string | null;
          converted_user_id: string | null;
        }>;
        Relationships: [];
      };
      overage_purchases: {
        Row: OveragePurchase;
        Insert: Partial<OveragePurchase> & { user_id: string; stripe_payment_intent_id: string; amount: number };
        Update: Partial<OveragePurchase>;
        Relationships: [];
      };
      drills: {
        Row: Drill;
        Insert: Partial<Drill> & { user_id: string; drill_type: DrillType; prompt_id: string; prompt_text: string };
        Update: Partial<Drill>;
        Relationships: [];
      };
      drill_attempts: {
        Row: DrillAttempt;
        Insert: Partial<DrillAttempt> & { drill_id: string; attempt_number: number; transcript: string; duration_seconds: number };
        Update: Partial<DrillAttempt>;
        Relationships: [];
      };
      session_messages: {
        Row: SessionMessage;
        Insert: Partial<SessionMessage> & { session_id: string; speaker: "user" | "interviewer" | "system"; content: string };
        Update: Partial<SessionMessage>;
        Relationships: [];
      };
      session_scorecards: {
        Row: SessionScorecard;
        Insert: Partial<SessionScorecard> & { session_id: string; dimension: string };
        Update: Partial<SessionScorecard>;
        Relationships: [];
      };
      skill_history: {
        Row: SkillHistory;
        Insert: Partial<SkillHistory> & { user_id: string; skill: string };
        Update: Partial<SkillHistory>;
        Relationships: [];
      };
      company_questions: {
        Row: CompanyQuestion;
        Insert: Partial<CompanyQuestion> & { company_slug: string; question_text: string };
        Update: Partial<CompanyQuestion>;
        Relationships: [];
      };
      outreach_contacts: {
        Row: OutreachContact;
        Insert: Partial<OutreachContact> & { user_id: string; name: string };
        Update: Partial<OutreachContact>;
        Relationships: [];
      };
      outreach_drafts: {
        Row: OutreachDraft;
        Insert: Partial<OutreachDraft> & { user_id: string };
        Update: Partial<OutreachDraft>;
        Relationships: [];
      };
      outreach_sequences: {
        Row: OutreachSequence;
        Insert: Partial<OutreachSequence> & { user_id: string; name: string };
        Update: Partial<OutreachSequence>;
        Relationships: [];
      };
      user_streaks: {
        Row: UserStreak;
        Insert: Partial<UserStreak> & { user_id: string };
        Update: Partial<UserStreak>;
        Relationships: [];
      };
      daily_activity: {
        Row: DailyActivity;
        Insert: Partial<DailyActivity> & { user_id: string; activity_date: string };
        Update: Partial<DailyActivity>;
        Relationships: [];
      };
    };
    Views: {
      user_tiers: {
        Row: UserTier;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      subscription_tier: SubscriptionTier;
      subscription_status: SubscriptionStatus;
      verification_status: VerificationStatus;
      session_status: SessionStatus;
      persona_id: PersonaId;
      interview_type: InterviewType;
    };
    CompositeTypes: Record<string, never>;
  };
};
