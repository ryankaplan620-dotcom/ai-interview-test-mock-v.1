import { requireUser, getUserTier } from "@/lib/auth/server";
import { PERSONAS } from "@/lib/personas";
import { resolveRuntimeFeatures } from "@/lib/gates/session";
import { tierHasFeature } from "@/lib/tiers";
import { SessionPicker, type PickerPersona } from "./picker";

export default async function NewSessionPage() {
  await requireUser();
  const tier = await getUserTier();

  // Build the client-safe persona list from the registry.
  // We deliberately strip the base prompt / overlays / openings here —
  // those live server-side only. The client only needs display info.
  const pickerPersonas: PickerPersona[] = Object.values(PERSONAS).map((p) => ({
    id: p.id,
    name: p.name,
    firstName: p.firstName,
    firm: p.firm,
    title: p.title,
    tagline: p.tagline,
    supportedTypes: p.supportedInterviewTypes,
    defaultDurationMinutes: p.defaultDurationMinutes,
  }));

  const effectiveTier = tier?.effective_tier ?? "cycle";
  const runtime = resolveRuntimeFeatures(effectiveTier);

  return (
    <SessionPicker
      personas={pickerPersonas}
      tier={effectiveTier}
      hasFirmCalibration={runtime.firmCalibration}
      hasPanel={runtime.panelSimulation}
      hasHardMode={tierHasFeature(effectiveTier, "hardMode")}
    />
  );
}
