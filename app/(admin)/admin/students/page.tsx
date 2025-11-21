"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Users, GraduationCap, Search, ShieldOff } from "lucide-react";

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

export default function AdminStudentsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<StudentsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingStudentId, setUpdatingStudentId] = useState<string | null>(null);

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

  const updateStudentState = (updated: StudentRecord) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            students: prev.students.map((student) =>
              student.id === updated.id ? updated : student
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
      const updatedStudent: StudentRecord = {
        ...student,
        isActive: result.student.isActive,
      };
      updateStudentState(updatedStudent);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Student Roster</h1>
          <p className="text-sm text-gray-400">
            Audit student progress, enrollment status, and outstanding requests for support.
          </p>
        </div>
        <Button
          variant="outline"
          className="text-gray-300 border-gray-700"
          onClick={() =>
            toast({
              title: "Exports coming soon",
              description: "Bulk data exports for registrar workflows will arrive in a future release.",
            })
          }
        >
          <Search className="h-4 w-4 mr-2" />
          Advanced filters
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
                      variant="ghost"
                      size="sm"
                      className="text-gray-300 hover:text-white"
                      onClick={() => {
                        toast({
                          title: "Student profile",
                          description: `${student.firstName} ${student.lastName}'s detailed registrar workspace will be available in an upcoming release.`,
                        });
                      }}
                    >
                      View record
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
    </div>
  );
}
