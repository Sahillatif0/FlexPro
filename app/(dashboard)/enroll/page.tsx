'use client';

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Search } from 'lucide-react';
import { StudentMetricSkeleton } from '@/components/ui/student-skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface AvailableCourse {
  id: string;
  code: string;
  title: string;
  creditHours: number;
  prerequisite: string | null;
  enrolled: number;
  capacity: number;
  department: string;
  semester: number;
  available: boolean;
  alreadyEnrolled: boolean;
  sections: { id: string; name: string }[];
  matchesStudentSection: boolean;
  studentSection: string | null;
}

interface EnrollmentSummary {
  availableCount: number;
  currentCredits: number;
  creditLimit: number;
  enrolledCount: number;
}

interface ActiveTermInfo {
  id: string;
  name: string;
  season: string;
  year: number;
  registrationEndsOn: string;
}

export default function EnrollPage() {
  const { user } = useAppStore();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'enrolled' | 'full' | 'restricted'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [courses, setCourses] = useState<AvailableCourse[]>([]);
  const [summary, setSummary] = useState<EnrollmentSummary | null>(null);
  const [term, setTerm] = useState<ActiveTermInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [enrollingCourse, setEnrollingCourse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [limitDialogMessage, setLimitDialogMessage] = useState('');

  const statusFilters = useMemo(
    () => [
      { value: 'all', label: 'All' },
      { value: 'available', label: 'Open Seats' },
      { value: 'enrolled', label: 'Enrolled' },
      { value: 'full', label: 'Full' }
    ] as const,
    []
  );

  const loadCourses = useCallback(
    async (signal?: AbortSignal) => {
      if (!user) return;
      setIsLoading(true);
      setHasLoaded(false);
      setError(null);

      try {
        const params = new URLSearchParams({ userId: user.id });
        const response = await fetch(`/api/enroll?${params.toString()}`, {
          signal,
        });

        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result?.message || 'Failed to load enrollment data');
        }

        const payload = (await response.json()) as {
          courses: AvailableCourse[];
          departments: string[];
          summary: EnrollmentSummary;
          term: ActiveTermInfo;
        };

        setCourses(payload.courses);
        setSummary(payload.summary);
        setTerm(payload.term);
        setHasLoaded(true);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Enrollment fetch error', err);
        setError(err.message || 'Failed to load course availability');
        toast({
          title: 'Unable to load courses',
          description: err.message || 'Please refresh and try again.',
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

  const filteredCourses = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const courseStatus = (course: AvailableCourse): 'available' | 'enrolled' | 'full' | 'restricted' => {
      if (course.alreadyEnrolled) return 'enrolled';
      if (!course.matchesStudentSection) return 'restricted';
      if (!course.available) return 'full';
      return 'available';
    };

    const matchesStatus = (course: AvailableCourse) =>
      statusFilter === 'all' || courseStatus(course) === statusFilter;

    const matchesSearch = (course: AvailableCourse) => {
      if (!query) return true;
      return (
        course.title.toLowerCase().includes(query) ||
        course.code.toLowerCase().includes(query) ||
        course.department.toLowerCase().includes(query)
      );
    };

    return courses.filter((course) => matchesStatus(course) && matchesSearch(course));
  }, [courses, searchTerm, statusFilter]);

  const handleEnroll = useCallback(
    async (courseId: string) => {
      if (!user) return;
      setEnrollingCourse(courseId);

      try {
        const response = await fetch('/api/enroll', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: user.id, courseId }),
        });

        if (!response.ok) {
          const result = await response.json().catch(() => ({}));

          if (response.status === 409 && (result?.message?.includes('credit hour limit') || result?.message?.includes('capacity'))) {
            setLimitDialogMessage(result.message);
            setShowLimitDialog(true);
            return;
          }

          throw new Error(result?.message || 'Enrollment failed');
        }

        toast({
          title: 'Enrollment successful',
          description: 'The course has been added to your registrations.',
        });
        await loadCourses();
      } catch (err: any) {
        console.error('Enrollment error', err);
        toast({
          title: 'Unable to enroll',
          description: err.message || 'Please try again later.',
        });
      } finally {
        setEnrollingCourse(null);
      }
    },
    [loadCourses, toast, user]
  );

  const handleDrop = useCallback(
    async (courseId: string) => {
      if (!user) return;
      setEnrollingCourse(courseId);

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
          description: 'You have successfully dropped the course.',
        });
        await loadCourses();
      } catch (err: any) {
        console.error('Drop error', err);
        toast({
          title: 'Unable to drop course',
          description: err.message || 'Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setEnrollingCourse(null);
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
        key: 'capacity',
        title: 'Enrollment',
        render: (value: number, item: AvailableCourse) => {
          const fillPercent = value ? Math.min((item.enrolled / value) * 100, 100) : 0;
          return (
            <div className="text-sm">
              <span className="text-gray-400">
                {item.enrolled}/{value}
              </span>
              <div className="w-full bg-gray-600 rounded-full h-1 mt-1">
                <div
                  className="bg-blue-500 h-1 rounded-full"
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
            </div>
          );
        },
      },
      {
        key: 'sections',
        title: 'Sections',
        render: (_: unknown, item: AvailableCourse) => (
          item.sections.length ? (
            <div className="flex flex-wrap gap-1">
              {item.sections.map((section) => (
                <Badge key={section.id} variant="outline" className="border-gray-600 text-gray-300">
                  {section.name}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-xs text-gray-500">All Sections</span>
          )
        ),
      },
      {
        key: 'available',
        title: 'Status',
        render: (_: boolean, item: AvailableCourse) => (
          (() => {
            const label = item.alreadyEnrolled
              ? 'Enrolled'
              : !item.matchesStudentSection
                ? 'Section Restricted'
                : item.available
                  ? 'Available'
                  : 'Full';

            const variant = label === 'Available' ? 'default' : item.alreadyEnrolled ? 'secondary' : 'destructive';
            const className = label === 'Available' ? 'bg-emerald-600' : label === 'Enrolled' ? 'bg-blue-600/30 text-blue-200' : '';

            return (
              <Badge variant={variant} className={className}>
                {label}
              </Badge>
            );
          })()
        ),
      },
      {
        key: 'actions',
        title: 'Actions',
        render: (_: unknown, item: AvailableCourse) => {
          if (item.alreadyEnrolled) {
            return (
              <Button
                size="sm"
                disabled={enrollingCourse === item.id}
                variant="destructive"
                onClick={() => handleDrop(item.id)}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                {enrollingCourse === item.id ? 'Dropping...' : 'Drop'}
              </Button>
            );
          }

          return (
            <Button
              size="sm"
              disabled={!item.available || enrollingCourse === item.id || !item.matchesStudentSection}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
              onClick={() => handleEnroll(item.id)}
            >
              <Plus className="h-3 w-3 mr-1" />
              {!item.matchesStudentSection
                ? 'Section Locked'
                : enrollingCourse === item.id
                  ? 'Enrolling...'
                  : 'Enroll'}
            </Button>
          );
        },
      },
    ],
    [enrollingCourse, handleEnroll, handleDrop]
  );

  if (!user) {
    return <div className="text-gray-300">Sign in to enroll in courses.</div>;
  }

  const registrationDeadline = term?.registrationEndsOn
    ? new Date(term.registrationEndsOn).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    : null;

  const showMetricSkeletons = isLoading || !hasLoaded;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Course Enrollment</h1>
        <p className="text-sm text-gray-400 sm:text-base">Browse and enroll in available courses</p>
      </div>

      {error ? (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <Card className="student-surface border-0 bg-transparent">
        <CardHeader className="px-4 pb-3 pt-6 sm:px-6">
          <CardTitle className="text-lg text-white sm:text-xl">Filter Courses</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-6 sm:px-6">
          <div className="space-y-6 md:grid md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] md:items-start md:gap-6">
            <div className="space-y-3">
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400/70">Find a course</label>
              <div className="group relative w-full">
                <div className="pointer-events-none absolute -inset-[1px] rounded-[1.05rem] bg-gradient-to-r from-sky-500/25 via-indigo-500/20 to-blue-500/20 opacity-0 blur-[1px] transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100" />
                <div className="relative overflow-hidden rounded-[1rem] border border-white/10 bg-[#0b1220]/80 backdrop-blur">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400/70 transition-colors duration-300 group-focus-within:text-blue-200 group-hover:text-blue-200" />
                  <Input
                    value={searchTerm}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value)}
                    placeholder="Search by code, title, or department"
                    className="h-11 w-full rounded-[1rem] border border-transparent bg-transparent pl-12 pr-4 text-sm text-slate-100 placeholder:text-slate-400 focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400/70">Status</label>
              <div className="flex flex-wrap gap-2">
                {statusFilters.map((filter) => (
                  <Button
                    key={filter.value}
                    type="button"
                    size="sm"
                    onClick={() => setStatusFilter(filter.value)}
                    className={cn(
                      'rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-blue-500/50 hover:text-white',
                      statusFilter === filter.value && 'border-blue-500/60 bg-blue-600/20 text-white shadow-[0_12px_35px_-22px_rgba(59,130,246,0.85)]'
                    )}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {showMetricSkeletons ? (
          Array.from({ length: 3 }).map((_, index) => <StudentMetricSkeleton key={index} />)
        ) : (
          <>
            <Card className="student-surface border-0 bg-transparent p-6">
              <div className="space-y-3 text-center">
                <p className="text-sm text-slate-400/75">Available Courses</p>
                <p className="text-2xl font-semibold text-white">
                  {summary?.availableCount ?? 0}
                </p>
              </div>
            </Card>
            <Card className="student-surface border-0 bg-transparent p-6">
              <div className="space-y-3 text-center">
                <p className="text-sm text-slate-400/75">Credit Limit</p>
                <p className="text-2xl font-semibold text-white">
                  {summary?.creditLimit ?? 0}
                </p>
                <p className="text-xs text-slate-400/80">
                  Currently enrolled: {summary?.currentCredits ?? 0} credit hours
                </p>
              </div>
            </Card>
            <Card className="student-surface border-0 bg-transparent p-6">
              <div className="space-y-3 text-center">
                <p className="text-sm text-slate-400/75">Registration Period</p>
                <p className="text-2xl font-semibold text-emerald-400">
                  {registrationDeadline ? 'Open' : 'Pending'}
                </p>
                <p className="text-xs text-slate-400/80">
                  {registrationDeadline
                    ? `Ends ${registrationDeadline}`
                    : 'Registration window not announced'}
                </p>
              </div>
            </Card>
          </>
        )}
      </div>

      <Card className="student-surface border-0 bg-transparent">
        <CardHeader className="px-4 pb-3 pt-6 sm:px-6 sm:pb-4">
          <CardTitle className="text-lg text-white sm:text-xl">Available Courses</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-6 sm:px-6">
          <div className="-mx-1 sm:mx-0">
            <DataTable
            key={`${statusFilter}-${searchTerm}`}
            data={filteredCourses}
            columns={columns}
            searchable={false}
            emptyMessage="No courses available for enrollment"
            isLoading={isLoading || !hasLoaded}
            skeletonRows={8}
            hideSearchWhileLoading
            skeletonColumns={columns.length}
            showEmptyState={hasLoaded}
            />
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <AlertDialogContent className="student-popover text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Registration Limit Reached</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {limitDialogMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setShowLimitDialog(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Understood
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}