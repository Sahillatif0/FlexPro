"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

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

interface StudentNote {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  courseCode: string | null;
  termName: string | null;
}

export default function FacultyStudentNotesPage() {
  const { toast } = useToast();
  const [courses, setCourses] = useState<TeachingCourse[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedTermId, setSelectedTermId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("__all__");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
            const firstTerm = firstCourse.terms[0];
            setSelectedCourseId(firstCourse.courseId);
            if (firstTerm) {
              setSelectedTermId(firstTerm.termId);
              const firstSection = firstTerm.sections[0];
              setSelectedSectionId(firstSection ? firstSection.sectionId : "__all__");
              const allStudents = firstTerm.sections.flatMap((section) => section.students);
              setSelectedStudentId(allStudents[0]?.userId ?? "");
            } else {
              setSelectedTermId("");
              setSelectedSectionId("__all__");
              setSelectedStudentId("");
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

  const activeStudent = useMemo(() => {
    if (!visibleStudents.length) return undefined;
    return visibleStudents.find((student) => student.userId === selectedStudentId);
  }, [selectedStudentId, visibleStudents]);

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
    if (!visibleStudents.length) {
      if (selectedStudentId) {
        setSelectedStudentId("");
      }
      return;
    }

    const exists = visibleStudents.some((student) => student.userId === selectedStudentId);
    if (!exists) {
      setSelectedStudentId(visibleStudents[0].userId);
    }
  }, [selectedStudentId, visibleStudents]);

  useEffect(() => {
    if (!selectedStudentId || !selectedCourseId || !selectedTermId) {
      setNotes([]);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function loadNotes() {
      setIsLoadingNotes(true);
      setEditingNoteId(null);
      setFormTitle("");
      setFormContent("");
      try {
        const params = new URLSearchParams({
          studentId: selectedStudentId,
          courseId: selectedCourseId,
          termId: selectedTermId,
        });
        const response = await fetch(`/api/faculty/student-notes?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.message ?? "Failed to load student notes");
        }
        const payload: { notes: StudentNote[] } = await response.json();
        if (!cancelled) {
          setNotes(payload.notes);
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
          setIsLoadingNotes(false);
        }
      }
    }

    loadNotes();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedStudentId, selectedCourseId, selectedTermId]);

  const resetForm = () => {
    setEditingNoteId(null);
    setFormTitle("");
    setFormContent("");
  };

  const handleEdit = (note: StudentNote) => {
    setEditingNoteId(note.id);
    setFormTitle(note.title);
    setFormContent(note.content);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCourseId || !selectedTermId || !selectedStudentId) {
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        courseId: selectedCourseId,
        termId: selectedTermId,
        studentId: selectedStudentId,
        title: formTitle,
        content: formContent,
      };

      const response = await fetch(
        editingNoteId ? `/api/faculty/student-notes/${editingNoteId}` : "/api/faculty/student-notes",
        {
          method: editingNoteId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message ?? "Failed to save note");
      }

      toast({
        title: "Student note saved",
        description: result?.message ?? "Details recorded successfully.",
      });

      // Refresh notes list
      const params = new URLSearchParams({
        studentId: selectedStudentId,
        courseId: selectedCourseId,
        termId: selectedTermId,
      });
      const refreshed = await fetch(`/api/faculty/student-notes?${params.toString()}`);
      if (refreshed.ok) {
        const data = await refreshed.json();
        setNotes(data.notes);
      }

      resetForm();
    } catch (err: any) {
      toast({
        title: "Unable to save note",
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
        <h1 className="text-2xl font-semibold text-white">Student Notes</h1>
        <p className="text-sm text-gray-400">
          Document mentorship notes, intervention plans, or progress highlights for each student.
        </p>
      </div>

      {error ? (
        <Card className="bg-red-500/10 border-red-500/40">
          <CardContent className="p-4 text-sm text-red-200">{error}</CardContent>
        </Card>
      ) : null}

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Filter Context</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          {isLoadingCourses ? (
            Array.from({ length: 4 }).map((_, index) => (
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
                    if (firstTerm) {
                      setSelectedTermId(firstTerm.termId);
                      const firstSection = firstTerm.sections[0];
                      setSelectedSectionId(firstSection ? firstSection.sectionId : "__all__");
                      const allStudents = firstTerm.sections.flatMap((section) => section.students);
                      setSelectedStudentId(allStudents[0]?.userId ?? "");
                    } else {
                      setSelectedTermId("");
                      setSelectedSectionId("__all__");
                      setSelectedStudentId("");
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
                    const term = activeCourse?.terms.find((item) => item.termId === value);
                    const firstSection = term?.sections[0];
                    setSelectedSectionId(firstSection ? firstSection.sectionId : "__all__");
                    const allStudents = term ? term.sections.flatMap((section) => section.students) : [];
                    setSelectedStudentId(allStudents[0]?.userId ?? "");
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

              <div className="space-y-2">
                <label className="text-sm text-gray-300">Student</label>
                <Select
                  value={selectedStudentId}
                  onValueChange={setSelectedStudentId}
                  disabled={!visibleStudents.length}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Choose student" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-800 max-h-60 overflow-y-auto">
                    {visibleStudents.map((student) => (
                      <SelectItem key={student.userId} value={student.userId} className="text-white">
                        {student.firstName} {student.lastName} · {student.studentId}
                        {student.sectionName ? ` · ${student.sectionName}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[2fr,3fr]">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Existing Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingNotes ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 bg-gray-800" />
                ))}
              </div>
            ) : notes.length === 0 ? (
              <p className="text-sm text-gray-400">No notes yet for this student.</p>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => handleEdit(note)}
                    className="w-full text-left rounded-lg bg-gray-800/60 p-4 transition hover:bg-gray-800"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-white">{note.title}</p>
                      <Badge variant="secondary" className="bg-emerald-600/20 text-emerald-400">
                        {note.courseCode ?? "General"}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400">
                      {note.termName ?? "—"} · {new Date(note.updatedAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-2 max-h-12 overflow-hidden">
                      {note.content}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">{editingNoteId ? "Update Note" : "Add Note"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="text-sm text-gray-300">Student</label>
                <Input
                  value={
                    activeStudent
                      ? `${activeStudent.firstName} ${activeStudent.lastName}${
                          activeStudent.sectionName ? ` · ${activeStudent.sectionName}` : ""
                        }`
                      : "Select a student"
                  }
                  disabled
                  className="mt-1 bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300">Title</label>
                <Input
                  value={formTitle}
                  onChange={(event) => setFormTitle(event.target.value)}
                  placeholder="e.g. Midterm feedback"
                  className="mt-1 bg-gray-800 border-gray-700 text-white"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-gray-300">Details</label>
                <Textarea
                  value={formContent}
                  onChange={(event) => setFormContent(event.target.value)}
                  placeholder="Write observations, action items, or commendations."
                  className="mt-1 h-40 bg-gray-800 border-gray-700 text-white"
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                {editingNoteId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-gray-300 hover:text-white"
                    onClick={resetForm}
                  >
                    Cancel edit
                  </Button>
                ) : (
                  <span className="text-xs text-gray-500">
                    Notes are shared only with fellow faculty.
                  </span>
                )}
                <Button
                  type="submit"
                  disabled={isSaving || !selectedStudentId}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isSaving ? "Saving..." : editingNoteId ? "Update Note" : "Save Note"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
