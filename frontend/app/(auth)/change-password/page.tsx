import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginScreen } from "@/components/auth/login-screen";

export const metadata: Metadata = { title: "Choose your password" };

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#07071a]" />}>
      <LoginScreen mode="set-password" />
    </Suspense>
  );
}
