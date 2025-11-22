import { z } from "zod";

const optionalNonEmptyString = () =>
  z
    .string()
    .trim()
    .transform((value) => (value.length ? value : undefined))
    .optional();

const optionalEmail = () =>
  optionalNonEmptyString().superRefine((value, ctx) => {
    if (!value) {
      return;
    }
    const parsed = z.string().email().safeParse(value);
    if (!parsed.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid email address" });
    }
  });

export const adminStudentRegistrationSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(64, "Password must be at most 64 characters"),
  studentId: z.string().min(3, "Student ID must be at least 3 characters"),
  program: z.string().min(2, "Program must be at least 2 characters"),
  semester: z
    .coerce
    .number({ invalid_type_error: "Semester must be a number" })
    .int("Semester must be a whole number")
    .min(1, "Semester must be at least 1")
    .max(12, "Semester cannot exceed 12"),
  section: optionalNonEmptyString(),
  cgpa: z
    .coerce
    .number({ invalid_type_error: "CGPA must be a number" })
    .min(0, "CGPA cannot be negative")
    .max(4, "CGPA cannot exceed 4.0"),
  phone: optionalNonEmptyString(),
  address: optionalNonEmptyString(),
  bio: optionalNonEmptyString(),
});

export const adminStudentUpdateSchema = z
  .object({
    firstName: optionalNonEmptyString(),
    lastName: optionalNonEmptyString(),
    email: optionalEmail(),
    studentId: optionalNonEmptyString(),
    program: optionalNonEmptyString(),
    semester: z
      .coerce
      .number({ invalid_type_error: "Semester must be a number" })
      .int("Semester must be a whole number")
      .min(1, "Semester must be at least 1")
      .max(12, "Semester cannot exceed 12")
      .optional(),
    section: optionalNonEmptyString(),
    cgpa: z
      .coerce
      .number({ invalid_type_error: "CGPA must be a number" })
      .min(0, "CGPA cannot be negative")
      .max(4, "CGPA cannot exceed 4.0")
      .optional(),
    phone: optionalNonEmptyString(),
    address: optionalNonEmptyString(),
    bio: optionalNonEmptyString(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Provide at least one field to update",
  });

export const adminFacultyRegistrationSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(64, "Password must be at most 64 characters"),
  employeeId: z.string().min(3, "Employee ID must be at least 3 characters"),
  department: z.string().min(2, "Department must be at least 2 characters"),
  phone: optionalNonEmptyString(),
  address: optionalNonEmptyString(),
  bio: optionalNonEmptyString(),
});

export const adminFacultyUpdateSchema = z
  .object({
    firstName: optionalNonEmptyString(),
    lastName: optionalNonEmptyString(),
    email: optionalEmail(),
    employeeId: optionalNonEmptyString(),
    department: optionalNonEmptyString(),
    phone: optionalNonEmptyString(),
    address: optionalNonEmptyString(),
    bio: optionalNonEmptyString(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Provide at least one field to update",
  });

export const adminNotificationSchema = z.object({
  audience: z.enum(["students", "faculty", "all"]),
  title: z.string().min(3, "Title must be at least 3 characters").max(120, "Title is too long"),
  message: z.string().min(5, "Message must be at least 5 characters").max(2000, "Message is too long"),
  type: z.enum(["info", "success", "warning", "error"]).default("info"),
});

export type AdminStudentRegistrationInput = z.infer<typeof adminStudentRegistrationSchema>;
export type AdminStudentUpdateInput = z.infer<typeof adminStudentUpdateSchema>;
export type AdminFacultyRegistrationInput = z.infer<typeof adminFacultyRegistrationSchema>;
export type AdminFacultyUpdateInput = z.infer<typeof adminFacultyUpdateSchema>;
export type AdminNotificationInput = z.infer<typeof adminNotificationSchema>;
