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
  adminFacultyUpdateSchema,
  type AdminFacultyUpdateInput,
} from "@/lib/validation/admin";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FacultyDetail extends Required<AdminFacultyUpdateInput> {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string | null;
  department: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminFacultyDetailPage() {
  const params = useParams<{ facultyId: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [faculty, setFaculty] = useState<FacultyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<AdminFacultyUpdateInput>({
    resolver: zodResolver(adminFacultyUpdateSchema),
    defaultValues: {} as AdminFacultyUpdateInput,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  useEffect(() => {
    const controller = new AbortController();
    async function loadFaculty() {
      if (!params?.facultyId) {
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/faculty/${params.facultyId}`, {
          signal: controller.signal,
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result?.message || "Failed to load faculty member");
        }
        setFaculty(result.faculty);
        reset({
          firstName: result.faculty.firstName,
          lastName: result.faculty.lastName,
          email: result.faculty.email,
          employeeId: result.faculty.employeeId ?? undefined,
          department: result.faculty.program ?? undefined,
          phone: result.faculty.phone ?? undefined,
          address: result.faculty.address ?? undefined,
          bio: result.faculty.bio ?? undefined,
          isActive: result.faculty.isActive,
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

    loadFaculty();
    return () => controller.abort();
  }, [params?.facultyId, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!params?.facultyId) {
      return;
    }
    try {
      const response = await fetch(`/api/admin/faculty/${params.facultyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || "Unable to update faculty member");
      }
      toast({
        title: "Faculty updated",
        description: `${result.faculty.firstName} ${result.faculty.lastName} updated successfully`,
      });
      setFaculty((prev) =>
        prev
          ? {
              ...prev,
              ...result.faculty,
              updatedAt: result.faculty.updatedAt,
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
    if (!faculty) {
      return null;
    }
    return (
      <Badge
        variant="secondary"
        className={cn(
          faculty.isActive ? "bg-emerald-600/20 text-emerald-300" : "bg-gray-600/20 text-gray-300"
        )}
      >
        {faculty.isActive ? "Active" : "Inactive"}
      </Badge>
    );
  }, [faculty]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 bg-gray-800" />
        <Skeleton className="h-96 bg-gray-800" />
      </div>
    );
  }

  if (error || !faculty) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load faculty</AlertTitle>
        <AlertDescription>{error || "Faculty member unavailable"}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">{faculty.firstName} {faculty.lastName}</h1>
          <p className="text-sm text-gray-400">
            Employee ID {faculty.employeeId ?? "Unassigned"} · Created {new Date(faculty.createdAt).toLocaleDateString()} · Updated {new Date(faculty.updatedAt).toLocaleString()}
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
          <CardTitle className="text-white">Faculty profile</CardTitle>
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
              <Field label="Employee ID" htmlFor="employeeId" error={errors.employeeId?.message}>
                <Input id="employeeId" {...register("employeeId")} />
              </Field>
              <Field label="Department" htmlFor="department" error={errors.department?.message}>
                <Input id="department" {...register("department")} />
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
              <Button type="submit" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
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
