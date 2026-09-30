"use client";

import { Users } from "lucide-react";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { RequirePermission } from "@/components/layout/require-permission";
import { Permission } from "@/lib/permissions";

export default function Page() {
  return (
    <RequirePermission permission={Permission.CustomersView}>
      <ModulePlaceholder
        title="Customers"
        description="Everyone who has shown interest in a treatment."
        icon={Users}
        comingTitle="Customer management is coming next"
        comingDescription="Search, filter and manage customers, their interested treatments and stages. This module is being built now."
      />
    </RequirePermission>
  );
}
