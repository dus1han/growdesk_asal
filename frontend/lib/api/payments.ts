"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { Paged } from "@/types/customers";
import type { PaymentListItem, PaymentQuery, PaymentSummary } from "@/types/payments";

export function paymentQueryString(q: PaymentQuery) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  return p.toString();
}

export function usePayments(q: PaymentQuery, enabled = true) {
  return useQuery({
    queryKey: ["payments", "list", q],
    queryFn: ({ signal }) => api.get<Paged<PaymentListItem>>(`/payments?${paymentQueryString(q)}`, { signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Summary uses the same filters, minus paging and status (see backend PaymentSummaryDto). */
export function usePaymentSummary(q: PaymentQuery, enabled = true) {
  const filters: PaymentQuery = { from: q.from, to: q.to, paymentMethodId: q.paymentMethodId, customerId: q.customerId, search: q.search };
  return useQuery({
    queryKey: ["payments", "summary", filters],
    queryFn: ({ signal }) => api.get<PaymentSummary>(`/payments/summary?${paymentQueryString(filters)}`, { signal }),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, ...input }: { bookingId: number; paymentMethodId: number; paymentDate: string | null }) =>
      api.post<PaymentListItem>(`/bookings/${bookingId}/payments`, input),
    onSuccess: (_p, { bookingId }) => {
      void qc.invalidateQueries({ queryKey: ["payments"] });
      void qc.invalidateQueries({ queryKey: ["bookings"] });
      void qc.invalidateQueries({ queryKey: ["bookings", "detail", bookingId] });
    },
  });
}
