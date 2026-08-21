import { z } from 'zod';

export const createPostSchema = z.object({
   title: z.string({ error: 'Title is required' }).min(1).max(100),
   description: z.string().max(2000).optional(),
   categoryId: z.string({ error: 'Category is required' }),
   tags: z.array(z.string().min(1).max(30)).max(10).default([]),
   images: z
      .array(
         z.object({
            imageUrl: z.string({ error: 'Image URL is required' }),
            publicId: z.string({ error: 'Public ID is required' }),
            order: z.number().int().min(0),
         }),
      )
      .min(1, { error: 'At least one image is required' })
      .max(10),
});

export const postImageSchema = z.object({
   id: z.string(),
   imageUrl: z.string(),
   publicId: z.string(),
   order: z.number(),
   createdAt: z.date(),
});

export const postSchema = z.object({
   id: z.string(),
   profileId: z.string(),
   title: z.string(),
   description: z.string().nullable(),
   categoryId: z.string(),
   createdAt: z.date(),
   updatedAt: z.date(),
   images: z.array(postImageSchema),
   category: z.object({ id: z.string(), name: z.string(), slug: z.string() }),
   tags: z.array(
      z.object({ id: z.string(), name: z.string(), slug: z.string() }),
   ),
});

export const postSummarySchema = z.object({
   id: z.string(),
   title: z.string(),
   categoryId: z.string(),
   createdAt: z.date(),
   coverImage: postImageSchema,
   category: z.object({ id: z.string(), name: z.string(), slug: z.string() }),
   tags: z.array(
      z.object({ id: z.string(), name: z.string(), slug: z.string() }),
   ),
});

export type Post = z.infer<typeof postSchema>;
export type PostSummary = z.infer<typeof postSummarySchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
