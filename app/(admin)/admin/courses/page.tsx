"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BookMarked, GraduationCap, Plus, X } from "lucide-react";

interface InstructorOption {
  id: string;
  fullName: string;
  employeeId: string | null;
}

interface SectionInstructorInfo {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string | null;
}

interface CourseSectionRecord {
  id: string;
  name: string;
  instructor: SectionInstructorInfo | null;
}

interface CourseRecord {
  id: string;
  code: string;
  title: string;
  department: string;
  creditHours: number;
  semester: number;
  maxCapacity: number;
  isActive: boolean;
  createdAt: string;
  sections: CourseSectionRecord[];
}

interface CoursesPayload {
  courses: CourseRecord[];
  instructors: InstructorOption[];
}

const departments = [
  "Computer Science",
  "Electrical Engineering",
  "Mathematics",
  "Management Sciences",
  "Humanities",
];

export default function AdminCoursesPage() {
  const { toast } = useToast();
  const [data, setData] = useState<CoursesPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingCourseId, setPendingCourseId] = useState<string | null>(null);
  const [assigningSectionId, setAssigningSectionId] = useState<string | null>(null);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [addingSectionCourseId, setAddingSectionCourseId] = useState<string | null>(null);
  const [removingSectionId, setRemovingSectionId] = useState<string | null>(null);
  const [sectionDrafts, setSectionDrafts] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    code: "",
    title: "",
    description: "",
    creditHours: "3",
    department: "Computer Science",
    semester: "1",
    prerequisite: "",
    maxCapacity: "40",
    sections: "",
  });

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function loadCourses() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/admin/courses?limit=100", {
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.message ?? "Failed to load courses");
        }
        const payload: CoursesPayload = await response.json();
        if (!cancelled) {
          setData(payload);
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
          setIsLoading(false);
        }
      }
    }

    loadCourses();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const sortedCourses = useMemo(() => {
    if (!data) {
      return [];
    }
    return [...data.courses].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [data]);

  const handleInputChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      code: "",
      title: "",
      description: "",
      creditHours: "3",
      department: "Computer Science",
      semester: "1",
      prerequisite: "",
      maxCapacity: "40",
      sections: "",
    });
  };

  const updateCourseState = (updatedCourse: CourseRecord) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            courses: prev.courses.map((course) =>
              course.id === updatedCourse.id ? updatedCourse : course
            ),
          }
        : prev
    );
  };

  const handleToggleStatus = async (course: CourseRecord) => {
    if (pendingCourseId) {
      return;
    }

    try {
      setPendingCourseId(course.id);
      const response = await fetch(`/api/admin/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !course.isActive }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message ?? "Unable to update course status");
      }
      updateCourseState(result.course);
      toast({
        title: "Course status updated",
        description: `${course.code} is now ${result.course.isActive ? "active" : "inactive"}.`,
      });
    } catch (err: any) {
      toast({
        title: "Status update failed",
        description: err?.message ?? "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setPendingCourseId(null);
    }
  };

  const handleAssignSectionInstructor = async (
    course: CourseRecord,
    section: CourseSectionRecord,
    instructorId: string | null
  ) => {
    if (assigningSectionId) {
      return;
    }

    try {
      setAssigningSectionId(section.id);
      const response = await fetch(`/api/admin/courses/${course.id}/sections/${section.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructorId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message ?? "Unable to update section");
      }

      const updatedSection: CourseSectionRecord = result.section;
      setData((prev) =>
        prev
          ? {
              ...prev,
              courses: prev.courses.map((item) =>
                item.id === course.id
                  ? {
                      ...item,
                      sections: item.sections
                        .map((entry) => (entry.id === section.id ? updatedSection : entry))
                        .sort((a, b) => a.name.localeCompare(b.name)),
                    }
                  : item
              ),
            }
          : prev
      );

      toast({
        title: "Section updated",
        description: updatedSection.instructor
          ? `${updatedSection.name} assigned to ${updatedSection.instructor.firstName} ${updatedSection.instructor.lastName}.`
          : `${updatedSection.name} is now unassigned.`,
      });
    } catch (err: any) {
      toast({
        title: "Assignment failed",
        description: err?.message ?? "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setAssigningSectionId(null);
    }
  };

  const handleSectionDraftChange = (courseId: string, value: string) => {
    setSectionDrafts((prev) => ({ ...prev, [courseId]: value }));
  };

  const handleAddSection = async (course: CourseRecord) => {
    if (addingSectionCourseId) {
      return;
    }

    const draft = sectionDrafts[course.id]?.trim() ?? "";
    if (!draft) {
      toast({
        title: "Section name required",
        description: "Provide a section label before adding it.",
        variant: "destructive",
      });
      return;
    }

    const duplicate = course.sections.some((section) => section.name.toLowerCase() === draft.toLowerCase());
    if (duplicate) {
      toast({
        title: "Section already exists",
        description: `${draft} is already linked to this course.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setAddingSectionCourseId(course.id);
      const response = await fetch(`/api/admin/courses/${course.id}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draft }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message ?? "Unable to add section");
      }

      const newSection: CourseSectionRecord | undefined = result.section;
      if (!newSection || !newSection.id || !newSection.name) {
        throw new Error("Invalid section response");
      }
      setData((prev) =>
        prev
          ? {
              ...prev,
              courses: prev.courses.map((item) =>
                item.id === course.id
                  ? {
                      ...item,
                      sections: [...item.sections, newSection].sort((a, b) =>
                        a.name.localeCompare(b.name)
                      ),
                    }
                  : item
              ),
            }
          : prev
      );
      setSectionDrafts((prev) => ({ ...prev, [course.id]: "" }));
      toast({ title: "Section added", description: `${draft} now appears under ${course.code}.` });
    } catch (err: any) {
      toast({
        title: "Unable to add section",
        description: err?.message ?? "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setAddingSectionCourseId(null);
    }
  };

  const handleRemoveSection = async (course: CourseRecord, section: CourseSectionRecord) => {
    if (removingSectionId) {
      return;
    }

    const confirmed = window.confirm(
      `Remove ${section.name} from ${course.code}? This will detach the section from the course.`
    );
    if (!confirmed) {
      return;
    }

    try {
      setRemovingSectionId(section.id);
      const response = await fetch(`/api/admin/courses/${course.id}/sections/${section.id}`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message ?? "Unable to remove section");
      }

      setData((prev) =>
        prev
          ? {
              ...prev,
              courses: prev.courses.map((item) =>
                item.id === course.id
                  ? {
                      ...item,
                      sections: item.sections.filter((entry) => entry.id !== section.id),
                    }
                  : item
              ),
            }
          : prev
      );
      toast({ title: "Section removed", description: `${section.name} is no longer linked to ${course.code}.` });
    } catch (err: any) {
      toast({
        title: "Unable to remove section",
        description: err?.message ?? "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setRemovingSectionId(null);
    }
  };

  const handleDeleteCourse = async (course: CourseRecord) => {
    if (deletingCourseId) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${course.code} · ${course.title}? This action cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    try {
      setDeletingCourseId(course.id);
      const response = await fetch(`/api/admin/courses/${course.id}`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message ?? "Unable to delete course");
      }
      setData((prev) =>
        prev
          ? {
              ...prev,
              courses: prev.courses.filter((item) => item.id !== course.id),
            }
          : prev
      );
      toast({ title: "Course deleted", description: `${course.code} removed successfully.` });
    } catch (err: any) {
      toast({
        title: "Deletion failed",
        description: err?.message ?? "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setDeletingCourseId(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    const payload = {
      code: form.code.trim().toUpperCase(),
      title: form.title.trim(),
      description: form.description.trim(),
      creditHours: Number(form.creditHours) || 0,
      department: form.department,
      semester: Number(form.semester) || 1,
      prerequisite: form.prerequisite.trim() || null,
      maxCapacity: Number(form.maxCapacity) || 40,
      sections: form.sections
        .split(",")
        .map((value) => value.trim())
        .filter((value, index, array) => value.length > 0 && array.indexOf(value) === index),
    };

    if (!payload.code || !payload.title || payload.creditHours <= 0) {
      toast({
        title: "Invalid course details",
        description: "Please provide a course code, title, and positive credit hours.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/admin/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message ?? "Unable to create course");
      }

      toast({
        title: "Course created",
        description: `${payload.code} has been added successfully.`,
      });

      setData((prev) =>
        prev
          ? {
              ...prev,
              courses: [result.course, ...prev.courses],
            }
          : prev
      );

      resetForm();
    } catch (err: any) {
      toast({
        title: "Unable to create course",
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
        <h1 className="text-2xl font-semibold text-white">Manage Courses</h1>
        <p className="text-sm text-gray-400">
          Create new offerings and review existing courses available for enrollment.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load courses</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[2fr,3fr]">
        <Card id="new" className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BookMarked className="h-5 w-5 text-purple-400" />
              New Course
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Course Code</label>
                  <Input
                    value={form.code}
                    onChange={(event) => handleInputChange("code", event.target.value)}
                    placeholder="CS-450"
                    className="bg-gray-800 border-gray-700 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Course Title</label>
                  <Input
                    value={form.title}
                    onChange={(event) => handleInputChange("title", event.target.value)}
                    placeholder="Advanced Topics in AI"
                    className="bg-gray-800 border-gray-700 text-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-300">Description</label>
                <Textarea
                  value={form.description}
                  onChange={(event) => handleInputChange("description", event.target.value)}
                  placeholder="Describe the course objectives and learning outcomes"
                  className="bg-gray-800 border-gray-700 text-white"
                  rows={4}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Credit Hours</label>
                  <Input
                    type="number"
                    min="1"
                    value={form.creditHours}
                    onChange={(event) => handleInputChange("creditHours", event.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Semester</label>
                  <Input
                    type="number"
                    min="1"
                    max="8"
                    value={form.semester}
                    onChange={(event) => handleInputChange("semester", event.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Department</label>
                  <Select
                    value={form.department}
                    onValueChange={(value) => handleInputChange("department", value)}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-800">
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept} className="text-white">
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Capacity</label>
                  <Input
                    type="number"
                    min="10"
                    value={form.maxCapacity}
                    onChange={(event) => handleInputChange("maxCapacity", event.target.value)}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-300">Prerequisites</label>
                <Input
                  value={form.prerequisite}
                  onChange={(event) => handleInputChange("prerequisite", event.target.value)}
                  placeholder="CS-301, MT-205"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-300">Sections</label>
                <Input
                  value={form.sections}
                  onChange={(event) => handleInputChange("sections", event.target.value)}
                  placeholder="Section A, Section B"
                  className="bg-gray-800 border-gray-700 text-white"
                />
                <p className="text-xs text-gray-500">Use commas to add multiple sections in one go.</p>
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-gray-300 hover:text-white"
                  onClick={resetForm}
                  disabled={isSaving}
                >
                  Reset
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isSaving ? "Saving..." : "Create Course"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-purple-400" />
              Existing Courses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading || !data ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 bg-gray-800" />
                ))}
              </div>
            ) : sortedCourses.length ? (
              <div className="space-y-3">
                {sortedCourses.map((course) => (
                  <div key={course.id} className="rounded-lg bg-gray-800/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {course.code} · {course.title}
                        </p>
                        <p className="text-xs text-gray-400">
                          {course.department} · {course.creditHours} CH
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={course.isActive ? "bg-emerald-600/20 text-emerald-400" : "bg-gray-600/20 text-gray-300"}
                      >
                        {course.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                      <span>Semester {course.semester}</span>
                      <span>|</span>
                      <span>Capacity {course.maxCapacity}</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        Sections
                      </p>
                      {course.sections.length ? (
                        <div className="space-y-2">
                          {course.sections.map((section) => (
                            <div
                              key={section.id}
                              className="flex flex-wrap items-center gap-2 rounded-md bg-gray-900/60 px-2 py-2 text-xs text-gray-200"
                            >
                              <span className="font-medium text-white">{section.name}</span>
                              <Select
                                value={section.instructor?.id ?? "__none__"}
                                onValueChange={(value) =>
                                  handleAssignSectionInstructor(
                                    course,
                                    section,
                                    value === "__none__" ? null : value
                                  )
                                }
                                disabled={assigningSectionId === section.id}
                              >
                                <SelectTrigger className="h-8 w-48 bg-gray-800 border-gray-700 text-white">
                                  <SelectValue
                                    placeholder="Assign instructor"
                                    aria-label={`Assign instructor for ${section.name}`}
                                  />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-900 border-gray-800 max-h-64 overflow-y-auto">
                                  <SelectItem value="__none__" className="text-gray-400">
                                    Unassigned
                                  </SelectItem>
                                  {data?.instructors.map((instructor) => (
                                    <SelectItem key={instructor.id} value={instructor.id} className="text-white">
                                      {instructor.fullName}
                                      {instructor.employeeId ? ` · ${instructor.employeeId}` : ""}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {section.instructor ? (
                                <Badge variant="secondary" className="bg-purple-600/20 text-purple-300">
                                  {section.instructor.firstName} {section.instructor.lastName}
                                </Badge>
                              ) : null}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-gray-400 hover:text-white"
                                onClick={() => handleRemoveSection(course, section)}
                                disabled={removingSectionId === section.id}
                                aria-label={`Remove section ${section.name}`}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">No sections configured.</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          value={sectionDrafts[course.id] ?? ""}
                          onChange={(event) => handleSectionDraftChange(course.id, event.target.value)}
                          placeholder="e.g. Section A"
                          className="bg-gray-800 border-gray-700 text-white max-w-xs"
                          disabled={addingSectionCourseId === course.id}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              handleAddSection(course);
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                          onClick={() => handleAddSection(course)}
                          disabled={addingSectionCourseId === course.id}
                        >
                          {addingSectionCourseId === course.id ? "Adding..." : (
                            <span className="flex items-center gap-1">
                              <Plus className="h-3 w-3" />
                              Add Section
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-700 text-gray-200"
                        onClick={() => handleToggleStatus(course)}
                        disabled={pendingCourseId === course.id}
                      >
                        {pendingCourseId === course.id
                          ? "Updating..."
                          : course.isActive
                          ? "Mark Inactive"
                          : "Activate"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-300 hover:text-red-200"
                        onClick={() => handleDeleteCourse(course)}
                        disabled={deletingCourseId === course.id}
                      >
                        {deletingCourseId === course.id ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                No courses available yet. Create your first course using the form on the left.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
