'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/store';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Users, Clock, TrendingUp, Trash2 } from 'lucide-react';
import { StudentMetricSkeleton } from '@/components/ui/student-skeleton';

interface SectionInstructor {
  id: string;
  fullName: string;
  employeeId: string | null;
}

interface CourseSection {
  id: string;
  name: string;
  instructor: SectionInstructor | null;
}

interface CourseRow {
  id: string;
  courseId: string;
  code: string;
  title: string;
  creditHours: number;
  prerequisite: string | null;
  enrolled: number;
  capacity: number;
  department: string;
  status: string;
  term: string | null;
  section: string | null;
  sectionInstructor: SectionInstructor | null;
  sections: CourseSection[];
}

interface CourseSummary {
  totalCreditHours: number;
  averageAttendance: number | null;
  semesterGpa: number | null;
  enrolledCount: number;
}

export default function CoursesPage() {
  const router = useRouter();
  const { user } = useAppStore();
  const { toast } = useToast();

  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [summary, setSummary] = useState<CourseSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [droppingCourse, setDroppingCourse] = useState<string | null>(null);

  const loadCourses = useCallback(
    async (signal?: AbortSignal) => {
      if (!user) return;

      setIsLoading(true);
      setHasLoaded(false);
      setError(null);

      try {
        const params = new URLSearchParams({ userId: user.id });
        const response = await fetch(`/api/courses?${params.toString()}`, {
          signal,
        });

        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result?.message || 'Failed to load courses');
        }

        const payload = (await response.json()) as {
          courses: CourseRow[];
          summary: CourseSummary;
        };

        setCourses(payload.courses);
        setSummary(payload.summary);
        setHasLoaded(true);
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.error('Courses fetch error', err);
        setError(err.message || 'Failed to load courses');
        toast({
          title: 'Unable to load courses',
          description: err.message || 'Please refresh and try again.',
          variant: 'destructive',
        });
        setHasLoaded(true);
      } finally {
        setIsLoading(false);
      }
    },
    [toast, user]
  );

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    loadCourses(controller.signal);
    return () => controller.abort();
  }, [loadCourses, user]);

  const handleDrop = useCallback(
    async (courseId: string) => {
      if (!user) return;

      setDroppingCourse(courseId);

      try {
        const response = await fetch('/api/enroll', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: user.id, courseId }),
        });

        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result?.message || 'Failed to drop course');
        }

        toast({
          title: 'Course dropped',
          description: 'The course has been removed from your enrolments.',
        });

        await loadCourses();
      } catch (err: any) {
        console.error('Course drop error', err);
        toast({
          title: 'Unable to drop course',
          description: err.message || 'Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setDroppingCourse(null);
      }
    },
    [loadCourses, toast, user]
  );

  const columns = useMemo(
    () => [
      {
        key: 'code',
        title: 'Course Code',
        render: (value: string) => (
          <span className="font-mono text-sky-300">{value}</span>
        ),
        sortable: true,
      },
      {
        key: 'title',
        title: 'Course Title',
        render: (value: string) => (
          <span className="font-semibold text-white">{value}</span>
        ),
        sortable: true,
      },
      {
        key: 'creditHours',
        title: 'Credit Hours',
        render: (value: number) => (
          <Badge
            variant="outline"
            className="rounded-full border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-200"
          >
            {value} CR
          </Badge>
        ),
        sortable: true,
      },
      {
        key: 'section',
        title: 'Section',
        render: (value: string | null) => (
          <Badge
            variant="outline"
            className="rounded-full border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-200"
          >
            {value ?? '—'}
          </Badge>
        ),
      },
      {
        key: 'sectionInstructor',
        title: 'Instructor',
        render: (_: unknown, item: CourseRow) => (
          <span className="text-sm text-slate-300/80">
            {item.sectionInstructor?.fullName ?? '—'}
          </span>
        ),
      },
      {
        key: 'capacity',
        title: 'Enrollment',
        render: (value: number, item: CourseRow) => (
          <div className="flex items-center gap-2 text-sm text-slate-300/75">
            <Users className="h-3.5 w-3.5 text-sky-300" />
            <span>
              {item.enrolled}/{value}
            </span>
          </div>
        ),
      },
      {
        key: 'actions',
        title: 'Actions',
        render: (_: unknown, item: CourseRow) => (
          <Button
            size="sm"
            variant="destructive"
            disabled={droppingCourse === item.courseId}
            onClick={() => handleDrop(item.courseId)}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            {droppingCourse === item.courseId ? 'Dropping...' : 'Drop'}
          </Button>
        ),
      },
    ],
    [droppingCourse, handleDrop]
  );

  const showMetricSkeletons = isLoading || !hasLoaded;

  const totalCreditHours = summary?.totalCreditHours ?? 0;
  const averageAttendance = summary?.averageAttendance;
  const semesterGpa = summary?.semesterGpa;

  if (!user) {
    return <div className="text-slate-300">Sign in to view your courses.</div>;
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400/70">
            Course Hub
          </span>
          <h1 className="text-3xl font-semibold text-white">My Courses</h1>
          <p className="text-sm text-slate-300/80">
            Manage enrolments, explore sections, and keep your semester aligned.
          </p>
        </div>
        <Button
          disabled={isLoading}
          className="rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_18px_45px_-28px_rgba(59,130,246,0.7)] hover:opacity-90"
          onClick={() => router.push('/enroll')}
        >
          <BookOpen className="mr-2 h-4 w-4" />
          View All Available
        </Button>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {showMetricSkeletons ? (
          Array.from({ length: 3 }).map((_, index) => (
            <StudentMetricSkeleton key={index} />
          ))
        ) : (
          <>
            <Card className="student-surface border-0 bg-transparent p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400/75">Total Credit Hours</p>
                  <p className="text-2xl font-semibold text-white">
                    {totalCreditHours}
                  </p>
                </div>
                <BookOpen className="h-8 w-8 text-sky-400" />
              </div>
            </Card>
            <Card className="student-surface border-0 bg-transparent p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400/75">Average Attendance</p>
                  <p className="text-2xl font-semibold text-white">
                    {typeof averageAttendance === 'number'
                      ? `${averageAttendance.toFixed(1)}%`
                      : 'N/A'}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-emerald-400" />
              </div>
            </Card>
            <Card className="student-surface border-0 bg-transparent p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400/75">Semester GPA</p>
                  <p className="text-2xl font-semibold text-white">
                    {typeof semesterGpa === 'number'
                      ? semesterGpa.toFixed(2)
                      : 'N/A'}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-amber-400" />
              </div>
            </Card>
          </>
        )}
      </div>

      <Card className="student-surface border-0 bg-transparent">
        <CardHeader>
          <CardTitle className="text-white">Enrolled Courses</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={courses}
            columns={columns}
            searchKey="title"
            emptyMessage="No courses enrolled"
            isLoading={isLoading || !hasLoaded}
            skeletonRows={6}
            hideSearchWhileLoading
            skeletonColumns={columns.length}
            showEmptyState={hasLoaded}
          />
        </CardContent>
      </Card>
    </div>
  );
}