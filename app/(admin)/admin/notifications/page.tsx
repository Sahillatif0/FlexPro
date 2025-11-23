"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  adminNotificationSchema,
  type AdminNotificationInput,
} from "@/lib/validation/admin";
import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";

const audienceOptions: { label: string; value: AdminNotificationInput["audience"]; hint: string }[] = [
  { label: "All users", value: "all", hint: "Students and faculty" },
  { label: "Students", value: "students", hint: "Undergraduate and graduate" },
  { label: "Faculty", value: "faculty", hint: "Teaching staff" },
];

const typeOptions: { label: string; value: AdminNotificationInput["type"]; accent: string }[] = [
  { label: "Informational", value: "info", accent: "text-blue-300" },
  { label: "Success", value: "success", accent: "text-emerald-300" },
  { label: "Warning", value: "warning", accent: "text-amber-300" },
  { label: "Critical", value: "error", accent: "text-rose-300" },
];

export default function AdminNotificationsPage() {
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<AdminNotificationInput>({
    resolver: zodResolver(adminNotificationSchema),
    defaultValues: {
      audience: "all",
      type: "info",
      title: "",
      message: "",
    },
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = result?.message ?? "Unable to send notification";
        setServerError(message);
        return;
      }

      toast({
        title: "Notification sent",
        description: result?.message ?? "Your announcement has been delivered.",
      });

      reset({
        audience: values.audience,
        type: "info",
        title: "",
        message: "",
      });
    } catch (error) {
      console.error("Notification dispatch failed", error);
      setServerError("Unexpected error. Check console for details.");
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-white">Broadcast Notification</h1>
          <p className="text-sm text-gray-400">
            Reach students and faculty with campus-wide announcements and critical alerts.
          </p>
        </div>
        <Badge variant="secondary" className="bg-purple-500/10 text-purple-200">
          Communications
        </Badge>
      </div>

      {serverError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to send message</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-purple-400" />
            Compose announcement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Controller
                name="audience"
                control={control}
                render={({ field }) => (
                  <Field
                    label="Audience"
                    htmlFor="audience"
                    error={errors.audience?.message}
                    description={
                      audienceOptions.find((option) => option.value === field.value)?.hint
                    }
                  >
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="audience" className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Select audience" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 text-gray-100">
                        {audienceOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />

              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Field
                    label="Notification tone"
                    htmlFor="type"
                    error={errors.type?.message}
                    description={
                      typeOptions.find((option) => option.value === field.value)?.label
                    }
                  >
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="type" className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 text-gray-100">
                        {typeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span className={option.accent}>{option.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            </div>

            <Field label="Subject" htmlFor="title" error={errors.title?.message}>
              <Input
                id="title"
                placeholder="Semester kick-off briefing"
                maxLength={120}
                {...register("title")}
              />
            </Field>

            <Field label="Message" htmlFor="message" error={errors.message?.message}>
              <Textarea
                id="message"
                rows={6}
                placeholder="Share the announcement details, timelines, and any required actions."
                maxLength={2000}
                {...register("message")}
              />
            </Field>

            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  reset({
                    audience: "all",
                    type: "info",
                    title: "",
                    message: "",
                  })
                }
                disabled={isSubmitting}
              >
                Clear
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSubmitting ? "Sending..." : "Send notification"}
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
  description?: string;
  children: React.ReactNode;
}

function Field({ label, htmlFor, error, description, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={htmlFor} className="text-gray-200">
          {label}
        </Label>
        {error ? <span className="text-xs text-red-300">{error}</span> : null}
      </div>
      {children}
      {description ? (
        <p className="text-xs text-gray-500">{description}</p>
      ) : null}
    </div>
  );
}
