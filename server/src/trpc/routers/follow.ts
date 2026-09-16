import { getFollowsInputSchema } from '@artfolio/shared';
import { getViewerProfileId } from '@/trpc/helpers.js';
import { eq, and, desc, lt } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { follow } from '@/db/schema/profile.js';
import { db } from '@/db/index.js';
import { t } from '@/trpc/init.js';
import { z } from 'zod';

export const followRouter = t.router({
   toggleFollow: t.procedure
      .input(z.object({ followingId: z.string() }))
      .mutation(async ({ ctx, input }) => {
         const viewerProfileId = await getViewerProfileId(ctx.user?.id ?? null);
         if (!viewerProfileId) throw new TRPCError({ code: 'UNAUTHORIZED' });

         if (viewerProfileId === input.followingId) {
            throw new TRPCError({
               code: 'BAD_REQUEST',
               message: 'Cannot follow yourself',
            });
         }

         const existing = await db.query.follow.findFirst({
            where: and(
               eq(follow.followerId, viewerProfileId),
               eq(follow.followingId, input.followingId),
            ),
         });

         if (existing) {
            await db
               .delete(follow)
               .where(
                  and(
                     eq(follow.followerId, viewerProfileId),
                     eq(follow.followingId, input.followingId),
                  ),
               );
            return { following: false };
         }

         await db.insert(follow).values({
            followerId: viewerProfileId,
            followingId: input.followingId,
         });
         return { following: true };
      }),

   getFollowers: t.procedure
      .input(getFollowsInputSchema)
      .query(async ({ input }) => {
         const { profileId, limit, cursor } = input;

         const rows = await db.query.follow.findMany({
            where: and(
               eq(follow.followingId, profileId),
               cursor ? lt(follow.createdAt, new Date(cursor)) : undefined,
            ),
            orderBy: [desc(follow.createdAt)],
            limit: limit + 1,
            with: {
               follower: {
                  columns: {
                     id: true,
                     username: true,
                     displayName: true,
                     profileImageUrl: true,
                  },
               },
            },
         });

         let nextCursor: string | null = null;
         if (rows.length > limit) {
            const nextItem = rows.pop()!;
            nextCursor = nextItem.createdAt.toISOString();
         }

         return { items: rows.map((r) => r.follower), nextCursor };
      }),

   getFollowing: t.procedure
      .input(getFollowsInputSchema)
      .query(async ({ input }) => {
         const { profileId, limit, cursor } = input;

         const rows = await db.query.follow.findMany({
            where: and(
               eq(follow.followerId, profileId),
               cursor ? lt(follow.createdAt, new Date(cursor)) : undefined,
            ),
            orderBy: [desc(follow.createdAt)],
            limit: limit + 1,
            with: {
               followed: {
                  columns: {
                     id: true,
                     username: true,
                     displayName: true,
                     profileImageUrl: true,
                  },
               },
            },
         });

         let nextCursor: string | null = null;
         if (rows.length > limit) {
            const nextItem = rows.pop()!;
            nextCursor = nextItem.createdAt.toISOString();
         }

         return { items: rows.map((r) => r.followed), nextCursor };
      }),
});
