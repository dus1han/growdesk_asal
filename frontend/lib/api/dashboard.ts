"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { Dashboard } from "@/types/dashboard";

/** The dashboard, refreshed every minute while the page is open so today's list stays current. */
export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: ({ signal }) => api.get<Dashboard>("/dashboard", { signal }),
    staleTime: 0,
    refetchInterval: 60_000,
  });
}
