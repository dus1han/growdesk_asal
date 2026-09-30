/** Mirrors backend DTOs/PaymentDtos.cs. */
import type { PaymentStatus } from "./bookings";
import type { NamedRef } from "./customers";

export interface PaymentListItem {
  id: number;
  customer: NamedRef;
  booking: { id: number; date: string; startTime: string; treatments: string[] };
  amount: number;
  status: PaymentStatus;
  method: NamedRef | null;
  paymentDate: string | null;
  createdAt: string;
  recordedBy: string | null;
  isCurrent: boolean;
}

export interface PaymentSummary {
  collected: number;
  collectedCount: number;
  outstanding: number;
  outstandingCount: number;
  waived: number;
  waivedCount: number;
  currency: string;
}

export interface PaymentQuery {
  from?: string;
  to?: string;
  status?: string;
  paymentMethodId?: number;
  customerId?: number;
  search?: string;
  currentOnly?: boolean;
  page?: number;
  pageSize?: number;
}
