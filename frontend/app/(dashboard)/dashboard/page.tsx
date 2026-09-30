"use client";

import { motion } from "framer-motion";
import { Bell, CalendarClock, CalendarDays, ListChecks, Sparkles, UserRoundSearch } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/layout/require-permission";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useSession } from "@/lib/auth/session";
import { Permission } from "@/lib/permissions";

const STAT_CARDS = [
  { label: "Today's Consultations", icon: CalendarDays, tint: "from-brand/15 to-brand/0 text-brand" },
  { label: "Upcoming", icon: CalendarClock, tint: "from-sky-500/15 to-sky-500/0 text-sky-600" },
  { label: "Follow-ups", icon: Bell, tint: "from-amber-500/15 to-amber-500/0 text-amber-600" },
  { label: "Potential Customers", icon: UserRoundSearch, tint: "from-accent/15 to-accent/0 text-teal-600" },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const firstName = session?.user.fullName.split(" ")[0] ?? "";

  return (
    <RequirePermission permission={Permission.DashboardView}>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description={new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
      />

      {/* Stat cards: values appear once bookings and customers are live (no invented numbers). */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {STAT_CARDS.map(({ label, icon: Icon, tint }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -3 }}
          >
            <Card className="relative h-full overflow-hidden p-4 sm:p-5">
              <div className={`absolute inset-0 bg-gradient-to-br ${tint.split(" ").slice(0, 2).join(" ")}`} aria-hidden />
              <div className="relative flex items-start justify-between">
                <p className="text-[13px] font-medium leading-snug text-muted sm:text-sm">{label}</p>
                <span className={`hidden size-9 shrink-0 items-center sm:flex justify-center rounded-xl bg-surface shadow-card ${tint.split(" ")[2]}`}>
                  <Icon className="size-[18px]" />
                </span>
              </div>
              <p className="relative mt-4 font-display text-3xl font-bold tracking-tight text-muted/50">—</p>
              <p className="relative mt-1 hidden text-xs text-muted sm:block">Starts counting once bookings are live</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Today's Appointments" description="Consultations booked for today" />
          <EmptyState
            icon={CalendarDays}
            title="No consultations today"
            description="Your calendar is clear. Booked consultations will appear here with their time and treatments."
          />
        </Card>

        <Card>
          <CardHeader title="Potential Customers" description="Customers by stage" />
          <EmptyState
            icon={ListChecks}
            title="No customers yet"
            description="Once customers are captured, you'll see how many sit in each stage."
          />
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Follow-ups" description="Customers due for a follow-up" />
          <EmptyState icon={Bell} title="Nothing to follow up" description="Customers with a follow-up date will show here." />
        </Card>

        <Card>
          <CardHeader title="Recent Activity" />
          <EmptyState icon={Sparkles} title="No activity yet" description="New customers, bookings and completions will appear here." />
        </Card>
      </div>
    </RequirePermission>
  );
}
