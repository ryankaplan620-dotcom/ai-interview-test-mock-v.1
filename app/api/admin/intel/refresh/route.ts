import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { fetchCompanyIntel } from "@/lib/intel/pipeline/fetch-company";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = (process.env.INTEL_ADMIN_EMAILS ?? "")
  .split(",")
  .filter(Boolean);

/**
 * GET /api/admin/intel/refresh?company=name
 *
 * Admin-only endpoint to manually refresh company intelligence.
 * Uses a 30s timeout (admin can wait longer than a session start).
 */
export async function GET(request: Request) {
  try {
    const user = await requireUser();

    if (!user.email || !ADMIN_EMAILS.includes(user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const company = searchParams.get("company");

    if (!company) {
      return NextResponse.json(
        { error: "Missing required query parameter: company" },
        { status: 400 }
      );
    }

    const intel = await fetchCompanyIntel(company, "admin-refresh", 30_000);

    return NextResponse.json({
      company: intel.company.name,
      questionCount: intel.questions.length,
      sourceCount: intel.sources.length,
      freshness: {
        generated_at: intel.freshness.generated_at,
        ttl_hours: intel.freshness.ttl_hours,
        oldest_field: intel.freshness.oldest_field,
      },
    });
  } catch (err) {
    console.error("[admin.intel.refresh] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
