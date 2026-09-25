import {
   getCommentsSchema,
   deleteCommentSchema,
   createCommentSchema,
   updateCommentSchema,
} from '@artfolio/shared';
import { getProfileByUserId, getViewerProfileId } from '@/trpc/helpers.js';
import { like, bookmark, comment, postImage } from '@/db/schema/post.js';
import { and, eq, lt, desc, asc, ne } from 'drizzle-orm';
import { protectedProcedure } from '@/trpc/middleware.js';
import { TRPCError } from '@trpc/server';
import { db } from '@/db/index.js';
import { t } from '@/trpc/init.js';
import { z } from 'zod';

const getLatestDiscussionsSchema = z.object({
   limit: z.number().min(1).max(10).default(5),
   cursor: z.string().optional(),
});

export const engagementRouter = t.router({
   toggleLike: protectedProcedure
      .input(z.object({ postId: z.string() }))
      .mutation(async ({ ctx, input }) => {
         const profile = await getProfileByUserId(ctx.user.id);

         const existing = await db.query.like.findFirst({
            where: and(
               eq(like.postId, input.postId),
               eq(like.profileId, profile.id),
            ),
         });

         if (existing) {
            await db
               .delete(like)
               .where(
                  and(
                     eq(like.postId, input.postId),
                     eq(like.profileId, profile.id),
                  ),
               );
            return { liked: false };
         }

         await db.insert(like).values({
            postId: input.postId,
            profileId: profile.id,
            createdAt: new Date(),
         });
         return { liked: true };
      }),

   toggleBookmark: protectedProcedure
      .input(z.object({ postId: z.string() }))
      .mutation(async ({ ctx, input }) => {
         const profile = await getProfileByUserId(ctx.user.id);

         const existing = await db.query.bookmark.findFirst({
            where: and(
               eq(bookmark.postId, input.postId),
               eq(bookmark.profileId, profile.id),
            ),
         });

         if (existing) {
            await db
               .delete(bookmark)
               .where(
                  and(
                     eq(bookmark.postId, input.postId),
                     eq(bookmark.profileId, profile.id),
                  ),
               );
            return { bookmarked: false };
         }

         await db.insert(bookmark).values({
            postId: input.postId,
            profileId: profile.id,
            createdAt: new Date(),
         });
         return { bookmarked: true };
      }),

   getComments: t.procedure
      .input(getCommentsSchema)
      .query(async ({ input }) => {
         const { postId, limit, cursor } = input;

         const rows = await db.query.comment.findMany({
            where: cursor
               ? and(
                    eq(comment.postId, postId),
                    lt(comment.createdAt, new Date(cursor)),
                 )
               : eq(comment.postId, postId),
            orderBy: [desc(comment.createdAt)],
            limit: limit + 1,
            with: {
               profile: {
                  columns: {
                     username: true,
                     displayName: true,
                     profileImageUrl: true,
                  },
               },
            },
         });

         let nextCursor: string | null = null;
         if (rows.length > limit) {
            const next = rows.pop()!;
            nextCursor = next.createdAt.toISOString();
         }

         return {
            items: rows.map((c) => ({
               id: c.id,
               postId: c.postId,
               body: c.body,
               createdAt: c.createdAt,
               profile: c.profile,
            })),
            nextCursor,
         };
      }),

   createComment: protectedProcedure
      .input(createCommentSchema)
      .mutation(async ({ ctx, input }) => {
         const profile = await getProfileByUserId(ctx.user.id);
         const now = new Date();
         const id = crypto.randomUUID();

         await db.insert(comment).values({
            id,
            postId: input.postId,
            profileId: profile.id,
            body: input.body,
            createdAt: now,
            updatedAt: now,
         });

         return {
            id,
            postId: input.postId,
            body: input.body,
            createdAt: now,
            profile: {
               username: profile.username,
               displayName: profile.displayName,
               profileImageUrl: profile.profileImageUrl,
            },
         };
      }),

   updateComment: protectedProcedure
      .input(updateCommentSchema)
      .mutation(async ({ ctx, input }) => {
         const profile = await getProfileByUserId(ctx.user.id);

         const existing = await db.query.comment.findFirst({
            where: eq(comment.id, input.commentId),
         });

         if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
         if (existing.profileId !== profile.id)
            throw new TRPCError({ code: 'FORBIDDEN' });

         await db
            .update(comment)
            .set({ body: input.body, updatedAt: new Date() })
            .where(eq(comment.id, input.commentId));

         return { id: input.commentId, body: input.body };
      }),

   deleteComment: protectedProcedure
      .input(deleteCommentSchema)
      .mutation(async ({ ctx, input }) => {
         const profile = await getProfileByUserId(ctx.user.id);

         const existing = await db.query.comment.findFirst({
            where: eq(comment.id, input.commentId),
            with: {
               post: { columns: { profileId: true } },
            },
         });

         if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

         const isCommentAuthor = existing.profileId === profile.id;
         const isPostOwner = existing.post.profileId === profile.id;

         if (!isCommentAuthor && !isPostOwner) {
            throw new TRPCError({ code: 'FORBIDDEN' });
         }

         await db.delete(comment).where(eq(comment.id, input.commentId));
      }),

   getLatestDiscussions: t.procedure
      .input(getLatestDiscussionsSchema)
      .query(async ({ ctx, input }) => {
         const { limit, cursor } = input;
         const viewerProfileId = await getViewerProfileId(ctx.user?.id ?? null);

         const comments = await db.query.comment.findMany({
            where: and(
               viewerProfileId
                  ? ne(comment.profileId, viewerProfileId)
                  : undefined,
               cursor ? lt(comment.createdAt, new Date(cursor)) : undefined,
            ),
            orderBy: [desc(comment.createdAt)],
            limit: limit + 1,
            with: {
               profile: {
                  columns: {
                     username: true,
                     displayName: true,
                     profileImageUrl: true,
                  },
               },
               post: {
                  with: {
                     images: {
                        orderBy: [asc(postImage.order)],
                        limit: 1,
                     },
                  },
               },
            },
         });

         let nextCursor: string | null = null;
         if (comments.length > limit) {
            const nextItem = comments.pop()!;
            nextCursor = nextItem.createdAt.toISOString();
         }

         return {
            items: comments.map((c) => ({
               id: c.id,
               body: c.body,
               postId: c.postId,
               coverImage: c.post.images[0]!,
               profile: {
                  username: c.profile.username,
                  displayName: c.profile.displayName,
                  profileImageUrl: c.profile.profileImageUrl,
               },
            })),
            nextCursor,
         };
      }),

   getCommentById: t.procedure
      .input(z.object({ commentId: z.string() }))
      .query(async ({ input }) => {
         const result = await db.query.comment.findFirst({
            where: eq(comment.id, input.commentId),
            with: {
               profile: {
                  columns: {
                     username: true,
                     displayName: true,
                     profileImageUrl: true,
                  },
               },
            },
         });

         if (!result)
            throw new TRPCError({
               code: 'NOT_FOUND',
               message: 'Comment not found',
            });

         return result;
      }),
});
