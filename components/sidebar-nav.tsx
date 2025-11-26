"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from 'next/navigation';
import { Button } from "./ui/button";
import { LayoutDashboard, Users, FileText, Briefcase, LogOut, Menu, X, BarChart3, Bell, Star, Users2, CalendarPlus, CalendarCheck } from 'lucide-react';
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

interface SidebarNavProps {
  role: "super_admin" | "admin" | "hod" | "employee";
  userName?: string;
}

export function SidebarNav({ role, userName }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  // Helper to check permissions
  const isAdminOrSuper = role === "admin" || role === "super_admin";
  const isManagement = role === "hod" || isAdminOrSuper;

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      show: true,
    },
    {
      label: "Review Leaves",
      href: "/dashboard/leaves",
      icon: CalendarCheck,
      show: isManagement,
    },
    {
      label: "My Leaves",
      href: "/dashboard/my-leaves",
      icon: CalendarPlus,
      // Everyone can request leaves
      show: true, 
    },
    {
      label: "My Team",
      href: "/dashboard/team",
      icon: Users2,
      show: true,
    },
    {
      label: "Employees",
      href: "/dashboard/employees",
      icon: Users,
      // Only management sees full employee list
      show: isManagement,
    },
    {
      label: "Announcements",
      href: "/dashboard/announcements",
      icon: Bell,
      show: true,
    },
    {
      label: "Performance",
      href: "/dashboard/performance",
      icon: Star,
      show: isManagement,
    },
    {
      label: "Attendance",
      href: "/dashboard/attendance",
      icon: FileText,
      show: isManagement,
    },
    {
      label: "Reports",
      href: "/dashboard/reports",
      icon: BarChart3,
      show: isAdminOrSuper,
    },
    {
      label: "Profile",
      href: "/dashboard/profile",
      icon: Briefcase,
      show: true,
    },
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside
        className={cn(
          "fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 md:translate-x-0 z-40",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-xl font-bold text-sidebar-foreground">EMS</h1>
          <p className="text-sm text-sidebar-foreground/60 capitalize mt-1">
            {role.replace('_', ' ')}
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className="w-full justify-start gap-2"
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon size={20} />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-2">
          <p className="text-xs text-sidebar-foreground/60 px-2">
            {userName || "User"}
          </p>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={handleLogout}
          >
            <LogOut size={20} />
            Logout
          </Button>
        </div>
      </aside>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}