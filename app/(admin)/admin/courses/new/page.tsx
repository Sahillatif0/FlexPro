"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, BookMarked, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const departments = [
  "Computer Science",
  "Electrical Engineering",
  "Mathematics",
  "Management Sciences",
  "Humanities",
];

export default function AdminCreateCoursePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    title: "",
    description: "",
    creditHours: "3",
    department: departments[0],
    semester: "1",
    prerequisite: "",
    maxCapacity: "40",
    sections: "",
  });

  const disabled = useMemo(() => {
    return !form.code.trim() || !form.title.trim() || Number(form.creditHours) <= 0;
  }, [form.code, form.title, form.creditHours]);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving || disabled) {
      return;
    }

    const payload = {
      code: form.code.trim().toUpperCase(),
      title: form.title.trim(),
      description: form.description.trim(),
      creditHours: Number(form.creditHours) || 0,
      department: form.department,
      semester: Number(form.semester) || 1,
      prerequisite: form.prerequisite.trim() || null,
      maxCapacity: Number(form.maxCapacity) || 40,
      sections: form.sections
        .split(",")
        .map((value) => value.trim())
        .filter((value, index, array) => value.length > 0 && array.indexOf(value) === index),
    };

    try {
      setIsSaving(true);
      setError(null);
      const response = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message ?? "Unable to create course");
      }

      toast({
        title: "Course created",
        description: `${payload.code} has been added successfully.`,
      });
      router.push("/admin/courses");
    } catch (err: any) {
      setError(err?.message ?? "Unexpected error while creating the course");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase text-purple-300">Course Builder</p>
          <h1 className="text-2xl font-semibold text-white">Add a New Course</h1>
          <p className="text-sm text-gray-400">
            Publish a fresh offering, configure default sections, and set enrollment capacity in one place.
          </p>
        </div>
        <Button
          variant="outline"
          className="border-gray-700 text-gray-200 hover:text-white"
          asChild
        >
          <Link href="/admin/courses">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to catalog
          </Link>
        </Button>
      </div>

      <Alert className="border-purple-500/40 bg-purple-500/10 text-purple-100">
        <Info className="h-4 w-4" />
        <AlertTitle>Launch tip</AlertTitle>
        <AlertDescription>
          You can add more sections or assign instructors later from the course drawer. Keep descriptions concise so they surface well in the student portal.
        </AlertDescription>
      </Alert>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <BookMarked className="h-5 w-5 text-purple-400" />
            Course details
          </CardTitle>
          <CardDescription className="text-gray-400">
            Provide the foundational information that appears throughout the student enrollment journey.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-gray-300">Course code</label>
                <Input
                  value={form.code}
                  onChange={(event) => handleChange("code", event.target.value)}
                  placeholder="CS-450"
                  className="bg-gray-800 border-gray-700 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-300">Course title</label>
                <Input
                  value={form.title}
                  onChange={(event) => handleChange("title", event.target.value)}
                  placeholder="Advanced Topics in AI"
                  className="bg-gray-800 border-gray-700 text-white"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-300">Overview</label>
              <Textarea
                value={form.description}
                onChange={(event) => handleChange("description", event.target.value)}
                placeholder="Describe the course objectives and expected learning outcomes."
                className="bg-gray-800 border-gray-700 text-white"
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-gray-300">Credit hours</label>
                <Input
                  type="number"
                  min="1"
                  value={form.creditHours}
                  onChange={(event) => handleChange("creditHours", event.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-300">Semester</label>
                <Input
                  type="number"
                  min="1"
                  max="12"
                  value={form.semester}
                  onChange={(event) => handleChange("semester", event.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-gray-300">Department</label>
                <Select
                  value={form.department}
                  onValueChange={(value) => handleChange("department", value)}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-800 text-white">
                    {departments.map((department) => (
                      <SelectItem key={department} value={department}>
                        {department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-300">Capacity</label>
                <Input
                  type="number"
                  min="10"
                  value={form.maxCapacity}
                  onChange={(event) => handleChange("maxCapacity", event.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-300">Prerequisites</label>
              <Input
                value={form.prerequisite}
                onChange={(event) => handleChange("prerequisite", event.target.value)}
                placeholder="CS-301, MT-205"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-300">Initial sections</label>
              <Input
                value={form.sections}
                onChange={(event) => handleChange("sections", event.target.value)}
                placeholder="Section A, Section B"
                className="bg-gray-800 border-gray-700 text-white"
              />
              <p className="text-xs text-gray-500">Use commas to add multiple sections in one go.</p>
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to create course</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                className="text-gray-300 hover:text-white"
                onClick={() => setForm({
                  code: "",
                  title: "",
                  description: "",
                  creditHours: "3",
                  department: departments[0],
                  semester: "1",
                  prerequisite: "",
                  maxCapacity: "40",
                  sections: "",
                })}
                disabled={isSaving}
              >
                Clear form
              </Button>
              <Button
                type="submit"
                className="bg-purple-600 text-white hover:bg-purple-700"
                disabled={isSaving || disabled}
              >
                {isSaving ? "Saving..." : "Create course"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
