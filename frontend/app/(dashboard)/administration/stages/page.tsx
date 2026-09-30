"use client";

import { Layers } from "lucide-react";
import { LookupManager } from "@/components/admin/lookup-manager";

export default function Page() {
  return (
    <LookupManager
      resource="stages"
      title="Stages"
      description="Where each customer is in their journey. Stages marked Automation are moved automatically."
      singular="stage"
      icon={Layers}
      withColor
    />
  );
}
