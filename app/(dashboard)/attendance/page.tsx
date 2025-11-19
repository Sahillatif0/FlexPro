'use client';

import { useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/store';
import { useToast } from '@/hooks/use-toast';
import { Calendar, TrendingUp, AlertTriangle, Award } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AttendanceRecord {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  date: string;
  status: string;
  markedBy: string | null;
}

interface CourseStat {
  courseCode: string;
  present: number;
  total: number;
  percentage: number | null;
}

interface AttendanceSummary {
  totalPresent: number;
  totalClasses: number;
  overallAttendance: number | null;
}

interface CourseOption {
  courseId: string;
  courseCode: string;
  courseTitle: string;
}

export default function AttendancePage() {
  const { user } = useAppStore();
  const { toast } = useToast();
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [courseStats, setCourseStats] = useState<CourseStat[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    const controller = new AbortController();

    async function loadAttendance() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ userId });
        const response = await fetch(`/api/attendance?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result?.message || 'Failed to load attendance records');
        }

        const payload = (await response.json()) as {
          records: AttendanceRecord[];
          courseStats: CourseStat[];
          summary: AttendanceSummary;
          courses: CourseOption[];
        };

        setRecords(payload.records);
        setCourseStats(payload.courseStats);
        setSummary(payload.summary);
        setCourses(payload.courses);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Attendance fetch error', err);
        setError(err.message || 'Failed to load attendance records');
        toast({
          title: 'Unable to load attendance',
          description: err.message || 'Please try again later.',
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadAttendance();
    return () => controller.abort();
  }, [toast, user]);

  const filteredRecords = useMemo(() => {
    if (selectedCourse === 'all') return records;
    return records.filter((record) => record.courseCode === selectedCourse);
  }, [records, selectedCourse]);

  const columns = useMemo(
    () => [
      {
        key: 'courseCode',
        title: 'Course',
        render: (value: string, item: AttendanceRecord) => (
          <div>
            <span className="font-mono text-blue-400">{value}</span>
            <p className="text-gray-400 text-xs">{item.courseTitle}</p>
          </div>
        ),
        sortable: true,
      },
      {
        key: 'date',
        title: 'Date',
        render: (value: string) => (
          <span className="text-gray-300">
            {new Date(value).toLocaleDateString()}
          </span>
        ),
        sortable: true,
      },
      {
        key: 'status',
        title: 'Status',
        render: (value: string) => {
          const color =
            value === 'present'
              ? 'bg-emerald-600'
              : value === 'late'
              ? 'bg-amber-600'
              : value === 'absent'
              ? 'bg-red-600'
              : '';

          return (
            <Badge
              variant={value === 'present' ? 'default' : 'destructive'}
              className={color}
            >
              {value}
            </Badge>
          );
        },
      },
      {
        key: 'markedBy',
        title: 'Marked By',
        render: (value: string | null) => (
          <span className="text-gray-400 text-sm">{value ?? '-'}</span>
        ),
      },
    ],
    []
  );

  if (!user) {
    return <div className="text-gray-300">Sign in to view attendance.</div>;
  }

  const overallAttendance = summary?.overallAttendance ?? null;
  const totalPresent = summary?.totalPresent ?? 0;
  const totalClasses = summary?.totalClasses ?? 0;
  const classesMissed = Math.max(totalClasses - totalPresent, 0);
  const statusLabel =
    overallAttendance !== null && overallAttendance >= 80 ? 'Good' : 'Monitor';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Attendance Record</h1>
          <p className="text-gray-400">Track your class attendance and statistics</p>
        </div>
      </div>

      {error ? (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        {isLoading && !summary ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-32 bg-gray-700" />
                  <Skeleton className="h-6 w-24 bg-gray-700" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Overall Attendance</p>
                    <p className="text-2xl font-bold text-white">
                      {overallAttendance !== null
                        ? `${overallAttendance.toFixed(1)}%`
                        : 'N/A'}
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
                    <p className="text-2xl font-bold text-red-400">{classesMissed}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Status</p>
                    <p className="text-2xl font-bold text-emerald-400">{statusLabel}</p>
                  </div>
                  <Award className="h-8 w-8 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Course-wise Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {isLoading && !courseStats.length ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="bg-gray-700 rounded-lg p-4 space-y-3">
                  <Skeleton className="h-4 w-24 bg-gray-600" />
                  <Skeleton className="h-4 w-full bg-gray-600" />
                  <Skeleton className="h-2 w-full rounded bg-gray-600" />
                  <Skeleton className="h-4 w-16 bg-gray-600 mx-auto" />
                </div>
              ))
            ) : (
              courseStats.map((stat) => {
                const percentage = stat.percentage ?? 0;
                const colorClass =
                  percentage >= 90
                    ? 'text-emerald-400'
                    : percentage >= 80
                    ? 'text-amber-400'
                    : 'text-red-400';

                const barClass =
                  percentage >= 90
                    ? 'bg-emerald-500'
                    : percentage >= 80
                    ? 'bg-amber-500'
                    : 'bg-red-500';

                return (
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
                          className={`h-2 rounded-full ${barClass}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="text-center">
                        <span className={`font-bold text-lg ${colorClass}`}>
                          {stat.percentage !== null
                            ? `${stat.percentage.toFixed(1)}%`
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {!courseStats.length ? (
              <p className="text-sm text-gray-400 col-span-full">
                No attendance statistics available yet.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Filter Records</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && !courses.length ? (
            <Skeleton className="h-10 w-48 bg-gray-700" />
          ) : (
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-48 bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all" className="text-white">
                  All Courses
                </SelectItem>
                {courses.map((course) => (
                  <SelectItem
                    key={course.courseId}
                    value={course.courseCode}
                    className="text-white"
                  >
                    {course.courseCode} - {course.courseTitle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="grid grid-cols-4 items-center gap-4">
                  <Skeleton className="h-4 w-24 bg-gray-700" />
                  <Skeleton className="h-4 w-32 bg-gray-700" />
                  <Skeleton className="h-8 w-20 bg-gray-700" />
                  <Skeleton className="h-4 w-28 bg-gray-700" />
                </div>
              ))}
            </div>
          ) : (
            <DataTable
              data={filteredRecords}
              columns={columns}
              searchKey="courseCode"
              emptyMessage="No attendance records found"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
