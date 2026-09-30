"use client";

import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { useState } from "react";
import { Toaster } from "sonner";
import { ApiError } from "@/lib/api/client";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => {
      const client: QueryClient = new QueryClient({
        // Any successful change (booking, completion, customer, payment) can move a dashboard figure.
        mutationCache: new MutationCache({
          onSuccess: () => void client.invalidateQueries({ queryKey: ["dashboard"] }),
        }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // Retrying a 4xx never helps; retry network and 5xx failures once.
            retry: (count, error) => count < 1 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
          },
        },
      });
      return client;
    },
  );

  return (
    <QueryClientProvider client={queryClient}>
      {/* reducedMotion="user" makes every Framer Motion animation honour prefers-reduced-motion. */}
      <MotionConfig reducedMotion="user">
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{ duration: 3500, className: "font-sans" }}
        />
      </MotionConfig>
    </QueryClientProvider>
  );
}
