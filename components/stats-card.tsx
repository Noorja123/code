"use client";

import { Card, CardContent } from "./ui/card";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size: number }>;
  color: string;
  trend?: {
    value: number;
    direction: "up" | "down";
  };
}

export function StatsCard({
  label,
  value,
  icon: Icon,
  color,
  trend,
}: StatsCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-2">{value}</p>
            {trend && (
              <p
                className={`text-xs mt-2 ${
                  trend.direction === "up"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {trend.direction === "up" ? "↑" : "↓"} {Math.abs(trend.value)}%
              </p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon size={24} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
