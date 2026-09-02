import { post, postImage } from '@/db/schema/post.js';
import { feedInputSchema } from '@artfolio/shared';
import { desc, lt, asc } from 'drizzle-orm';
import { db } from '@/db/index.js';
import { t } from '@/trpc/init.js';

export const feedRouter = t.router({
   getFeed: t.procedure.input(feedInputSchema).query(async ({ input }) => {
      const { limit, cursor } = input;

      const posts = await db.query.post.findMany({
         where: cursor ? lt(post.createdAt, new Date(cursor)) : undefined,
         orderBy: [desc(post.createdAt)],
         limit: limit + 1, // fetch one extra to know if a next page exists
         with: {
            images: { orderBy: [asc(postImage.order)] },
            category: true,
            postTags: { with: { tag: true } },
            profile: true,
         },
      });

      let nextCursor: string | null = null;
      if (posts.length > limit) {
         const nextItem = posts.pop()!;
         nextCursor = nextItem.createdAt.toISOString();
      }

      const items = posts.map((p) => ({
         id: p.id,
         categoryId: p.categoryId,
         createdAt: p.createdAt,
         coverImage: p.images[0],
         description: p.description,
         imageCount: p.images.length,
         category: p.category,
         tags: p.postTags.map((pt) => pt.tag),
         profile: {
            username: p.profile.username,
            displayName: p.profile.displayName,
            profileImageUrl: p.profile.profileImageUrl,
         },
      }));

      return { items, nextCursor };
   }),
});
