"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SidebarNav } from "@/components/sidebar-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, CheckCircle, X, AlertCircle, History, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Leave {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
  reason: string;
  hod_notes?: string;
  admin_notes?: string;
  employee_name?: string;
  created_at: string;
}

export default function LeavesPage() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [notes, setNotes] = useState("");
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

        let query = supabase
          .from("leaves")
          .select(`*, profiles!employee_id(first_name, last_name)`);

        if (profileData.role === "hod") {
          query = query.eq("department_id", profileData.department_id);
        } else if (profileData.role === "admin" || profileData.role === "super_admin") {
          // Admin sees everything
        } else {
          setLeaves([]);
          setLoading(false);
          return;
        }

        const { data: leavesData } = await query.order("created_at", {
          ascending: false,
        });

        const formattedLeaves = (leavesData || []).map((leave: any) => ({
          ...leave,
          employee_name: `${leave.profiles?.first_name} ${leave.profiles?.last_name}`,
        }));

        setLeaves(formattedLeaves);
      } catch (err) {
        setError("Failed to load leave requests");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getFilteredLeaves = (type: 'pending' | 'history') => {
    if (!profile) return [];

    return leaves.filter((leave) => {
      if (profile.role === "hod") {
        if (type === 'pending') return leave.status === "pending";
        return leave.status !== "pending";
      } 
      
      if (profile.role === "admin" || profile.role === "super_admin") {
        // Admin Pending: Status is 'hod_approved' (waiting for admin) OR 'pending' if HOD submitted it
        if (type === 'pending') return leave.status === "hod_approved";
        return ["admin_approved", "admin_rejected", "hod_rejected"].includes(leave.status);
      }

      return false;
    });
  };

  const handleApprove = async () => {
    if (!selectedLeave) return;
    setError(null);
    setSuccess(null);

    try {
      const newStatus =
        profile.role === "hod" ? "hod_approved" : "admin_approved";
      const notesField =
        profile.role === "hod" ? "hod_notes" : "admin_notes";
      const dateField =
        profile.role === "hod" ? "hod_approval_date" : "admin_approval_date";
      const approverIdField = 
        profile.role === "hod" ? "hod_id" : "admin_id";

      const { error: updateError } = await supabase
        .from("leaves")
        .update({
          status: newStatus,
          [notesField]: notes,
          [dateField]: new Date().toISOString(),
          [approverIdField]: profile.id,
        })
        .eq("id", selectedLeave.id);

      if (updateError) throw updateError;

      setSuccess(
        profile.role === "hod" 
          ? "Leave approved! Sent to Admin." 
          : "Leave request fully approved!"
      );

      setLeaves(current => 
        current.map(l => l.id === selectedLeave.id ? { ...l, status: newStatus, [notesField]: notes } : l)
      );
      
      setSelectedLeave(null);
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve leave");
    }
  };

  const handleReject = async () => {
    if (!selectedLeave) return;
    setError(null);
    setSuccess(null);

    try {
      const newStatus =
        profile.role === "hod" ? "hod_rejected" : "admin_rejected";
      const notesField =
        profile.role === "hod" ? "hod_notes" : "admin_notes";

      const { error: updateError } = await supabase
        .from("leaves")
        .update({
          status: newStatus,
          [notesField]: notes,
        })
        .eq("id", selectedLeave.id);

      if (updateError) throw updateError;

      setSuccess("Leave request rejected.");

      setLeaves(current => 
        current.map(l => l.id === selectedLeave.id ? { ...l, status: newStatus, [notesField]: notes } : l)
      );

      setSelectedLeave(null);
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject leave");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: string } = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      hod_approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      admin_approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      hod_rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      admin_rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return variants[status] || variants.pending;
  };

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

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNav role={profile?.role} userName={`${profile?.first_name} ${profile?.last_name}`} />
      
      <main className="flex-1 md:ml-64">
        <div className="p-4 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Leave Management</h1>
            <p className="text-muted-foreground mt-2">
              Review incoming requests and view history
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Tabs defaultValue="pending" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="pending">Pending Reviews</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="pending">
                  <div className="space-y-3">
                    {getFilteredLeaves('pending').length === 0 ? (
                      <Card>
                        <CardContent className="pt-6 text-center text-muted-foreground">
                          <CheckCircle size={32} className="mx-auto mb-2 opacity-50" />
                          <p>No pending requests!</p>
                        </CardContent>
                      </Card>
                    ) : (
                      getFilteredLeaves('pending').map((leave) => (
                        <LeaveCard 
                          key={leave.id} 
                          leave={leave} 
                          isSelected={selectedLeave?.id === leave.id}
                          onClick={() => {
                            setSelectedLeave(leave);
                            setSuccess(null);
                            setNotes("");
                          }}
                          statusColor={getStatusBadge(leave.status)}
                        />
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="history">
                  <div className="space-y-3">
                    {getFilteredLeaves('history').length === 0 ? (
                      <Card>
                        <CardContent className="pt-6 text-center text-muted-foreground">
                          <History size={32} className="mx-auto mb-2 opacity-50" />
                          <p>No history found</p>
                        </CardContent>
                      </Card>
                    ) : (
                      getFilteredLeaves('history').map((leave) => (
                        <LeaveCard 
                          key={leave.id} 
                          leave={leave} 
                          isSelected={selectedLeave?.id === leave.id}
                          onClick={() => {
                            setSelectedLeave(leave);
                            setSuccess(null);
                            setNotes(profile.role === 'hod' ? leave.hod_notes || "" : leave.admin_notes || "");
                          }}
                          statusColor={getStatusBadge(leave.status)}
                        />
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Review Panel */}
            {selectedLeave && (
              <Card className="h-fit sticky top-4 border-primary/20 shadow-md">
                <CardHeader>
                  <CardTitle>Review Action</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Employee</p>
                    <p className="font-semibold">{selectedLeave.employee_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-semibold capitalize">
                      {selectedLeave.leave_type}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Dates</p>
                    <p className="font-semibold">
                      {new Date(selectedLeave.start_date).toLocaleDateString()} -{" "}
                      {new Date(selectedLeave.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reason</p>
                    <p className="font-medium">{selectedLeave.reason}</p>
                  </div>

                  {/* ✅ NEW: Show HOD Notes for Admins */}
                  {selectedLeave.hod_notes && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-100 dark:border-blue-800">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1 flex items-center gap-1">
                        <MessageSquare size={12} />
                        Head of Department Note
                      </p>
                      <p className="text-sm text-blue-800 dark:text-blue-200 italic">
                        "{selectedLeave.hod_notes}"
                      </p>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t">
                    <Label htmlFor="notes">Your Decision Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  
                  <div className="flex gap-2 flex-col pt-2">
                    {/* Only show buttons if the status allows action for this role */}
                    {(profile.role === 'hod' && selectedLeave.status === 'pending') || 
                     ((profile.role === 'admin' || profile.role === 'super_admin') && selectedLeave.status === 'hod_approved') ? (
                      <>
                        <Button
                          onClick={handleApprove}
                          className="bg-green-600 hover:bg-green-700 w-full"
                        >
                          <CheckCircle size={16} className="mr-2" />
                          {profile.role === 'hod' ? 'Approve & Send to Admin' : 'Final Approve'}
                        </Button>
                        <Button
                          onClick={handleReject}
                          variant="destructive"
                          className="w-full"
                        >
                          <X size={16} className="mr-2" />
                          Reject
                        </Button>
                      </>
                    ) : (
                      <p className="text-center text-sm text-muted-foreground italic">
                        This request has already been processed.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function LeaveCard({ leave, isSelected, onClick, statusColor }: any) {
  return (
    <Card
      className={`cursor-pointer transition hover:bg-accent/50 ${
        isSelected ? "ring-2 ring-primary border-primary" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold">
                {leave.employee_name}
              </h3>
              <Badge className={statusColor}>
                {leave.status.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              {leave.leave_type.charAt(0).toUpperCase() + leave.leave_type.slice(1)} Leave
            </p>
            <p className="text-sm font-medium">
              {new Date(leave.start_date).toLocaleDateString()} -{" "}
              {new Date(leave.end_date).toLocaleDateString()}
            </p>
            {/* Show if HOD notes exist in list view too */}
            {leave.hod_notes && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <MessageSquare size={12} /> Has HOD Comments
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}