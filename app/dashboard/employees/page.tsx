"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SidebarNav } from "@/components/sidebar-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Users, Search, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
  // ✅ FIX: Initialize with "all" instead of empty string
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
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

  const filteredEmployees = employees.filter((emp) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (emp.first_name?.toLowerCase() || "").includes(term) ||
      (emp.last_name?.toLowerCase() || "").includes(term) ||
      (emp.email?.toLowerCase() || "").includes(term);

    // ✅ FIX: Check for "all" instead of truthiness of empty string
    const matchesDept =
      selectedDept === "all" || emp.department_id === selectedDept;

    return matchesSearch && matchesDept;
  });

  const getRoleBadge = (role: string) => {
    const variants: { [key: string]: string } = {
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
                {profile?.role === "admin" && (
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Select value={selectedDept} onValueChange={setSelectedDept}>
                      <SelectTrigger id="department" className="mt-2">
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* ✅ FIX: Changed value from "" to "all" */}
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
                          <Badge className={getRoleBadge(emp.role)}>
                            {emp.role}
                          </Badge>
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
        </div>
      </main>
    </div>
  );
}