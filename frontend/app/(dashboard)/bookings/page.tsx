"use client";

import { motion } from "framer-motion";
import { CalendarDays, List, Plus } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BookingCalendar } from "@/components/bookings/booking-calendar";
import { BookingDetailsDrawer } from "@/components/bookings/booking-details-drawer";
import { BookingFormDrawer, type BookingPrefill } from "@/components/bookings/booking-form-drawer";
import { BookingList, type Tab } from "@/components/bookings/booking-list";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/layout/require-permission";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSession } from "@/lib/auth/session";
import { can, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type View = "calendar" | "list";
const VIEW_KEY = "growdesk.bookings.view";

const VIEWS = [
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "list", label: "List", icon: List },
] as const;

/** One page for bookings: the calendar to plan, the list to work through and export. */
export default function BookingsPage() {
  return (
    <RequirePermission permission={Permission.BookingsView}>
      <Suspense fallback={null}>
        <Bookings />
      </Suspense>
    </RequirePermission>
  );
}

function Bookings() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { data: session } = useSession();
  const canBook = can(session?.user, Permission.BookingsManage);
  const [openId, setOpenId] = useState<number | null>(null);
  const [booking, setBooking] = useState<BookingPrefill | null>(null);

  const fromUrl = params.get("view");
  const tabParam = params.get("tab");
  const initialTab: Tab | undefined = tabParam === "today" || tabParam === "history" || tabParam === "upcoming" ? tabParam : undefined;
  const view: View = fromUrl === "list" || fromUrl === "calendar" ? fromUrl : "calendar";

  // No view in the address: reopen whichever view was used last.
  useEffect(() => {
    if (fromUrl) return;
    let last: string | null = null;
    try {
      last = localStorage.getItem(VIEW_KEY);
    } catch {
      // storage unavailable
    }
    if (last === "list") router.replace(`${pathname}?view=list`, { scroll: false });
  }, [fromUrl, pathname, router]);

  const setView = (v: View) => {
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      // storage unavailable
    }
    router.replace(`${pathname}?view=${v}`, { scroll: false });
  };

  return (
    <>
      <PageHeader
        title="Bookings"
        description={view === "calendar" && canBook ? "Click an empty slot to book, or a consultation to open it." : "Book, complete, reschedule and cancel consultations."}
        actions={
          <>
            <div className="inline-flex rounded-xl border border-line bg-surface p-1 text-sm font-medium shadow-card" role="tablist" aria-label="View">
              {VIEWS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={view === id}
                  onClick={() => setView(id)}
                  className={cn("relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors", view === id ? "text-brand-strong" : "text-muted hover:text-foreground")}
                >
                  {view === id && (
                    <motion.span layoutId="bookings-view" className="absolute inset-0 rounded-lg bg-brand-soft" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
                  )}
                  <Icon className="relative size-4" />
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>
            {canBook && (
              <Button onClick={() => setBooking({})}>
                <Plus className="size-4" /> Book consultation
              </Button>
            )}
          </>
        }
      />

      <Card className="overflow-hidden">
        {view === "calendar" ? (
          <BookingCalendar onOpenBooking={setOpenId} onPickSlot={canBook ? (slot) => setBooking(slot) : undefined} />
        ) : (
          <BookingList initialTab={initialTab} onOpen={setOpenId} onBook={canBook ? () => setBooking({}) : undefined} />
        )}
      </Card>

      <BookingDetailsDrawer bookingId={openId} onClose={() => setOpenId(null)} onBookingChange={setOpenId} />
      <BookingFormDrawer open={booking !== null} prefill={booking ?? undefined} onClose={() => setBooking(null)} onSaved={(b) => setOpenId(b.id)} />
    </>
  );
}
