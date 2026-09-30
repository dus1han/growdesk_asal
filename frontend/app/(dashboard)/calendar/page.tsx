import { redirect } from "next/navigation";

// Calendar and Bookings are one page now.
export default function CalendarPage() {
  redirect("/bookings?view=calendar");
}
