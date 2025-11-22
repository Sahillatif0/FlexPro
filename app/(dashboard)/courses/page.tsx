'use client';

import { useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/store';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Users, Clock, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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
  sectionInstructor: {
    id: string;
    fullName: string;
    employeeId: string | null;
  } | null;
  sections: Array<{
    id: string;
    name: string;
    instructor: {
      id: string;
      fullName: string;
      employeeId: string | null;
    } | null;
  }>;
}

interface CoursesSummary {
  totalCreditHours: number;
  averageAttendance: number | null;
  semesterGpa: number | null;
  enrolledCount: number;
}

export default function CoursesPage() {
  const { user } = useAppStore();
  const { toast } = useToast();
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [summary, setSummary] = useState<CoursesSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const userId = user.id;

    const controller = new AbortController();

    async function loadCourses() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ userId });
        const response = await fetch(`/api/courses?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result?.message || 'Failed to load courses');
        }

        const payload = (await response.json()) as {
          courses: CourseRow[];
          summary: CoursesSummary;
        };

        setCourses(payload.courses);
        setSummary(payload.summary);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Courses fetch error', err);
        setError(err.message || 'Failed to load courses');
        toast({
          title: 'Unable to load courses',
          description: err.message || 'Please try again shortly.',
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadCourses();

    return () => controller.abort();
  }, [toast, user]);

  const columns = useMemo(
    () => [
      {
        key: 'code',
        title: 'Course Code',
        render: (value: string) => (
          <span className="font-mono text-blue-400">{value}</span>
        ),
        sortable: true,
      },
      {
        key: 'title',
        title: 'Course Title',
        render: (value: string) => (
          <span className="font-medium text-white">{value}</span>
        ),
        sortable: true,
      },
      {
        key: 'creditHours',
        title: 'Credit Hours',
        render: (value: number) => (
          <Badge variant="outline" className="border-gray-600 text-gray-300">
            {value} CR
          </Badge>
        ),
        sortable: true,
      },
      {
        key: 'section',
        title: 'Section',
        render: (value: string | null) => (
          <Badge variant="outline" className="border-gray-600 text-gray-300">
            {value ?? '—'}
          </Badge>
        ),
      },
      {
        key: 'sectionInstructor',
        title: 'Instructor',
        render: (_: unknown, item: CourseRow) => (
          <span className="text-sm text-gray-300">
            {item.sectionInstructor?.fullName ?? '—'}
          </span>
        ),
      },
      {
        key: 'capacity',
        title: 'Enrollment',
        render: (value: number, item: CourseRow) => (
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <Users className="h-3 w-3" />
            <span>
              {item.enrolled}/{value}
            </span>
          </div>
        ),
      },
      {
        key: 'status',
        title: 'Status',
        render: (value: string) => (
          <Badge
            variant={value === 'enrolled' ? 'default' : 'secondary'}
            className={value === 'enrolled' ? 'bg-emerald-600' : ''}
          >
            {value}
          </Badge>
        ),
      },
    ],
    []
  );

  if (!user) {
    return (
      <div className="text-gray-300">
        Sign in to view your enrolled courses.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">My Courses</h1>
          <p className="text-gray-400">
            Manage your enrolled courses and view details
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" asChild>
          <a href="/enroll">
            <BookOpen className="h-4 w-4 mr-2" />
            View All Available
          </a>
        </Button>
      </div>

      {error ? (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {isLoading && !summary ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-28 bg-gray-700" />
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
                    <p className="text-gray-400 text-sm">Total Credit Hours</p>
                    <p className="text-2xl font-bold text-white">
                      {summary?.totalCreditHours ?? 0}
                    </p>
                  </div>
                  <BookOpen className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Average Attendance</p>
                    <p className="text-2xl font-bold text-white">
                      {summary?.averageAttendance !== null
                        ? `${summary?.averageAttendance.toFixed(1)}%`
                        : 'N/A'}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Semester GPA</p>
                    <p className="text-2xl font-bold text-white">
                      {summary?.semesterGpa !== null
                        ? summary?.semesterGpa.toFixed(2)
                        : 'N/A'}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Enrolled Courses</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="grid grid-cols-5 items-center gap-4">
                  <Skeleton className="h-4 w-20 bg-gray-700" />
                  <Skeleton className="h-4 w-56 bg-gray-700 col-span-2" />
                  <Skeleton className="h-4 w-16 bg-gray-700" />
                  <Skeleton className="h-8 w-20 bg-gray-700" />
                </div>
              ))}
            </div>
          ) : (
            <DataTable
              data={courses}
              columns={columns}
              searchKey="title"
              emptyMessage="No courses enrolled"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}