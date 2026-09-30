"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_SECTIONS } from "@/components/admin/admin-sections";
import { RequirePermission } from "@/components/layout/require-permission";
import { useSession } from "@/lib/auth/session";
import { can, Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

/**
 * Administration shell: a section menu (vertical on desktop, a scrollable strip on phones) next to
 * the active section. The overview page at /administration shows the menu as cards instead.
 */
export default function AdministrationLayout({ children }: LayoutProps<"/administration">) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const sections = ADMIN_SECTIONS.filter((s) => can(session?.user, s.permission));
  const onOverview = pathname === "/administration";

  return (
    <RequirePermission permission={Permission.AdminAccess}>
      {onOverview ? (
        children
      ) : (
        <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
          <nav aria-label="Administration" className="-mx-4 mb-6 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:mb-0 lg:overflow-visible lg:px-0">
            <Link href="/administration" className="mb-3 hidden text-xs font-semibold uppercase tracking-[0.08em] text-muted hover:text-foreground lg:block">
              Administration
            </Link>
            <ul className="flex gap-1 lg:sticky lg:top-10 lg:flex-col">
              {sections.map(({ href, title, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <li key={href} className="shrink-0">
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex h-9 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 text-sm font-medium transition-colors",
                        active ? "text-brand-strong" : "text-muted hover:bg-surface hover:text-foreground",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="admin-nav-active"
                          className="absolute inset-0 rounded-xl bg-brand-soft"
                          transition={{ type: "spring", stiffness: 500, damping: 38 }}
                        />
                      )}
                      <Icon className="relative size-4" />
                      <span className="relative">{title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="min-w-0">{children}</div>
        </div>
      )}
    </RequirePermission>
  );
}
