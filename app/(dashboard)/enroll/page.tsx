'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/store';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [courses, setCourses] = useState<AvailableCourse[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [summary, setSummary] = useState<EnrollmentSummary | null>(null);
  const [term, setTerm] = useState<ActiveTermInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [enrollingCourse, setEnrollingCourse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [limitDialogMessage, setLimitDialogMessage] = useState('');

  const loadCourses = useCallback(
    async (signal?: AbortSignal) => {
      if (!user) return;
      setIsLoading(true);
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
        setDepartments(['all', ...payload.departments]);
        setSummary(payload.summary);
        setTerm(payload.term);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Enrollment fetch error', err);
        setError(err.message || 'Failed to load course availability');
        toast({
          title: 'Unable to load courses',
          description: err.message || 'Please refresh and try again.',
        });
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
    if (selectedDepartment === 'all') {
      return courses;
    }
    return courses.filter((course) => course.department === selectedDepartment);
  }, [courses, selectedDepartment]);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Course Enrollment</h1>
        <p className="text-gray-400">Browse and enroll in available courses</p>
      </div>

      {error ? (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Filter Courses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-48 bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept} className="text-white">
                    {dept === 'all' ? 'All Departments' : dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Available Courses</p>
              <p className="text-2xl font-bold text-white">
                {summary?.availableCount ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Credit Limit</p>
              <p className="text-2xl font-bold text-white">
                {summary?.creditLimit ?? 0}
              </p>
              <p className="text-xs text-gray-500">
                Currently enrolled: {summary?.currentCredits ?? 0} credit hours
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Registration Period</p>
              <p className="text-2xl font-bold text-emerald-400">
                {registrationDeadline ? 'Open' : 'Pending'}
              </p>
              <p className="text-xs text-gray-500">
                {registrationDeadline
                  ? `Ends ${registrationDeadline}`
                  : 'Registration window not announced'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Available Courses</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-gray-400">Loading available courses...</p>
          ) : (
            <DataTable
              data={filteredCourses}
              columns={columns}
              searchKey="title"
              emptyMessage="No courses available for enrollment"
            />
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <AlertDialogContent className="bg-gray-800 border-gray-700 text-white">
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