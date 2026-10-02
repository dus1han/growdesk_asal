"use client";

import { Layers } from "lucide-react";
import { LookupManager } from "@/components/admin/lookup-manager";

export default function Page() {
  return (
    <LookupManager
      resource="stages"
      title="Statuses"
      description="The clinic's own view of each customer, set by staff. Completing a consultation makes the person a Customer. Where they are with consultations is shown separately, from their bookings."
      singular="status"
      icon={Layers}
      withColor
    />
  );
}
