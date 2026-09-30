"use client";

import { Megaphone } from "lucide-react";
import { LookupManager } from "@/components/admin/lookup-manager";

export default function Page() {
  return (
    <LookupManager
      resource="lead-sources"
      title="Lead Sources"
      description="Where customers hear about the clinic."
      singular="lead source"
      icon={Megaphone}
    />
  );
}
