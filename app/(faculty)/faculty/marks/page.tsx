"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface TeachingStudent {
  userId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface TeachingTerm {
  termId: string;
  termName: string;
  students: TeachingStudent[];
}

interface TeachingCourse {
  courseId: string;
  code: string;
  title: string;
  terms: TeachingTerm[];
}

interface GradeRecord {
  userId: string;
  grade: string | null;
  gradePoints: number | null;
}

type GradeEntry = {
  grade: string;
  gradePoints: string;
};

const GRADE_POINTS: Record<string, string> = {
  "A+": "4.00",
  A: "4.00",
  "A-": "3.67",
  "B+": "3.33",
  B: "3.00",
  "B-": "2.67",
  "C+": "2.33",
  C: "2.00",
  "C-": "1.67",
  "D+": "1.33",
  D: "1.00",
  F: "0.00",
};

export default function FacultyMarksPage() {
  const { toast } = useToast();
  const [courses, setCourses] = useState<TeachingCourse[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedTermId, setSelectedTermId] = useState<string>("");
  const [gradeEntries, setGradeEntries] = useState<Record<string, GradeEntry>>({});
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadCourses() {
      setIsLoadingCourses(true);
      setError(null);
      try {
        const response = await fetch("/api/faculty/teaching", {
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.message ?? "Failed to load teaching assignments");
        }
        const payload: { courses: TeachingCourse[] } = await response.json();
        if (!cancelled) {
          setCourses(payload.courses);
          if (payload.courses.length) {
            setSelectedCourseId(payload.courses[0].courseId);
            const firstTerm = payload.courses[0].terms[0];
            if (firstTerm) {
              setSelectedTermId(firstTerm.termId);
            }
          }
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
          setIsLoadingCourses(false);
        }
      }
    }

    loadCourses();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const activeCourse = useMemo(
    () => courses.find((course) => course.courseId === selectedCourseId),
    [courses, selectedCourseId]
  );

  const activeTerm = useMemo(() => {
    if (!activeCourse) {
      return undefined;
    }
    return activeCourse.terms.find((term) => term.termId === selectedTermId);
  }, [activeCourse, selectedTermId]);

  useEffect(() => {
    if (!selectedCourseId || !selectedTermId) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function loadGrades() {
      setIsLoadingGrades(true);
      try {
        const params = new URLSearchParams({
          courseId: selectedCourseId,
          termId: selectedTermId,
        });
        const response = await fetch(`/api/faculty/marks?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.message ?? "Failed to load gradebook");
        }
        const payload: { records: GradeRecord[] } = await response.json();
        if (!cancelled) {
          const nextEntries: Record<string, GradeEntry> = {};
          payload.records.forEach((record) => {
            nextEntries[record.userId] = {
              grade: record.grade ?? "",
              gradePoints: record.gradePoints !== null ? record.gradePoints.toFixed(2) : "",
            };
          });
          setGradeEntries(nextEntries);
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
          setIsLoadingGrades(false);
        }
      }
    }

    loadGrades();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedCourseId, selectedTermId]);

  const updateGrade = (userId: string, updates: Partial<GradeEntry>) => {
    setGradeEntries((prev) => ({
      ...prev,
      [userId]: {
        grade: updates.grade ?? prev[userId]?.grade ?? "",
        gradePoints: updates.gradePoints ?? prev[userId]?.gradePoints ?? "",
      },
    }));
  };

  const handleSave = async () => {
    if (!selectedCourseId || !selectedTermId || !activeTerm) {
      return;
    }

    try {
      setIsSaving(true);
      const entries = activeTerm?.students?.map((student) => {
        const current = gradeEntries[student.userId] ?? { grade: "", gradePoints: "" };
        return {
          userId: student.userId,
          grade: current.grade || null,
          gradePoints: current.gradePoints ? parseFloat(current.gradePoints) : null,
        };
      });

      const response = await fetch("/api/faculty/marks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: selectedCourseId,
          termId: selectedTermId,
          entries,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message ?? "Failed to save gradebook");
      }

      toast({
        title: "Grades updated",
        description: payload?.message ?? "Gradebook saved successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Unable to save grades",
        description: err?.message ?? "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-white">Gradebook</h1>
        <p className="text-sm text-gray-400">
          Assign term grades for each enrolled student.
        </p>
      </div>

      {error ? (
        <Card className="bg-red-500/10 border-red-500/40">
          <CardContent className="p-4 text-sm text-red-200">{error}</CardContent>
        </Card>
      ) : null}

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Gradebook Context</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {isLoadingCourses ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-10 bg-gray-800" />
            ))
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm text-gray-300">Course</label>
                <Select
                  value={selectedCourseId}
                  onValueChange={(value) => {
                    setSelectedCourseId(value);
                    const course = courses.find((item) => item.courseId === value);
                    const firstTerm = course?.terms[0];
                    setSelectedTermId(firstTerm ? firstTerm.termId : "");
                  }}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Choose course" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-800">
                    {courses.map((course) => (
                      <SelectItem key={course.courseId} value={course.courseId} className="text-white">
                        {course.code} · {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-300">Term</label>
                <Select value={selectedTermId} onValueChange={setSelectedTermId}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Choose term" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-800">
                    {activeCourse?.terms.map((term) => (
                      <SelectItem key={term.termId} value={term.termId} className="text-white">
                        {term.termName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-300">Grading Scale</label>
                <div className="rounded-md border border-gray-700 bg-gray-800 p-3 text-xs text-gray-300">
                  Grades automatically default to the standard 4.0 scale. Adjust grade points if needed.
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Students</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingCourses || !activeTerm ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-[2fr,1fr,1fr] gap-4 items-center">
                  <Skeleton className="h-5 bg-gray-800" />
                  <Skeleton className="h-10 bg-gray-800" />
                  <Skeleton className="h-10 bg-gray-800" />
                </div>
              ))}
            </div>
          ) : activeTerm?.students?.length === 0 ? (
            <p className="text-sm text-gray-400">No students are enrolled for the selected course and term.</p>
          ) : (
            <div className="space-y-3">
              {activeTerm?.students?.map((student) => {
                const entry = gradeEntries[student.userId] ?? { grade: "", gradePoints: "" };
                return (
                  <div
                    key={student.userId}
                    className="grid grid-cols-1 md:grid-cols-[2fr,1fr,1fr] gap-4 rounded-lg bg-gray-800/60 p-4"
                  >
                    <div>
                      <p className="text-white font-medium">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs text-gray-400">{student.studentId}</p>
                      <p className="text-xs text-gray-500">{student.email}</p>
                    </div>
                    <Select
                      value={entry.grade}
                      onValueChange={(value) =>
                        updateGrade(student.userId, {
                          grade: value,
                          gradePoints: GRADE_POINTS[value] ?? entry.gradePoints,
                        })
                      }
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Grade" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-800">
                        <SelectItem value="" className="text-gray-300">
                          Not graded
                        </SelectItem>
                        {Object.keys(GRADE_POINTS).map((grade) => (
                          <SelectItem key={grade} value={grade} className="text-white">
                            {grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={entry.gradePoints}
                      onChange={(event) => updateGrade(student.userId, { gradePoints: event.target.value })}
                      placeholder="Grade Points"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving || isLoadingGrades || !activeTerm}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {isSaving ? "Saving..." : "Save Grades"}
        </Button>
      </div>
    </div>
  );
}
