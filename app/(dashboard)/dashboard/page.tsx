'use client';

import { useEffect, useMemo, useState } from 'react';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store';
import { BookOpen, TrendingUp, Calendar, Award, Clock } from 'lucide-react';

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

  if (!user) {
    return <div className="text-gray-300">Sign in to view your dashboard.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {user.firstName}!</h1>
        <p className="text-gray-400">Here&apos;s what&apos;s happening with your academic journey.</p>
      </div>

      {error ? (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Current CGPA" value={user.cgpa.toFixed(2)} icon={Award} />
        <StatCard
          title="Enrolled Courses"
          value={data?.enrolledCourses.length ?? 0}
          description={data?.enrolledCourses.length ? 'This semester' : 'No enrollments yet'}
          icon={BookOpen}
        />
        <StatCard
          title="Attendance Rate"
          value={overallAttendance !== null ? `${overallAttendance.toFixed(1)}%` : 'N/A'}
          description={overallAttendance !== null ? 'Overall average' : 'No records yet'}
          icon={Calendar}
        />
        <StatCard
          title="Credit Hours"
          value={data?.totalCreditHours ? data.totalCreditHours.toString() : '0'}
          description="Current semester"
          icon={Clock}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Student Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">
                  {user.firstName.charAt(0)}
                  {user.lastName.charAt(0)}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-white">
                  {user.firstName} {user.lastName}
                </h3>
                <p className="text-sm text-gray-400">{user.studentId}</p>
                <Badge variant="secondary" className="mt-1">
                  {user.program}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Current Semester</p>
                <p className="text-white font-medium">{user.semester}</p>
              </div>
              <div>
                <p className="text-gray-400">CGPA</p>
                <p className="text-white font-medium">{user.cgpa.toFixed(2)}</p>
              </div>
            </div>
            {user.bio ? (
              <div>
                <p className="text-gray-400 text-sm">Bio</p>
                <p className="text-gray-300 text-sm mt-1">{user.bio}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Enrolled Courses</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <p className="text-sm text-gray-400">Loading courses...</p>
            ) : data?.enrolledCourses.length ? (
              <div className="space-y-3">
                {data.enrolledCourses.map((course) => (
                  <div key={course.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-400 font-mono text-sm">{course.code}</span>
                        <span className="text-white text-sm font-medium">{course.title}</span>
                      </div>
                      <p className="text-gray-400 text-xs mt-1">{course.department}</p>
                    </div>
                    <div className="text-right text-xs text-gray-400">{course.term ?? '--'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No enrollments found.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Recent Grades</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <p className="text-sm text-gray-400">Loading grades...</p>
            ) : data?.recentGrades.length ? (
              <div className="space-y-3">
                {data.recentGrades.map((grade) => (
                  <div key={`${grade.courseCode}-${grade.createdAt}`} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-400 font-mono text-sm">{grade.courseCode}</span>
                        <span className="text-white text-sm">{grade.courseTitle}</span>
                      </div>
                        <p className="text-xs text-gray-400">{grade.status}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-sm">GPA: {grade.gradePoints.toFixed(2)}</span>
                      <Badge variant={grade.grade.startsWith('A') ? 'default' : 'secondary'}>
                        {grade.grade}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No transcript entries yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent>
            {formattedDeadlines.length ? (
              <div className="space-y-3">
                {formattedDeadlines.map((deadline) => (
                  <div key={deadline.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          deadline.type === 'payment'
                            ? 'bg-amber-500'
                            : deadline.type === 'registration'
                            ? 'bg-blue-500'
                            : deadline.type === 'exam'
                            ? 'bg-red-500'
                            : 'bg-slate-400'
                        }`}
                      />
                      <span className="text-white text-sm font-medium">{deadline.title}</span>
                    </div>
                    <span className="text-gray-400 text-sm">{deadline.dateLabel}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No upcoming deadlines.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Overall Attendance</p>
                <p className="text-2xl font-bold text-white">
                  {overallAttendance !== null ? `${overallAttendance.toFixed(1)}%` : 'N/A'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Classes Attended</p>
                <p className="text-2xl font-bold text-white">
                  {totalPresent}/{totalClasses}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Classes Missed</p>
                <p className="text-2xl font-bold text-red-400">{Math.max(totalClasses - totalPresent, 0)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-red-500 rotate-180" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Status</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {overallAttendance !== null && overallAttendance >= 80 ? 'Good' : 'Monitor'}
                </p>
              </div>
              <Award className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Course-wise Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          {courseAttendance.length ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {courseAttendance.map((stat) => (
                <div key={stat.courseCode} className="bg-gray-700 rounded-lg p-4">
                  <h3 className="font-mono text-blue-400 mb-2">{stat.courseCode}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Attended:</span>
                      <span className="text-white">
                        {stat.present}/{stat.total}
                      </span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          (stat.percentage ?? 0) >= 90
                            ? 'bg-emerald-500'
                            : (stat.percentage ?? 0) >= 80
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${stat.percentage ?? 0}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <span
                        className={`font-bold text-lg ${
                          (stat.percentage ?? 0) >= 90
                            ? 'text-emerald-400'
                            : (stat.percentage ?? 0) >= 80
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }`}
                      >
                        {stat.percentage !== null ? `${stat.percentage.toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No attendance records yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
