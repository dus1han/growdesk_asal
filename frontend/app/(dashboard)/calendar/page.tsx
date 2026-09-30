"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { BookingCalendar } from "@/components/bookings/booking-calendar";
import { BookingDetailsDrawer } from "@/components/bookings/booking-details-drawer";
import { BookingFormDrawer, type BookingPrefill } from "@/components/bookings/booking-form-drawer";
import { PageHeader } from "@/components/layout/page-header";
import { RequirePermission } from "@/components/layout/require-permission";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSession } from "@/lib/auth/session";
import { can, Permission } from "@/lib/permissions";

export default function CalendarPage() {
  const { data: session } = useSession();
  const canBook = can(session?.user, Permission.BookingsManage);
  const [openId, setOpenId] = useState<number | null>(null);
  const [booking, setBooking] = useState<BookingPrefill | null>(null);

  return (
    <RequirePermission permission={Permission.BookingsView}>
      <PageHeader
        title="Calendar"
        description={canBook ? "Click an empty slot to book, or a consultation to open it." : "Consultations by day, week and month."}
        actions={
          canBook && (
            <Button onClick={() => setBooking({})}>
              <Plus className="size-4" /> Book consultation
            </Button>
          )
        }
      />
      <Card className="overflow-hidden">
        <BookingCalendar onOpenBooking={setOpenId} onPickSlot={canBook ? (slot) => setBooking(slot) : undefined} />
      </Card>

      <BookingDetailsDrawer bookingId={openId} onClose={() => setOpenId(null)} onBookingChange={setOpenId} />
      <BookingFormDrawer open={booking !== null} prefill={booking ?? undefined} onClose={() => setBooking(null)} onSaved={(b) => setOpenId(b.id)} />
    </RequirePermission>
  );
}
