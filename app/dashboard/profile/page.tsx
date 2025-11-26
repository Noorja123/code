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
import { User, AlertCircle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  position: string;
  phone: string;
  address: string;
  department_id: string;
  avatar_url: string;
}

interface Department {
  id: string;
  name: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Profile>>({});
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
        setFormData(profileData);

        const { data: deptData } = await supabase
          .from("departments")
          .select("*");
        setDepartments(deptData || []);
      } catch (err) {
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          position: formData.position,
          phone: formData.phone,
          address: formData.address,
          department_id: formData.department_id,
        })
        .eq("id", profile?.id);

      if (updateError) throw updateError;

      setSuccess("Profile updated successfully!");
      setEditing(false);
      setProfile(formData as Profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <SidebarNav role="employee" />
        <main className="flex-1 md:ml-64 p-8">
          <p className="text-muted-foreground">Loading...</p>
        </main>
      </div>
    );
  }

  const getDepartmentName = (deptId: string) => {
    return departments.find((d) => d.id === deptId)?.name || "Not assigned";
  };

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNav role={profile?.role as any} userName={`${profile?.first_name} ${profile?.last_name}`} />
      
      <main className="flex-1 md:ml-64">
        <div className="p-4 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-muted-foreground mt-2">
              Manage your personal information
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

          {profile && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Profile Information</CardTitle>
                  <Button
                    onClick={() => setEditing(!editing)}
                    variant={editing ? "destructive" : "default"}
                  >
                    {editing ? "Cancel" : "Edit Profile"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first_name">First Name</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            first_name: e.target.value,
                          })
                        }
                        disabled={!editing}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            last_name: e.target.value,
                          })
                        }
                        disabled={!editing}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email || ""}
                        disabled
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Input
                        id="role"
                        value={formData.role || ""}
                        disabled
                        className="mt-2 capitalize"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="position">Position</Label>
                      <Input
                        id="position"
                        value={formData.position || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            position: e.target.value,
                          })
                        }
                        disabled={!editing}
                        className="mt-2"
                        placeholder="Your job title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            phone: e.target.value,
                          })
                        }
                        disabled={!editing}
                        className="mt-2"
                        placeholder="Your phone number"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: e.target.value,
                        })
                      }
                      disabled={!editing}
                      className="mt-2"
                      placeholder="Your address"
                    />
                  </div>

                  {profile.role === "employee" && (
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Select
                        value={formData.department_id || ""}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            department_id: value,
                          })
                        }
                        disabled={!editing}
                      >
                        <SelectTrigger id="department" className="mt-2">
                          <SelectValue
                            placeholder={getDepartmentName(
                              formData.department_id || ""
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {editing && (
                    <Button onClick={handleSave} className="w-full">
                      Save Changes
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
