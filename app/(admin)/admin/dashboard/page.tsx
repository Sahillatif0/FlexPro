"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  GraduationCap,
  BookMarked,
  ClipboardList,
  Layers,
  ShieldCheck,
} from "lucide-react";

interface DashboardSummary {
  totalStudents: number;
  totalFaculty: number;
  totalCourses: number;
  totalEnrollments: number;
  pendingGradeRequests: number;
}

interface RecentCourse {
  id: string;
  code: string;
  title: string;
  department: string;
  createdAt: string;
}

interface RecentActivity {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: "course" | "enrollment" | "grade";
}

interface DashboardPayload {
  summary: DashboardSummary;
  recentCourses: RecentCourse[];
  recentActivity: RecentActivity[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadDashboard() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/admin/dashboard", {signal: controller.signal});
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.message ?? "Failed to load admin dashboard");
        }
        const payload: DashboardPayload = await response.json();
        if (!cancelled) {
          setData(payload);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") {
          return;
        }
        if (!cancelled) {
          setError(err?.message ?? "Unexpected error");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
    }
}

loadDashboard();
return () => {
    cancelled = true;
    controller.abort()
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-white">Administration Overview</h1>
        <p className="text-sm text-gray-400">
          Monitor key institutional metrics and recent activity across the FlexPro platform.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load dashboard</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {isLoading || !data ? (
          Array.from({ length: 5 }).map((_, index) => (
            <Card key={index} className="bg-gray-900 border-gray-800">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-4 w-24 bg-gray-800" />
                <Skeleton className="h-8 w-16 bg-gray-800" />
                <Skeleton className="h-3 w-20 bg-gray-800" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Students</p>
                    <p className="text-3xl font-bold text-white">{data.summary.totalStudents}</p>
                  </div>
                  <Users className="h-10 w-10 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Faculty Members</p>
                    <p className="text-3xl font-bold text-white">{data.summary.totalFaculty}</p>
                  </div>
                  <GraduationCap className="h-10 w-10 text-indigo-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Active Courses</p>
                    <p className="text-3xl font-bold text-white">{data.summary.totalCourses}</p>
                  </div>
                  <BookMarked className="h-10 w-10 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Enrollments</p>
                    <p className="text-3xl font-bold text-white">{data.summary.totalEnrollments}</p>
                  </div>
                  <Layers className="h-10 w-10 text-amber-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Pending Grade Requests</p>
                    <p className="text-3xl font-bold text-white">{data.summary.pendingGradeRequests}</p>
                  </div>
                  <ClipboardList className="h-10 w-10 text-red-400" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,3fr]">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Recently Added Courses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading || !data ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 bg-gray-800" />
                ))}
              </div>
            ) : data.recentCourses.length ? (
              <div className="space-y-3">
                {data.recentCourses.map((course) => (
                  <div key={course.id} className="rounded-lg bg-gray-800/60 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">
                        {course.code} · {course.title}
                      </p>
                      <Badge variant="secondary" className="bg-purple-600/20 text-purple-400">
                        {course.department}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Added on {new Date(course.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No courses have been created recently.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Recent Platform Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading || !data ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 bg-gray-800" />
                ))}
              </div>
            ) : data.recentActivity.length ? (
              <div className="space-y-4">
                {data.recentActivity.map((activity) => (
                  <div key={activity.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white">{activity.title}</p>
                      <Badge variant="outline" className="border-purple-500 text-purple-300">
                        {activity.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400">{activity.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No recent admin-related activity logged.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Alert className="border-purple-500/40 bg-purple-500/10 text-purple-200">
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Tip</AlertTitle>
        <AlertDescription>
          Assign instructors to newly created courses to ensure faculty dashboards stay in sync.
        </AlertDescription>
      </Alert>
    </div>
  );
}
