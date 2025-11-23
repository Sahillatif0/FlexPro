"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookMarked, GraduationCap, ListChecks, RefreshCcw, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

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

export default function AdminCoursesPage() {
  const { toast } = useToast();
  const [payload, setPayload] = useState<CoursesPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingCourseId, setPendingCourseId] = useState<string | null>(null);
  const [addingSectionCourseId, setAddingSectionCourseId] = useState<string | null>(null);
  const [assigningSectionId, setAssigningSectionId] = useState<string | null>(null);
  const [removingSectionId, setRemovingSectionId] = useState<string | null>(null);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [sectionDrafts, setSectionDrafts] = useState<Record<string, string>>({});
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    async function fetchCourses() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/admin/courses?limit=100", {
          signal: controller.signal,
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result?.message ?? "Unable to load courses");
        }
        if (mounted) {
          setPayload(result);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") {
          return;
        }
        if (mounted) {
          setError(err?.message ?? "Unexpected error");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchCourses();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  const refreshCourses = async () => {
    if (isRefreshing) {
      return;
    }
    try {
      setIsRefreshing(true);
      const response = await fetch("/api/admin/courses?limit=100");
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message ?? "Unable to refresh courses");
      }
      setPayload(result);
      toast({
        title: "Course list updated",
        description: "Synced with the latest catalog.",
      });
    } catch (err: any) {
      toast({
        title: "Refresh failed",
        description: err?.message ?? "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const courses = payload?.courses ?? [];
  const instructors = payload?.instructors ?? [];

  const sortedCourses = useMemo(() => {
    return [...courses].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [courses]);

  const filteredCourses = useMemo(() => {
    if (!searchTerm.trim()) {
      return sortedCourses;
    }
    const term = searchTerm.trim().toLowerCase();
    return sortedCourses.filter((course) => {
      const composite = `${course.code} ${course.title} ${course.department}`.toLowerCase();
      return composite.includes(term);
    });
  }, [searchTerm, sortedCourses]);

  const selectedCourse = useMemo(() => {
    if (!selectedCourseId) {
      return null;
    }
    return courses.find((course) => course.id === selectedCourseId) ?? null;
  }, [courses, selectedCourseId]);

  const handleOpenDetails = (course: CourseRecord) => {
    setSelectedCourseId(course.id);
    setIsDetailOpen(true);
  };

  const closeDetails = () => {
    setIsDetailOpen(false);
    setSelectedCourseId(null);
  };

  const updateCourseInState = (updated: CourseRecord) => {
    setPayload((prev) =>
      prev
        ? {
            ...prev,
            courses: prev.courses.map((item) => (item.id === updated.id ? updated : item)),
          }
        : prev
    );
  };

  const handleToggleCourseStatus = async (course: CourseRecord) => {
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
      if (!response.ok || !result?.course) {
        throw new Error(result?.message ?? "Unable to update course");
      }
      updateCourseInState(result.course);
      toast({
        title: "Course status updated",
        description: `${course.code} is now ${result.course.isActive ? "active" : "inactive"}.`,
      });
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err?.message ?? "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setPendingCourseId(null);
    }
  };

  const handleDeleteCourse = async (course: CourseRecord) => {
    if (deletingCourseId) {
      return;
    }
    const confirmed = window.confirm(
      `Delete ${course.code} · ${course.title}? Students will lose access to this offering.`
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
      setPayload((prev) =>
        prev
          ? {
              ...prev,
              courses: prev.courses.filter((item) => item.id !== course.id),
            }
          : prev
      );
      toast({
        title: "Course deleted",
        description: `${course.code} removed from catalog.`,
      });
      if (selectedCourseId === course.id) {
        closeDetails();
      }
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
        description: "Add a section label before saving.",
        variant: "destructive",
      });
      return;
    }
    const exists = course.sections.some(
      (section) => section.name.toLowerCase() === draft.toLowerCase()
    );
    if (exists) {
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
      if (!response.ok || !result?.section) {
        throw new Error(result?.message ?? "Unable to add section");
      }
      const newSection: CourseSectionRecord = result.section;
      setPayload((prev) =>
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
      toast({
        title: "Section added",
        description: `${draft} now appears under ${course.code}.`,
      });
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

  const handleAssignInstructor = async (
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
      if (!response.ok || !result?.section) {
        throw new Error(result?.message ?? "Unable to update section");
      }
      const updatedSection: CourseSectionRecord = result.section;
      setPayload((prev) =>
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

  const handleRemoveSection = async (course: CourseRecord, section: CourseSectionRecord) => {
    if (removingSectionId) {
      return;
    }
    const confirmed = window.confirm(
      `Remove ${section.name} from ${course.code}? This section will no longer appear in the catalog.`
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
      setPayload((prev) =>
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
      toast({
        title: "Section removed",
        description: `${section.name} detached from ${course.code}.`,
      });
    } catch (err: any) {
      toast({
        title: "Removal failed",
        description: err?.message ?? "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setRemovingSectionId(null);
    }
  };

  const activeCount = useMemo(
    () => sortedCourses.filter((course) => course.isActive).length,
    [sortedCourses]
  );

  const sectionCount = useMemo(
    () => sortedCourses.reduce((total, course) => total + course.sections.length, 0),
    [sortedCourses]
  );

  return (
    <div className="space-y-8 lg:space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="text-2xl font-semibold text-white">Course Catalog</h1>
          <p className="text-sm text-gray-400">
            Manage offerings, control publication status, and maintain section assignments.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            className="border-gray-700 text-gray-200 hover:text-white"
            onClick={refreshCourses}
            disabled={isRefreshing}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            {isRefreshing ? "Refreshing" : "Refresh"}
          </Button>
          <Button asChild className="bg-purple-600 text-white hover:bg-purple-700">
            <Link href="/admin/courses/new">Add Course</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="rounded-3xl border border-white/10 bg-slate-950/70 backdrop-blur-xl shadow-lg shadow-purple-900/10">
          <CardContent className="flex items-center gap-4 px-5 py-5 text-gray-200">
            <GraduationCap className="h-10 w-10 rounded-lg bg-purple-600/20 p-2 text-purple-300" />
            <div>
              <p className="text-xs uppercase text-gray-400">Total courses</p>
              <p className="text-xl font-semibold">{sortedCourses.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border border-white/10 bg-slate-950/70 backdrop-blur-xl shadow-lg shadow-purple-900/10">
          <CardContent className="flex items-center gap-4 px-5 py-5 text-gray-200">
            <Users className="h-10 w-10 rounded-lg bg-emerald-600/20 p-2 text-emerald-300" />
            <div>
              <p className="text-xs uppercase text-gray-400">Active offerings</p>
              <p className="text-xl font-semibold">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border border-white/10 bg-slate-950/70 backdrop-blur-xl shadow-lg shadow-purple-900/10">
          <CardContent className="flex items-center gap-4 px-5 py-5 text-gray-200">
            <ListChecks className="h-10 w-10 rounded-lg bg-blue-600/20 p-2 text-blue-300" />
            <div>
              <p className="text-xs uppercase text-gray-400">Sections tracked</p>
              <p className="text-xl font-semibold">{sectionCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load courses</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="rounded-3xl border border-white/10 bg-slate-950/75 backdrop-blur-xl shadow-xl shadow-purple-900/20">
        <CardHeader className="flex flex-col gap-4 border-b border-white/10 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <BookMarked className="h-5 w-5 text-purple-400" />
            Existing Courses
          </CardTitle>
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by code, title, or department"
            className="w-full max-w-xs rounded-xl border border-white/10 bg-slate-950/70 text-white"
          />
        </CardHeader>
        <CardContent className="space-y-4 px-6 py-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full rounded-2xl bg-white/10" />
              ))}
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-10 text-center text-sm text-gray-400">
              No courses match this filter. Try a different search term.
            </div>
          ) : (
            filteredCourses.map((course) => (
              <div
                key={course.id}
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 shadow-lg shadow-purple-900/15 transition hover:border-purple-500/50 lg:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{course.code}</p>
                      <Badge variant={course.isActive ? "default" : "secondary"}>
                        {course.isActive ? "Active" : "Draft"}
                      </Badge>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-100">{course.title}</h2>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      {course.department} · {course.creditHours} credit hrs · Semester {course.semester}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-gray-700 text-gray-200 hover:text-white"
                      onClick={() => handleOpenDetails(course)}
                    >
                      Quick view
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-gray-700 text-gray-200 hover:text-white"
                      onClick={() => handleToggleCourseStatus(course)}
                      disabled={pendingCourseId === course.id}
                    >
                      {course.isActive ? "Deactivate" : "Publish"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteCourse(course)}
                      disabled={deletingCourseId === course.id}
                    >
                      Delete
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-300 hover:text-white"
                      asChild
                    >
                      <Link href={`/admin/courses/${course.id}`}>Open page</Link>
                    </Button>
                  </div>
                </div>
                <Separator className="my-4 border-white/10" />
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                  <span>{course.sections.length} section(s)</span>
                  <span>Max capacity: {course.maxCapacity}</span>
                  <span>
                    Last updated: {new Date(course.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Sheet
        open={isDetailOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDetails();
          } else {
            setIsDetailOpen(true);
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto border-l border-white/10 bg-slate-950/90 px-6 py-8 text-slate-100 shadow-2xl shadow-purple-900/20 backdrop-blur-xl sm:max-w-xl"
        >
          {selectedCourse ? (
            <div className="space-y-6">
              <SheetHeader>
                <SheetTitle className="text-white">{selectedCourse.title}</SheetTitle>
                <SheetDescription className="text-gray-400">
                  {selectedCourse.code} · {selectedCourse.department}
                </SheetDescription>
              </SheetHeader>

              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-200 shadow-inner shadow-purple-900/10">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant={selectedCourse.isActive ? "default" : "secondary"}>
                    {selectedCourse.isActive ? "Published" : "Draft"}
                  </Badge>
                </div>
                <div className="grid gap-2 text-sm">
                  <p>
                    Credit hours: <span className="text-white">{selectedCourse.creditHours}</span>
                  </p>
                  <p>
                    Semester: <span className="text-white">{selectedCourse.semester}</span>
                  </p>
                  <p>
                    Max capacity: <span className="text-white">{selectedCourse.maxCapacity}</span>
                  </p>
                  <p>
                    Created{" "}
                    <span className="text-white">
                      {new Date(selectedCourse.createdAt).toLocaleString()}
                    </span>
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">
                    Sections ({selectedCourse.sections.length})
                  </h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="New section label"
                      value={sectionDrafts[selectedCourse.id] ?? ""}
                      onChange={(event) =>
                        handleSectionDraftChange(selectedCourse.id, event.target.value)
                      }
                      className="h-9 w-40 rounded-xl border border-white/10 bg-slate-950/70 text-white"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleAddSection(selectedCourse)}
                      disabled={addingSectionCourseId === selectedCourse.id}
                    >
                      Add
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-[320px] rounded-2xl border border-white/10 bg-slate-950/70">
                  <div className="space-y-2 p-3">
                    {selectedCourse.sections.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center text-xs text-slate-300">
                        No sections yet. Create one to start assigning instructors.
                      </div>
                    ) : (
                      selectedCourse.sections.map((section) => {
                        const value = section.instructor ? section.instructor.id : "unassigned";
                        return (
                          <div
                            key={section.id}
                            className="rounded-xl border border-white/10 bg-slate-950/70 p-3 shadow-inner shadow-purple-900/5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-white">{section.name}</p>
                                <p className="text-xs text-gray-400">
                                  {section.instructor
                                    ? `${section.instructor.firstName} ${section.instructor.lastName}${
                                        section.instructor.employeeId
                                          ? ` · ${section.instructor.employeeId}`
                                          : ""
                                      }`
                                    : "Not assigned"}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Select
                                  value={value}
                                  onValueChange={(selected) =>
                                    handleAssignInstructor(
                                      selectedCourse,
                                      section,
                                      selected === "unassigned" ? null : selected
                                    )
                                  }
                                  disabled={assigningSectionId === section.id}
                                >
                                  <SelectTrigger className="h-9 w-44 rounded-xl border border-white/10 bg-slate-950/70 text-white">
                                    <SelectValue placeholder="Assign instructor" />
                                  </SelectTrigger>
                                  <SelectContent className="border-white/10 bg-slate-950/95 text-white">
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {instructors.map((option) => (
                                      <SelectItem key={option.id} value={option.id}>
                                        {option.fullName}
                                        {option.employeeId ? ` · ${option.employeeId}` : ""}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-gray-700 text-gray-200 hover:text-white"
                                  onClick={() => handleRemoveSection(selectedCourse, section)}
                                  disabled={removingSectionId === section.id}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Skeleton className="h-6 w-2/3 bg-gray-800" />
              <Skeleton className="h-20 w-full bg-gray-800" />
              <Skeleton className="h-40 w-full bg-gray-800" />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
