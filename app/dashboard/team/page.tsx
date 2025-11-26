"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SidebarNav } from "@/components/sidebar-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Search, AlertCircle, Mail, Phone, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  phone: string;
  address: string;
  avatar_url: string;
}

export default function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchTeam = async () => {
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
          .from("profiles")
          .select("*");

        if (profileData.role === "hod") {
          query = query
            .eq("department_id", profileData.department_id)
            .neq("id", user.id);
        } else if (profileData.role === "employee") {
          query = query
            .eq("department_id", profileData.department_id)
            .neq("id", user.id);
        }

        const { data: teamData } = await query;
        setTeamMembers(teamData || []);
      } catch (err) {
        setError("Failed to load team members");
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, []);

  const filteredMembers = teamMembers.filter((member) =>
    `${member.first_name} ${member.last_name}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <h1 className="text-3xl font-bold">My Team</h1>
            <p className="text-muted-foreground mt-2">
              Connect with your team members
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
              <CardTitle>Search Team</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.length === 0 ? (
              <div className="col-span-full">
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    <Users size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No team members found</p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              filteredMembers.map((member) => (
                <Card key={member.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">
                          {member.first_name} {member.last_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {member.position || "Not specified"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      {member.email && (
                        <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                          <Mail size={16} />
                          <a href={`mailto:${member.email}`} className="hover:underline">
                            {member.email}
                          </a>
                        </div>
                      )}
                      {member.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                          <Phone size={16} />
                          <a href={`tel:${member.phone}`} className="hover:underline">
                            {member.phone}
                          </a>
                        </div>
                      )}
                      {member.address && (
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                          <span className="text-xs">{member.address}</span>
                        </div>
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
