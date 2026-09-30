"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { CREATED_PRESETS, FOLLOW_UP_PRESETS } from "@/lib/dates";
import type { CustomerFilters } from "@/types/customers";

/** URL parameter names: short, readable, shareable (spec §52). */
export type FilterParam = "q" | "stage" | "treatment" | "source" | "assigned" | "created" | "followup" | "page";

const num = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : undefined);

/**
 * Customer list filters live in the URL, so a filtered view can be bookmarked or shared
 * (e.g. /customers?stage=1&treatment=2). Changing any filter resets to page 1.
 */
export function useCustomerFilters() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const values = useMemo(
    () => ({
      q: params.get("q") ?? "",
      stage: params.get("stage") ?? undefined,
      treatment: params.get("treatment") ?? undefined,
      source: params.get("source") ?? undefined,
      assigned: params.get("assigned") ?? undefined,
      created: params.get("created") ?? undefined,
      followup: params.get("followup") ?? undefined,
      page: num(params.get("page")) ?? 1,
    }),
    [params],
  );

  const apiFilters = useMemo<CustomerFilters>(() => {
    const created = values.created ? CREATED_PRESETS[values.created]?.range() : undefined;
    const followUp = values.followup ? FOLLOW_UP_PRESETS[values.followup]?.range() : undefined;
    return {
      search: values.q.trim() || undefined,
      stageId: num(values.stage ?? null),
      treatmentId: num(values.treatment ?? null),
      leadSourceId: num(values.source ?? null),
      assignedUserId: num(values.assigned ?? null),
      createdFrom: created?.from,
      createdTo: created?.to,
      followUpFrom: followUp?.from,
      followUpTo: followUp?.to,
      page: values.page,
    };
  }, [values]);

  const set = useCallback(
    (key: FilterParam, value: string | number | undefined) => {
      const next = new URLSearchParams(params.toString());
      if (value === undefined || value === "" || (key === "page" && value === 1)) next.delete(key);
      else next.set(key, String(value));
      if (key !== "page") next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const clearAll = useCallback(() => router.replace(pathname, { scroll: false }), [pathname, router]);

  const activeCount = ["stage", "treatment", "source", "assigned", "created", "followup"].filter(
    (k) => values[k as keyof typeof values] !== undefined,
  ).length;

  return { values, apiFilters, set, clearAll, activeCount };
}
