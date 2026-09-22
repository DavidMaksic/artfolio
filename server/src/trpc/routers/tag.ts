import { category, postTag, tag } from '@/db/schema/post.js';
import { eq, desc } from 'drizzle-orm';
import { count } from 'drizzle-orm';
import { db } from '@/db/index.js';
import { t } from '@/trpc/init.js';

export const tagRouter = t.router({
   getTrending: t.procedure.query(async () => {
      const results = await db
         .select({
            id: tag.id,
            name: tag.name,
            slug: tag.slug,
            count: count(postTag.postId),
         })
         .from(tag)
         .innerJoin(postTag, eq(tag.id, postTag.tagId))
         .groupBy(tag.id, tag.name, tag.slug)
         .orderBy(desc(count(postTag.postId)))
         .limit(8);

      return { tags: results };
   }),

   getCategories: t.procedure.query(async () => {
      return db.select().from(category).orderBy(category.name);
   }),
});
