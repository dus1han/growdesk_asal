"use client";

import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default function UnauthorizedPage() {
  return (
    <Card className="mx-auto mt-10 max-w-lg">
      <EmptyState
        icon={ShieldAlert}
        title="You don't have access to this page"
        description="Your role doesn't include permission for this area. If you need it, ask an administrator."
        action={
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-strong"
          >
            Back to dashboard
          </Link>
        }
        className="py-16"
      />
    </Card>
  );
}
