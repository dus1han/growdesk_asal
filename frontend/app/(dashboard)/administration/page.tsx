"use client";

import { motion } from "framer-motion";
import {
  Ban,
  ClipboardType,
  Layers,
  Megaphone,
  Settings,
  Smartphone,
  Sparkles,
  UserCog,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/layout/require-permission";
import { Card } from "@/components/ui/card";
import { Permission } from "@/lib/permissions";

const SECTIONS: { title: string; description: string; icon: LucideIcon }[] = [
  { title: "Users", description: "Accounts, roles, activation and password resets", icon: UserCog },
  { title: "Treatments", description: "The treatments customers can be interested in", icon: Sparkles },
  { title: "Stages", description: "Customer stages, colours and order", icon: Layers },
  { title: "Lead Sources", description: "Where customers come from", icon: Megaphone },
  { title: "Custom Fields", description: "Extra customer fields of any type", icon: ClipboardType },
  { title: "Capture Tool", description: "Fields shown in the WhatsApp capture tool", icon: Smartphone },
  { title: "Cancellation Reasons", description: "Reasons offered when cancelling a booking", icon: Ban },
  { title: "Payment Methods", description: "Cash, card, bank transfer and others", icon: Wallet },
  { title: "System Settings", description: "Branding, currency and time zone", icon: Settings },
];

export default function AdministrationPage() {
  return (
    <RequirePermission permission={Permission.AdminAccess}>
      <PageHeader title="Administration" description="Configure how GrowDesk works for your clinic." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map(({ title, description, icon: Icon }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card className="flex h-full items-start gap-4 p-5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-[15px] font-semibold">{title}</h2>
                  <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-muted">Soon</span>
                </div>
                <p className="mt-1 text-sm text-muted">{description}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </RequirePermission>
  );
}
