import { requireUser } from "@/lib/auth/server";

/**
 * Layout for the live interview room.
 *
 * Deliberately minimal — no top nav, no chrome. The session page takes the
 * whole viewport. Only auth protection is enforced here.
 */
export default async function SessionLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <main className="min-h-screen bg-ink text-text-primary">
      {children}
    </main>
  );
}
