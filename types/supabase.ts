/**
 * Folio database types.
 * Generated to match supabase/migrations/0001_initial_schema.sql
 *
 * In production, regenerate with:
 *   npx supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > types/supabase.ts
 */

export type SubscriptionTier = "trial" | "student" | "general" | "pro" | "max";

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

export type PersonaId = "luke" | "marcus" | "sarah" | "david" | "jennifer";

export type InterviewType =
  | "behavioral"
  | "case"
  | "technical"
  | "product_sense"
  | "superday"
  | "hard_mode";

export type BillingCycle = "monthly" | "yearly";

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
