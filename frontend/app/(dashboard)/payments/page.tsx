"use client";

import { CreditCard } from "lucide-react";
import { ModulePlaceholder } from "@/components/layout/module-placeholder";
import { RequirePermission } from "@/components/layout/require-permission";
import { Permission } from "@/lib/permissions";

export default function Page() {
  return (
    <RequirePermission permission={Permission.PaymentsView}>
      <ModulePlaceholder
        title="Payments"
        description="Consultation charges and payment history."
        icon={CreditCard}
        comingTitle="Payments are on their way"
        comingDescription="Charges recorded when a consultation is completed, with status, method and full history."
      />
    </RequirePermission>
  );
}
