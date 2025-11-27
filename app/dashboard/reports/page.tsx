"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SidebarNav } from "@/components/sidebar-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BarChart3, AlertCircle, Users, Calendar, CheckCircle, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ReportStats {
  totalEmployees: number;
  totalLeaves: number;
  totalDepartments: number;
  avgAttendance: number;
  leavesThisMonth: number;
  approvedLeaves: number;
}

interface DepartmentStats {
  name: string;
  employees: number;
  avgAttendance: number;
  pendingLeaves: number;
}

export default function ReportsPage() {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [deptStats, setDeptStats] = useState<DepartmentStats[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().split("T")[0].slice(0, 7)
  );
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchReports = async () => {
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

        // ✅ FIX: Allow Super Admin access
        if (profileData.role !== "admin" && profileData.role !== "super_admin") {
          // Instead of redirecting immediately, we just stop loading
          // The UI below handles the "No Permission" message
          setLoading(false);
          return;
        }

        setProfile(profileData);

        // Fetch all stats
        const { data: employeesData } = await supabase
          .from("profiles")
          .select("*");

        const { data: leavesData } = await supabase
          .from("leaves")
          .select("*");

        const { data: departmentsData } = await supabase
          .from("departments")
          .select("*");

        const { data: attendanceData } = await supabase
          .from("attendance")
          .select("*");

        const currentMonth = selectedMonth;
        const leavesThisMonth = leavesData?.filter((leave: any) => {
          const leaveMonth = leave.created_at.split("T")[0].slice(0, 7);
          return leaveMonth === currentMonth;
        }).length || 0;

        const approvedLeaves = leavesData?.filter(
          (leave: any) =>
            leave.status === "admin_approved" ||
            leave.status === "hod_approved"
        ).length || 0;

        const totalEmployees = employeesData?.filter(
          (emp: any) => emp.role === "employee"
        ).length || 0;

        const avgAttendanceRate = attendanceData && attendanceData.length > 0
          ? (attendanceData.filter(
              (rec: any) => rec.status === "present"
            ).length / Math.max(attendanceData.length, 1)) *
            100
          : 0;

        setStats({
          totalEmployees,
          totalLeaves: leavesData?.length || 0,
          totalDepartments: departmentsData?.length || 0,
          avgAttendance: Math.round(avgAttendanceRate),
          leavesThisMonth,
          approvedLeaves,
        });

        // Fetch department stats
        const deptStatsList: DepartmentStats[] = [];
        for (const dept of departmentsData || []) {
          const deptEmployees = employeesData?.filter(
            (emp: any) => emp.department_id === dept.id && emp.role === "employee"
          ).length || 0;

          const deptAttendance = attendanceData?.filter(
            (rec: any) =>
              rec.department_id === dept.id && rec.status === "present"
          ).length || 0;

          const deptPendingLeaves = leavesData?.filter(
            (leave: any) =>
              leave.department_id === dept.id && leave.status === "pending"
          ).length || 0;

          const deptAvgAttendance =
            deptEmployees > 0
              ? Math.round(
                  (deptAttendance / Math.max(deptEmployees * 20, 1)) * 100
                )
              : 0;

          deptStatsList.push({
            name: dept.name,
            employees: deptEmployees,
            avgAttendance: deptAvgAttendance,
            pendingLeaves: deptPendingLeaves,
          });
        }

        setDeptStats(deptStatsList);
      } catch (err) {
        setError("Failed to load reports");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [selectedMonth]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <SidebarNav role={profile?.role || "admin"} />
        <main className="flex-1 md:ml-64 p-8">
          <p className="text-muted-foreground">Loading...</p>
        </main>
      </div>
    );
  }

  // ✅ FIX: Update Permission Check in UI
  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
    return (
      <div className="flex min-h-screen bg-background">
        {/* Pass "admin" as fallback role just to render sidebar */}
        <SidebarNav role="admin" />
        <main className="flex-1 md:ml-64 p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to view this page.
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNav role={profile.role} userName={`${profile?.first_name} ${profile?.last_name}`} />
      
      <main className="flex-1 md:ml-64">
        <div className="p-4 md:p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Reports & Analytics</h1>
              <p className="text-muted-foreground mt-2">
                Company-wide analytics and insights
              </p>
            </div>
            <div className="w-40">
              <Label htmlFor="month" className="text-sm">
                Select Month
              </Label>
              <input
                id="month"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 mt-2 text-sm"
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {stats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total Employees
                        </p>
                        <p className="text-2xl font-bold mt-2">
                          {stats.totalEmployees}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        <Users size={24} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Avg Attendance
                        </p>
                        <p className="text-2xl font-bold mt-2">
                          {stats.avgAttendance}%
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                        <TrendingUp size={24} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total Leaves
                        </p>
                        <p className="text-2xl font-bold mt-2">
                          {stats.totalLeaves}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                        <Calendar size={24} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Approved Leaves
                        </p>
                        <p className="text-2xl font-bold mt-2">
                          {stats.approvedLeaves}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                        <CheckCircle size={24} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Leaves This Month
                        </p>
                        <p className="text-2xl font-bold mt-2">
                          {stats.leavesThisMonth}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                        <Calendar size={24} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Departments
                        </p>
                        <p className="text-2xl font-bold mt-2">
                          {stats.totalDepartments}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                        <BarChart3 size={24} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Department Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {deptStats.map((dept) => (
                      <div key={dept.name} className="pb-4 border-b last:border-b-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{dept.name}</h3>
                          <span className="text-2xl font-bold">
                            {dept.avgAttendance}%
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              Employees:
                            </span>
                            <span className="ml-2 font-medium">
                              {dept.employees}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Attendance:
                            </span>
                            <span className="ml-2 font-medium">
                              {dept.avgAttendance}%
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Pending Leaves:
                            </span>
                            <span className="ml-2 font-medium">
                              {dept.pendingLeaves}
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2 dark:bg-gray-700">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${dept.avgAttendance}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}