'use client';

import { useEffect, useMemo, useState } from 'react';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store';
import { BookOpen, TrendingUp, Calendar, Award, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnrolledCourse {
  id: string;
  code: string;
  title: string;
  creditHours: number;
  department: string;
  term: string | null;
}

interface RecentGrade {
  courseCode: string;
  courseTitle: string;
  grade: string;
  gradePoints: number;
  status: string;
  createdAt: string;
}

interface DeadlineItem {
  id: string;
  title: string;
  date: string;
  type: 'payment' | 'registration' | 'exam' | 'info';
}

interface AttendanceByCourse {
  courseCode: string;
  present: number;
  total: number;
  percentage: number | null;
}

interface DashboardResponse {
  enrolledCourses: EnrolledCourse[];
  recentGrades: RecentGrade[];
  totalCreditHours: number;
  attendanceRate: number | null;
  attendanceByCourse: AttendanceByCourse[];
  deadlines: DeadlineItem[];
}

export default function DashboardPage() {
  const { user } = useAppStore();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      if (!user) return;
      setLoadingData(true);
      setError(null);

      try {
        const params = new URLSearchParams({ userId: user.id });
        const response = await fetch(`/api/dashboard?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result?.message || 'Failed to load dashboard data');
        }

        const payload: DashboardResponse = await response.json();
        setData(payload);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Dashboard data fetch failed', err);
        setError(err.message || 'Something went wrong');
      } finally {
        setLoadingData(false);
      }
    }

    loadData();

    return () => controller.abort();
  }, [user]);

  const overallAttendance = useMemo(() => {
    if (!data?.attendanceRate || data.attendanceRate < 0) {
      return null;
    }
    return data.attendanceRate;
  }, [data]);

  const courseAttendance = data?.attendanceByCourse ?? [];

  const totalPresent = courseAttendance.reduce((sum, course) => sum + course.present, 0);
  const totalClasses = courseAttendance.reduce((sum, course) => sum + course.total, 0);

  const formattedDeadlines = (data?.deadlines ?? []).map((deadline) => ({
    ...deadline,
    dateLabel: new Date(deadline.date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
  }));

  const isInitialLoading = loadingData && !data;
  const nextDeadline = formattedDeadlines[0];

  if (!user) {
    return <div className="text-gray-300">Sign in to view your dashboard.</div>;
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="student-surface overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl space-y-4">
            <span className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400/70">
              Student Pulse
            </span>
            <h1 className="text-3xl font-semibold text-white md:text-4xl">
              Hey <span className="student-section-title">{user.firstName}</span>, welcome back!
            </h1>
            <p className="text-sm text-slate-300/80 md:text-base">
              Here&apos;s a lovingly curated snapshot of your semester. Keep the momentum going and celebrate the wins along the way.
            </p>
            {data ? (
              <div className="flex flex-wrap gap-2 text-xs text-slate-300/75">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  {data.enrolledCourses.length} active courses
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  {data.totalCreditHours} credit hours
                </span>
                {overallAttendance !== null ? (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    {overallAttendance.toFixed(1)}% attendance
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-sky-500/25 via-indigo-500/20 to-transparent p-6 text-sm text-white shadow-[0_25px_70px_-45px_rgba(59,130,246,0.65)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(147,197,253,0.32),transparent_55%)]" />
            <div className="relative space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/75">Next focus</p>
              <p className="text-lg font-semibold">
                {nextDeadline ? nextDeadline.title : 'No deadlines on the horizon'}
              </p>
              <p className="text-sm text-white/80">
                {nextDeadline
                  ? `Due ${nextDeadline.dateLabel}`
                  : 'You are all caught up for now. Take a deep breath and keep shining!'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {isInitialLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="student-surface border-0 bg-transparent">
                <CardContent className="space-y-4 p-6">
                  <Skeleton className="h-3 w-24 rounded-full bg-white/10" />
                  <Skeleton className="h-8 w-24 rounded-lg bg-white/10" />
                  <Skeleton className="h-3 w-28 rounded-full bg-white/10" />
                </CardContent>
              </Card>
            )
          ) : (
            <>
              <StatCard title="Current CGPA" value={user.cgpa.toFixed(2)} icon={Award} accent="violet" />
              <StatCard
                title="Enrolled Courses"
                value={data?.enrolledCourses.length ?? 0}
                description={data?.enrolledCourses.length ? 'This semester' : 'No enrollments yet'}
                icon={BookOpen}
                accent="blue"
              />
              <StatCard
                title="Attendance Rate"
                value={overallAttendance !== null ? `${overallAttendance.toFixed(1)}%` : 'N/A'}
                description={overallAttendance !== null ? 'Overall average' : 'No records yet'}
                icon={Calendar}
                accent="emerald"
              />
              <StatCard
                title="Credit Hours"
                value={data?.totalCreditHours ? data.totalCreditHours.toString() : '0'}
                description="Current semester"
                icon={Clock}
                accent="amber"
              />
            </>
          )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {isInitialLoading ? (
          <>
            <Card className="student-surface border-0 bg-transparent">
              <CardHeader className="space-y-3">
                <Skeleton className="h-4 w-32 rounded-full bg-white/10" />
                <Skeleton className="h-6 w-20 rounded-full bg-white/10" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-2xl bg-white/10" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-36 rounded-full bg-white/10" />
                    <Skeleton className="h-3 w-28 rounded-full bg-white/10" />
                    <Skeleton className="h-3 w-20 rounded-full bg-white/10" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-14 rounded-xl bg-white/10" />
                  <Skeleton className="h-14 rounded-xl bg-white/10" />
                </div>
                <Skeleton className="h-10 rounded-xl bg-white/10" />
              </CardContent>
            </Card>
            <Card className="student-surface border-0 bg-transparent">
              <CardHeader className="space-y-3">
                <Skeleton className="h-4 w-40 rounded-full bg-white/10" />
                <Skeleton className="h-3 w-28 rounded-full bg-white/10" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between gap-3">
                    <Skeleton className="h-12 flex-1 rounded-2xl bg-white/10" />
                    <Skeleton className="h-6 w-14 rounded-full bg-white/10" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="student-surface border-0 bg-transparent">
              <CardHeader>
                <CardTitle className="text-white">Student Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-indigo-500 to-emerald-500 text-white shadow-[0_18px_45px_-28px_rgba(56,189,248,0.75)]">
                    <span className="text-xl font-semibold">
                      {user.firstName.charAt(0)}
                      {user.lastName.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">
                      {user.firstName} {user.lastName}
                    </h3>
                    <p className="text-xs text-slate-300/75">{user.studentId}</p>
                    <Badge variant="secondary" className="mt-2 border border-white/10 bg-white/10 text-xs text-slate-100">
                      {user.program}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400/70">Current Semester</p>
                    <p className="text-white font-medium">{user.semester}</p>
                  </div>
                  <div>
                    <p className="text-slate-400/70">CGPA</p>
                    <p className="text-white font-medium">{user.cgpa.toFixed(2)}</p>
                  </div>
                </div>
                {user.bio ? (
                  <div>
                    <p className="text-sm text-slate-400/70">Bio</p>
                    <p className="mt-1 text-sm text-slate-200/80">{user.bio}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="student-surface border-0 bg-transparent">
              <CardHeader>
                <CardTitle className="text-white">Enrolled Courses</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.enrolledCourses.length ? (
                  <div className="space-y-3">
                    {data.enrolledCourses.map((course) => (
                      <div
                        key={course.id}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 backdrop-blur"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm uppercase text-sky-300">{course.code}</span>
                            <span className="font-medium text-white">{course.title}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-300/70">{course.department}</p>
                        </div>
                        <div className="text-right text-xs text-slate-400/70">{course.term ?? '--'}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-300/70">No enrollments found.</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {isInitialLoading ? (
          <>
            <Card className="student-surface border-0 bg-transparent">
              <CardHeader className="space-y-3">
                <Skeleton className="h-4 w-36 rounded-full bg-white/10" />
                <Skeleton className="h-3 w-24 rounded-full bg-white/10" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between gap-3">
                    <Skeleton className="h-12 flex-1 rounded-2xl bg-white/10" />
                    <Skeleton className="h-6 w-20 rounded-full bg-white/10" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="student-surface border-0 bg-transparent">
              <CardHeader className="space-y-3">
                <Skeleton className="h-4 w-44 rounded-full bg-white/10" />
                <Skeleton className="h-3 w-28 rounded-full bg-white/10" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between gap-3">
                    <Skeleton className="h-10 flex-1 rounded-2xl bg-white/10" />
                    <Skeleton className="h-4 w-16 rounded-full bg-white/10" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="student-surface border-0 bg-transparent">
              <CardHeader>
                <CardTitle className="text-white">Recent Grades</CardTitle>
              </CardHeader>
              <CardContent>
                {data?.recentGrades.length ? (
                  <div className="space-y-3">
                    {data.recentGrades.map((grade) => (
                      <div
                        key={`${grade.courseCode}-${grade.createdAt}`}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm backdrop-blur"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm uppercase text-sky-300">{grade.courseCode}</span>
                            <span className="text-white">{grade.courseTitle}</span>
                          </div>
                          <p className="text-xs text-slate-300/70">{grade.status}</p>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-slate-300/70">GPA {grade.gradePoints.toFixed(2)}</span>
                          <Badge
                            variant={grade.grade.startsWith('A') ? 'default' : 'secondary'}
                            className="border border-white/10 bg-white/10 text-xs text-white"
                          >
                            {grade.grade}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-300/70">No transcript entries yet.</p>
                )}
              </CardContent>
            </Card>

            <Card className="student-surface border-0 bg-transparent">
              <CardHeader>
                <CardTitle className="text-white">Upcoming Deadlines</CardTitle>
              </CardHeader>
              <CardContent>
                {formattedDeadlines.length ? (
                  <div className="space-y-3">
                    {formattedDeadlines.map((deadline) => (
                      <div
                        key={deadline.id}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 backdrop-blur"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              'h-3 w-3 rounded-full',
                              deadline.type === 'payment'
                                ? 'bg-amber-400'
                                : deadline.type === 'registration'
                                ? 'bg-sky-400'
                                : deadline.type === 'exam'
                                ? 'bg-rose-500'
                                : 'bg-slate-400'
                            )}
                          />
                          <span className="text-sm font-medium text-white">{deadline.title}</span>
                        </div>
                        <span className="text-sm text-slate-300/70">{deadline.dateLabel}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-300/70">No upcoming deadlines.</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isInitialLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="student-surface border-0 bg-transparent p-6">
                <div className="space-y-3">
                  <Skeleton className="h-3 w-24 rounded-full bg-white/10" />
                  <Skeleton className="h-8 w-28 rounded-lg bg-white/10" />
                </div>
              </Card>
            )
          ) : (
            <>
              <Card className="student-surface border-0 bg-transparent p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400/75">Overall Attendance</p>
                    <p className="text-2xl font-semibold text-white">
                      {overallAttendance !== null ? `${overallAttendance.toFixed(1)}%` : 'N/A'}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-emerald-400" />
                </div>
              </Card>
              <Card className="student-surface border-0 bg-transparent p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400/75">Classes Attended</p>
                    <p className="text-2xl font-semibold text-white">
                      {totalPresent}/{totalClasses}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-sky-400" />
                </div>
              </Card>
              <Card className="student-surface border-0 bg-transparent p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400/75">Classes Missed</p>
                    <p className="text-2xl font-semibold text-rose-300">{Math.max(totalClasses - totalPresent, 0)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 -scale-y-100 text-rose-400" />
                </div>
              </Card>
              <Card className="student-surface border-0 bg-transparent p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400/75">Status</p>
                    <p className="text-2xl font-semibold text-emerald-300">
                      {overallAttendance !== null && overallAttendance >= 80 ? 'Good' : 'Monitor'}
                    </p>
                  </div>
                  <Award className="h-8 w-8 text-emerald-400" />
                </div>
              </Card>
            </>
          )}
      </div>

      <Card className="student-surface">
        <CardHeader>
          <CardTitle className="text-white">Course-wise Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          {courseAttendance.length ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {courseAttendance.map((stat) => {
                const percentage = stat.percentage ?? 0;
                const colorClass =
                  percentage >= 90
                    ? 'text-emerald-300'
                    : percentage >= 80
                    ? 'text-amber-300'
                    : 'text-rose-300';
                const barClass =
                  percentage >= 90
                    ? 'bg-emerald-400'
                    : percentage >= 80
                    ? 'bg-amber-300'
                    : 'bg-rose-400';

                return (
                  <div
                    key={stat.courseCode}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
                  >
                    <h3 className="mb-2 font-mono text-sm uppercase text-sky-300">{stat.courseCode}</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-slate-300/75">
                        <span>Attended</span>
                        <span className="text-white">
                          {stat.present}/{stat.total}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <div className={`h-2 rounded-full ${barClass}`} style={{ width: `${percentage}%` }} />
                      </div>
                      <div className="text-center">
                        <span className={`text-lg font-semibold ${colorClass}`}>
                          {stat.percentage !== null ? `${stat.percentage.toFixed(1)}%` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-300/70">No attendance records yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
