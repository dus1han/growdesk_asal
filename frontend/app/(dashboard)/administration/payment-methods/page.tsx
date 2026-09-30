"use client";

import { Wallet } from "lucide-react";
import { LookupManager } from "@/components/admin/lookup-manager";

export default function Page() {
  return (
    <LookupManager
      resource="payment-methods"
      title="Payment Methods"
      description="How customers can pay for consultations."
      singular="payment method"
      icon={Wallet}
    />
  );
}
