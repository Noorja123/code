"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SidebarNav } from "@/components/sidebar-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Bell, Plus, CheckCircle, AlertCircle, Megaphone, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  creator_name: string;
  visibility: string;
  department_id: string | null;
  department_name?: string;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
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
          .select("*, departments(name)") // Fetch department name too
          .eq("id", user.id)
          .single();

        setProfile(profileData);

        // FETCH ANNOUNCEMENTS
        let query = supabase
          .from("announcements")
          .select(`
            *, 
            profiles!created_by(first_name, last_name, role),
            departments(name)
          `)
          .order("created_at", { ascending: false });

        // Admins/Super Admins see everything
        if (profileData.role === 'admin' || profileData.role === 'super_admin') {
          // No filter needed
        } else {
          // HODs and Employees see: Global ('all') OR Their Department
          // We use .or() syntax: "visibility.eq.all,department_id.eq.XYZ"
          const deptFilter = profileData.department_id 
            ? `,department_id.eq.${profileData.department_id}` 
            : '';
          query = query.or(`visibility.eq.all${deptFilter}`);
        }

        const { data: announcementData, error: fetchError } = await query;
        
        if (fetchError) throw fetchError;

        const formattedAnnouncements = (announcementData || []).map(
          (ann: any) => ({
            id: ann.id,
            title: ann.title,
            content: ann.content,
            created_at: ann.created_at,
            visibility: ann.visibility,
            department_id: ann.department_id,
            department_name: ann.departments?.name,
            creator_name: `${ann.profiles?.first_name} ${ann.profiles?.last_name}`,
          })
        );

        setAnnouncements(formattedAnnouncements);
      } catch (err) {
        console.error(err);
        setError("Failed to load announcements");
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

    if (!formData.title.trim() || !formData.content.trim()) {
      setError("Please fill in all fields");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // LOGIC: 
      // If HOD -> visibility = 'department', department_id = profile.department_id
      // If Admin -> visibility = 'all' (Global)
      
      const isHod = profile.role === 'hod';
      const visibility = isHod ? 'department' : 'all';
      const departmentId = isHod ? profile.department_id : null;

      if (isHod && !departmentId) {
        throw new Error("You are not assigned to a department, so you cannot post.");
      }

      const { error: insertError } = await supabase
        .from("announcements")
        .insert({
          created_by: user.id,
          title: formData.title,
          content: formData.content,
          visibility: visibility,
          department_id: departmentId
        });

      if (insertError) throw insertError;

      setSuccess("Announcement posted successfully!");
      setFormData({ title: "", content: "" });
      setShowForm(false);

      // Refresh list instantly by adding new item (simplified) or re-fetching
      // Ideally re-fetch to get proper timestamps/names, but for speed we reload window or fetch again
      window.location.reload(); 

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post announcement");
    }
  };

  // Check if user is allowed to post
  const canPost = ['admin', 'super_admin', 'hod'].includes(profile?.role);

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
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Announcements</h1>
              <p className="text-muted-foreground mt-2">
                Stay updated with company news
              </p>
            </div>
            {canPost && (
              <Button onClick={() => setShowForm(!showForm)}>
                <Plus size={16} className="mr-2" />
                {profile.role === 'hod' ? 'Post to My Department' : 'Post Announcement'}
              </Button>
            )}
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

          {showForm && canPost && (
            <Card className="mb-8 border-2 border-primary/10">
              <CardHeader>
                <CardTitle>
                  New {profile.role === 'hod' ? 'Department' : 'Company'} Announcement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="Announcement title..."
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      placeholder="Write your announcement here..."
                      value={formData.content}
                      onChange={(e) =>
                        setFormData({ ...formData, content: e.target.value })
                      }
                      required
                      className="min-h-32"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit">Post Announcement</Button>
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

          <div className="space-y-4">
            {announcements.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <Bell size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No announcements yet</p>
                </CardContent>
              </Card>
            ) : (
              announcements.map((announcement) => (
                <Card key={announcement.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold">
                        {announcement.title}
                      </h3>
                      {announcement.visibility === 'all' ? (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Megaphone size={12} /> Company Wide
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="flex items-center gap-1 border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                          <Building2 size={12} /> {announcement.department_name || "Department"}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-muted-foreground text-sm mb-4 border-b pb-2">
                      Posted by <span className="font-medium text-foreground">{announcement.creator_name}</span> on {new Date(announcement.created_at).toLocaleDateString()}
                    </p>
                    
                    <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                      {announcement.content}
                    </p>
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