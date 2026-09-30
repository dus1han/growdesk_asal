import { CalendarDays, ClipboardList, CreditCard, LayoutDashboard, Settings2, Users, type LucideIcon } from "lucide-react";
import { Permission, type PermissionKey } from "@/lib/permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: PermissionKey;
  /** Shown in the mobile bottom bar (max four). */
  mobilePrimary?: boolean;
}

export const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: Permission.DashboardView, mobilePrimary: true },
  { href: "/customers", label: "Customers", icon: Users, permission: Permission.CustomersView, mobilePrimary: true },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, permission: Permission.BookingsView, mobilePrimary: true },
  { href: "/bookings", label: "Bookings", icon: ClipboardList, permission: Permission.BookingsView, mobilePrimary: true },
  { href: "/payments", label: "Payments", icon: CreditCard, permission: Permission.PaymentsView },
];

export const managementNav: NavItem[] = [
  { href: "/administration", label: "Administration", icon: Settings2, permission: Permission.AdminAccess },
];
