import { CalendarDays, ChartColumn, Grid3x3, LayoutDashboard, ListChecks, Settings } from "lucide-react";

export const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, mobile: true },
  { href: "/habits", label: "My Habits", icon: ListChecks, mobile: true },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, mobile: true },
  { href: "/analytics", label: "Analytics", icon: ChartColumn, mobile: true },
  { href: "/year", label: "Yearly Overview", icon: Grid3x3, mobile: true, short: "Year" },
  { href: "/settings", label: "Settings", icon: Settings, mobile: false },
] as const;
