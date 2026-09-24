import {
   getProfileByUsername,
   getViewerProfileId,
   getProfileByUserId,
   upsertTagsForPost,
   assertPostOwner,
} from '@/trpc/helpers.js';
import {
   searchInputSchema,
   createPostSchema,
   updatePostSchema,
} from '@artfolio/shared';
import {
   postImage,
   category,
   postTag,
   like,
   post,
   tag,
} from '@/db/schema/post.js';
import { and, asc, count, desc, eq, ilike, inArray, lt, or } from 'drizzle-orm';
import { deleteImage, generateUploadSignature } from '@/lib/cloudinary.js';
import { protectedProcedure } from '@/trpc/middleware.js';
import { follow, profile } from '@/db/schema/profile.js';
import { TRPCError } from '@trpc/server';
import { db } from '@/db/index.js';
import { t } from '@/trpc/init.js';
import z from 'zod';

function mapSearchPost(p: any) {
   return {
      id: p.id,
      profileId: p.profileId,
      categoryId: p.categoryId,
      createdAt: p.createdAt,
      coverImage: p.images.sort((a: any, b: any) => a.order - b.order)[0]!,
      description: p.description,
      imageCount: p.images.length,
      category: p.category,
      tags: p.postTags.map((pt: any) => pt.tag),
      profile: {
         username: p.profile.username,
         displayName: p.profile.displayName,
         profileImageUrl: p.profile.profileImageUrl,
         userIsFollowing: false,
      },
   };
}

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
         console.log(input.tags);

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

   search: t.procedure.input(searchInputSchema).query(async ({ input }) => {
      const { query, limit, cursor, sort, category: categorySlug } = input;

      // resolve selected category filter
      const selectedCategoryId = categorySlug
         ? (
              await db.query.category.findFirst({
                 where: eq(category.slug, categorySlug),
                 columns: { id: true },
              })
           )?.id
         : undefined;

      const selectedCategoryFilter = selectedCategoryId
         ? eq(post.categoryId, selectedCategoryId)
         : undefined;

      const term = `%${query}%`;

      const [tagMatches, categoryMatches, profileMatches] = await Promise.all([
         db
            .select({ postId: postTag.postId })
            .from(postTag)
            .innerJoin(tag, eq(postTag.tagId, tag.id))
            .where(ilike(tag.name, term)),

         db
            .select({ id: category.id })
            .from(category)
            .where(ilike(category.name, term)),

         db
            .select({ id: profile.id })
            .from(profile)
            .where(
               or(
                  ilike(profile.username, term),
                  ilike(profile.displayName, term),
               ),
            ),
      ]);

      const tagPostIds = tagMatches.map((r) => r.postId);
      const matchingCategoryIds = categoryMatches.map((r) => r.id);
      const matchingProfileIds = profileMatches.map((r) => r.id);

      const matchWhere = or(
         ilike(post.description, term),
         tagPostIds.length > 0 ? inArray(post.id, tagPostIds) : undefined,
         matchingCategoryIds.length > 0
            ? inArray(post.categoryId, matchingCategoryIds)
            : undefined,
         matchingProfileIds.length > 0
            ? inArray(post.profileId, matchingProfileIds)
            : undefined,
      );

      const fullWhere = and(matchWhere, selectedCategoryFilter);

      if (sort === 'popular') {
         const offset = cursor ? parseInt(cursor) : 0;

         const results = await db
            .select({
               postId: post.id,
               likeCount: count(like.profileId),
            })
            .from(post)
            .leftJoin(like, eq(like.postId, post.id))
            .where(fullWhere)
            .groupBy(post.id)
            .orderBy(desc(count(like.profileId)), desc(post.createdAt))
            .limit(limit + 1)
            .offset(offset);

         const hasMore = results.length > limit;
         const page = hasMore ? results.slice(0, limit) : results;
         const postIds = page.map((r) => r.postId);

         const posts =
            postIds.length > 0
               ? await db.query.post.findMany({
                    where: inArray(post.id, postIds),
                    with: {
                       images: true,
                       category: true,
                       postTags: { with: { tag: true } },
                       profile: {
                          columns: {
                             username: true,
                             displayName: true,
                             profileImageUrl: true,
                          },
                       },
                    },
                 })
               : [];

         const sorted = postIds.map((id) => posts.find((p) => p.id === id)!);

         return {
            items: sorted.map((p) => mapSearchPost(p)),
            nextCursor: hasMore ? String(offset + limit) : null,
         };
      }

      const results = await db.query.post.findMany({
         where: and(
            cursor ? lt(post.createdAt, new Date(cursor)) : undefined,
            fullWhere,
         ),
         orderBy: [desc(post.createdAt)],
         limit: limit + 1,
         with: {
            images: true,
            category: true,
            postTags: { with: { tag: true } },
            profile: {
               columns: {
                  username: true,
                  displayName: true,
                  profileImageUrl: true,
               },
            },
         },
      });

      const hasMore = results.length > limit;
      const page = hasMore ? results.slice(0, limit) : results;

      const lastItem = page[page.length - 1];
      const nextCursor =
         hasMore && lastItem ? lastItem.createdAt.toISOString() : null;

      return {
         items: page.map((p) => mapSearchPost(p)),
         nextCursor,
      };
   }),

   getPostImageUploadSignature: protectedProcedure.mutation(() => {
      return generateUploadSignature('posts');
   }),
});
