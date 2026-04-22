/**
 * Session tier gates.
 *
 * Single source of truth for "can this user start this session?" checks.
 * The orchestrator, `/session/new` submission handler, and Tavus conversation
 * route all call these.
 *
 * All checks are pure functions over tier + request + context. No DB access —
 * callers pre-fetch and pass in.
 *
 * Phase H (pricing rework): retention-based quota replaced with cycle session
 * quota. Users get N full sessions per cycle; once exhausted they either
 * purchase an overage, wait for cycle renewal, or upgrade.
 */

import type { PersonaId, InterviewType, SubscriptionTier } from "@/types/supabase";
import { TIERS, tierHasFeature } from "@/lib/tiers";
import { isValidCombo } from "@/lib/personas";
import type { InterviewMode } from "@/lib/personas/types";

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export interface SessionStartRequest {
  personaId: PersonaId;
  interviewType: InterviewType;
  mode: InterviewMode;
  targetFirm?: string;
  targetRole?: string;
  isPanel?: boolean;
  /** Pre-authorized overage charge — user has agreed to the overage cost. */
  overageAccepted?: boolean;
}

export interface SessionStartContext {
  /** Included sessions used so far in the current cycle. */
  sessionsUsedThisCycle: number;
  /** Overages already used this cycle (for display + billing context). */
  overagesUsedThisCycle: number;
  /** Has the user verified they are a student (if on the Cycle tier)? */
  studentVerified?: boolean;
  /** Is the user currently within their active cycle? */
  cycleActive: boolean;
}

export type SessionGateReason =
  | "invalid_combo"
  | "tier_feature_gated"
  | "session_quota_exceeded"
  | "cycle_inactive"
  | "student_not_verified";

export interface SessionGateResult {
  allowed: boolean;
  reason?: SessionGateReason;
  /** Human-readable message — safe to surface to the user. */
  message?: string;
  /** If denied by tier, the minimum tier that would allow it. */
  minimumTier?: SubscriptionTier;
  /** If quota exceeded, whether overage purchase would unlock this session. */
  overageAvailable?: boolean;
  /** If overage available, the price in USD. */
  overagePrice?: number;
}

// --------------------------------------------------------------------------
// Primary gate
// --------------------------------------------------------------------------

export function checkSessionStart(
  tier: SubscriptionTier,
  req: SessionStartRequest,
  ctx: SessionStartContext,
): SessionGateResult {
  // DEV BYPASS: skip all gates when FOLIO_DEV_BYPASS_GATES is set
  if (process.env.FOLIO_DEV_BYPASS_GATES === "true" || process.env.NEXT_PUBLIC_APP_ENV === "development") {
    return { allowed: true };
  }

  // 1. Cycle must be active
  if (!ctx.cycleActive) {
    return {
      allowed: false,
      reason: "cycle_inactive",
      message: "Your plan has expired. Renew to start a new session.",
    };
  }

  // 2. Combo validity — persona + type must make sense
  if (!isValidCombo(req.personaId, req.interviewType)) {
    return {
      allowed: false,
      reason: "invalid_combo",
      message: "That interviewer doesn't run that kind of session. Pick another format.",
    };
  }

  // 3. Student verification required for Cycle tier
  if (tier === "basic" && TIERS.basic.requiresStudentVerification && !ctx.studentVerified) {
    return {
      allowed: false,
      reason: "student_not_verified",
      message: "Verify your student status to activate your Cycle plan.",
    };
  }

  // 4. Feature gates — mode, interview type, panel
  const modeGate = checkModeGate(tier, req);
  if (!modeGate.allowed) return modeGate;

  const interviewTypeGate = checkInterviewTypeGate(tier, req);
  if (!interviewTypeGate.allowed) return interviewTypeGate;

  const panelGate = checkPanelGate(tier, req);
  if (!panelGate.allowed) return panelGate;

  // 5. Session quota — user has enough sessions left (or accepted overage)
  const quotaGate = checkSessionQuota(tier, req, ctx);
  if (!quotaGate.allowed) return quotaGate;

  return { allowed: true };
}

// --------------------------------------------------------------------------
// Sub-gates
// --------------------------------------------------------------------------

function checkModeGate(tier: SubscriptionTier, req: SessionStartRequest): SessionGateResult {
  if (req.mode === "hard" && !tierHasFeature(tier, "hardMode")) {
    return {
      allowed: false,
      reason: "tier_feature_gated",
      message: "Hard Mode is part of the Max plan.",
      minimumTier: "max",
    };
  }
  return { allowed: true };
}

function checkInterviewTypeGate(
  tier: SubscriptionTier,
  req: SessionStartRequest,
): SessionGateResult {
  if (req.interviewType === "superday" && !tierHasFeature(tier, "superdayMode")) {
    return {
      allowed: false,
      reason: "tier_feature_gated",
      message: "Superday mode is part of the Max plan.",
      minimumTier: "max",
    };
  }
  if (req.interviewType === "hard_mode" && !tierHasFeature(tier, "hardMode")) {
    return {
      allowed: false,
      reason: "tier_feature_gated",
      message: "Hard Mode sessions are part of the Max plan.",
      minimumTier: "max",
    };
  }
  return { allowed: true };
}

function checkPanelGate(tier: SubscriptionTier, req: SessionStartRequest): SessionGateResult {
  if (req.isPanel && !tierHasFeature(tier, "panelSimulation")) {
    return {
      allowed: false,
      reason: "tier_feature_gated",
      message: "Panel interviews are part of the Max plan.",
      minimumTier: "max",
    };
  }
  return { allowed: true };
}

function checkSessionQuota(
  tier: SubscriptionTier,
  req: SessionStartRequest,
  ctx: SessionStartContext,
): SessionGateResult {
  const tierConfig = TIERS[tier];
  const included = tierConfig.allotments.interviewSessions;
  const used = ctx.sessionsUsedThisCycle;

  // Within quota — free to start
  if (used < included) return { allowed: true };

  // Over quota but user accepted overage — allow
  if (req.overageAccepted) return { allowed: true };

  // Over quota, no overage yet — surface the option
  return {
    allowed: false,
    reason: "session_quota_exceeded",
    message: `You've used all ${included} sessions in your current cycle. Start an overage session for $${tierConfig.overage.sessionPriceUsd}, or upgrade for more included sessions.`,
    overageAvailable: true,
    overagePrice: tierConfig.overage.sessionPriceUsd,
    minimumTier: nextTierAbove(tier),
  };
}

function nextTierAbove(tier: SubscriptionTier): SubscriptionTier | undefined {
  const order: SubscriptionTier[] = ["basic", "pro", "max"];
  const idx = order.indexOf(tier);
  if (idx === -1 || idx === order.length - 1) return undefined;
  return order[idx + 1];
}

// --------------------------------------------------------------------------
// Feature checks for runtime orchestrator composition
// --------------------------------------------------------------------------

export interface RuntimeFeatureFlags {
  firmCalibration: boolean;
  sessionMemory: boolean;
  questionIntelligenceEngine: boolean;
  nonVerbalFeedback: boolean;
  voiceAcousticAnalysis: boolean;
  panelSimulation: boolean;
  priorityFeedback: boolean;
}

export function resolveRuntimeFeatures(tier: SubscriptionTier): RuntimeFeatureFlags {
  return {
    firmCalibration: tierHasFeature(tier, "firmCalibration"),
    sessionMemory: tierHasFeature(tier, "sessionMemory"),
    questionIntelligenceEngine: tierHasFeature(tier, "questionIntelligenceEngine"),
    nonVerbalFeedback: tierHasFeature(tier, "nonVerbalFeedback"),
    // Voice acoustic analysis isn't in the new feature matrix — removed this phase
    voiceAcousticAnalysis: false,
    panelSimulation: tierHasFeature(tier, "panelSimulation"),
    priorityFeedback: tierHasFeature(tier, "priorityFeedback"),
  };
}
