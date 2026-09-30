import { z } from "zod";

// Mirrors backend Validators (Rules.IsStrongPassword, ChangePasswordRequestValidator).
export const PASSWORD_MESSAGE = "Use at least 8 characters, including a letter and a number.";
export const isStrongPassword = (v: string) => v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v);

/** The individual rules, for the live checklist under a new-password field. */
export const PASSWORD_RULES = [
  { label: "8+ characters", test: (v: string) => v.length >= 8 },
  { label: "A letter", test: (v: string) => /[A-Za-z]/.test(v) },
  { label: "A number", test: (v: string) => /\d/.test(v) },
] as const;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Please enter your current password."),
    newPassword: z.string().refine(isStrongPassword, PASSWORD_MESSAGE),
    confirm: z.string().min(1, "Please type the new password again."),
  })
  .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "The passwords don't match." })
  .refine((v) => !v.newPassword || v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "Choose a password different from your current one.",
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
