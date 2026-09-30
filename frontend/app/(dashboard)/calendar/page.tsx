"use client";

import { CalendarDays } from "lucide-react";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { RequirePermission } from "@/components/layout/require-permission";
import { Permission } from "@/lib/permissions";

export default function Page() {
  return (
    <RequirePermission permission={Permission.BookingsView}>
      <ModulePlaceholder
        title="Calendar"
        description="Consultations by day, week and month."
        icon={CalendarDays}
        comingTitle="The calendar is on its way"
        comingDescription="A week view of every consultation, with status colours and one-click booking details."
      />
    </RequirePermission>
  );
}
