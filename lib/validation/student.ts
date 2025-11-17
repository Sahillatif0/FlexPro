import { z } from 'zod';

export const registerStudentSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(64, 'Password must be at most 64 characters'),
  studentId: z.string().min(3, 'Student ID must be at least 3 characters'),
  program: z.string().min(2, 'Program must be at least 2 characters'),
  semester: z
    .coerce
    .number({ invalid_type_error: 'Semester must be a number' })
    .int('Semester must be a whole number')
    .min(1, 'Semester must be at least 1')
    .max(12, 'Semester cannot exceed 12'),
  cgpa: z
    .coerce
    .number({ invalid_type_error: 'CGPA must be a number' })
    .min(0, 'CGPA cannot be negative')
    .max(4, 'CGPA cannot exceed 4.0'),
  phone: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value : undefined)),
  address: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value : undefined)),
  bio: z
    .string()
    .optional()
    .transform((value) => (value?.trim() ? value : undefined)),
});

export type RegisterStudentInput = z.infer<typeof registerStudentSchema>;
