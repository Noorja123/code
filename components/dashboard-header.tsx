"use client";

import { Card } from "./ui/card";
import { Users, Calendar, AlertCircle, TrendingUp } from 'lucide-react';

interface DashboardHeaderProps {
  role: "admin" | "hod" | "employee";
  stats?: {
    label: string;
    value: string | number;
    icon: React.ComponentType;
    color: string;
  }[];
}

export function DashboardHeader({ role, stats }: DashboardHeaderProps) {
  const defaultStats = [
    {
      label: "Total Employees",
      value: "145",
      icon: Users,
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    },
    {
      label: "Pending Leaves",
      value: "12",
      icon: Calendar,
      color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    },
    {
      label: "Active Alerts",
      value: "3",
      icon: AlertCircle,
      color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    },
    {
      label: "Department AVG",
      value: "4.2",
      icon: TrendingUp,
      color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    },
  ];

  const displayStats = stats || defaultStats;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {displayStats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-2">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <Icon size={24} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
