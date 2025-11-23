"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";

interface TeachingStudent {
  userId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  sectionName: string | null;
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

interface AttendanceRecord {
  userId: string;
  status: "present" | "absent" | "late";
}

interface LowAttendanceStudent {
  userId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  sectionName: string | null;
  attendedSessions: number;
  totalSessions: number;
  percentage: number;
  history: { date: string; status: string }[];
}

export default function FacultyAttendancePage() {
  const { toast } = useToast();
  const [courses, setCourses] = useState<TeachingCourse[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedTermId, setSelectedTermId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("__all__");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord["status"]>>({});
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Low Attendance State
  const [showLowAttendance, setShowLowAttendance] = useState(false);
  const [lowAttendanceStudents, setLowAttendanceStudents] = useState<LowAttendanceStudent[]>([]);
  const [isLoadingLowAttendance, setIsLoadingLowAttendance] = useState(false);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

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
            const firstCourse = payload.courses[0];
            setSelectedCourseId(firstCourse.courseId);
            const firstTerm = firstCourse.terms[0];
            if (firstTerm) {
              setSelectedTermId(firstTerm.termId);
              const firstSection = firstTerm.sections[0];
              setSelectedSectionId(firstSection ? firstSection.sectionId : "__all__");
            } else {
              setSelectedTermId("");
              setSelectedSectionId("__all__");
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
    if (!activeCourse) return undefined;
    return activeCourse.terms.find((term) => term.termId === selectedTermId);
  }, [activeCourse, selectedTermId]);

  const activeSection = useMemo(() => {
    if (!activeTerm) return undefined;
    if (!selectedSectionId || selectedSectionId === "__all__") return undefined;
    return activeTerm.sections.find((section) => section.sectionId === selectedSectionId);
  }, [activeTerm, selectedSectionId]);

  const visibleStudents = useMemo(() => {
    if (!activeTerm) return [] as TeachingStudent[];

    if (selectedSectionId === "__all__") {
      const merged = new Map<string, TeachingStudent>();
      activeTerm.sections.forEach((section) => {
        section.students.forEach((student) => {
          merged.set(student.userId, student);
        });
      });
      return Array.from(merged.values()).sort((a, b) => a.lastName.localeCompare(b.lastName));
    }

    if (activeSection) {
      return activeSection.students;
    }

    const fallbackSection = activeTerm.sections[0];
    return fallbackSection ? fallbackSection.students : [];
  }, [activeSection, activeTerm, selectedSectionId]);

  useEffect(() => {
    if (!activeTerm) {
      if (selectedSectionId !== "__all__") {
        setSelectedSectionId("__all__");
      }
      return;
    }

    if (selectedSectionId === "__all__") {
      return;
    }

    const exists = activeTerm.sections.some((section) => section.sectionId === selectedSectionId);
    if (!exists) {
      const firstSection = activeTerm.sections[0];
      setSelectedSectionId(firstSection ? firstSection.sectionId : "__all__");
    }
  }, [activeTerm, selectedSectionId]);

  useEffect(() => {
    if (!selectedCourseId || !selectedTermId || !selectedDate || showLowAttendance) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function loadAttendance() {
      setIsLoadingAttendance(true);
      try {
        const params = new URLSearchParams({
          courseId: selectedCourseId,
          termId: selectedTermId,
          date: selectedDate,
        });
        if (selectedSectionId && selectedSectionId !== "__all__") {
          params.set("sectionId", selectedSectionId);
        }
        const response = await fetch(`/api/faculty/attendance?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.message ?? "Failed to load attendance details");
        }
        const payload: { records: AttendanceRecord[] } = await response.json();
        if (!cancelled) {
          const nextMap: Record<string, AttendanceRecord["status"]> = {};
          payload.records.forEach((record) => {
            nextMap[record.userId] = record.status;
          });
          setAttendanceMap(nextMap);
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
          setIsLoadingAttendance(false);
        }
      }
    }

    loadAttendance();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedCourseId, selectedTermId, selectedSectionId, selectedDate, showLowAttendance]);

  // Load Low Attendance Data
  useEffect(() => {
    if (!showLowAttendance || !selectedCourseId || !selectedTermId) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function loadLowAttendance() {
      setIsLoadingLowAttendance(true);
      try {
        const params = new URLSearchParams({
          courseId: selectedCourseId,
          termId: selectedTermId,
        });
        if (selectedSectionId && selectedSectionId !== "__all__") {
          params.set("sectionId", selectedSectionId);
        }

        const response = await fetch(`/api/faculty/attendance/low-attendance?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.message ?? "Failed to load low attendance data");
        }

        const payload: { students: LowAttendanceStudent[] } = await response.json();
        if (!cancelled) {
          setLowAttendanceStudents(payload.students);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") {
          return;
        }
        if (!cancelled) {
          setError(err?.message ?? "Unexpected error loading low attendance");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingLowAttendance(false);
        }
      }
    }

    loadLowAttendance();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [showLowAttendance, selectedCourseId, selectedTermId, selectedSectionId]);


  const handleStatusChange = (studentId: string, status: AttendanceRecord["status"]) => {
    setAttendanceMap((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    if (!selectedCourseId || !selectedTermId || !selectedDate || !activeTerm) {
      return;
    }

    try {
      setIsSaving(true);
      const entries = visibleStudents.map((student) => ({
        userId: student.userId,
        status: attendanceMap[student.userId] ?? "absent",
      }));

      const response = await fetch("/api/faculty/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: selectedCourseId,
          termId: selectedTermId,
          date: selectedDate,
          sectionId: selectedSectionId !== "__all__" ? selectedSectionId : undefined,
          entries,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message ?? "Failed to save attendance");
      }

      toast({
        title: "Attendance saved",
        description: payload?.message ?? "Attendance sheet updated successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Unable to save attendance",
        description: err?.message ?? "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStudentExpansion = (studentId: string) => {
    setExpandedStudentId(expandedStudentId === studentId ? null : studentId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white">
            {showLowAttendance ? "Low Attendance Report (< 80%)" : "Record Attendance"}
          </h1>
          <Button
            variant={showLowAttendance ? "outline" : "destructive"}
            onClick={() => setShowLowAttendance(!showLowAttendance)}
            className={showLowAttendance ? "border-gray-700 text-gray-300 hover:bg-gray-800" : ""}
          >
            {showLowAttendance ? (
              <>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Attendance
              </>
            ) : (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" />
                View Low Attendance
              </>
            )}
          </Button>
        </div>
        <p className="text-sm text-gray-400">
          {showLowAttendance
            ? "Students with less than 80% attendance for the selected course and term."
            : "Select a course, term, and session date to capture student attendance."}
        </p>
      </div>

      {error ? (
        <Card className="bg-red-500/10 border-red-500/40">
          <CardContent className="p-4 text-sm text-red-200">{error}</CardContent>
        </Card>
      ) : null}

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Session Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingCourses ? (
            <div className="grid gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-10 bg-gray-800" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-300">Course</label>
                <Select
                  value={selectedCourseId}
                  onValueChange={(value) => {
                    setSelectedCourseId(value);
                    const course = courses.find((item) => item.courseId === value);
                    const firstTerm = course?.terms[0];
                    if (firstTerm) {
                      setSelectedTermId(firstTerm.termId);
                      const firstSection = firstTerm.sections[0];
                      setSelectedSectionId(firstSection ? firstSection.sectionId : "__all__");
                    } else {
                      setSelectedTermId("");
                      setSelectedSectionId("__all__");
                    }
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
                <Select
                  value={selectedTermId}
                  onValueChange={(value) => {
                    setSelectedTermId(value);
                    const course = courses.find((item) => item.courseId === selectedCourseId);
                    const term = course?.terms.find((item) => item.termId === value);
                    const firstSection = term?.sections[0];
                    setSelectedSectionId(firstSection ? firstSection.sectionId : "__all__");
                  }}
                >
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
                <label className="text-sm text-gray-300">Section</label>
                <Select
                  value={selectedSectionId}
                  onValueChange={setSelectedSectionId}
                  disabled={!activeTerm}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Choose section" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-800">
                    <SelectItem value="__all__" className="text-white">
                      All Sections
                    </SelectItem>
                    {activeTerm?.sections.map((section) => (
                      <SelectItem key={section.sectionId} value={section.sectionId} className="text-white">
                        {section.sectionName}
                        {section.sectionId === "__unassigned__" ? " (Unassigned)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!showLowAttendance && (
                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Session Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                    className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    max={new Date().toISOString().slice(0, 10)}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {showLowAttendance ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">At-Risk Students</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingLowAttendance ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 bg-gray-800 rounded-lg" />
                ))}
              </div>
            ) : lowAttendanceStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="rounded-full bg-emerald-500/10 p-3 mb-3">
                  <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">Great Job</Badge>
                </div>
                <p className="text-gray-300 font-medium">No students are below 80% attendance</p>
                <p className="text-sm text-gray-500 mt-1">All students in this selection are attending classes regularly.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowAttendanceStudents.map((student) => (
                  <div
                    key={student.userId}
                    className="flex flex-col gap-4 rounded-lg bg-gray-800/60 p-4 border border-red-500/20"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium">
                            {student.firstName} {student.lastName}
                          </p>
                          <Badge variant="destructive" className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-0">
                            {student.percentage}%
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{student.studentId}</p>
                        <div className="flex gap-3 mt-1 text-xs text-gray-500">
                          <span>{student.email}</span>
                          {student.sectionName && <span>• Section {student.sectionName}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="text-gray-400 text-xs uppercase tracking-wider">Attended</p>
                          <p className="text-white font-medium">{student.attendedSessions}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400 text-xs uppercase tracking-wider">Total</p>
                          <p className="text-white font-medium">{student.totalSessions}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400 text-xs uppercase tracking-wider">Missed</p>
                          <p className="text-red-400 font-medium">{student.totalSessions - student.attendedSessions}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-white"
                          onClick={() => toggleStudentExpansion(student.userId)}
                        >
                          {expandedStudentId === student.userId ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {expandedStudentId === student.userId && (
                      <div className="mt-2 border-t border-gray-700 pt-4">
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Attendance History</h4>
                        {student.history.length === 0 ? (
                          <p className="text-xs text-gray-500">No attendance records found.</p>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {student.history.map((record, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-gray-900/50 p-2 rounded text-xs">
                                <span className="text-gray-300">{record.date}</span>
                                <Badge
                                  variant="outline"
                                  className={`
                                    border-0 
                                    ${record.status === 'present' ? 'bg-emerald-500/20 text-emerald-400' :
                                      record.status === 'late' ? 'bg-amber-500/20 text-amber-400' :
                                        'bg-red-500/20 text-red-400'}
                                  `}
                                >
                                  {record.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Student Attendance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingCourses || isLoadingAttendance ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="grid grid-cols-4 items-center gap-4">
                      <Skeleton className="h-5 bg-gray-800 col-span-2" />
                      <Skeleton className="h-8 w-full bg-gray-800 col-span-2" />
                    </div>
                  ))}
                </div>
              ) : !activeTerm ? (
                <p className="text-sm text-gray-400">Select a course and term to view students.</p>
              ) : activeTerm.sections.length === 0 ? (
                <p className="text-sm text-gray-400">No sections are assigned to you for this course and term.</p>
              ) : selectedSectionId !== "__all__" && !activeSection ? (
                <p className="text-sm text-gray-400">Select another section to manage attendance.</p>
              ) : visibleStudents.length === 0 ? (
                <p className="text-sm text-gray-400">No students are enrolled for the selected filters.</p>
              ) : (
                <div className="space-y-3">
                  {visibleStudents.map((student) => {
                    const status = attendanceMap[student.userId] ?? "absent";
                    return (
                      <div
                        key={student.userId}
                        className="grid grid-cols-1 md:grid-cols-[2fr,1fr] items-center gap-4 rounded-lg bg-gray-800/60 p-4"
                      >
                        <div>
                          <p className="text-white font-medium">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-xs text-gray-400">{student.studentId}</p>
                          {student.sectionName ? (
                            <p className="text-xs text-gray-500">Section {student.sectionName}</p>
                          ) : null}
                          <p className="text-xs text-gray-500">{student.email}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {[
                            { value: "present", label: "Present", color: "bg-emerald-500/20 text-emerald-400" },
                            { value: "absent", label: "Absent", color: "bg-red-500/20 text-red-400" },
                            { value: "late", label: "Late", color: "bg-amber-500/20 text-amber-400" },
                          ].map((option) => (
                            <Button
                              key={option.value}
                              type="button"
                              onClick={() => handleStatusChange(student.userId, option.value as AttendanceRecord["status"])}
                              className={`h-9 ${status === option.value ? option.color : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
                            >
                              {option.label}
                            </Button>
                          ))}
                          <Badge variant="secondary" className="bg-gray-700/60 text-gray-300">
                            {status.toUpperCase()}
                          </Badge>
                        </div>
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
              disabled={isSaving || isLoadingAttendance || !activeTerm}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSaving ? "Saving..." : "Save Attendance"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
