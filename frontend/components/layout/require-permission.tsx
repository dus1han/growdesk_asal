"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/lib/auth/session";
import { can, type PermissionKey } from "@/lib/permissions";

/**
 * Page-level permission gate. The API enforces every permission independently; this only keeps
 * users from landing on a screen whose data they cannot load.
 */
export function RequirePermission({ permission, children }: { permission: PermissionKey; children: React.ReactNode }) {
  const router = useRouter();
  const { data: session } = useSession();
  const allowed = can(session?.user, permission);

  useEffect(() => {
    if (session && !allowed) router.replace("/unauthorized");
  }, [session, allowed, router]);

  return allowed ? <>{children}</> : null;
}
