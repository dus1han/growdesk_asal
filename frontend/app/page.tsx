import { redirect } from "next/navigation";

// proxy.ts normally redirects "/" before this renders; this is the fallback.
export default function Home() {
  redirect("/dashboard");
}
