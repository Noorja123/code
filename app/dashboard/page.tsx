import { redirect } from 'next/navigation';
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/sidebar-nav";
import { DashboardHeader } from "@/components/dashboard-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, AlertTriangle } from 'lucide-react';
import type { IconKey } from "@/components/dashboard-header";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg max-w-md">
          <h2 className="text-red-800 font-bold mb-2">Profile Not Found</h2>
          <p className="text-red-600 text-sm mb-4">
            Your account exists, but your employee profile is missing.
          </p>
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  const role = profile.role as "admin" | "hod" | "employee" | "super_admin";

  // --- 1. Fetch Real Statistics ---
  
  // A. Total Employees (or Team Members for Employee)
  let employeeQuery = supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'employee');
  if (role === 'hod') {
    employeeQuery = employeeQuery.eq('department_id', profile.department_id);
  } else if (role === 'employee') {
    employeeQuery = employeeQuery.eq('department_id', profile.department_id);
  }
  const { count: employeeCount } = await employeeQuery;

  // B. Pending Leaves (Context aware)
  let leaveQuery = supabase.from('leaves').select('*', { count: 'exact', head: true });
  if (role === 'hod') {
    leaveQuery = leaveQuery.eq('department_id', profile.department_id).eq('status', 'pending');
  } else if (role === 'admin' || role === 'super_admin') {
    leaveQuery = leaveQuery.eq('status', 'hod_approved');
  } else {
    leaveQuery = leaveQuery.eq('employee_id', user.id).eq('status', 'pending');
  }
  const { count: pendingLeaveCount } = await leaveQuery;

  // C. Announcements
  const { count: announcementCount } = await supabase
    .from('announcements')
    .select('*', { count: 'exact', head: true });

  // D. Performance Average
  let perfQuery = supabase.from('performance_reviews').select('rating');
  if (role === 'employee') {
    perfQuery = perfQuery.eq('employee_id', user.id);
  }
  const { data: reviews } = await perfQuery;
  
  const avgRating = reviews && reviews.length > 0
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1)
    : "0.0";


  // --- 2. Construct Stats Objects (Using STRINGS for icons now) ---
  const stats = [
    {
      label: role === 'employee' ? "My Team Members" : "Total Employees",
      value: employeeCount || 0,
      icon: "users" as IconKey, // Passed as string
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    },
    {
      label: role === 'employee' ? "My Pending Requests" : "Pending Reviews",
      value: pendingLeaveCount || 0,
      icon: "calendar" as IconKey, // Passed as string
      color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    },
    {
      label: "Announcements",
      value: announcementCount || 0,
      icon: "bell" as IconKey, // Passed as string
      color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    },
    {
      label: "Avg Performance",
      value: avgRating,
      icon: "trending" as IconKey, // Passed as string
      color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNav role={role} userName={`${profile.first_name} ${profile.last_name}`} />
      
      <main className="flex-1 md:ml-64">
        <div className="p-4 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Welcome back, {profile.first_name}!</h1>
            <p className="text-muted-foreground mt-2">
              Here&apos;s what&apos;s happening in your organization today.
            </p>
          </div>

          <DashboardHeader role={role} stats={stats} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(role === "employee" || role === "hod") && (
                  <Link href="/dashboard/my-leaves">
                    <Button variant="outline" className="w-full justify-between">
                      Request Leave
                      <ArrowRight size={16} />
                    </Button>
                  </Link>
                )}
                {role !== "employee" && (
                  <>
                    <Link href="/dashboard/leaves">
                      <Button variant="outline" className="w-full justify-between">
                        Review Leave Requests
                        <ArrowRight size={16} />
                      </Button>
                    </Link>
                    <Link href="/dashboard/employees">
                      <Button variant="outline" className="w-full justify-between">
                        Manage Employees
                        <ArrowRight size={16} />
                      </Button>
                    </Link>
                  </>
                )}
                <Link href="/dashboard/announcements">
                  <Button variant="outline" className="w-full justify-between">
                    View Announcements
                    <ArrowRight size={16} />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profile Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{profile.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Role</p>
                  <p className="font-medium capitalize">{profile.role.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Position</p>
                  <p className="font-medium">{profile.position || "Not set"}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}