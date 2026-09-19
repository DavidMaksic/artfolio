import {
   getProfileByUsername,
   getViewerProfileId,
   getProfileByUserId,
   upsertTagsForPost,
   assertPostOwner,
} from '@/trpc/helpers.js';
import { deleteImage, generateUploadSignature } from '@/lib/cloudinary.js';
import { createPostSchema, updatePostSchema } from '@artfolio/shared';
import { category, post, postImage } from '@/db/schema/post.js';
import { protectedProcedure } from '@/trpc/middleware.js';
import { and, asc, desc, eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { db } from '@/db/index.js';
import { t } from '@/trpc/init.js';
import z from 'zod';
import { follow } from '@/db/schema/profile.js';

export const postRouter = t.router({
   create: protectedProcedure
      .input(createPostSchema)
      .mutation(async ({ ctx, input }) => {
         const userProfile = await getProfileByUserId(ctx.user.id);
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

            await upsertTagsForPost(tx, postId, input.tags);
         });

         return { id: postId };
      }),

   update: protectedProcedure
      .input(updatePostSchema)
      .mutation(async ({ ctx, input }) => {
         const userProfile = await getProfileByUserId(ctx.user.id);
         await assertPostOwner(input.id, userProfile.id);

         const now = new Date();

         // Fetch publicIds of removed images before the transaction
         // so we can clean up Cloudinary after
         const removedImages =
            input.removedImageIds.length > 0
               ? await db.query.postImage.findMany({
                    where: (pi, { inArray }) =>
                       inArray(pi.id, input.removedImageIds),
                 })
               : [];

         await db.transaction(async (tx) => {
            await tx
               .update(post)
               .set({
                  description: input.description ?? null,
                  categoryId: input.categoryId,
                  updatedAt: now,
               })
               .where(eq(post.id, input.id));

            // Full replace — delete all existing images and reinsert
            await tx.delete(postImage).where(eq(postImage.postId, input.id));
            await tx.insert(postImage).values(
               input.images.map((img) => ({
                  id: crypto.randomUUID(),
                  postId: input.id,
                  imageUrl: img.imageUrl,
                  publicId: img.publicId,
                  order: img.order,
                  width: img.width,
                  height: img.height,
                  createdAt: now,
               })),
            );

            await upsertTagsForPost(tx, input.id, input.tags);
         });

         // Fire-and-forget — don't block the response on Cloudinary
         if (removedImages.length > 0) {
            Promise.all(
               removedImages.map((img) => deleteImage(img.publicId)),
            ).catch(console.error);
         }

         return { id: input.id };
      }),

   delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
         const userProfile = await getProfileByUserId(ctx.user.id);
         await assertPostOwner(input.id, userProfile.id);

         // Fetch images before deletion for Cloudinary cleanup
         const images = await db.query.postImage.findMany({
            where: eq(postImage.postId, input.id),
         });

         // Cascade handles post_image and post_tag rows deletion
         await db.delete(post).where(eq(post.id, input.id));

         if (images.length > 0) {
            Promise.all(images.map((img) => deleteImage(img.publicId))).catch(
               console.error,
            );
         }

         return { id: input.id };
      }),

   getById: t.procedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
         const viewerProfileId = await getViewerProfileId(ctx.user?.id ?? null);

         const result = await db.query.post.findFirst({
            where: eq(post.id, input.id),
            with: {
               images: { orderBy: [asc(postImage.order)] },
               category: true,
               postTags: { with: { tag: true } },
               profile: true,
               likes: { columns: { profileId: true } },
               bookmarks: { columns: { profileId: true } },
               comments: { columns: { id: true } },
            },
         });

         if (!result) {
            throw new TRPCError({
               code: 'NOT_FOUND',
               message: 'Post not found',
            });
         }

         // Resolve follow state for the post author
         let userIsFollowing = false;
         if (viewerProfileId && viewerProfileId !== result.profileId) {
            const existingFollow = await db.query.follow.findFirst({
               where: and(
                  eq(follow.followerId, viewerProfileId),
                  eq(follow.followingId, result.profileId),
               ),
            });
            userIsFollowing = !!existingFollow;
         }

         return {
            id: result.id,
            profileId: result.profileId,
            description: result.description,
            categoryId: result.categoryId,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
            images: result.images,
            category: result.category,
            tags: result.postTags.map((pt) => pt.tag),
            profile: {
               username: result.profile.username,
               displayName: result.profile.displayName,
               profileImageUrl: result.profile.profileImageUrl,
               userIsFollowing,
            },
            likeCount: result.likes.length,
            bookmarkCount: result.bookmarks.length,
            commentCount: result.comments.length,
            userHasLiked: viewerProfileId
               ? result.likes.some((l) => l.profileId === viewerProfileId)
               : false,
            userHasBookmarked: viewerProfileId
               ? result.bookmarks.some((b) => b.profileId === viewerProfileId)
               : false,
         };
      }),

   getByUsername: t.procedure
      .input(z.object({ username: z.string() }))
      .query(async ({ input }) => {
         const userProfile = await getProfileByUsername(input.username);

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
            profileId: p.profileId,
            categoryId: p.categoryId,
            createdAt: p.createdAt,
            coverImage: p.images.sort((a, b) => a.order - b.order)[0]!,
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
