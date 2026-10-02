"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api/client";
import type {
  AdminUser,
  BookingHours,
  CaptureClient,
  CaptureClientCreated,
  ConnectionKind,
  CaptureField,
  CreateUser,
  CustomField,
  LookupItem,
  Role,
  SaveCustomField,
  SaveLookupItem,
  UpdateUser,
} from "@/types/admin";

/** Toast for failures the form can't show inline (field errors are shown next to the field). */
export function toastError(error: unknown) {
  if (error instanceof ApiError && error.fieldErrors.length > 0) return;
  toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");
}

// ---- Lookup lists --------------------------------------------------------------------------------

/** The five admin-managed lists share one API shape. */
export type LookupResource = "treatments" | "stages" | "lead-sources" | "cancellation-reasons" | "payment-methods";

const lookupKey = (resource: LookupResource) => ["lookup", resource] as const;

/** Every item, active or not, for the admin screens. Forms use the active-only variant. */
export function useLookupAdmin(resource: LookupResource) {
  return useQuery({
    queryKey: [...lookupKey(resource), "all"],
    queryFn: ({ signal }) => api.get<LookupItem[]>(`/${resource}?includeInactive=true`, { signal }),
  });
}

export function useLookupMutations(resource: LookupResource) {
  const qc = useQueryClient();
  const allKey = [...lookupKey(resource), "all"];
  const invalidate = () => qc.invalidateQueries({ queryKey: lookupKey(resource) });

  const create = useMutation({
    mutationFn: (input: SaveLookupItem) => api.post<LookupItem>(`/${resource}`, input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, ...input }: SaveLookupItem & { id: number }) => api.put<LookupItem>(`/${resource}/${id}`, input),
    onSuccess: invalidate,
  });

  const setActive = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      api.patch<LookupItem>(`/${resource}/${id}/active`, { isActive }),
    // Flip the switch immediately; roll back if the server refuses (e.g. a built-in status).
    onMutate: async ({ id, isActive }) => {
      await qc.cancelQueries({ queryKey: allKey });
      const previous = qc.getQueryData<LookupItem[]>(allKey);
      qc.setQueryData<LookupItem[]>(allKey, (items) => items?.map((i) => (i.id === id ? { ...i, isActive } : i)));
      return { previous };
    },
    onError: (error, _vars, context) => {
      qc.setQueryData(allKey, context?.previous);
      toastError(error);
    },
    onSettled: invalidate,
  });

  const reorder = useMutation({
    mutationFn: (ids: number[]) => api.put<LookupItem[]>(`/${resource}/reorder`, { ids }),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: allKey });
      const previous = qc.getQueryData<LookupItem[]>(allKey);
      qc.setQueryData<LookupItem[]>(allKey, (items) =>
        items ? ids.map((id) => items.find((i) => i.id === id)!).filter(Boolean) : items,
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      qc.setQueryData(allKey, context?.previous);
      toastError(error);
    },
    onSettled: invalidate,
  });

  return { create, update, setActive, reorder };
}

// ---- Users --------------------------------------------------------------------------------------

export function useUsers(search: string) {
  return useQuery({
    queryKey: ["users", search],
    queryFn: ({ signal }) => api.get<AdminUser[]>(`/users${search ? `?search=${encodeURIComponent(search)}` : ""}`, { signal }),
    placeholderData: (previous) => previous,
  });
}

export function useRoles() {
  return useQuery({ queryKey: ["roles"], queryFn: ({ signal }) => api.get<Role[]>("/roles", { signal }), staleTime: 10 * 60_000 });
}

export function useUserMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["users"] });
  return {
    create: useMutation({ mutationFn: (input: CreateUser) => api.post<AdminUser>("/users", input), onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, ...input }: UpdateUser & { id: number }) => api.put<AdminUser>(`/users/${id}`, input),
      onSuccess: invalidate,
    }),
    setActive: useMutation({
      mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
        api.patch<AdminUser>(`/users/${id}/active`, { isActive }),
      onSuccess: invalidate,
      onError: toastError,
    }),
    resetPassword: useMutation({
      mutationFn: ({ id, newPassword }: { id: number; newPassword: string }) =>
        api.post<null>(`/users/${id}/reset-password`, { newPassword }),
    }),
  };
}

// ---- Custom fields ------------------------------------------------------------------------------

export function useCustomFieldsAdmin() {
  return useQuery({
    queryKey: ["custom-fields", "all"],
    queryFn: ({ signal }) => api.get<CustomField[]>("/custom-fields?includeInactive=true", { signal }),
  });
}

export function useCustomFieldMutations() {
  const qc = useQueryClient();
  const allKey = ["custom-fields", "all"];
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["custom-fields"] });
    void qc.invalidateQueries({ queryKey: ["capture-fields"] });
  };
  return {
    create: useMutation({ mutationFn: (input: SaveCustomField) => api.post<CustomField>("/custom-fields", input), onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, ...input }: SaveCustomField & { id: number }) => api.put<CustomField>(`/custom-fields/${id}`, input),
      onSuccess: invalidate,
    }),
    setActive: useMutation({
      mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
        api.patch<CustomField>(`/custom-fields/${id}/active`, { isActive }),
      onSuccess: invalidate,
      onError: toastError,
    }),
    reorder: useMutation({
      mutationFn: (ids: number[]) => api.put<CustomField[]>("/custom-fields/reorder", { ids }),
      onMutate: async (ids) => {
        await qc.cancelQueries({ queryKey: allKey });
        const previous = qc.getQueryData<CustomField[]>(allKey);
        qc.setQueryData<CustomField[]>(allKey, (items) =>
          items ? ids.map((id) => items.find((i) => i.id === id)!).filter(Boolean) : items,
        );
        return { previous };
      },
      onError: (error, _vars, context) => {
        qc.setQueryData(allKey, context?.previous);
        toastError(error);
      },
      onSettled: invalidate,
    }),
  };
}

// ---- Capture tool configuration -------------------------------------------------------------------

export function useCaptureFields() {
  return useQuery({ queryKey: ["capture-fields"], queryFn: ({ signal }) => api.get<CaptureField[]>("/admin/capture-fields", { signal }) });
}

export function useSaveCaptureFields() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fields: { key: string; isEnabled: boolean; isRequired: boolean }[]) =>
      api.put<CaptureField[]>("/admin/capture-fields", { fields }),
    onSuccess: (data) => qc.setQueryData(["capture-fields"], data),
  });
}

// ---- Opening hours (WhatsApp BOT) ----------------------------------------------------------------

export function useBookingHours() {
  return useQuery({ queryKey: ["booking-hours"], queryFn: ({ signal }) => api.get<BookingHours>("/admin/booking-hours", { signal }) });
}

export function useSaveBookingHours() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (hours: BookingHours) => api.put<BookingHours>("/admin/booking-hours", hours),
    onSuccess: (data) => {
      qc.setQueryData(["booking-hours"], data);
      qc.setQueryData(["opening-hours"], data);
    },
  });
}

// ---- Capture tool connections -------------------------------------------------------------------

export function useCaptureClients() {
  return useQuery({ queryKey: ["capture-clients"], queryFn: ({ signal }) => api.get<CaptureClient[]>("/admin/capture-clients", { signal }) });
}

export function useCaptureClientMutations() {
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: ["capture-clients"] });
  return {
    create: useMutation({
      mutationFn: (v: { name: string; kind: ConnectionKind }) => api.post<CaptureClientCreated>("/admin/capture-clients", v),
      onSuccess: refresh,
    }),
    revoke: useMutation({
      mutationFn: (id: number) => api.post<null>(`/admin/capture-clients/${id}/revoke`),
      onSuccess: refresh,
    }),
  };
}
