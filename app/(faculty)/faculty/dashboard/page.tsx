"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CalendarClock, GraduationCap, Layers, ListChecks } from "lucide-react";

interface DashboardData {
  summary: {
    totalCourses: number;
    totalStudents: number;
    pendingAttendance: number;
    pendingGrades: number;
  };
  courseStats: Array<{
    courseId: string;
    courseCode: string;
    courseTitle: string;
    termName: string;
    attendanceRate: number | null;
    averageGrade: number | null;
  }>;
  recentActivities: Array<{
    id: string;
    type: "attendance" | "grade" | "note";
    title: string;
    description: string;
    timestamp: string;
  }>;
  recentNotes: Array<{
    id: string;
    studentName: string;
    courseCode: string | null;
    title: string;
    updatedAt: string;
  }>;
}

export default function FacultyDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadDashboard() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/faculty/dashboard", {
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.message ?? "Failed to load dashboard data");
        }
        const payload: DashboardData = await response.json();
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
      controller.abort();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-white">Faculty Overview</h1>
        <p className="text-sm text-gray-400">
          Monitor your courses, attendance progress, and student notes at a glance.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load dashboard</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isLoading || !data ? (
          Array.from({ length: 4 }).map((_, index) => (
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
                    <p className="text-sm text-gray-400">Active Courses</p>
                    <p className="text-3xl font-bold text-white">
                      {data.summary.totalCourses}
                    </p>
                  </div>
                  <Layers className="h-10 w-10 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Enrolled Students</p>
                    <p className="text-3xl font-bold text-white">
                      {data.summary.totalStudents}
                    </p>
                  </div>
                  <GraduationCap className="h-10 w-10 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Attendance Sessions Due</p>
                    <p className="text-3xl font-bold text-white">
                      {data.summary.pendingAttendance}
                    </p>
                  </div>
                  <CalendarClock className="h-10 w-10 text-amber-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Pending Grade Entries</p>
                    <p className="text-3xl font-bold text-white">
                      {data.summary.pendingGrades}
                    </p>
                  </div>
                  <ListChecks className="h-10 w-10 text-red-400" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="bg-gray-900 border-gray-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white">Course Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading || !data ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="grid grid-cols-[2fr,1fr,1fr] gap-4 items-center">
                    <Skeleton className="h-4 bg-gray-800" />
                    <Skeleton className="h-4 bg-gray-800" />
                    <Skeleton className="h-4 bg-gray-800" />
                  </div>
                ))}
              </div>
            ) : data.courseStats.length ? (
              <div className="space-y-4">
                {data.courseStats.map((course) => (
                  <div
                    key={course.courseId}
                    className="grid grid-cols-1 md:grid-cols-[2fr,1fr,1fr] gap-4 items-center rounded-lg bg-gray-800/60 p-4"
                  >
                    <div>
                      <p className="text-white font-medium">
                        {course.courseCode} · {course.courseTitle}
                      </p>
                      <p className="text-xs text-gray-400">{course.termName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Attendance Rate</p>
                      <p className="text-lg font-semibold text-emerald-400">
                        {course.attendanceRate !== null
                          ? `${course.attendanceRate.toFixed(1)}%`
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Average Grade</p>
                      <p className="text-lg font-semibold text-blue-400">
                        {course.averageGrade !== null
                          ? `${course.averageGrade.toFixed(2)}`
                          : '—'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No course analytics available yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading || !data ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <Skeleton className="h-4 w-48 bg-gray-800" />
                    <Skeleton className="h-3 w-36 bg-gray-800" />
                  </div>
                ))}
              </div>
            ) : data.recentActivities.length ? (
              <div className="space-y-4">
                {data.recentActivities.map((activity) => (
                  <div key={activity.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-white font-medium">{activity.title}</p>
                      <Badge variant="outline" className="border-emerald-600 text-emerald-400">
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
              <p className="text-sm text-gray-400">
                No recent activity recorded in the last week.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Latest Student Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading || !data ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-56 bg-gray-800" />
                  <Skeleton className="h-3 w-44 bg-gray-800" />
                </div>
              ))}
            </div>
          ) : data.recentNotes.length ? (
            <div className="space-y-3">
              {data.recentNotes.map((note) => (
                <div key={note.id} className="rounded-lg bg-gray-800/60 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white font-medium">{note.title}</p>
                    <Badge variant="secondary" className="bg-emerald-600/20 text-emerald-400">
                      {note.courseCode ?? 'General'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400">
                    {note.studentName} · {new Date(note.updatedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No student notes recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
