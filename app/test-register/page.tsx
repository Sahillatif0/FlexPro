'use client';

import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { registerStudentSchema, type RegisterStudentInput } from '@/lib/validation/student';
import { Badge } from '@/components/ui/badge';

export default function TestRegisterPage() {
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<RegisterStudentInput>({
    resolver: zodResolver(registerStudentSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      studentId: '',
      program: '',
      semester: 1,
      cgpa: 0,
      phone: '',
      address: '',
      bio: '',
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    setServerMessage(null);
    setServerError(null);

    try {
      const response = await fetch('/api/test-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!response.ok) {
        const message = result.message || 'Failed to register student';
        setServerError(message);
        return;
      }

      setServerMessage(
        `Student registered: ${result.user.fullName} (${result.user.studentId})`
      );
      reset({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        studentId: '',
        program: '',
        semester: 1,
        cgpa: 0,
        phone: '',
        address: '',
        bio: '',
      });
    } catch (error) {
      console.error('Registration request failed', error);
      setServerError('Unexpected error. Check console for details.');
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 py-12 px-4">
      <Card className="w-full max-w-3xl bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Test Student Registration</CardTitle>
          <CardDescription className="text-gray-400">
            Quickly create student records for local or staging environments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className="bg-blue-500/10 text-blue-200">
              Testing Utility
            </Badge>
            <p className="text-sm text-gray-400">
              Records created here use a hashed password and default role of
              student.
            </p>
          </div>

          {serverMessage && (
            <div className="mb-6 flex items-center gap-3 rounded-md border border-emerald-700 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-200">
              <CheckCircle2 className="h-5 w-5" />
              <span>{serverMessage}</span>
            </div>
          )}

          {serverError && (
            <div className="mb-6 flex items-center gap-3 rounded-md border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-200">
              <AlertCircle className="h-5 w-5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="First Name" htmlFor="firstName" error={errors.firstName?.message}>
                <Input id="firstName" autoComplete="given-name" {...register('firstName')} />
              </Field>
              <Field label="Last Name" htmlFor="lastName" error={errors.lastName?.message}>
                <Input id="lastName" autoComplete="family-name" {...register('lastName')} />
              </Field>
              <Field label="Email" htmlFor="email" error={errors.email?.message}>
                <Input id="email" type="email" autoComplete="email" {...register('email')} />
              </Field>
              <Field label="Password" htmlFor="password" error={errors.password?.message}>
                <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
              </Field>
              <Field label="Student ID" htmlFor="studentId" error={errors.studentId?.message}>
                <Input id="studentId" {...register('studentId')} />
              </Field>
              <Field label="Program" htmlFor="program" error={errors.program?.message}>
                <Input id="program" placeholder="BS Computer Science" {...register('program')} />
              </Field>
              <Field label="Semester" htmlFor="semester" error={errors.semester?.message}>
                <Input id="semester" type="number" min={1} max={12} {...register('semester')} />
              </Field>
              <Field label="CGPA" htmlFor="cgpa" error={errors.cgpa?.message}>
                <Input id="cgpa" type="number" step="0.01" min={0} max={4} {...register('cgpa')} />
              </Field>
              <Field label="Phone" htmlFor="phone" error={errors.phone?.message} optional>
                <Input id="phone" placeholder="Optional" {...register('phone')} />
              </Field>
              <Field label="Address" htmlFor="address" error={errors.address?.message} optional>
                <Input id="address" placeholder="Optional" {...register('address')} />
              </Field>
            </div>

            <Field label="Bio" htmlFor="bio" error={errors.bio?.message} optional>
              <Textarea id="bio" rows={3} placeholder="Short bio (optional)" {...register('bio')} />
            </Field>

            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => reset()}
                disabled={isSubmitting}
              >
                Clear
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
                {isSubmitting ? 'Registering...' : 'Register Student'}
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
  children: ReactNode;
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
