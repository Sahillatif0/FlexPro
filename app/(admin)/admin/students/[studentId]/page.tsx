"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  adminStudentUpdateSchema,
  type AdminStudentUpdateInput,
} from "@/lib/validation/admin";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StudentDetail extends Required<AdminStudentUpdateInput> {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  studentId: string;
  program: string;
  semester: number;
  section: string;
  cgpa: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminStudentDetailPage() {
  const params = useParams<{ studentId: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<AdminStudentUpdateInput>({
    resolver: zodResolver(adminStudentUpdateSchema),
    defaultValues: {} as AdminStudentUpdateInput,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  useEffect(() => {
    const controller = new AbortController();
    async function loadStudent() {
      if (!params?.studentId) {
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/students/${params.studentId}`, {
          signal: controller.signal,
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result?.message || "Failed to load student");
        }
        setStudent(result.student);
        reset({
          firstName: result.student.firstName,
          lastName: result.student.lastName,
          email: result.student.email,
          studentId: result.student.studentId,
          program: result.student.program,
          semester: result.student.semester,
          section: result.student.section,
          cgpa: result.student.cgpa,
          phone: result.student.phone ?? undefined,
          address: result.student.address ?? undefined,
          bio: result.student.bio ?? undefined,
          isActive: result.student.isActive,
        });
      } catch (err: any) {
        if (err?.name === "AbortError") {
          return;
        }
        setError(err?.message || "Unexpected error");
      } finally {
        setIsLoading(false);
      }
    }

    loadStudent();
    return () => controller.abort();
  }, [params?.studentId, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!params?.studentId) {
      return;
    }
    try {
      const response = await fetch(`/api/admin/students/${params.studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || "Unable to update student");
      }
      toast({
        title: "Student updated",
        description: `${result.student.firstName} ${result.student.lastName} updated successfully`,
      });
      setStudent((prev) =>
        prev
          ? {
              ...prev,
              ...result.student,
              updatedAt: result.student.updatedAt,
            }
          : prev
      );
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error?.message || "Unexpected error",
        variant: "destructive",
      });
    }
  });

  const statusBadge = useMemo(() => {
    if (!student) {
      return null;
    }
    return (
      <Badge
        variant="secondary"
        className={cn(
          student.isActive ? "bg-emerald-600/20 text-emerald-300" : "bg-gray-600/20 text-gray-300"
        )}
      >
        {student.isActive ? "Active" : "Inactive"}
      </Badge>
    );
  }, [student]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 bg-gray-800" />
        <Skeleton className="h-96 bg-gray-800" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load student</AlertTitle>
        <AlertDescription>{error || "Student record unavailable"}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">{student.firstName} {student.lastName}</h1>
          <p className="text-sm text-gray-400">
            Student ID {student.studentId} · Created {new Date(student.createdAt).toLocaleDateString()} · Updated {new Date(student.updatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {statusBadge}
          <Button variant="ghost" className="text-gray-300" onClick={() => router.back()}>
            Back
          </Button>
        </div>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Student profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="First name" htmlFor="firstName" error={errors.firstName?.message}>
                <Input id="firstName" {...register("firstName")} />
              </Field>
              <Field label="Last name" htmlFor="lastName" error={errors.lastName?.message}>
                <Input id="lastName" {...register("lastName")} />
              </Field>
              <Field label="Email" htmlFor="email" error={errors.email?.message}>
                <Input id="email" type="email" {...register("email")} />
              </Field>
              <Field label="Student ID" htmlFor="studentId" error={errors.studentId?.message}>
                <Input id="studentId" {...register("studentId")} />
              </Field>
              <Field label="Program" htmlFor="program" error={errors.program?.message}>
                <Input id="program" {...register("program")} />
              </Field>
              <Field label="Semester" htmlFor="semester" error={errors.semester?.message}>
                <Input id="semester" type="number" min={1} max={12} {...register("semester", { valueAsNumber: true })} />
              </Field>
              <Field label="Section" htmlFor="section" error={errors.section?.message}>
                <Input id="section" {...register("section")} />
              </Field>
              <Field label="CGPA" htmlFor="cgpa" error={errors.cgpa?.message}>
                <Input id="cgpa" type="number" step="0.01" min={0} max={4} {...register("cgpa", { valueAsNumber: true })} />
              </Field>
              <Field label="Phone" htmlFor="phone" error={errors.phone?.message} optional>
                <Input id="phone" {...register("phone")} />
              </Field>
              <Field label="Address" htmlFor="address" error={errors.address?.message} optional>
                <Input id="address" {...register("address")} />
              </Field>
              <Field label="Status" htmlFor="isActive" error={errors.isActive?.message}>
                <select
                  id="isActive"
                  className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:outline-none"
                  {...register("isActive")}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </Field>
            </div>
            <Field label="Bio" htmlFor="bio" error={errors.bio?.message} optional>
              <Textarea id="bio" rows={3} {...register("bio")} />
            </Field>
            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => reset()} disabled={isSubmitting}>
                Reset
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {isSubmitting ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}

function Field({ label, htmlFor, error, optional, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={htmlFor} className="text-gray-200">
          {label}
          {optional ? <span className="ml-1 text-xs text-gray-500">(optional)</span> : null}
        </Label>
        {error ? <span className="text-xs text-red-300">{error}</span> : null}
      </div>
      {children}
    </div>
  );
}
