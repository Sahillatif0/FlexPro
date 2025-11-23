"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, GraduationCap, ShieldOff, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface StudentRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  studentId: string;
  program: string;
  semester: number;
  cgpa: number;
  isActive: boolean;
  enrolledCourses: number;
  pendingFeeInvoices: number;
  pendingGradeRequests: number;
  createdAt: string;
}

interface StudentsPayload {
  students: StudentRecord[];
}

interface StudentDetailRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  studentId: string;
  program: string | null;
  semester: number;
  section: string | null;
  cgpa: number | null;
  phone: string | null;
  address: string | null;
  bio: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StudentDetailResponse {
  student: StudentDetailRecord;
}

interface StudentDetailForm {
  firstName: string;
  lastName: string;
  email: string;
  studentId: string;
  program: string;
  semester: string;
  section: string;
  cgpa: string;
  phone: string;
  address: string;
  bio: string;
  isActive: boolean;
}

export default function AdminStudentsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<StudentsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingStudentId, setUpdatingStudentId] = useState<string | null>(null);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [detail, setDetail] = useState<StudentDetailRecord | null>(null);
  const [detailForm, setDetailForm] = useState<StudentDetailForm | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSaving, setDetailSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function loadStudents() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/admin/students?limit=100", {
          signal: controller.signal,
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.message ?? "Failed to load student list");
        }
        const payload: StudentsPayload = await response.json();
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

    loadStudents();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!isDetailOpen || !selectedStudentId) {
      setDetailError(null);
      setDetail(null);
      setDetailForm(null);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function loadDetail() {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const response = await fetch(`/api/admin/students/${selectedStudentId}`, {
          signal: controller.signal,
        });
        const payload: StudentDetailResponse = await response.json().catch(() => ({} as StudentDetailResponse));
        if (!response.ok) {
          throw new Error((payload as any)?.message ?? "Unable to load student profile");
        }
        if (!cancelled) {
          setDetail(payload.student);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") {
          return;
        }
        if (!cancelled) {
          setDetailError(err?.message ?? "Unexpected error");
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    }

    loadDetail();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isDetailOpen, selectedStudentId]);

  useEffect(() => {
    if (!detail) {
      setDetailForm(null);
      return;
    }
    setDetailForm({
      firstName: detail.firstName,
      lastName: detail.lastName,
      email: detail.email,
      studentId: detail.studentId,
      program: detail.program ?? "",
      semester: String(detail.semester ?? ""),
      section: detail.section ?? "",
      cgpa: detail.cgpa !== null && detail.cgpa !== undefined ? String(detail.cgpa) : "",
      phone: detail.phone ?? "",
      address: detail.address ?? "",
      bio: detail.bio ?? "",
      isActive: detail.isActive,
    });
  }, [detail]);

  const filteredStudents = useMemo(() => {
    if (!data) {
      return [] as StudentRecord[];
    }
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return data.students;
    }
    return data.students.filter((student) => {
      const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
      return (
        fullName.includes(term) ||
        student.email.toLowerCase().includes(term) ||
        student.studentId.toLowerCase().includes(term) ||
        student.program.toLowerCase().includes(term)
      );
    });
  }, [data, searchTerm]);

  const updateStudentState = (id: string, updates: Partial<StudentRecord>) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            students: prev.students.map((student) =>
              student.id === id ? { ...student, ...updates } : student
            ),
          }
        : prev
    );
  };

  const handleToggleStatus = async (student: StudentRecord) => {
    if (updatingStudentId) {
      return;
    }

    try {
      setUpdatingStudentId(student.id);
      const response = await fetch(`/api/admin/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !student.isActive }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message ?? "Unable to update student");
      }
      updateStudentState(student.id, { isActive: result.student.isActive });
      if (detail && detail.id === student.id) {
        setDetail({ ...detail, isActive: result.student.isActive });
        setDetailForm((prev) => (prev ? { ...prev, isActive: result.student.isActive } : prev));
      }
      toast({
        title: "Student status updated",
        description: `${student.studentId} is now ${result.student.isActive ? "active" : "inactive"}.`,
      });
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err?.message ?? "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setUpdatingStudentId(null);
    }
  };

  const handleDetailFieldChange = (field: keyof StudentDetailForm, value: string | boolean) => {
    setDetailForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSaveDetail = async () => {
    if (!detail || !detailForm || detailSaving) {
      return;
    }

    const payload: Record<string, unknown> = {};

    const trim = (value: string) => value.trim();

    if (trim(detailForm.firstName) && trim(detailForm.firstName) !== detail.firstName) {
      payload.firstName = trim(detailForm.firstName);
    }
    if (trim(detailForm.lastName) && trim(detailForm.lastName) !== detail.lastName) {
      payload.lastName = trim(detailForm.lastName);
    }
    if (trim(detailForm.email) && trim(detailForm.email).toLowerCase() !== detail.email.toLowerCase()) {
      payload.email = trim(detailForm.email);
    }
    if (trim(detailForm.studentId) && trim(detailForm.studentId) !== detail.studentId) {
      payload.studentId = trim(detailForm.studentId);
    }
    if (trim(detailForm.program) !== (detail.program ?? "")) {
      payload.program = trim(detailForm.program);
    }
    if (trim(detailForm.section) !== (detail.section ?? "")) {
      payload.section = trim(detailForm.section);
    }

    const semesterValue = Number(detailForm.semester);
    if (Number.isFinite(semesterValue) && semesterValue !== detail.semester) {
      payload.semester = semesterValue;
    }

    const cgpaValue = Number(detailForm.cgpa);
    if (!Number.isNaN(cgpaValue) && cgpaValue !== (detail.cgpa ?? 0)) {
      payload.cgpa = cgpaValue;
    }

    if (trim(detailForm.phone) !== (detail.phone ?? "")) {
      payload.phone = trim(detailForm.phone);
    }
    if (trim(detailForm.address) !== (detail.address ?? "")) {
      payload.address = trim(detailForm.address);
    }
    if (trim(detailForm.bio) !== (detail.bio ?? "")) {
      payload.bio = trim(detailForm.bio);
    }
    if (detailForm.isActive !== detail.isActive) {
      payload.isActive = detailForm.isActive;
    }

    if (!Object.keys(payload).length) {
      toast({
        title: "No changes detected",
        description: "Update at least one field before saving.",
      });
      return;
    }

    try {
      setDetailSaving(true);
      const response = await fetch(`/api/admin/students/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message ?? "Unable to update student");
      }

      const updated = result.student as StudentDetailRecord;
      setDetail((prev) => (prev ? { ...prev, ...updated } : updated));
      setDetailForm((prev) =>
        prev
          ? {
              ...prev,
              firstName: updated.firstName,
              lastName: updated.lastName,
              email: updated.email,
              studentId: updated.studentId,
              program: updated.program ?? "",
              section: updated.section ?? "",
              semester: String(updated.semester),
              cgpa: updated.cgpa !== null && updated.cgpa !== undefined ? String(updated.cgpa) : "",
              phone: updated.phone ?? "",
              address: updated.address ?? "",
              bio: updated.bio ?? "",
              isActive: updated.isActive,
            }
          : prev
      );
      updateStudentState(updated.id, {
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        studentId: updated.studentId,
        program: updated.program ?? (detail?.program ?? ""),
        semester: updated.semester,
        cgpa: updated.cgpa ?? detail?.cgpa ?? 0,
        isActive: updated.isActive,
      });
      toast({
        title: "Student updated",
        description: `${updated.firstName} ${updated.lastName}'s profile was saved successfully.`,
      });
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err?.message ?? "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setDetailSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Student Roster</h1>
          <p className="text-sm text-gray-400">
            Audit student progress, enrollment status, and outstanding requests for support.
          </p>
        </div>
        <Button asChild className="bg-purple-600 text-white hover:bg-purple-700">
          <Link href="/admin/students/register">Register Student</Link>
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load students</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="space-y-4 lg:flex lg:items-center lg:justify-between lg:space-y-0">
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-400" />
            Enrolled Students
          </CardTitle>
          <div className="w-full max-w-xs">
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, roll number, or program"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading || !data ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-24 bg-gray-800" />
              ))}
            </div>
          ) : filteredStudents.length ? (
            <div className="space-y-3">
              {filteredStudents.map((student) => (
                <div key={student.id} className="rounded-lg bg-gray-800/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {student.firstName} {student.lastName}
                      </p>
                      <div className="text-xs text-gray-400 flex flex-wrap items-center gap-2">
                        <span>{student.email}</span>
                        <span>| {student.studentId}</span>
                        <span>| {student.program}</span>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        student.isActive
                          ? "bg-emerald-600/20 text-emerald-400"
                          : "bg-gray-600/20 text-gray-300"
                      }
                    >
                      {student.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                    <span>Semester {student.semester}</span>
                    <span>|</span>
                    <span>CGPA {student.cgpa.toFixed(2)}</span>
                    <span>|</span>
                    <span>{student.enrolledCourses} courses</span>
                    {student.pendingFeeInvoices > 0 ? (
                      <span className="flex items-center gap-1 text-amber-300">
                        <ShieldOff className="h-3 w-3" />
                        {student.pendingFeeInvoices} fee due
                      </span>
                    ) : null}
                    {student.pendingGradeRequests > 0 ? (
                      <span className="flex items-center gap-1 text-purple-300">
                        <GraduationCap className="h-3 w-3" />
                        {student.pendingGradeRequests} grade review
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-700 text-gray-200"
                      onClick={() => handleToggleStatus(student)}
                      disabled={updatingStudentId === student.id}
                    >
                      {updatingStudentId === student.id
                        ? "Updating..."
                        : student.isActive
                        ? "Deactivate"
                        : "Activate"}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="bg-purple-600/30 text-purple-200 hover:bg-purple-600/40"
                      onClick={() => {
                        setSelectedStudentId(student.id);
                        setIsDetailOpen(true);
                      }}
                    >
                      View profile
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Users className="h-10 w-10 text-gray-500" />
              <p className="text-sm text-gray-400">No students found for your query. Try adjusting the filters.</p>
              <Button variant="outline" className="text-gray-300 border-gray-700" onClick={() => setSearchTerm("")}>
                Reset filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet
        open={isDetailOpen}
        onOpenChange={(open) => {
          setIsDetailOpen(open);
          if (!open) {
            setSelectedStudentId(null);
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full border-l border-gray-800 bg-gray-950 text-gray-100 sm:max-w-3xl"
        >
          {detailLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 bg-gray-800" />
              ))}
            </div>
          ) : detailError ? (
            <div className="flex h-full flex-col items-center justify-center space-y-3 text-center">
              <Alert variant="destructive" className="max-w-sm bg-red-500/10 text-red-100">
                <AlertTitle>Unable to load profile</AlertTitle>
                <AlertDescription>{detailError}</AlertDescription>
              </Alert>
              <Button
                variant="outline"
                className="border-gray-700 text-gray-200"
                onClick={() => {
                  if (selectedStudentId) {
                    setIsDetailOpen(false);
                    setTimeout(() => setIsDetailOpen(true), 10);
                  }
                }}
              >
                Retry
              </Button>
            </div>
          ) : detail && detailForm ? (
            <div className="flex h-full flex-col gap-4">
              <SheetHeader className="space-y-1 text-left">
                <SheetTitle className="text-white">
                  {detail.firstName} {detail.lastName}
                </SheetTitle>
                <SheetDescription className="text-gray-400">
                  {detail.email}
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="flex-1 pr-3">
                <div className="space-y-6 pb-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 text-sm text-gray-300">
                      <p className="text-xs uppercase text-gray-500">Student ID</p>
                      <p className="font-medium text-white">{detail.studentId}</p>
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 text-sm text-gray-300">
                      <p className="text-xs uppercase text-gray-500">Status</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={detail.isActive ? "bg-emerald-600/20 text-emerald-400" : "bg-gray-600/20 text-gray-300"}
                        >
                          {detail.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Switch
                          checked={detailForm.isActive}
                          onCheckedChange={(value) => handleDetailFieldChange("isActive", value)}
                          className="data-[state=checked]:bg-purple-600"
                        />
                      </div>
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 text-sm text-gray-300">
                      <p className="text-xs uppercase text-gray-500">Program</p>
                      <p className="font-medium text-white">{detail.program ?? "Not set"}</p>
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 text-sm text-gray-300">
                      <p className="text-xs uppercase text-gray-500">Joined</p>
                      <p className="font-medium text-white">
                        <CalendarDays className="mr-1 inline h-4 w-4" />
                        {new Date(detail.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm text-gray-300">First name</label>
                        <Input
                          value={detailForm.firstName}
                          onChange={(event) => handleDetailFieldChange("firstName", event.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-gray-300">Last name</label>
                        <Input
                          value={detailForm.lastName}
                          onChange={(event) => handleDetailFieldChange("lastName", event.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm text-gray-300">Email</label>
                        <Input
                          type="email"
                          value={detailForm.email}
                          onChange={(event) => handleDetailFieldChange("email", event.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-gray-300">Student ID</label>
                        <Input
                          value={detailForm.studentId}
                          onChange={(event) => handleDetailFieldChange("studentId", event.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <label className="text-sm text-gray-300">Program</label>
                        <Input
                          value={detailForm.program}
                          onChange={(event) => handleDetailFieldChange("program", event.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-gray-300">Semester</label>
                        <Input
                          type="number"
                          min="1"
                          max="12"
                          value={detailForm.semester}
                          onChange={(event) => handleDetailFieldChange("semester", event.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-gray-300">Section</label>
                        <Input
                          value={detailForm.section}
                          onChange={(event) => handleDetailFieldChange("section", event.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm text-gray-300">CGPA</label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="4"
                          value={detailForm.cgpa}
                          onChange={(event) => handleDetailFieldChange("cgpa", event.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-gray-300">Phone</label>
                        <Input
                          value={detailForm.phone}
                          onChange={(event) => handleDetailFieldChange("phone", event.target.value)}
                          className="bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-300">Address</label>
                      <Textarea
                        value={detailForm.address}
                        onChange={(event) => handleDetailFieldChange("address", event.target.value)}
                        className="bg-gray-800 border-gray-700 text-white"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-300">Advisor notes</label>
                      <Textarea
                        value={detailForm.bio}
                        onChange={(event) => handleDetailFieldChange("bio", event.target.value)}
                        className="bg-gray-800 border-gray-700 text-white"
                        rows={4}
                        placeholder="Capture advising notes, strengths, or support needs."
                      />
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  className="text-gray-300 hover:text-white"
                  onClick={() => {
                    setDetailForm({
                      firstName: detail.firstName,
                      lastName: detail.lastName,
                      email: detail.email,
                      studentId: detail.studentId,
                      program: detail.program ?? "",
                      semester: String(detail.semester ?? ""),
                      section: detail.section ?? "",
                      cgpa: detail.cgpa !== null && detail.cgpa !== undefined ? String(detail.cgpa) : "",
                      phone: detail.phone ?? "",
                      address: detail.address ?? "",
                      bio: detail.bio ?? "",
                      isActive: detail.isActive,
                    });
                  }}
                  disabled={detailSaving}
                >
                  Reset changes
                </Button>
                <Button
                  onClick={handleSaveDetail}
                  disabled={detailSaving}
                  className="bg-purple-600 text-white hover:bg-purple-700"
                >
                  {detailSaving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              Select a student to view details.
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
