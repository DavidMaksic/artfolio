import { createPostSchema, getPostsByUsernameSchema } from '@artfolio/shared';
import { category, post, postImage, postTag, tag } from '@/db/schema/post.js';
import { generateUploadSignature } from '@/lib/cloudinary.js';
import { protectedProcedure } from '@/trpc/middleware.js';
import { TRPCError } from '@trpc/server';
import { desc, eq } from 'drizzle-orm';
import { profile } from '@/db/schema/profile.js';
import { db } from '@/db/index.js';
import { t } from '@/trpc/init.js';

export const postRouter = t.router({
   create: protectedProcedure
      .input(createPostSchema)
      .mutation(async ({ ctx, input }) => {
         const userProfile = await db.query.profile.findFirst({
            where: eq(profile.userId, ctx.user.id),
         });

         if (!userProfile) {
            throw new TRPCError({
               code: 'NOT_FOUND',
               message: 'Profile not found',
            });
         }

         const postId = crypto.randomUUID();
         const now = new Date();

         await db.transaction(async (tx) => {
            await tx.insert(post).values({
               id: postId,
               profileId: userProfile.id,
               description: input.description ?? null,
               categoryId: input.categoryId,
               createdAt: now,
               updatedAt: now,
            });

            if (input.images.length > 0) {
               await tx.insert(postImage).values(
                  input.images.map((img) => ({
                     id: crypto.randomUUID(),
                     postId,
                     imageUrl: img.imageUrl,
                     publicId: img.publicId,
                     order: img.order,
                     width: img.width,
                     height: img.height,
                     createdAt: now,
                  })),
               );
            }

            if (input.tags.length > 0) {
               for (const tagName of input.tags) {
                  const slug = tagName.toLowerCase().replace(/\s+/g, '-');
                  const existingTag = await tx.query.tag.findFirst({
                     where: eq(tag.slug, slug),
                  });

                  let tagId: string;

                  if (existingTag) {
                     tagId = existingTag.id;
                  } else {
                     tagId = crypto.randomUUID();
                     await tx
                        .insert(tag)
                        .values({ id: tagId, name: tagName, slug });
                  }

                  await tx.insert(postTag).values({ postId, tagId });
               }
            }
         });

         return { id: postId };
      }),

   getByUsername: t.procedure
      .input(getPostsByUsernameSchema)
      .query(async ({ input }) => {
         const userProfile = await db.query.profile.findFirst({
            where: eq(profile.username, input.username),
         });

         if (!userProfile) {
            throw new TRPCError({
               code: 'NOT_FOUND',
               message: 'Profile not found',
            });
         }

         const posts = await db.query.post.findMany({
            where: eq(post.profileId, userProfile.id),
            orderBy: [desc(post.createdAt)],
            with: {
               images: true,
               category: true,
               postTags: {
                  with: { tag: true },
               },
            },
         });

         const items = posts.map((p) => ({
            id: p.id,
            categoryId: p.categoryId,
            createdAt: p.createdAt,
            coverImage: p.images.sort((a, b) => a.order - b.order)[0],
            description: p.description,
            imageCount: p.images.length,
            category: p.category,
            tags: p.postTags.map((pt) => pt.tag),
         }));

         return { items };
      }),

   getCategories: t.procedure.query(async () => {
      return db.select().from(category).orderBy(category.name);
   }),

   getPostImageUploadSignature: protectedProcedure.mutation(() => {
      return generateUploadSignature('posts');
   }),
});
