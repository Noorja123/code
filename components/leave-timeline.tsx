"use client";

import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

interface LeaveRecord {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface LeaveTimelineProps {
  leaves: LeaveRecord[];
}

export function LeaveTimeline({ leaves }: LeaveTimelineProps) {
  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900",
      hod_approved: "bg-blue-100 text-blue-800 dark:bg-blue-900",
      admin_approved: "bg-green-100 text-green-800 dark:bg-green-900",
      hod_rejected: "bg-red-100 text-red-800 dark:bg-red-900",
      admin_rejected: "bg-red-100 text-red-800 dark:bg-red-900",
    };
    return colors[status] || colors.pending;
  };

  return (
    <div className="space-y-3">
      {leaves.map((leave, index) => (
        <div key={leave.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-4 h-4 rounded-full bg-blue-500 border-4 border-background"></div>
            {index !== leaves.length - 1 && (
              <div className="w-1 h-12 bg-border mt-2"></div>
            )}
          </div>
          <div className="pb-8 flex-1">
            <div className="bg-card p-3 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold capitalize">{leave.leave_type} Leave</p>
                <Badge className={getStatusColor(leave.status)}>
                  {leave.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {new Date(leave.start_date).toLocaleDateString()} -{" "}
                {new Date(leave.end_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
