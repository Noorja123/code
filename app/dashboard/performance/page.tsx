"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SidebarNav } from "@/components/sidebar-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Star, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Review {
  id: string;
  employee_id: string;
  reviewer_id: string;
  rating: number;
  feedback: string;
  review_date: string;
  employee_name?: string;
  reviewer_name?: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

export default function PerformancePage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: "",
    rating: "5",
    feedback: "",
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

        // Fetch employees
        let empQuery = supabase.from("profiles").select("id, first_name, last_name");
        
        if (profileData.role === "hod") {
          empQuery = empQuery
            .eq("department_id", profileData.department_id)
            .eq("role", "employee");
        } else if (profileData.role !== "admin") {
          router.push("/dashboard");
          return;
        }

        const { data: empData } = await empQuery;
        setEmployees(empData || []);

        // Fetch reviews
        let reviewQuery = supabase
          .from("performance_reviews")
          .select(
            `*, 
             employee:profiles!employee_id(first_name, last_name),
             reviewer:profiles!reviewer_id(first_name, last_name)`
          );

        if (profileData.role === "hod") {
          reviewQuery = reviewQuery.eq("reviewer_id", user.id);
        }

        const { data: reviewData } = await reviewQuery.order("review_date", {
          ascending: false,
        });

        const formatted = (reviewData || []).map((review: any) => ({
          ...review,
          employee_name: `${review.employee?.first_name} ${review.employee?.last_name}`,
          reviewer_name: `${review.reviewer?.first_name} ${review.reviewer?.last_name}`,
        }));

        setReviews(formatted);
      } catch (err) {
        setError("Failed to load performance data");
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

    if (!formData.employee_id || !formData.feedback.trim()) {
      setError("Please fill in all fields");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: insertError } = await supabase
        .from("performance_reviews")
        .insert({
          employee_id: formData.employee_id,
          reviewer_id: user.id,
          rating: parseFloat(formData.rating),
          feedback: formData.feedback,
          review_date: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      setSuccess("Review submitted successfully!");
      setFormData({ employee_id: "", rating: "5", feedback: "" });
      setShowForm(false);

      // Refresh reviews
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      let reviewQuery = supabase
        .from("performance_reviews")
        .select(
          `*, 
           employee:profiles!employee_id(first_name, last_name),
           reviewer:profiles!reviewer_id(first_name, last_name)`
        );

      if (profile.role === "hod") {
        reviewQuery = reviewQuery.eq("reviewer_id", currentUser?.id);
      }

      const { data: reviewData } = await reviewQuery.order("review_date", {
        ascending: false,
      });

      const formatted = (reviewData || []).map((review: any) => ({
        ...review,
        employee_name: `${review.employee?.first_name} ${review.employee?.last_name}`,
        reviewer_name: `${review.reviewer?.first_name} ${review.reviewer?.last_name}`,
      }));

      setReviews(formatted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            size={16}
            className={
              i < rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }
          />
        ))}
      </div>
    );
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
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Performance Reviews</h1>
              <p className="text-muted-foreground mt-2">
                Manage employee performance reviews and ratings
              </p>
            </div>
            {(profile?.role === "hod" || profile?.role === "admin") && (
              <Button onClick={() => setShowForm(!showForm)}>
                <Plus size={16} className="mr-2" />
                Add Review
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

          {showForm && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Add Performance Review</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="employee">Employee</Label>
                    <Select
                      value={formData.employee_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, employee_id: value })
                      }
                    >
                      <SelectTrigger id="employee" className="mt-2">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.first_name} {emp.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="rating">Rating</Label>
                    <Select
                      value={formData.rating}
                      onValueChange={(value) =>
                        setFormData({ ...formData, rating: value })
                      }
                    >
                      <SelectTrigger id="rating" className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 Stars - Excellent</SelectItem>
                        <SelectItem value="4">4 Stars - Very Good</SelectItem>
                        <SelectItem value="3">3 Stars - Good</SelectItem>
                        <SelectItem value="2">2 Stars - Fair</SelectItem>
                        <SelectItem value="1">1 Star - Needs Improvement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="feedback">Feedback</Label>
                    <Textarea
                      id="feedback"
                      placeholder="Write your detailed feedback..."
                      value={formData.feedback}
                      onChange={(e) =>
                        setFormData({ ...formData, feedback: e.target.value })
                      }
                      required
                      className="mt-2 min-h-32"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit">Submit Review</Button>
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
            {reviews.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  <Star size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No performance reviews yet</p>
                </CardContent>
              </Card>
            ) : (
              reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">{review.employee_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Reviewed by {review.reviewer_name}
                        </p>
                      </div>
                      <div className="text-right">
                        {renderStars(review.rating)}
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(review.review_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <p className="text-foreground">{review.feedback}</p>
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
