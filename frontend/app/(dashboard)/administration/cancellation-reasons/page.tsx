"use client";

import { Ban } from "lucide-react";
import { LookupManager } from "@/components/admin/lookup-manager";

export default function Page() {
  return (
    <LookupManager
      resource="cancellation-reasons"
      title="Cancellation Reasons"
      description="Reasons offered when a booking is cancelled."
      singular="cancellation reason"
      icon={Ban}
    />
  );
}
