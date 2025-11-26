"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SidebarNav } from "@/components/sidebar-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Leave {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
  reason: string;
  hod_notes?: string;
  admin_notes?: string;
}

export default function MyLeavesPage() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    leave_type: "casual",
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
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

        const { data: leavesData } = await supabase
          .from("leaves")
          .select("*")
          .eq("employee_id", user.id)
          .order("created_at", { ascending: false });

        setLeaves(leavesData || []);
      } catch (err) {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. NEW LOGIC: Check role to determine initial status
      // If HOD, set to 'hod_approved' so it goes straight to Admin
      // If Employee, set to 'pending' for HOD review
      const initialStatus = profile.role === 'hod' ? 'hod_approved' : 'pending';

      const { error: insertError } = await supabase.from("leaves").insert({
        employee_id: user.id,
        department_id: profile.department_id,
        leave_type: formData.leave_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason,
        status: initialStatus, // Using the dynamic status
      });

      if (insertError) throw insertError;

      setSuccess("Leave request submitted successfully!");
      setFormData({
        leave_type: "casual",
        start_date: "",
        end_date: "",
        reason: "",
      });
      setShowForm(false);

      const { data: updatedLeaves } = await supabase
        .from("leaves")
        .select("*")
        .eq("employee_id", user.id)
        .order("created_at", { ascending: false });
      setLeaves(updatedLeaves || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit leave request");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: string } = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      hod_approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      admin_approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      hod_rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      admin_rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    };
    return variants[status] || variants.pending;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        {/* Pass loading state or default role to avoid layout shift */}
        <SidebarNav role={profile?.role || "employee"} />
        <main className="flex-1 md:ml-64 p-8">
          <p className="text-muted-foreground">Loading...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* 2. FIXED: Pass the actual profile role, not hardcoded 'employee' */}
      <SidebarNav role={profile?.role} userName={`${profile?.first_name} ${profile?.last_name}`} />
      
      <main className="flex-1 md:ml-64">
        <div className="p-4 md:p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">My Leave Requests</h1>
              <p className="text-muted-foreground mt-2">
                Manage and track your leave requests
              </p>
            </div>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus size={16} className="mr-2" />
              Request Leave
            </Button>
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

          {showForm && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Request New Leave</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="leave_type">Leave Type</Label>
                      <Select
                        value={formData.leave_type}
                        onValueChange={(value) =>
                          setFormData({ ...formData, leave_type: value })
                        }
                      >
                        <SelectTrigger id="leave_type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="casual">Casual Leave</SelectItem>
                          <SelectItem value="sick">Sick Leave</SelectItem>
                          <SelectItem value="personal">Personal Leave</SelectItem>
                          <SelectItem value="annual">Annual Leave</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="start_date">Start Date</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) =>
                          setFormData({ ...formData, start_date: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="end_date">End Date</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) =>
                          setFormData({ ...formData, end_date: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="reason">Reason</Label>
                    <Input
                      id="reason"
                      placeholder="Reason for leave..."
                      value={formData.reason}
                      onChange={(e) =>
                        setFormData({ ...formData, reason: e.target.value })
                      }
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit">Submit Request</Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {leaves.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No leave requests yet</p>
                </CardContent>
              </Card>
            ) : (
              leaves.map((leave) => (
                <Card key={leave.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold capitalize">
                            {leave.leave_type} Leave
                          </h3>
                          <Badge className={getStatusBadge(leave.status)}>
                            {leave.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {new Date(leave.start_date).toLocaleDateString()} -{" "}
                          {new Date(leave.end_date).toLocaleDateString()}
                        </p>
                        <p className="text-sm">{leave.reason}</p>
                        {leave.hod_notes && (
                          <p className="text-sm mt-2 text-blue-600 dark:text-blue-400">
                            HOD Notes: {leave.hod_notes}
                          </p>
                        )}
                        {leave.admin_notes && (
                          <p className="text-sm mt-2 text-green-600 dark:text-green-400">
                            Admin Notes: {leave.admin_notes}
                          </p>
                        )}
                      </div>
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