"use client";

import { Sparkles } from "lucide-react";
import { LookupManager } from "@/components/admin/lookup-manager";

export default function Page() {
  return (
    <LookupManager
      resource="treatments"
      title="Treatments"
      description="The treatments customers can be interested in and booked for."
      singular="treatment"
      icon={Sparkles}
      withDescription
    />
  );
}
