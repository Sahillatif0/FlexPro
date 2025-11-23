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
  adminFacultyRegistrationSchema,
  type AdminFacultyRegistrationInput,
} from "@/lib/validation/admin";
import { Badge } from "@/components/ui/badge";

export default function AdminFacultyRegisterPage() {
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<AdminFacultyRegistrationInput>({
    resolver: zodResolver(adminFacultyRegistrationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      employeeId: "",
      department: "",
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
    setSuccessMessage(null);
    try {
      const response = await fetch("/api/admin/faculty/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = result?.message || "Unable to register faculty";
        setServerError(message);
        return;
      }

      toast({
        title: "Faculty registered",
        description: `${result.faculty.fullName} (${result.faculty.employeeId}) has been created`,
      });

      setSuccessMessage(`${result.faculty.fullName} (${result.faculty.employeeId}) has been created.`);

      reset({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        employeeId: "",
        department: "",
        phone: "",
        address: "",
        bio: "",
      });
    } catch (error) {
      console.error("Faculty registration failed", error);
      setServerError("Unexpected error. Check console for details.");
      setSuccessMessage(null);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Register Faculty</h1>
          <p className="text-sm text-gray-400">
            Onboard a faculty member and associate them with teaching assignments.
          </p>
        </div>
        <Badge variant="secondary" className="bg-purple-500/10 text-purple-200">
          Faculty onboarding
        </Badge>
      </div>

      {successMessage ? (
        <Alert className="border-emerald-500/40 bg-emerald-500/10 text-emerald-100">
          <AlertTitle>Faculty added</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      ) : null}

      {serverError ? (
        <Alert variant="destructive">
          <AlertTitle>Registration failed</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Faculty details</CardTitle>
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
            </div>
            <Field label="Bio" htmlFor="bio" error={errors.bio?.message} optional>
              <Textarea id="bio" rows={3} {...register("bio")} />
            </Field>
            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => reset()} disabled={isSubmitting}>
                Clear
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
                {isSubmitting ? "Creating..." : "Create faculty"}
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
