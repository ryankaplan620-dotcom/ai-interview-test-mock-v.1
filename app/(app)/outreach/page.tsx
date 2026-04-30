export const dynamic = "force-dynamic";

import { requireUser } from "@/lib/auth/server";
import { createServerClient } from "@/lib/db/server";
import { OutreachClient } from "./outreach-client";

interface OutreachContact {
  id: string;
  name: string;
  title: string;
  company: string;
  source: string;
  status: string;
  relevance_reason: string | null;
  suggested_approach: string | null;
  created_at: string;
}

interface OutreachDraft {
  id: string;
  contact_id: string | null;
  subject: string;
  body: string;
  status: string;
  tone: string | null;
  sent_at: string | null;
  created_at: string;
}

export default async function OutreachPage() {
  const user = await requireUser();
  const supabase = createServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: contactsRaw } = await (supabase.from("outreach_contacts") as any)
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: draftsRaw } = await (supabase.from("outreach_drafts") as any)
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const contacts = (contactsRaw ?? []) as OutreachContact[];
  const drafts = (draftsRaw ?? []) as OutreachDraft[];

  return <OutreachClient contacts={contacts} drafts={drafts} />;
}
