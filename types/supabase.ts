/**
 * Folio database types.
 * Generated to match supabase/migrations/0001_initial_schema.sql through 0009.
 *
 * In production, regenerate with:
 *   npx supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > types/supabase.ts
 */

export type SubscriptionTier = "free" | "basic" | "pro" | "max";

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

export type PersonaId = "priya" | "marcus" | "sarah";

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

export type UserProfile = Profile;

export interface Profile {
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
  tavus_conversation_id: string | null;
  tavus_conversation_url: string | null;
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

export interface UserTier {
  user_id: string;
  email: string;
  effective_tier: SubscriptionTier;
  status: SubscriptionStatus;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  is_verified_student: boolean;
  cycle_start: string | null;
  cycle_end: string | null;
  sessions_used_this_cycle: number;
  overages_used_this_cycle: number;
  sessions_remaining_this_cycle: number;
  included_sessions: number;
  auto_renew: boolean;
}

// ==========================================================================
// Phase I.1 — Session memory (migration 0008)
// ==========================================================================

export interface UserSessionMemory {
  id: string;
  user_id: string;
  persona: PersonaId;
  source_session_id: string | null;
  memory_text: string;
  category: string;
  confidence: number; // 1-5
  surfaced_count: number;
  dismissed: boolean;
  dismissed_at: string | null;
  created_at: string;
}

// ==========================================================================
// Phase I.2 — Q&A feedback (migration 0009)
// ==========================================================================

export type QaBoundaryMethod = "transition_detected" | "fallback_timestamp" | "absent";

export interface SessionQaBoundary {
  session_id: string;
  start_turn_index: number | null;
  start_seconds: number | null;
  method: QaBoundaryMethod;
  candidate_questions_count: number;
  created_at: string;
}

export interface QaQuestionBreakdown {
  question: string;
  signal: string;
  stronger_version: string;
  reasoning: string;
}

export interface SessionQaFeedback {
  id: string;
  session_id: string;
  overall_score: number;
  preparation_score: number;
  specificity_score: number;
  engagement_score: number;
  composure_score: number;
  summary: string;
  question_breakdown: QaQuestionBreakdown[];
  improvements: string[];
  questions_asked_count: number;
  created_at: string;
}

// ==========================================================================
// Phase Analytics — Session analytics (migration 0010)
// ==========================================================================

export interface EmotionalState {
  emotion: string;
  intensity: number;
  timestamp_seconds?: number;
}

export interface ToneShift {
  from: string;
  to: string;
  at_seconds: number;
}

export interface KeyDiscussionPoint {
  topic: string;
  sentiment: string;
  details?: string;
}

export interface SessionAnalytics {
  id: string;
  session_id: string;
  emotional_states: EmotionalState[] | null;
  tone_shifts: ToneShift[] | null;
  key_discussion_points: KeyDiscussionPoint[] | null;
  overall_sentiment: string | null;
  confidence_level: number | null;
  engagement_score: number | null;
  recording_url: string | null;
  recording_s3_key: string | null;
  raw_perception_payload: unknown;
  created_at: string;
  updated_at: string;
}

// ==========================================================================
// Supabase generated-style Database type — used by @supabase/ssr
// ==========================================================================

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; email: string };
        Update: Partial<Profile>;
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
      user_session_memory: {
        Row: UserSessionMemory;
        Insert: Partial<UserSessionMemory> & {
          user_id: string;
          persona: PersonaId;
          memory_text: string;
          category: string;
        };
        Update: Partial<UserSessionMemory>;
        Relationships: [];
      };
      session_qa_boundary: {
        Row: SessionQaBoundary;
        Insert: Partial<SessionQaBoundary> & {
          session_id: string;
          method: QaBoundaryMethod;
        };
        Update: Partial<SessionQaBoundary>;
        Relationships: [];
      };
      session_qa_feedback: {
        Row: SessionQaFeedback;
        Insert: Partial<SessionQaFeedback> & {
          session_id: string;
          overall_score: number;
          preparation_score: number;
          specificity_score: number;
          engagement_score: number;
          composure_score: number;
          summary: string;
        };
        Update: Partial<SessionQaFeedback>;
        Relationships: [];
      };
      session_analytics: {
        Row: SessionAnalytics;
        Insert: Partial<SessionAnalytics> & { session_id: string };
        Update: Partial<SessionAnalytics>;
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
    };
    Views: {
      user_tiers: {
        Row: UserTier;
        Relationships: [];
      };
    };
    Functions: {
      increment_subscription_counter: {
        Args: { p_user_id: string; p_field: string };
        Returns: void;
      };
      bump_memory_surfaced_count: {
        Args: { p_memory_ids: string[] };
        Returns: void;
      };
    };
    Enums: {
      subscription_tier: SubscriptionTier;
      subscription_status: SubscriptionStatus;
      verification_status: VerificationStatus;
      session_status: SessionStatus;
      persona_id: PersonaId;
      interview_type: InterviewType;
      qa_boundary_method: QaBoundaryMethod;
    };
    CompositeTypes: Record<string, never>;
  };
};
