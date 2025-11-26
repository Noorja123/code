// app/dashboard/page.tsx

import { redirect } from 'next/navigation';
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/sidebar-nav";
import { DashboardHeader } from "@/components/dashboard-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, AlertTriangle } from 'lucide-react';

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

  // ------------------------------------------------------------------
  // ✅ FIX: Show Error UI instead of redirecting to prevent loops
  // ------------------------------------------------------------------
  // ✅ CORRECT LOGIC
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
  // ------------------------------------------------------------------

  const role = profile.role as "admin" | "hod" | "employee";

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

          <DashboardHeader role={role} />

          {/* Dashboard Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {role === "employee" && (
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
                  <p className="font-medium capitalize">{profile.role}</p>
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