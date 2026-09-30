"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ADMIN_SECTIONS } from "@/components/admin/admin-sections";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { useBranding, useSession } from "@/lib/auth/session";
import { can } from "@/lib/permissions";

export default function AdministrationPage() {
  const { data: session } = useSession();
  const { data: branding } = useBranding();
  const sections = ADMIN_SECTIONS.filter((s) => can(session?.user, s.permission));

  return (
    <>
      <PageHeader title="Administration" description={`Configure how ${branding?.crmName ?? "GrowDesk"} works for your clinic.`} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map(({ href, title, description, icon: Icon }, i) => (
          <motion.div
            key={href}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -3 }}
          >
            <Link href={href} className="group block h-full rounded-2xl focus-visible:outline-offset-4">
              <Card className="flex h-full items-start gap-4 p-5 transition-shadow duration-200 group-hover:shadow-[0_12px_32px_-12px_rgb(15_23_42/0.18)]">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand transition-colors duration-200 group-hover:bg-brand group-hover:text-white">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-[15px] font-semibold">{title}</h2>
                    <ArrowRight className="size-4 -translate-x-1 text-muted opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
                  </div>
                  <p className="mt-1 text-sm text-muted">{description}</p>
                </div>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </>
  );
}
