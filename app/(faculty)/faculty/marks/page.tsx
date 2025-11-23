
"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface TeachingStudent {
  userId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface TeachingSection {
  sectionId: string;
  sectionName: string;
  students: TeachingStudent[];
}

interface TeachingTerm {
  termId: string;
  termName: string;
  sections: TeachingSection[];
}

interface TeachingCourse {
  courseId: string;
  code: string;
  title: string;
  terms: TeachingTerm[];
}

interface StudentMark {
  assignment1: number;
  assignment2: number;
  quiz1: number;
  quiz2: number;
  quiz3: number;
  quiz4: number;
  mid1: number;
  mid2: number;
  finalExam: number;
  graceMarks: number;
  total: number;
}

interface MarkRecord {
  userId: string;
  studentMark: StudentMark | null;
}

const MAX_MARKS = {
  assignment1: 5,
  assignment2: 5,
  quiz1: 2.5,
  quiz2: 2.5,
  quiz3: 2.5,
  quiz4: 2.5,
  mid1: 15,
  mid2: 15,
  finalExam: 50,
  graceMarks: 8,
};

export default function FacultyMarksPage() {
  const { toast } = useToast();
  const [courses, setCourses] = useState<TeachingCourse[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedTermId, setSelectedTermId] = useState<string>("");
  const [marksEntries, setMarksEntries] = useState<Record<string, StudentMark>>({});
  const [isLoadingMarks, setIsLoadingMarks] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [graceMarksInput, setGraceMarksInput] = useState<string>("");

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

  const allStudents = useMemo(() => {
    if (!activeTerm) return [];
    return activeTerm.sections.flatMap((section) => section.students);
  }, [activeTerm]);

  useEffect(() => {
    if (!selectedCourseId || !selectedTermId) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function loadMarks() {
      setIsLoadingMarks(true);
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
          throw new Error(payload?.message ?? "Failed to load marks");
        }
        const payload: { records: MarkRecord[] } = await response.json();
        if (!cancelled) {
          const nextEntries: Record<string, StudentMark> = {};
          payload.records.forEach((record) => {
            if (record.studentMark) {
              nextEntries[record.userId] = record.studentMark;
            } else {
              nextEntries[record.userId] = {
                assignment1: 0,
                assignment2: 0,
                quiz1: 0,
                quiz2: 0,
                quiz3: 0,
                quiz4: 0,
                mid1: 0,
                mid2: 0,
                finalExam: 0,
                graceMarks: 0,
                total: 0,
              };
            }
          });
          setMarksEntries(nextEntries);
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
          setIsLoadingMarks(false);
        }
      }
    }

    loadMarks();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedCourseId, selectedTermId]);

  const updateMark = (userId: string, field: keyof StudentMark, value: string) => {
    const numValue = parseFloat(value);
    let safeValue = isNaN(numValue) ? 0 : numValue;

    // Validation: Clamp value to max marks
    if (field in MAX_MARKS) {
      const max = MAX_MARKS[field as keyof typeof MAX_MARKS];
      if (safeValue > max) {
        safeValue = max;
        toast({
          title: "Invalid Mark",
          description: `Maximum mark for ${field} is ${max}`,
          variant: "destructive",
        });
      }
    }

    if (safeValue < 0) safeValue = 0;

    setMarksEntries((prev) => {
      const current = prev[userId] ?? {
        assignment1: 0, assignment2: 0, quiz1: 0, quiz2: 0, quiz3: 0, quiz4: 0, mid1: 0, mid2: 0, finalExam: 0, graceMarks: 0, total: 0
      };

      const updated = { ...current, [field]: safeValue };

      // Recalculate total
      updated.total =
        updated.assignment1 + updated.assignment2 +
        updated.quiz1 + updated.quiz2 + updated.quiz3 + updated.quiz4 +
        updated.mid1 + updated.mid2 +
        updated.finalExam + updated.graceMarks;

      return {
        ...prev,
        [userId]: updated,
      };
    });
  };

  const applyGraceMarksToAll = () => {
    const value = parseFloat(graceMarksInput);
    if (isNaN(value)) return;

    if (value > MAX_MARKS.graceMarks) {
      toast({
        title: "Invalid Grace Marks",
        description: `Maximum grace marks allowed is ${MAX_MARKS.graceMarks}`,
        variant: "destructive",
      });
      return;
    }

    if (value < 0) {
      toast({
        title: "Invalid Grace Marks",
        description: "Grace marks cannot be negative",
        variant: "destructive",
      });
      return;
    }

    setMarksEntries((prev) => {
      const next = { ...prev };
      allStudents.forEach((student) => {
        const current = next[student.userId] ?? {
          assignment1: 0, assignment2: 0, quiz1: 0, quiz2: 0, quiz3: 0, quiz4: 0, mid1: 0, mid2: 0, finalExam: 0, graceMarks: 0, total: 0
        };
        const updated = { ...current, graceMarks: value };
        updated.total =
          updated.assignment1 + updated.assignment2 +
          updated.quiz1 + updated.quiz2 + updated.quiz3 + updated.quiz4 +
          updated.mid1 + updated.mid2 +
          updated.finalExam + updated.graceMarks;
        next[student.userId] = updated;
      });
      return next;
    });

    toast({
      title: "Grace Marks Applied",
      description: `Applied ${value} grace marks to all students.`,
    });
  };

  const handleSave = async () => {
    if (!selectedCourseId || !selectedTermId || !activeTerm) {
      return;
    }

    try {
      setIsSaving(true);
      const entries = allStudents.map((student) => {
        const current = marksEntries[student.userId] ?? {
          assignment1: 0, assignment2: 0, quiz1: 0, quiz2: 0, quiz3: 0, quiz4: 0, mid1: 0, mid2: 0, finalExam: 0, graceMarks: 0, total: 0
        };
        return {
          userId: student.userId,
          ...current
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
        throw new Error(payload?.message ?? "Failed to save marks");
      }

      toast({
        title: "Marks updated",
        description: payload?.message ?? "Marks saved successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Unable to save marks",
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
        <h1 className="text-2xl font-semibold text-white">Marks Management</h1>
        <p className="text-sm text-gray-400">
          Enter marks for assignments, quizzes, mids, and final exam.
        </p>
      </div>

      {error ? (
        <Card className="bg-red-500/10 border-red-500/40">
          <CardContent className="p-4 text-sm text-red-200">{error}</CardContent>
        </Card>
      ) : null}

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Context</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {isLoadingCourses ? (
            Array.from({ length: 2 }).map((_, index) => (
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
            </>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Student Marks</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Grace Marks (Max 8):</span>
              <Input
                className="h-8 w-20 bg-gray-800 border-gray-700 text-center"
                value={graceMarksInput}
                onChange={(e) => setGraceMarksInput(e.target.value)}
                placeholder="0"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={applyGraceMarksToAll}
                disabled={!activeTerm}
              >
                Apply to All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingCourses || !activeTerm ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-10 bg-gray-800" />
              ))}
            </div>
          ) : allStudents.length === 0 ? (
            <div className="p-4 text-sm text-gray-400">No students are enrolled for the selected course and term.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-800/50">
                  <TableRow className="border-gray-800 hover:bg-transparent">
                    <TableHead className="text-gray-300 min-w-[200px]">Student</TableHead>
                    <TableHead className="text-gray-300 text-center w-[80px]">A1 (5)</TableHead>
                    <TableHead className="text-gray-300 text-center w-[80px]">A2 (5)</TableHead>
                    <TableHead className="text-gray-300 text-center w-[80px]">Q1 (2.5)</TableHead>
                    <TableHead className="text-gray-300 text-center w-[80px]">Q2 (2.5)</TableHead>
                    <TableHead className="text-gray-300 text-center w-[80px]">Q3 (2.5)</TableHead>
                    <TableHead className="text-gray-300 text-center w-[80px]">Q4 (2.5)</TableHead>
                    <TableHead className="text-gray-300 text-center w-[80px]">M1 (15)</TableHead>
                    <TableHead className="text-gray-300 text-center w-[80px]">M2 (15)</TableHead>
                    <TableHead className="text-gray-300 text-center w-[80px]">Final (50)</TableHead>
                    <TableHead className="text-gray-300 text-center w-[80px]">Grace (8)</TableHead>
                    <TableHead className="text-gray-300 text-center w-[80px] font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allStudents.map((student) => {
                    const entry = marksEntries[student.userId] ?? {
                      assignment1: 0, assignment2: 0, quiz1: 0, quiz2: 0, quiz3: 0, quiz4: 0, mid1: 0, mid2: 0, finalExam: 0, graceMarks: 0, total: 0
                    };
                    return (
                      <TableRow key={student.userId} className="border-gray-800 hover:bg-gray-800/30">
                        <TableCell className="font-medium">
                          <div className="text-white">{student.firstName} {student.lastName}</div>
                          <div className="text-xs text-gray-500">{student.studentId}</div>
                        </TableCell>
                        <TableCell><Input className="h-8 bg-gray-800 border-gray-700 text-center" value={entry.assignment1} onChange={(e) => updateMark(student.userId, 'assignment1', e.target.value)} /></TableCell>
                        <TableCell><Input className="h-8 bg-gray-800 border-gray-700 text-center" value={entry.assignment2} onChange={(e) => updateMark(student.userId, 'assignment2', e.target.value)} /></TableCell>
                        <TableCell><Input className="h-8 bg-gray-800 border-gray-700 text-center" value={entry.quiz1} onChange={(e) => updateMark(student.userId, 'quiz1', e.target.value)} /></TableCell>
                        <TableCell><Input className="h-8 bg-gray-800 border-gray-700 text-center" value={entry.quiz2} onChange={(e) => updateMark(student.userId, 'quiz2', e.target.value)} /></TableCell>
                        <TableCell><Input className="h-8 bg-gray-800 border-gray-700 text-center" value={entry.quiz3} onChange={(e) => updateMark(student.userId, 'quiz3', e.target.value)} /></TableCell>
                        <TableCell><Input className="h-8 bg-gray-800 border-gray-700 text-center" value={entry.quiz4} onChange={(e) => updateMark(student.userId, 'quiz4', e.target.value)} /></TableCell>
                        <TableCell><Input className="h-8 bg-gray-800 border-gray-700 text-center" value={entry.mid1} onChange={(e) => updateMark(student.userId, 'mid1', e.target.value)} /></TableCell>
                        <TableCell><Input className="h-8 bg-gray-800 border-gray-700 text-center" value={entry.mid2} onChange={(e) => updateMark(student.userId, 'mid2', e.target.value)} /></TableCell>
                        <TableCell><Input className="h-8 bg-gray-800 border-gray-700 text-center" value={entry.finalExam} onChange={(e) => updateMark(student.userId, 'finalExam', e.target.value)} /></TableCell>
                        <TableCell><Input className="h-8 bg-gray-800 border-gray-700 text-center" value={entry.graceMarks} onChange={(e) => updateMark(student.userId, 'graceMarks', e.target.value)} /></TableCell>
                        <TableCell className="text-center font-bold text-emerald-400">{entry.total.toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving || isLoadingMarks || !activeTerm}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {isSaving ? "Saving..." : "Save Marks"}
        </Button>
      </div>
    </div>
  );
}
