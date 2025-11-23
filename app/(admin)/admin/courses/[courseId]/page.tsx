"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

import { adminCourseUpdateSchema, type AdminCourseUpdateInput } from "@/lib/validation/course";
import { cn } from "@/lib/utils";

interface CourseSectionInfo {
  id: string;
  name: string;
  instructor: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string | null;
  } | null;
}

interface CourseDetail extends Required<AdminCourseUpdateInput> {
  id: string;
  code: string;
  title: string;
  description: string | null;
  department: string;
  creditHours: number;
  semester: number;
  maxCapacity: number;
  isActive: boolean;
  prerequisite: string | null;
  createdAt: string;
  updatedAt: string;
  sections: CourseSectionInfo[];
}

export default function AdminCourseDetailPage() {
  const params = useParams<{ courseId: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<AdminCourseUpdateInput>({
    resolver: zodResolver(adminCourseUpdateSchema),
    defaultValues: {} as AdminCourseUpdateInput,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  useEffect(() => {
    const controller = new AbortController();
    async function loadCourse() {
      if (!params?.courseId) {
        return;
      }
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);
      try {
        const response = await fetch(`/api/admin/courses/${params.courseId}`);
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result?.message || "Failed to load course");
        }
        setCourse(result.course);
        reset({
          title: result.course.title,
          description: result.course.description ?? undefined,
          creditHours: result.course.creditHours,
          department: result.course.department,
          semester: result.course.semester,
          maxCapacity: result.course.maxCapacity,
          prerequisite: result.course.prerequisite ?? undefined,
          isActive: result.course.isActive,
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

    loadCourse();
    return () => controller.abort();
  }, [params?.courseId, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!params?.courseId) {
      return;
    }
    setSuccessMessage(null);
    try {
      const response = await fetch(`/api/admin/courses/${params.courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || "Unable to update course");
      }
      toast({
        title: "Course updated",
        description: `${result.course.title} updated successfully`,
      });
      setCourse(result.course);
      setSuccessMessage(`${result.course.title} updated successfully.`);
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error?.message || "Unexpected error",
        variant: "destructive",
      });
    }
  });

  const statusBadge = useMemo(() => {
    if (!course) {
      return null;
    }
    return (
      <Badge
        variant="secondary"
        className={cn(
          course.isActive ? "bg-emerald-600/20 text-emerald-300" : "bg-gray-600/20 text-gray-300"
        )}
      >
        {course.isActive ? "Active" : "Inactive"}
      </Badge>
    );
  }, [course]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 bg-gray-800" />
        <Skeleton className="h-96 bg-gray-800" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load course</AlertTitle>
        <AlertDescription>{error || "Course record unavailable"}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">{course.title}</h1>
          <p className="text-sm text-gray-400">
            {course.code} · Created {new Date(course.createdAt).toLocaleDateString()} · Updated {new Date(course.updatedAt).toLocaleString()}
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
          <CardTitle className="text-white">Course details</CardTitle>
        </CardHeader>
        <CardContent>
          {successMessage ? (
            <Alert className="mb-4 border-emerald-500/40 bg-emerald-500/10 text-emerald-100">
              <AlertTitle>Changes saved</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          ) : null}
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Title" htmlFor="title" error={errors.title?.message}>
                <Input id="title" {...register("title")} />
              </Field>
              <Field label="Department" htmlFor="department" error={errors.department?.message}>
                <Input id="department" {...register("department")} />
              </Field>
              <Field label="Credit hours" htmlFor="creditHours" error={errors.creditHours?.message}>
                <Input id="creditHours" type="number" min={1} {...register("creditHours", { valueAsNumber: true })} />
              </Field>
              <Field label="Semester" htmlFor="semester" error={errors.semester?.message}>
                <Input id="semester" type="number" min={1} {...register("semester", { valueAsNumber: true })} />
              </Field>
              <Field label="Max capacity" htmlFor="maxCapacity" error={errors.maxCapacity?.message}>
                <Input id="maxCapacity" type="number" min={1} {...register("maxCapacity", { valueAsNumber: true })} />
              </Field>
              <Field label="Prerequisite" htmlFor="prerequisite" error={errors.prerequisite?.message} optional>
                <Input id="prerequisite" {...register("prerequisite")} />
              </Field>
              <Field label="Status" htmlFor="isActive" error={errors.isActive?.message}>
                <Controller
                  control={control}
                  name="isActive"
                  render={({ field }) => (
                    <div className="flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-800/60 px-4 py-3">
                      <Switch
                        id="isActive"
                        checked={Boolean(field.value)}
                        onCheckedChange={(value) => field.onChange(value)}
                        className="data-[state=checked]:bg-emerald-600"
                      />
                      <span className="text-sm text-gray-200">
                        {field.value ? "Active" : "Inactive"}
                      </span>
                    </div>
                  )}
                />
              </Field>
            </div>
            <Field label="Description" htmlFor="description" error={errors.description?.message} optional>
              <Textarea id="description" rows={4} {...register("description")} />
            </Field>
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  reset();
                  setSuccessMessage(null);
                }}
                disabled={isSubmitting}
              >
                Reset
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-orange-600 hover:bg-orange-700">
                {isSubmitting ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Sections & instructors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {course.sections.length ? (
            course.sections.map((section) => (
              <div key={section.id} className="rounded-md border border-gray-800 bg-gray-800/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Section {section.name}</p>
                    <p className="text-xs text-gray-400">
                      {section.instructor
                        ? `${section.instructor.firstName} ${section.instructor.lastName} (${section.instructor.employeeId ?? "N/A"})`
                        : "No instructor assigned"}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="border-gray-700 text-gray-200">
                    Manage section
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400">No sections configured for this course.</p>
          )}
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
