import { category, postTag, tag } from '@/db/schema/post.js';
import { eq, desc, sql, ilike } from 'drizzle-orm';
import { tagInput } from '@artfolio/shared';
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
         .limit(3);

      return { tags: results };
   }),

   getCategories: t.procedure.query(async () => {
      return db
         .select()
         .from(category)
         .orderBy(
            sql`CASE WHEN ${category.slug} = 'other' THEN 1 ELSE 0 END`,
            category.name,
         );
   }),

   search: t.procedure.input(tagInput).query(async ({ input }) => {
      const escaped = input.query.replace(/[\\%_]/g, '\\$&');

      const results = await db
         .select({
            id: tag.id,
            name: tag.name,
            slug: tag.slug,
            count: count(postTag.postId),
         })
         .from(tag)
         .leftJoin(postTag, eq(tag.id, postTag.tagId))
         .where(ilike(tag.name, `${escaped}%`))
         .groupBy(tag.id, tag.name, tag.slug)
         .orderBy(desc(count(postTag.postId)), tag.name)
         .limit(8);

      return { tags: results };
   }),
});
