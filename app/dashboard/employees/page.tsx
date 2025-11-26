"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SidebarNav } from "@/components/sidebar-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Search, AlertCircle, ShieldCheck, Lock, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { adminUpdatePassword } from "@/app/actions/auth";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  position: string;
  department_id: string;
}

interface Department {
  id: string;
  name: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Password Change State
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // Toggle state
  const [isUpdating, setIsUpdating] = useState(false);

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

        const { data: deptData } = await supabase
          .from("departments")
          .select("*");
        setDepartments(deptData || []);

        let query = supabase.from("profiles").select("*");

        if (profileData.role === "hod") {
          query = query.eq("department_id", profileData.department_id);
        }

        const { data: empData } = await query;
        setEmployees(empData || []);
      } catch (err) {
        setError("Failed to load employees");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRoleChange = async (employeeId: string, newRole: string) => {
    setError(null);
    setSuccess(null);
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", employeeId);

      if (updateError) throw updateError;

      setSuccess("User role updated successfully!");
      
      setEmployees(employees.map(emp => 
        emp.id === employeeId ? { ...emp, role: newRole } : emp
      ));

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError("Failed to update role");
    }
  };

  const openPasswordDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setNewPassword("");
    setShowPassword(false); // Reset visibility
    setPasswordDialogOpen(true);
  };

  const handlePasswordUpdate = async () => {
    if (!selectedEmployee || newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const result = await adminUpdatePassword(selectedEmployee.id, newPassword);
      
      if (result.error) {
        throw new Error(result.error);
      }

      setSuccess(`Password updated for ${selectedEmployee.first_name}`);
      setPasswordDialogOpen(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (emp.first_name?.toLowerCase() || "").includes(term) ||
      (emp.last_name?.toLowerCase() || "").includes(term) ||
      (emp.email?.toLowerCase() || "").includes(term);

    const matchesDept =
      selectedDept === "all" || emp.department_id === selectedDept;

    return matchesSearch && matchesDept;
  });

  const getRoleBadge = (role: string) => {
    const variants: { [key: string]: string } = {
      super_admin: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      hod: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      employee: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
    return variants[role] || variants.employee;
  };

  const getDepartmentName = (deptId: string) => {
    return departments.find((d) => d.id === deptId)?.name || "Unknown";
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
            <h1 className="text-3xl font-bold">Employees</h1>
            <p className="text-muted-foreground mt-2">
              Manage and view employee information
            </p>
          </div>

          {success && (
            <Alert className="mb-6 bg-green-50 border-green-200 dark:bg-green-900/20">
              <ShieldCheck className="h-4 w-4 text-green-600" />
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
              <CardTitle>Search & Filter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="search">Search Employees</Label>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Name or email..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                {(profile?.role === "admin" || profile?.role === "super_admin") && (
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Select value={selectedDept} onValueChange={setSelectedDept}>
                      <SelectTrigger id="department" className="mt-2">
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {filteredEmployees.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <Users size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No employees found</p>
                </CardContent>
              </Card>
            ) : (
              filteredEmployees.map((emp) => (
                <Card key={emp.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">
                            {emp.first_name} {emp.last_name}
                          </h3>
                          
                          <div className="flex items-center gap-2">
                            {/* Role Changer: Super Admin Only */}
                            {profile?.role === 'super_admin' && emp.id !== profile.id ? (
                              <Select 
                                defaultValue={emp.role} 
                                onValueChange={(val) => handleRoleChange(emp.id, val)}
                              >
                                <SelectTrigger className="w-[120px] h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="employee">Employee</SelectItem>
                                  <SelectItem value="hod">HOD</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="super_admin">Super Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge className={getRoleBadge(emp.role)}>
                                {emp.role.replace('_', ' ')}
                              </Badge>
                            )}

                            {/* Password Reset: Super Admin, Admin, HOD */}
                            {emp.id !== profile.id && (
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-7 w-7"
                                onClick={() => openPasswordDialog(emp)}
                                title="Reset Password"
                              >
                                <Lock className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-1">
                          {emp.email}
                        </p>
                        <p className="text-sm">
                          {emp.position} •{" "}
                          <span className="font-medium">
                            {getDepartmentName(emp.department_id)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Password Change Dialog */}
          <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset Password</DialogTitle>
                <DialogDescription>
                  Set a new password for {selectedEmployee?.first_name} {selectedEmployee?.last_name}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="sr-only">Toggle password visibility</span>
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handlePasswordUpdate} disabled={isUpdating}>
                  {isUpdating ? "Updating..." : "Update Password"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </main>
    </div>
  );
}