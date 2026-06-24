import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es requerido').max(100, 'Máximo 100 caracteres'),
  email: z.string().trim().email('Email inválido').max(255, 'Máximo 255 caracteres'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});
