"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Field, Input } from "@/components/ui/form-controls";
import { toastError } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import { changePasswordSchema, PASSWORD_RULES, type ChangePasswordValues } from "@/lib/auth/password";
import { useChangePassword } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

/** Lets any signed-in user change their own password. */
export function ChangePasswordDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const change = useChangePassword();
  return (
    <Drawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Change password"
      description="Enter your current password, then choose a new one."
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="change-password-form" disabled={change.isPending}>
            {change.isPending ? "Saving…" : "Change password"}
          </Button>
        </>
      }
    >
      {open && <ChangePasswordForm onClose={onClose} />}
    </Drawer>
  );
}

function ChangePasswordForm({ onClose }: { onClose: () => void }) {
  const change = useChangePassword();
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
  });
  const newPassword = useWatch({ control, name: "newPassword" });

  const onSubmit = handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      await change.mutateAsync({ currentPassword, newPassword });
      toast.success("Password changed");
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors.length > 0) {
        for (const fe of error.fieldErrors) {
          if (fe.field === "currentPassword" || fe.field === "newPassword") setError(fe.field, { message: fe.message });
        }
        return;
      }
      toastError(error);
    }
  });

  return (
    <form id="change-password-form" onSubmit={onSubmit} className="space-y-5" noValidate>
      <Field label="Current password" error={errors.currentPassword?.message}>
        {(p) => <Input {...p} type="password" autoComplete="current-password" autoFocus {...register("currentPassword")} />}
      </Field>
      <Field label="New password" error={errors.newPassword?.message}>
        {(p) => (
          <div>
            <Input {...p} type="password" autoComplete="new-password" {...register("newPassword")} />
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1" aria-label="Password requirements">
              {PASSWORD_RULES.map((rule) => {
                const met = rule.test(newPassword);
                return (
                  <li key={rule.label} className={cn("flex items-center gap-1.5 text-xs transition-colors", met ? "text-emerald-600" : "text-muted")}>
                    <span className={cn("flex size-3.5 items-center justify-center rounded-full transition-colors", met ? "bg-emerald-100" : "bg-surface-muted")}>
                      {met && <Check className="size-2.5" strokeWidth={3} />}
                    </span>
                    {rule.label}
                    <span className="sr-only">{met ? "(met)" : "(not met)"}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Field>
      <Field label="Confirm new password" error={errors.confirm?.message}>
        {(p) => <Input {...p} type="password" autoComplete="new-password" {...register("confirm")} />}
      </Field>
    </form>
  );
}
