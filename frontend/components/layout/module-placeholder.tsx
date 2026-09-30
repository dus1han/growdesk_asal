"use client";

import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "./page-header";

/** Shell for modules that are planned but not built yet. Honest about it, still on-brand. */
export function ModulePlaceholder({
  title,
  description,
  icon,
  comingTitle,
  comingDescription,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  comingTitle: string;
  comingDescription: string;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <EmptyState icon={icon} title={comingTitle} description={comingDescription} className="py-20" />
      </Card>
    </>
  );
}
