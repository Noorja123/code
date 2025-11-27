"use client";

import { Card } from "./ui/card";
import { Users, Calendar, AlertCircle, TrendingUp, Bell, Briefcase } from 'lucide-react';

// Map string keys to actual Lucide components
const ICON_MAP = {
  users: Users,
  calendar: Calendar,
  alert: AlertCircle,
  trending: TrendingUp,
  bell: Bell,
  briefcase: Briefcase,
};

export type IconKey = keyof typeof ICON_MAP;

interface DashboardHeaderProps {
  role: "admin" | "hod" | "employee" | "super_admin";
  stats?: {
    label: string;
    value: string | number;
    icon: IconKey; // Expect a string key (e.g., "users"), not a Component
    color: string;
  }[];
}

export function DashboardHeader({ role, stats }: DashboardHeaderProps) {
  const defaultStats = [
    {
      label: "Total Employees",
      value: "0",
      icon: "users" as IconKey,
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    },
  ];

  const displayStats = stats || defaultStats;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
      {displayStats.map((stat, index) => {
        const IconComponent = ICON_MAP[stat.icon]; 
        return (
          <Card key={index} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-2">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                {IconComponent && <IconComponent size={24} />}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}