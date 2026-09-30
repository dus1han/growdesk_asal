import type { BookingStatus } from "@/types/bookings";
import type { NamedRef, StageRef } from "@/types/customers";

/** GET /api/dashboard (backend DTOs/DashboardDtos.cs). Null sections are hidden from this user. */
export interface Dashboard {
  today: string;
  bookings: DashboardBookingStats | null;
  customers: DashboardCustomerStats | null;
  todaysAppointments: DashboardAppointment[] | null;
  stages: DashboardStage[] | null;
  followUps: DashboardFollowUp[] | null;
  activity: DashboardActivity[] | null;
}

export interface DashboardBookingStats {
  today: number;
  yesterday: number;
  stillBookedToday: number;
  upcoming: number;
  upcomingThisWeek: number;
}

export interface DashboardCustomerStats {
  followUpsDue: number;
  followUpsOverdue: number;
  potential: number;
  newToday: number;
}

export interface DashboardAppointment {
  id: number;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  customer: NamedRef;
  treatments: string[];
  doctorName: string | null;
}

export interface DashboardStage {
  id: number;
  name: string;
  color: string;
  systemKey: string | null;
  count: number;
}

export interface DashboardFollowUp {
  id: number;
  name: string;
  whatsApp: string | null;
  date: string;
  stage: StageRef;
  treatments: string[];
}

export interface DashboardActivity {
  id: number;
  action: string;
  userName: string | null;
  createdAt: string;
  details: Record<string, unknown> | null;
  customer: NamedRef | null;
  bookingId: number | null;
}
