import { redirect } from 'next/navigation';
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/sidebar-nav";
import { DashboardHeader } from "@/components/dashboard-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, AlertTriangle } from 'lucide-react'; // Added AlertTriangle

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
  // ✅ FIX: Handle missing profile to prevent redirect loop
  // ------------------------------------------------------------------
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-red-200 bg-red-50 dark:bg-red-900/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Profile Not Found
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-red-600 dark:text-red-300">
              Your account is authenticated, but your employee profile is missing.
            </p>
            <Button 
              variant="outline" 
              className="w-full border-red-200 hover:bg-red-100"
              asChild
            >
              <Link href="/auth/login">Back to Login</Link>
            </Button>
          </CardContent>
        </Card>
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