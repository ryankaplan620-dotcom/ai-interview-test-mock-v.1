/**
 * Session tier gates.
 *
 * Single source of truth for "can this user start this session?" checks.
 * The orchestrator and the /session/new submission handler both call these.
 *
 * All checks are pure functions over tier + request. No DB access in here —
 * callers pre-fetch anything they need (e.g. active session count) and pass it in.
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
}

export interface SessionStartContext {
  /** Currently-retained session count for this user (excluding the one they're about to start). */
  activeSessionCount: number;
  /** Has the user verified they are a student (if on the Student tier)? */
  studentVerified?: boolean;
}

export type SessionGateReason =
  | "invalid_combo"
  | "tier_feature_gated"
  | "retention_quota_exceeded"
  | "student_not_verified";

export interface SessionGateResult {
  allowed: boolean;
  reason?: SessionGateReason;
  /** Human-readable message — safe to surface to the user. */
  message?: string;
  /** If denied by tier, the minimum tier that would allow it. */
  minimumTier?: SubscriptionTier;
}

// --------------------------------------------------------------------------
// Primary gate
// --------------------------------------------------------------------------

export function checkSessionStart(
  tier: SubscriptionTier,
  req: SessionStartRequest,
  ctx: SessionStartContext,
): SessionGateResult {
  // 1. Combo validity — persona + type must make sense
  if (!isValidCombo(req.personaId, req.interviewType)) {
    return {
      allowed: false,
      reason: "invalid_combo",
      message: "That interviewer doesn't run that kind of session. Pick another format.",
    };
  }

  // 2. Student verification required
  if (tier === "student" && TIERS.student.requiresVerification && !ctx.studentVerified) {
    return {
      allowed: false,
      reason: "student_not_verified",
      message: "Verify your student status to activate the student plan.",
    };
  }

  // 3. Feature gates — mode and special interview types
  const modeGate = checkModeGate(tier, req);
  if (!modeGate.allowed) return modeGate;

  const interviewTypeGate = checkInterviewTypeGate(tier, req);
  if (!interviewTypeGate.allowed) return interviewTypeGate;

  const panelGate = checkPanelGate(tier, req);
  if (!panelGate.allowed) return panelGate;

  const firmCalibrationGate = checkFirmCalibrationGate(tier, req);
  if (!firmCalibrationGate.allowed) return firmCalibrationGate;

  // 4. Retention quota — can this user keep more sessions?
  const retentionGate = checkRetentionQuota(tier, ctx);
  if (!retentionGate.allowed) return retentionGate;

  return { allowed: true };
}

// --------------------------------------------------------------------------
// Sub-gates
// --------------------------------------------------------------------------

function checkModeGate(tier: SubscriptionTier, req: SessionStartRequest): SessionGateResult {
  // Hard mode is Max-tier only
  if (req.mode === "hard" && !tierHasFeature(tier, "hardMode")) {
    return {
      allowed: false,
      reason: "tier_feature_gated",
      message: "True Hard Mode is part of the Max plan.",
      minimumTier: "max",
    };
  }
  return { allowed: true };
}

function checkInterviewTypeGate(tier: SubscriptionTier, req: SessionStartRequest): SessionGateResult {
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
      message: "Panel interviews are part of the Pro plan.",
      minimumTier: "pro",
    };
  }
  return { allowed: true };
}

function checkFirmCalibrationGate(
  tier: SubscriptionTier,
  req: SessionStartRequest,
): SessionGateResult {
  // targetFirm by itself is fine on any tier — we just don't inject the calibration overlay below Pro.
  // But if the caller is explicitly requesting calibration as a feature, gate it.
  // Implementation detail: the orchestrator checks tierHasFeature('firmCalibration') before composing
  // the calibration overlay. We don't fail the session start over it.
  void tier;
  void req;
  return { allowed: true };
}

function checkRetentionQuota(tier: SubscriptionTier, ctx: SessionStartContext): SessionGateResult {
  const limit = TIERS[tier].limits.sessionRetentionCount;
  if (limit === "unlimited") return { allowed: true };
  if (ctx.activeSessionCount < limit) return { allowed: true };

  return {
    allowed: false,
    reason: "retention_quota_exceeded",
    message: `You've hit the ${limit}-session retention limit on your plan. Delete older sessions, or upgrade to keep more.`,
    minimumTier: nextTierAbove(tier),
  };
}

function nextTierAbove(tier: SubscriptionTier): SubscriptionTier {
  const order: SubscriptionTier[] = ["trial", "student", "general", "pro", "max"];
  const idx = order.indexOf(tier);
  return order[Math.min(idx + 1, order.length - 1)];
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
}

/**
 * Resolve the runtime feature flags the orchestrator should honour for this tier.
 */
export function resolveRuntimeFeatures(tier: SubscriptionTier): RuntimeFeatureFlags {
  return {
    firmCalibration: tierHasFeature(tier, "firmCalibration"),
    sessionMemory: tierHasFeature(tier, "sessionMemory"),
    questionIntelligenceEngine: tierHasFeature(tier, "questionIntelligenceEngine"),
    nonVerbalFeedback: tierHasFeature(tier, "nonVerbalFeedback"),
    voiceAcousticAnalysis: tierHasFeature(tier, "voiceAcousticAnalysis"),
    panelSimulation: tierHasFeature(tier, "panelSimulation"),
  };
}
