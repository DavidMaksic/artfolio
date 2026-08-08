import { z } from 'zod';

const RESERVED_USERNAMES = [
   'admin',
   'me',
   'settings',
   'profile',
   'edit',
   'explore',
   'feed',
   'login',
   'logout',
   'signup',
   'verify',
   'api',
   'static',
   'help',
   'about',
   'terms',
   'privacy',
   'support',
];

export const usernameSchema = z
   .string()
   .min(3, { error: 'Username must be at least 3 characters' })
   .max(32, { error: 'Username must be at most 32 characters' })
   .regex(
      /^[a-z0-9_]+$/,
      'Username can only contain lowercase letters, numbers, and underscores',
   )
   .refine(
      (val) => !RESERVED_USERNAMES.includes(val),
      'This username is reserved',
   );

export const updateProfileSchema = z.object({
   username: usernameSchema.optional(),
   displayName: z.string().min(1).max(64).optional(),
   bio: z.string().max(500).optional(),
   location: z.string().max(100).optional(),
   website: z
      .union([z.url({ error: 'Must be a valid URL' }), z.literal('')])
      .optional(),
   availableForCommissions: z.boolean().optional(),
   profileImageUrl: z.url().optional(),
});

export const profileSchema = z.object({
   id: z.string(),
   userId: z.string(),
   username: z.string(),
   displayName: z.string().nullable(),
   bio: z.string().nullable(),
   profileImageUrl: z.string().nullable(),
   location: z.string().nullable(),
   website: z.string().nullable(),
   availableForCommissions: z.boolean(),
   createdAt: z.date(),
   updatedAt: z.date(),
});

export type Profile = z.infer<typeof profileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
