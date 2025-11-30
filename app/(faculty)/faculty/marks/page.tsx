
"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  finalized?: boolean;
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

const ASSESSMENT_FIELDS: Array<{ key: keyof StudentMark; label: string; max: number }> = [
  { key: "assignment1", label: "A1 (5)", max: MAX_MARKS.assignment1 },
  { key: "assignment2", label: "A2 (5)", max: MAX_MARKS.assignment2 },
  { key: "quiz1", label: "Q1 (2.5)", max: MAX_MARKS.quiz1 },
  { key: "quiz2", label: "Q2 (2.5)", max: MAX_MARKS.quiz2 },
  { key: "quiz3", label: "Q3 (2.5)", max: MAX_MARKS.quiz3 },
  { key: "quiz4", label: "Q4 (2.5)", max: MAX_MARKS.quiz4 },
  { key: "mid1", label: "M1 (15)", max: MAX_MARKS.mid1 },
  { key: "mid2", label: "M2 (15)", max: MAX_MARKS.mid2 },
  { key: "finalExam", label: "Final (50)", max: MAX_MARKS.finalExam },
  { key: "graceMarks", label: "Grace (8)", max: MAX_MARKS.graceMarks },
];

const createEmptyMark = (): StudentMark => ({
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
});

export default function FacultyMarksPage() {
  const { toast } = useToast();
  const [courses, setCourses] = useState<TeachingCourse[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedTermId, setSelectedTermId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("ALL");
  const [marksEntries, setMarksEntries] = useState<Record<string, StudentMark>>({});
  const [finalizedMap, setFinalizedMap] = useState<Record<string, boolean>>({});
  const [isLoadingMarks, setIsLoadingMarks] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(true);
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [graceMarksInput, setGraceMarksInput] = useState<string>("");
  const [isCompactViewport, setIsCompactViewport] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const mediaQuery = typeof window !== "undefined" ? window.matchMedia("(max-width: 768px)") : null;

    const handleViewportChange = () => {
      setIsCompactViewport(mediaQuery ? mediaQuery.matches : false);
    };

    if (mediaQuery) {
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener("change", handleViewportChange);
      } else {
        mediaQuery.addListener(handleViewportChange);
      }
      handleViewportChange();
    }

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
            const defaultCourse = payload.courses[0];
            setSelectedCourseId(defaultCourse.courseId);
            const firstTerm = defaultCourse.terms[0];
            if (firstTerm) {
              setSelectedTermId(firstTerm.termId);
            } else {
              setSelectedTermId("");
            }
            setSelectedSectionId("ALL");
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
      if (mediaQuery) {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener("change", handleViewportChange);
        } else {
          mediaQuery.removeListener(handleViewportChange);
        }
      }
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

  const activeSection = useMemo(() => {
    if (!activeTerm) {
      return undefined;
    }
    if (!selectedSectionId || selectedSectionId === "ALL") {
      return undefined;
    }
    return activeTerm.sections.find((section) => section.sectionId === selectedSectionId);
  }, [activeTerm, selectedSectionId]);

  const allStudents = useMemo(() => {
    if (!activeTerm) return [];
    if (selectedSectionId === "__unassigned__") {
      const unassigned = activeTerm.sections.find((section) => section.sectionId === "__unassigned__");
      return unassigned ? unassigned.students : [];
    }
    if (!selectedSectionId || selectedSectionId === "ALL") {
      return activeTerm.sections.flatMap((section) => section.students);
    }
    return activeSection ? activeSection.students : [];
  }, [activeTerm, activeSection, selectedSectionId]);

  useEffect(() => {
    if (!activeTerm) {
      setSelectedSectionId("ALL");
      return;
    }

    if (selectedSectionId === "ALL" || selectedSectionId === "__unassigned__") {
      return;
    }

    const exists = activeTerm.sections.some((section) => section.sectionId === selectedSectionId);
    if (!exists) {
      setSelectedSectionId("ALL");
    }
  }, [activeTerm, selectedSectionId]);

  const sectionBadgeLabel = useMemo(() => {
    if (!activeTerm) {
      return "No term selected";
    }
    if (selectedSectionId === "ALL") {
      return "All sections";
    }
    if (selectedSectionId === "__unassigned__") {
      return "Unassigned students";
    }
    const label = activeSection?.sectionName?.trim();
    if (label && label.length > 0) {
      return `Section ${label}`;
    }
    return `Section ${selectedSectionId}`;
  }, [activeSection, activeTerm, selectedSectionId]);

  const hasUnassignedSection = useMemo(() => {
    if (!activeTerm) {
      return false;
    }
    return activeTerm.sections.some((section) => section.sectionId === "__unassigned__");
  }, [activeTerm]);

  useEffect(() => {
    if (!selectedCourseId || !selectedTermId) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function loadMarks() {
      setIsLoadingMarks(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          courseId: selectedCourseId,
          termId: selectedTermId,
        });
        if (selectedSectionId && selectedSectionId !== "ALL") {
          params.set("sectionId", selectedSectionId);
        }
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
          const nextFinalized: Record<string, boolean> = {};
          payload.records.forEach((record) => {
            if (record.studentMark) {
              nextEntries[record.userId] = record.studentMark;
              nextFinalized[record.userId] = !!record.finalized;
            } else {
              nextEntries[record.userId] = createEmptyMark();
              nextFinalized[record.userId] = !!record.finalized;
            }
          });
          setMarksEntries(nextEntries);
          setFinalizedMap(nextFinalized);
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
  }, [selectedCourseId, selectedTermId, selectedSectionId]);

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
      const current = prev[userId] ?? createEmptyMark();

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
        const current = next[student.userId] ?? createEmptyMark();
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
        const current = marksEntries[student.userId] ?? createEmptyMark();
        return {
          userId: student.userId,
          ...current
        };
      });

      const sectionPayload = selectedSectionId && selectedSectionId !== "ALL" ? selectedSectionId : undefined;

      const response = await fetch("/api/faculty/marks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: selectedCourseId,
          termId: selectedTermId,
          sectionId: sectionPayload,
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

  const handleFinalize = async () => {
    if (!selectedCourseId || !selectedTermId) return;
    if (!confirm(`Finalize grades for ${activeCourse?.code} · ${activeCourse?.title}? This will create final transcript entries and mark enrollments completed.`)) {
      return;
    }

    try {
      setIsFinalizing(true);
      const sectionPayload = selectedSectionId && selectedSectionId !== "ALL" ? selectedSectionId : undefined;
      const response = await fetch('/api/faculty/marks/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: selectedCourseId, termId: selectedTermId, sectionId: sectionPayload }),
        credentials: 'include',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message ?? 'Failed to finalize grades');

      toast({ title: 'Grades finalized', description: payload?.message ?? 'Final transcripts created.' });
      // reload marks to pick up finalized state
      setTimeout(() => {
        // simple reload via re-fetch
        setIsLoadingMarks(true);
        const params = new URLSearchParams({ courseId: selectedCourseId, termId: selectedTermId });
        if (selectedSectionId && selectedSectionId !== 'ALL') params.set('sectionId', selectedSectionId);
        fetch(`/api/faculty/marks?${params.toString()}`, { credentials: 'include' }).then(async (res) => {
          const data = await res.json().catch(() => ({ records: [] }));
          const nextEntries: Record<string, StudentMark> = {};
          const nextFinalized: Record<string, boolean> = {};
          data.records.forEach((record: any) => {
            if (record.studentMark) {
              nextEntries[record.userId] = record.studentMark;
            } else {
              nextEntries[record.userId] = createEmptyMark();
            }
            nextFinalized[record.userId] = !!record.finalized;
          });
          setMarksEntries(nextEntries);
          setFinalizedMap(nextFinalized);
          setIsLoadingMarks(false);
        }).catch(() => setIsLoadingMarks(false));
      }, 250);
    } catch (err: any) {
      toast({ title: 'Unable to finalize grades', description: err?.message ?? 'Unexpected error', variant: 'destructive' });
    } finally {
      setIsFinalizing(false);
      setFinalizeDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Marks Management</h1>
          <p className="text-sm text-gray-400">
            Review, adjust, and publish marks for your assigned cohorts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
          >
            {allStudents.length} {allStudents.length === 1 ? "student" : "students"}
          </Badge>
          <Badge
            variant="outline"
            className={
              selectedSectionId === "ALL"
                ? "border-gray-700 bg-gray-800 text-gray-200"
                : selectedSectionId === "__unassigned__"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
                : "border-sky-500/40 bg-sky-500/10 text-sky-100"
            }
          >
            {sectionBadgeLabel}
          </Badge>
        </div>
      </div>

      {error ? (
        <Card className="border-red-500/40 bg-red-500/10">
          <CardContent className="p-4 text-sm text-red-200">{error}</CardContent>
        </Card>
      ) : null}

      <Card className="border-gray-800 bg-gray-900">
        <CardHeader>
          <CardTitle className="text-white">Context</CardTitle>
          <CardDescription className="text-gray-400">
            Choose the course, term, and section you want to grade. Data refreshes automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoadingCourses ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-11 rounded-md bg-gray-800" />
            ))
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Course</label>
                <Select
                  value={selectedCourseId}
                  onValueChange={(value) => {
                    setSelectedCourseId(value);
                    const course = courses.find((item) => item.courseId === value);
                    const firstTerm = course?.terms[0];
                    setSelectedTermId(firstTerm ? firstTerm.termId : "");
                    setSelectedSectionId("ALL");
                  }}
                  disabled={!courses.length}
                >
                  <SelectTrigger className="border-gray-700 bg-gray-800 text-left text-white">
                    <SelectValue placeholder="Choose course" />
                  </SelectTrigger>
                  <SelectContent className="border-gray-800 bg-gray-900">
                    {courses.map((course) => (
                      <SelectItem
                        key={course.courseId}
                        value={course.courseId}
                        className="text-white"
                      >
                        {course.code} · {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400">Term</label>
                <Select
                  value={selectedTermId}
                  onValueChange={(value) => {
                    setSelectedTermId(value);
                    setSelectedSectionId("ALL");
                  }}
                  disabled={!activeCourse || activeCourse.terms.length === 0}
                >
                  <SelectTrigger className="border-gray-700 bg-gray-800 text-left text-white">
                    <SelectValue placeholder="Choose term" />
                  </SelectTrigger>
                  <SelectContent className="border-gray-800 bg-gray-900">
                    {activeCourse?.terms.map((term) => (
                      <SelectItem key={term.termId} value={term.termId} className="text-white">
                        {term.termName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400">Section</label>
                <Select
                  value={selectedSectionId}
                  onValueChange={setSelectedSectionId}
                  disabled={!activeTerm}
                >
                  <SelectTrigger className="border-gray-700 bg-gray-800 text-left text-white">
                    <SelectValue placeholder="Choose section" />
                  </SelectTrigger>
                  <SelectContent className="border-gray-800 bg-gray-900">
                    <SelectItem value="ALL" className="text-white">
                      All sections
                    </SelectItem>
                    {activeTerm?.sections
                      .filter((section) => section.sectionId !== "__unassigned__")
                      .map((section) => (
                        <SelectItem
                          key={section.sectionId}
                          value={section.sectionId}
                          className="text-white"
                        >
                          {section.sectionName || section.sectionId}
                        </SelectItem>
                      ))}
                    {hasUnassignedSection ? (
                      <SelectItem value="__unassigned__" className="text-white">
                        Unassigned students
                      </SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-gray-800 bg-gray-900">
        <CardHeader className="gap-4 border-b border-gray-800 bg-gray-900/60">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-white">Student Marks</CardTitle>
            <CardDescription className="text-gray-400">
              Inline edits recalculate totals automatically. Remember to save when you are done.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-gray-400">
              {activeCourse ? `${activeCourse.code} · ${activeCourse.title}` : "Select a course"}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="text-sm text-gray-400">
                Grace Marks (Max {MAX_MARKS.graceMarks}):
              </span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min={0}
                  max={MAX_MARKS.graceMarks}
                  className="h-9 w-24 border-gray-700 bg-gray-800 text-center text-sm text-white"
                  value={graceMarksInput}
                  onChange={(e) => setGraceMarksInput(e.target.value)}
                  placeholder="0"
                  disabled={!activeTerm}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={applyGraceMarksToAll}
                  disabled={!activeTerm || isSaving || allStudents.length === 0}
                >
                  Apply to All
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingCourses || isLoadingMarks || !activeTerm ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-10 rounded-md bg-gray-800" />
              ))}
            </div>
          ) : allStudents.length === 0 ? (
            <div className="p-6 text-sm text-gray-400">
              No students were found for this selection. Try a different section.
            </div>
          ) : isCompactViewport ? (
            <div className="space-y-4 p-4">
                {allStudents.map((student) => {
                const entry = marksEntries[student.userId] ?? createEmptyMark();
                  const isFinal = !!finalizedMap[student.userId];
                return (
                  <div
                    key={student.userId}
                    className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-1 border-b border-gray-800 pb-3">
                      <span className="text-sm font-semibold text-white">
                        {student.firstName} {student.lastName}
                      </span>
                      <span className="text-xs text-gray-500">{student.studentId}</span>
                      <span className="text-xs text-gray-500">{student.email}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2">
                      {ASSESSMENT_FIELDS.map((field) => (
                        <div key={field.key} className="flex flex-col gap-1">
                          <span className="text-xs text-gray-400">{field.label}</span>
                          <Input
                            type="number"
                            inputMode="decimal"
                            step="0.5"
                            min={0}
                            max={field.max}
                            value={entry[field.key] ?? 0}
                            onChange={(e) => updateMark(student.userId, field.key, e.target.value)}
                            disabled={isSaving || isFinal}
                            className="h-9 w-full border-gray-700 bg-gray-800 text-center text-sm text-white focus-visible:ring-1 focus-visible:ring-emerald-500"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="pt-3 flex items-center justify-between">
                      <div className="text-sm font-semibold text-emerald-300">Total {entry.total.toFixed(2)}</div>
                      {isFinal ? (
                        <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-100">Finalized</Badge>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <ScrollArea className="max-h-[65vh]">
              <Table className="min-w-[1000px] text-sm">
                <TableHeader className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur">
                  <TableRow className="border-gray-800 hover:bg-transparent">
                    <TableHead className="min-w-[220px] text-left text-gray-300">
                      Student
                    </TableHead>
                    {ASSESSMENT_FIELDS.map((field) => (
                      <TableHead key={field.key} className="w-[110px] text-center text-gray-300">
                        {field.label}
                      </TableHead>
                    ))}
                    <TableHead className="w-[110px] text-center font-semibold text-emerald-300">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allStudents.map((student, index) => {
                    const entry = marksEntries[student.userId] ?? createEmptyMark();
                    const isFinal = !!finalizedMap[student.userId];
                    const isEven = index % 2 === 0;
                    return (
                      <TableRow
                        key={student.userId}
                        className={isEven ? "border-gray-800 bg-gray-900/40" : "border-gray-800"}
                      >
                        <TableCell className="align-top">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-white">
                              {student.firstName} {student.lastName}
                            </span>
                            <span className="text-xs text-gray-500">{student.studentId}</span>
                            <span className="text-xs text-gray-500">{student.email}</span>
                          </div>
                        </TableCell>
                        {ASSESSMENT_FIELDS.map((field) => (
                          <TableCell key={field.key} className="p-2">
                            <Input
                              type="number"
                              inputMode="decimal"
                              step="0.5"
                              min={0}
                              max={field.max}
                              value={entry[field.key] ?? 0}
                              onChange={(e) => updateMark(student.userId, field.key, e.target.value)}
                              disabled={isSaving || isFinal}
                              className="h-9 w-full border-gray-700 bg-gray-800 text-center text-sm text-white focus-visible:ring-1 focus-visible:ring-emerald-500"
                            />
                          </TableCell>
                        ))}
                        <TableCell className="text-center text-sm font-semibold text-emerald-300">
                          <div className="flex items-center justify-center gap-2">
                            <span>{entry.total.toFixed(2)}</span>
                            {isFinal ? <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-100">Finalized</Badge> : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving || isLoadingMarks || !activeTerm || allStudents.length === 0}
          className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto"
        >
          {isSaving ? "Saving..." : "Save Marks"}
        </Button>
        <Button
          onClick={handleFinalize}
          disabled={isFinalizing || isSaving || isLoadingMarks || !activeTerm || allStudents.length === 0}
          className="w-full bg-amber-600 text-white hover:bg-amber-700 sm:w-auto"
        >
          {isFinalizing ? 'Finalizing...' : 'Finalize Grades'}
        </Button>
      </div>
    </div>
  );
}
