"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SidebarNav } from "@/components/sidebar-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  check_in: string;
  check_out: string;
  date: string;
  status: string;
  employee_name: string;
}

export default function AttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState<string>("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkIn = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth/login");
          return;
        }

        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        setProfile(profileData);

        if (profileData.role === "employee") {
          const today = new Date().toISOString().split("T")[0];

          const { data: existingRecord } = await supabase
            .from("attendance")
            .select("*")
            .eq("employee_id", user.id)
            .eq("date", today)
            .single();

          if (!existingRecord) {
            await supabase.from("attendance").insert({
              employee_id: user.id,
              department_id: profileData.department_id,
              date: today,
              status: "present",
              check_in: new Date().toISOString(),
            });
          }
        }
      } catch (err) {
        console.error("Check-in error:", err);
      }
    };

    checkIn();
    loadAttendance();
  }, []);

  const loadAttendance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      let query = supabase
        .from("attendance")
        .select(`*, profiles!employee_id(first_name, last_name)`)
        .eq("date", selectedDate);

      if (profileData.role === "hod") {
        query = query.eq("department_id", profileData.department_id);
      } else if (profileData.role === "employee") {
        query = query.eq("employee_id", user.id);
      }

      const { data: attendanceData } = await query.order("check_in", {
        ascending: false,
      });

      const formatted = (attendanceData || []).map((rec: any) => ({
        ...rec,
        employee_name: `${rec.profiles?.first_name} ${rec.profiles?.last_name}`,
      }));

      setAttendance(formatted);
    } catch (err) {
      setError("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async (attendanceId: string) => {
    try {
      const { error: updateError } = await supabase
        .from("attendance")
        .update({ check_out: new Date().toISOString() })
        .eq("id", attendanceId);

      if (updateError) throw updateError;

      setSuccess("Checked out successfully!");
      setTimeout(() => setSuccess(null), 2000);
      loadAttendance();
    } catch (err) {
      setError("Failed to check out");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: string } = {
      present: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      absent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      half_day: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      leave: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    };
    return variants[status] || variants.present;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <SidebarNav role={profile?.role || "employee"} />
        <main className="flex-1 md:ml-64 p-8">
          <p className="text-muted-foreground">Loading...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNav role={profile?.role} userName={`${profile?.first_name} ${profile?.last_name}`} />
      
      <main className="flex-1 md:ml-64">
        <div className="p-4 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Attendance Tracking</h1>
            <p className="text-muted-foreground mt-2">
              Monitor and manage attendance records
            </p>
          </div>

          {success && (
            <Alert className="mb-6 bg-green-50 border-green-200 dark:bg-green-900/20">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <input
                    id="date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setLoading(true);
                      setTimeout(loadAttendance, 300);
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 mt-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {attendance.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <Clock size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No attendance records</p>
                </CardContent>
              </Card>
            ) : (
              attendance.map((record) => (
                <Card key={record.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{record.employee_name}</h3>
                          <Badge className={getStatusBadge(record.status)}>
                            {record.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {record.date}
                        </p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Check-in: </span>
                            <span className="font-medium">
                              {record.check_in
                                ? new Date(record.check_in).toLocaleTimeString()
                                : "Not checked in"}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Check-out: </span>
                            <span className="font-medium">
                              {record.check_out
                                ? new Date(record.check_out).toLocaleTimeString()
                                : "Not checked out"}
                            </span>
                          </div>
                        </div>
                      </div>
                      {profile?.role === "employee" &&
                        !record.check_out &&
                        new Date(record.date).toDateString() ===
                          new Date().toDateString() && (
                          <Button
                            onClick={() => handleCheckOut(record.id)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Check Out
                          </Button>
                        )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
