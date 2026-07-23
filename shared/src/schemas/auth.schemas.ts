import { z } from 'zod';

export const emailSchema = z
   .email('Please enter a valid email address')
   .toLowerCase()
   .trim();

export const otpSchema = z
   .string()
   .length(6, 'Code must be 6 digits')
   .regex(/^\d+$/, 'Code must contain only numbers');

export const sendOtpSchema = z.object({
   email: emailSchema,
});

export const verifyOtpSchema = z.object({
   email: emailSchema,
   code: otpSchema,
});

// Shape of BetterAuth's user object (mirrors the DB schema)
export const authUserSchema = z.object({
   id: z.string(),
   name: z.string(),
   email: z.email(),
   emailVerified: z.boolean(),
   image: z.url().nullable().optional(),
   createdAt: z.coerce.date(),
   updatedAt: z.coerce.date(),
});

export type AuthUser = z.infer<typeof authUserSchema>;
