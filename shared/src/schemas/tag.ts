import z from 'zod';

export const MAX_TAGS = 5;

export const normalizeTag = (t: string) =>
   t.trim().toLowerCase().replace(/\s+/g, '-');

export const tagInput = z.object({
   query: z.string().trim().min(1).max(30).transform(normalizeTag),
});
