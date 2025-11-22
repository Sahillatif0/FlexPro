"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  adminStudentRegistrationSchema,
  type AdminStudentRegistrationInput,
} from "@/lib/validation/admin";
import { Badge } from "@/components/ui/badge";

export default function AdminStudentRegisterPage() {
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<AdminStudentRegistrationInput>({
    resolver: zodResolver(adminStudentRegistrationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      studentId: "",
      program: "",
      semester: 1,
      section: "A",
      cgpa: 0,
      phone: "",
      address: "",
      bio: "",
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const response = await fetch("/api/admin/students/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = result?.message || "Unable to register student";
        setServerError(message);
        return;
      }

      toast({
        title: "Student registered",
        description: `${result.student.fullName} (${result.student.studentId}) has been created`,
      });

      reset({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        studentId: "",
        program: "",
        semester: 1,
        section: "A",
        cgpa: 0,
        phone: "",
        address: "",
        bio: "",
      });
    } catch (error) {
      console.error("Student registration failed", error);
      setServerError("Unexpected error. Check console for details.");
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Register Student</h1>
          <p className="text-sm text-gray-400">
            Create a student account and provision course enrolment access immediately.
          </p>
        </div>
        <Badge variant="secondary" className="bg-blue-500/10 text-blue-200">
          Registrar tools
        </Badge>
      </div>

      {serverError ? (
        <Alert variant="destructive">
          <AlertTitle>Registration failed</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Student details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="First name" htmlFor="firstName" error={errors.firstName?.message}>
                <Input id="firstName" autoComplete="given-name" {...register("firstName")} />
              </Field>
              <Field label="Last name" htmlFor="lastName" error={errors.lastName?.message}>
                <Input id="lastName" autoComplete="family-name" {...register("lastName")} />
              </Field>
              <Field label="Email" htmlFor="email" error={errors.email?.message}>
                <Input id="email" type="email" autoComplete="email" {...register("email")} />
              </Field>
              <Field label="Password" htmlFor="password" error={errors.password?.message}>
                <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
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
            </div>
            <Field label="Bio" htmlFor="bio" error={errors.bio?.message} optional>
              <Textarea id="bio" rows={3} {...register("bio")} />
            </Field>
            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => reset()} disabled={isSubmitting}>
                Clear
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
                {isSubmitting ? "Creating..." : "Create student"}
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
