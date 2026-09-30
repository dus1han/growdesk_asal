"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api/client";
import type { Branding, Session } from "@/types/api";

export const sessionQueryKey = ["auth", "session"] as const;

/** The signed-in session, or null when signed out. Never throws for a plain 401. */
export function useSession() {
  return useQuery({
    queryKey: sessionQueryKey,
    queryFn: async ({ signal }) => {
      try {
        return await api.get<Session>("/auth/me", { signal, skipUnauthorizedEvent: true });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { username: string; password: string }) =>
      api.post<Session>("/auth/login", input, { skipUnauthorizedEvent: true }),
    onSuccess: (session) => queryClient.setQueryData(sessionQueryKey, session),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => api.post<null>("/auth/logout"),
    onSettled: () => {
      queryClient.clear();
      router.replace("/login");
    },
  });
}

export function useBranding() {
  return useQuery({
    queryKey: ["settings", "branding"],
    queryFn: ({ signal }) => api.get<Branding>("/settings/branding", { signal }),
    staleTime: 30 * 60_000,
  });
}
