import {z} from 'zod':

export const SignUpSchema = z.object({
   email: z.string().email(),
   password: z.string().min(8),
});

export const LoginSchema = z.object({
   email: z.string().email(),
   password: z.string().min(1),
});

export type SignUpInput = z.infer<typeof SignUpSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
