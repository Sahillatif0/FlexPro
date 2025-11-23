'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, GripVertical, Trash2, BookOpen, Calendar } from 'lucide-react';
import { useAppStore } from '@/store';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface StudyPlanCourse {
  id: string;
  courseId: string;
  code: string;
  title: string;
  creditHours: number;
  type: string;
}

interface StudyPlanSemester {
  number: number;
  year: number;
  courses: StudyPlanCourse[];
}

interface StudyPlanData {
  id: string;
  title: string;
  isDefault: boolean;
  semesters: StudyPlanSemester[];
}

interface AvailableCourse {
  id: string;
  code: string;
  title: string;
  creditHours: number;
  department: string;
  semester: number;
}

export default function StudyPlanPage() {
  const { user } = useAppStore();
  const { toast } = useToast();
  const [plan, setPlan] = useState<StudyPlanData | null>(null);
  const [availableCourses, setAvailableCourses] = useState<AvailableCourse[]>([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const controller = new AbortController();

    async function loadStudyPlan() {
      if(!user) return;
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ userId: user.id });
        const response = await fetch(`/api/study-plan?${params.toString()}`, {
          signal: controller.signal,
        });

        if (response.status === 404) {
          setPlan(null);
          setAvailableCourses([]);
          setSelectedSemester('');
          setError('No study plan found for your account yet.');
          return;
        }

        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result?.message || 'Failed to load study plan');
        }

        const payload = (await response.json()) as {
          plan: StudyPlanData;
          availableCourses: AvailableCourse[];
        };

        setPlan(payload.plan);
        setAvailableCourses(payload.availableCourses);

        if (payload.plan.semesters.length) {
          setSelectedSemester(payload.plan.semesters[0].number.toString());
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Study plan fetch error', err);
        setError(err.message || 'Failed to load study plan');
        toast({
          title: 'Unable to load study plan',
          description: err.message || 'Please try again later.',
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadStudyPlan();
    return () => controller.abort();
  }, [toast, user]);

  const selectedSemesterData = useMemo(() => {
    if (!plan || !selectedSemester) return undefined;
    const semesterNumber = parseInt(selectedSemester, 10);
    return plan.semesters.find((semester) => semester.number === semesterNumber);
  }, [plan, selectedSemester]);

  const totalCredits = useMemo(() => {
    if (!selectedSemesterData) return 0;
    return selectedSemesterData.courses.reduce((sum, course) => sum + course.creditHours, 0);
  }, [selectedSemesterData]);

  const overallStats = useMemo(() => {
    if (!plan) {
      return { semesters: 0, courses: 0, credits: 0 };
    }

    const semesters = plan.semesters.length;
    const courses = plan.semesters.reduce((sum, semester) => sum + semester.courses.length, 0);
    const credits = plan.semesters.reduce(
      (sum, semester) =>
        sum + semester.courses.reduce((courseSum, course) => courseSum + course.creditHours, 0),
      0
    );

    return { semesters, courses, credits };
  }, [plan]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'core':
        return 'bg-blue-600';
      case 'elective':
        return 'bg-emerald-600';
      case 'general':
        return 'bg-amber-600';
      default:
        return 'bg-gray-600';
    }
  };

  const handleAddCourse = async () => {
    if (!user || !plan || !selectedCourse || !selectedSemesterData) return;

    setIsAddingCourse(true);

    try {
      const response = await fetch('/api/study-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          planId: plan.id,
          courseId: selectedCourse,
          semester: selectedSemesterData.number,
          year: selectedSemesterData.year,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result?.message || 'Failed to add course to study plan');
      }

      const payload = (await response.json()) as {
        item: {
          id: string;
          courseId: string;
          course: {
            code: string;
            title: string;
            creditHours: number;
            department: string;
          } | null;
        };
      };

      const newCourse: StudyPlanCourse = {
        id: payload.item.id,
        courseId: payload.item.courseId,
        code: payload.item.course?.code ?? 'N/A',
        title: payload.item.course?.title ?? 'Course',
        creditHours: payload.item.course?.creditHours ?? 0,
        type:
          payload.item.course?.department === 'Computer Science'
            ? 'core'
            : payload.item.course?.department === 'Mathematics'
            ? 'general'
            : 'elective',
      };

      setPlan((current) => {
        if (!current) return current;

        return {
          ...current,
          semesters: current.semesters.map((semester) =>
            semester.number === selectedSemesterData.number
              ? {
                  ...semester,
                  courses: [...semester.courses, newCourse],
                }
              : semester
          ),
        };
      });

      toast({
        title: 'Course added',
        description: `${newCourse.code} has been added to semester ${selectedSemesterData.number}.`,
      });

      setSelectedCourse('');
      setIsDialogOpen(false);
    } catch (err: any) {
      console.error('Study plan add course error', err);
      toast({
        title: 'Unable to add course',
        description: err.message || 'Please try again later.',
      });
    } finally {
      setIsAddingCourse(false);
    }
  };

  if (!user) {
    return <p className="text-gray-300">Sign in to view your study plan.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Study Plan</h1>
          <p className="text-gray-400">Plan your academic journey and manage course selections</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" disabled>
          <Plus className="h-4 w-4 mr-2" />
          Create New Plan
        </Button>
      </div>

      {error ? (
        <p className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          {error}
        </p>
      ) : null}

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Degree Plan Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && !plan ? (
            <div className="grid gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-3 text-center">
                  <Skeleton className="h-4 w-24 bg-gray-700 mx-auto" />
                  <Skeleton className="h-6 w-20 bg-gray-700 mx-auto" />
                </div>
              ))}
            </div>
          ) : plan ? (
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center">
                <p className="text-gray-400 text-sm">Total Semesters</p>
                <p className="text-2xl font-bold text-white">{overallStats.semesters}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">Planned Courses</p>
                <p className="text-2xl font-bold text-white">{overallStats.courses}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">Total Credits</p>
                <p className="text-2xl font-bold text-white">{overallStats.credits}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">Completion</p>
                <p className="text-2xl font-bold text-emerald-400">In progress</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No study plan data available.</p>
          )}
        </CardContent>
      </Card>

      {isLoading && !plan ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-48 bg-gray-800" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="bg-gray-800 border-gray-700 lg:col-span-2">
              <CardContent className="space-y-3 p-6">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded bg-gray-700" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32 bg-gray-700" />
                      <Skeleton className="h-4 w-20 bg-gray-700" />
                    </div>
                    <Skeleton className="h-8 w-16 bg-gray-700" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="space-y-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="space-y-4 p-6">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24 bg-gray-700" />
                      <Skeleton className="h-4 w-12 bg-gray-700" />
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="bg-blue-900/20 border-blue-700">
                <CardContent className="space-y-3 p-6">
                  <Skeleton className="h-4 w-32 bg-blue-800" />
                  <Skeleton className="h-4 w-full bg-blue-800" />
                  <Skeleton className="h-2 w-full rounded bg-blue-800" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : plan ? (
        <>
          <div className="flex items-center gap-4">
            <Select value={selectedSemester} onValueChange={setSelectedSemester}>
              <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Select semester" />
              </SelectTrigger>
              <SelectContent className="student-popover">
                {plan.semesters.map((semester) => (
                  <SelectItem key={semester.number} value={semester.number.toString()} className="text-white">
                    Semester {semester.number} - {semester.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedSemesterData ? (
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  {selectedSemesterData.courses.length} Courses
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {totalCredits} Credit Hours
                </span>
              </div>
            ) : null}
          </div>

          {selectedSemesterData ? (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-white">
                      Semester {selectedSemesterData.number} - {selectedSemesterData.year}
                    </CardTitle>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                          <Plus className="h-4 w-4 mr-1" />
                          Add Course
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="student-popover">
                        <DialogHeader>
                          <DialogTitle className="text-white">Add Course to Semester</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                            <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                              <SelectValue placeholder="Select a course" />
                            </SelectTrigger>
                            <SelectContent className="student-popover max-h-60">
                              {availableCourses.map((course) => (
                                <SelectItem key={course.id} value={course.id} className="text-white">
                                  {course.code} - {course.title} ({course.creditHours} CR)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={handleAddCourse}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            disabled={isAddingCourse || !selectedCourse}
                          >
                            {isAddingCourse ? 'Adding…' : 'Add Course'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedSemesterData.courses.length ? (
                      selectedSemesterData.courses.map((course) => (
                        <div
                          key={course.id}
                          className="flex items-center gap-3 p-4 bg-gray-700 rounded-lg group hover:bg-gray-600 transition-colors"
                        >
                          <GripVertical className="h-4 w-4 text-gray-500 cursor-move" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-blue-400">{course.code}</span>
                              <Badge className={getTypeColor(course.type)} variant="default">
                                {course.type}
                              </Badge>
                            </div>
                            <p className="text-white font-medium">{course.title}</p>
                            <p className="text-gray-400 text-sm">{course.creditHours} Credit Hours</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
                            disabled
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-400">No courses added to this semester yet.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Semester Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Total Courses:</span>
                      <span className="text-white font-bold">{selectedSemesterData.courses.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Total Credits:</span>
                      <span className="text-white font-bold">{totalCredits}</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-gray-400 text-sm">Course Types:</p>
                      <div className="space-y-1">
                        {['core', 'elective', 'general'].map((type) => {
                          const count = selectedSemesterData.courses.filter((course) => course.type === type).length;
                          if (!count) return null;
                          return (
                            <div key={type} className="flex items-center justify-between">
                              <Badge className={getTypeColor(type)} variant="default">
                                {type}
                              </Badge>
                              <span className="text-white text-sm">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-blue-900/20 border-blue-700">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-blue-400 mt-0.5" />
                      <div>
                        <p className="text-blue-400 font-medium text-sm">Credit Limit</p>
                        <p className="text-blue-300 text-xs">
                          Maximum 21 credit hours allowed per semester. Current: {totalCredits} CR
                        </p>
                        <div className="w-full bg-blue-900/50 rounded-full h-2 mt-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${Math.min((totalCredits / 21) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}