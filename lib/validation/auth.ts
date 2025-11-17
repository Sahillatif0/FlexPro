import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Student ID or email is required')
    .max(100, 'Identifier is too long'),
  password: z
    .string()
});

export type LoginInput = z.infer<typeof loginSchema>;
