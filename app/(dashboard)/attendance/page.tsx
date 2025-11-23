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
import { StudentCardSkeleton, StudentMetricSkeleton } from '@/components/ui/student-skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [viewMode, setViewMode] = useState<'all' | 'course'>('all');
  const [selectedCourseTab, setSelectedCourseTab] = useState<string | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [courseStats, setCourseStats] = useState<CourseStat[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    const controller = new AbortController();

    async function loadAttendance() {
      setIsLoading(true);
      setHasLoaded(false);

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
        setHasLoaded(true);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Attendance fetch error', err);
        setError(err.message || 'Failed to load attendance records');
        toast({
          title: 'Unable to load attendance',
          description: err.message || 'Please try again later.',
        });
        setHasLoaded(true);
      } finally {
        setIsLoading(false);
      }
    }

    loadAttendance();
    return () => controller.abort();
  }, [toast, user]);

  useEffect(() => {
    if (courses.length && !selectedCourseTab) {
      setSelectedCourseTab(courses[0].courseCode);
    }
  }, [courses, selectedCourseTab]);

  const filteredRecords = useMemo(() => {
    if (selectedCourse === 'all') return records;
    return records.filter((record) => record.courseCode === selectedCourse);
  }, [records, selectedCourse]);

  const isInitialLoading = isLoading && !hasLoaded;
  const showMetricSkeletons = isLoading || !hasLoaded;
  const showCourseStatsSkeleton = (isLoading && !courseStats.length) || !hasLoaded;

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
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Attendance Record</h1>
          <p className="text-gray-400">Track your class attendance and statistics</p>
        </div>
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => v && setViewMode(v as 'all' | 'course')}
          variant="outline"
          size="sm"
          className="bg-gray-800 border border-gray-700 rounded-md"
        >
          <ToggleGroupItem
            value="all"
            aria-label="All Entries"
            className="text-gray-200 data-[state=on]:bg-gray-700"
          >
            All Entries
          </ToggleGroupItem>
          <ToggleGroupItem
            value="course"
            aria-label="By Course"
            className="text-gray-200 data-[state=on]:bg-gray-700"
          >
            By Course
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {error ? (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        {showMetricSkeletons
          ? Array.from({ length: 4 }).map((_, index) => <StudentMetricSkeleton key={index} />)
          : (
            <>
              <Card className="student-surface border-0 bg-transparent p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400/75">Overall Attendance</p>
                    <p className="text-2xl font-semibold text-white">
                      {overallAttendance !== null
                        ? `${overallAttendance.toFixed(1)}%`
                        : 'N/A'}
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
                    <p className="text-2xl font-semibold text-rose-300">{classesMissed}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-rose-400" />
                </div>
              </Card>
              <Card className="student-surface border-0 bg-transparent p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400/75">Status</p>
                    <p className="text-2xl font-semibold text-emerald-300">{statusLabel}</p>
                  </div>
                  <Award className="h-8 w-8 text-emerald-400" />
                </div>
              </Card>
            </>
          )}
      </div>

      {showCourseStatsSkeleton ? (
        <StudentCardSkeleton lines={4} />
      ) : (
        <Card className="student-surface border-0 bg-transparent">
          <CardHeader>
            <CardTitle className="text-white">Course-wise Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {courseStats.length ? (
                courseStats.map((stat) => {
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
                      ? 'bg-amber-400'
                      : 'bg-rose-400';

                  return (
                    <div key={stat.courseCode} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                      <h3 className="font-mono text-sky-300 mb-2">{stat.courseCode}</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-slate-300/75">
                          <span>Attended</span>
                          <span className="text-white">
                            {stat.present}/{stat.total}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-white/10">
                          <div
                            className={`h-2 rounded-full ${barClass}`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        <div className="text-center">
                          <span className={`text-lg font-semibold ${colorClass}`}>
                            {stat.percentage !== null
                              ? `${stat.percentage.toFixed(1)}%`
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="col-span-full text-sm text-slate-300/70">
                  No attendance statistics available yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === 'all' ? (
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
                <SelectContent className="student-popover">
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
      ) : null}

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          {viewMode === 'all' ? (
            <DataTable
              data={filteredRecords}
              columns={columns}
              searchKey="courseCode"
              emptyMessage="No attendance records found"
              isLoading={isLoading || !hasLoaded}
              skeletonRows={8}
              hideSearchWhileLoading
              skeletonColumns={columns.length}
              showEmptyState={hasLoaded}
            />
          ) : courses.length ? (
            <Tabs
              value={selectedCourseTab ?? undefined}
              onValueChange={(v) => setSelectedCourseTab(v)}
            >
              <TabsList className="bg-gray-800 border border-gray-700 rounded-md">
                {courses.map((course) => (
                  <TabsTrigger
                    key={course.courseCode}
                    value={course.courseCode}
                    className="text-gray-200 data-[state=active]:bg-gray-700"
                  >
                    {course.courseCode}
                  </TabsTrigger>
                ))}
              </TabsList>
              {courses.map((course) => {
                const courseRecords = records.filter(
                  (r) => r.courseCode === course.courseCode
                );
                const total = courseRecords.length;
                const present = courseRecords.filter((r) => r.status === 'present').length;
                const late = courseRecords.filter((r) => r.status === 'late').length;
                const absent = courseRecords.filter((r) => r.status === 'absent').length;
                const presentPct = total ? (present / total) * 100 : 0;
                const latePct = total ? (late / total) * 100 : 0;
                const absentPct = total ? (absent / total) * 100 : 0;

                return (
                  <TabsContent key={course.courseCode} value={course.courseCode} className="mt-4">
                    <DataTable
                      data={courseRecords}
                      columns={columns}
                      searchKey="date"
                      emptyMessage="No attendance records for this course"
                      isLoading={isLoading || !hasLoaded}
                      skeletonRows={6}
                      hideSearchWhileLoading
                      skeletonColumns={columns.length}
                      showEmptyState={hasLoaded}
                    />
                    <div className="mt-4 border-t border-gray-700 pt-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gray-700 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-300">Present</p>
                          <p className="text-lg font-semibold text-emerald-400">
                            {presentPct.toFixed(1)}%
                          </p>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-300">Late</p>
                          <p className="text-lg font-semibold text-amber-400">
                            {latePct.toFixed(1)}%
                          </p>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-300">Absent</p>
                          <p className="text-lg font-semibold text-red-400">
                            {absentPct.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          ) : isLoading ? (
            <DataTable
              data={[]}
              columns={columns}
              searchKey="date"
              emptyMessage="Loading attendance records"
              isLoading
              skeletonRows={6}
              hideSearchWhileLoading
              skeletonColumns={columns.length}
              showEmptyState={hasLoaded}
            />
          ) : (
            <p className="text-sm text-gray-400">No courses available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
