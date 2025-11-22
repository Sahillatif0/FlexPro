import { z } from "zod";

const optionalTrimmedString = (min: number, message: string) =>
  z
    .string()
    .trim()
    .min(min, message)
    .optional();

const optionalStringToNull = (max: number, field: string) =>
  z
    .string()
    .trim()
    .max(max, `${field} is too long`)
    .transform((value) => (value.length ? value : null))
    .optional();

export const adminCourseUpdateSchema = z
  .object({
    title: optionalTrimmedString(3, "Title must be at least 3 characters"),
    description: optionalStringToNull(2000, "Description"),
    department: optionalTrimmedString(2, "Department must be at least 2 characters"),
    creditHours: z
      .coerce
      .number({ invalid_type_error: "Credit hours must be a number" })
      .int("Credit hours must be a whole number")
      .min(1, "Credit hours must be at least 1")
      .max(6, "Credit hours cannot exceed 6")
      .optional(),
    semester: z
      .coerce
      .number({ invalid_type_error: "Semester must be a number" })
      .int("Semester must be a whole number")
      .min(1, "Semester must be at least 1")
      .max(12, "Semester cannot exceed 12")
      .optional(),
    maxCapacity: z
      .coerce
      .number({ invalid_type_error: "Capacity must be a number" })
      .int("Capacity must be a whole number")
      .min(5, "Capacity must be at least 5")
      .max(500, "Capacity cannot exceed 500")
      .optional(),
    prerequisite: optionalStringToNull(255, "Prerequisite"),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Provide at least one field to update",
  });

export type AdminCourseUpdateInput = z.infer<typeof adminCourseUpdateSchema>;
