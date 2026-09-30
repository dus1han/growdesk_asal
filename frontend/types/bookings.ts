/** Mirrors backend DTOs/BookingDtos.cs. */
import type { NamedRef, StageRef } from "./customers";

export type BookingStatus = "Booked" | "Completed" | "Rescheduled" | "Cancelled" | "NoShow";
export type PaymentStatus = "Paid" | "Pending" | "Waived";

export interface BookingListItem {
  id: number;
  customer: NamedRef;
  doctor: NamedRef | null;
  date: string; // yyyy-MM-dd
  startTime: string; // HH:mm:ss
  endTime: string;
  status: BookingStatus;
  treatments: NamedRef[];
  consultationCharge: number | null;
  paymentStatus: PaymentStatus | null;
}

export interface Payment {
  id: number;
  amount: number;
  status: PaymentStatus;
  method: NamedRef | null;
  paymentDate: string | null;
  recordedBy: string | null;
  createdAt: string;
}

export interface BookingLink {
  id: number;
  date: string;
  startTime: string;
  status: BookingStatus;
}

export interface BookingDetail {
  id: number;
  customer: NamedRef;
  customerWhatsApp: string | null;
  customerStage: StageRef;
  doctor: NamedRef | null;
  date: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  treatments: NamedRef[];
  notes: string | null;
  consultationCharge: number | null;
  doctorNotes: string | null;
  nextTreatmentDate: string | null;
  nextTreatment: NamedRef | null;
  cancellationReason: NamedRef | null;
  cancellationNote: string | null;
  rescheduledFrom: BookingLink | null;
  rescheduledTo: BookingLink | null;
  payments: Payment[];
  completedAt: string | null;
  cancelledAt: string | null;
  rescheduledAt: string | null;
  noShowAt: string | null;
  createdAt: string;
}

export interface BookingQuery {
  from?: string;
  to?: string;
  customerId?: number;
  doctorId?: number;
  status?: string;
  page?: number;
  pageSize?: number;
  sort?: "asc" | "desc";
}

export interface BookingConflict {
  bookingId: number;
  customerName: string;
  startTime: string;
  endTime: string;
}

export interface Locale {
  currency: string;
  timeZone: string;
  today: string;
}
