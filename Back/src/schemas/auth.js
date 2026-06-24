import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(100, 'name is too long'),
  email: z.string().trim().toLowerCase().email('email is invalid'),
  password: z.string().min(8, 'password must be at least 8 characters').max(128, 'password is too long'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('email is invalid'),
  password: z.string().min(1, 'password is required'),
});
