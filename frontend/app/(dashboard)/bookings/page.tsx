"use client";

import { ClipboardList } from "lucide-react";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { RequirePermission } from "@/components/layout/require-permission";
import { Permission } from "@/lib/permissions";

export default function Page() {
  return (
    <RequirePermission permission={Permission.BookingsView}>
      <ModulePlaceholder
        title="Bookings"
        description="Book, complete, reschedule and cancel consultations."
        icon={ClipboardList}
        comingTitle="Bookings are on their way"
        comingDescription="Book consultations with multiple treatments, then complete, reschedule or cancel them in a couple of clicks."
      />
    </RequirePermission>
  );
}
