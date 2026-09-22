import {
   lt,
   eq,
   and,
   asc,
   desc,
   count,
   inArray,
   notInArray,
} from 'drizzle-orm';
import { exploreInputSchema, feedInputSchema } from '@artfolio/shared';
import { category, like, post, postImage } from '@/db/schema/post.js';
import { getViewerProfileId } from '@/trpc/helpers.js';
import { TRPCError } from '@trpc/server';
import { follow } from '@/db/schema/profile.js';
import { db } from '@/db/index.js';
import { t } from '@/trpc/init.js';

// Shared eager load shape — keeps all three procedures consistent
const postWith = {
   images: { orderBy: [asc(postImage.order)] },
   category: true as const,
   postTags: { with: { tag: true as const } },
   profile: true as const,
   likes: { columns: { profileId: true as const } },
   bookmarks: { columns: { profileId: true as const } },
   comments: { columns: { id: true as const } },
};

// Shared mapping — call with userIsFollowing resolved per-procedure
function mapPost(
   p: any,
   viewerProfileId: string | null,
   userIsFollowing: boolean,
) {
   return {
      id: p.id,
      profileId: p.profile.id,
      categoryId: p.categoryId,
      createdAt: p.createdAt,
      coverImage: p.images[0]!,
      description: p.description,
      imageCount: p.images.length,
      category: p.category,
      tags: p.postTags.map((pt: any) => pt.tag),
      profile: {
         username: p.profile.username,
         displayName: p.profile.displayName,
         profileImageUrl: p.profile.profileImageUrl,
         userIsFollowing,
      },
      likeCount: p.likes.length,
      bookmarkCount: p.bookmarks.length,
      commentCount: p.comments.length,
      userHasLiked: viewerProfileId
         ? p.likes.some((l: any) => l.profileId === viewerProfileId)
         : false,
      userHasBookmarked: viewerProfileId
         ? p.bookmarks.some((b: any) => b.profileId === viewerProfileId)
         : false,
   };
}

export const feedRouter = t.router({
   // Guest fallback — global recency feed, no follow state
   getFeed: t.procedure.input(feedInputSchema).query(async ({ ctx, input }) => {
      const { limit, cursor } = input;
      const viewerProfileId = await getViewerProfileId(ctx.user?.id ?? null);

      const posts = await db.query.post.findMany({
         where: cursor ? lt(post.createdAt, new Date(cursor)) : undefined,
         orderBy: [desc(post.createdAt)],
         limit: limit + 1,
         with: postWith,
      });

      let nextCursor: string | null = null;
      if (posts.length > limit) {
         const nextItem = posts.pop()!;
         nextCursor = nextItem.createdAt.toISOString();
      }

      return {
         items: posts.map((p) => mapPost(p, viewerProfileId, false)),
         nextCursor,
      };
   }),

   // Authenticated feed — posts from followed profiles only
   getFollowingFeed: t.procedure
      .input(feedInputSchema)
      .query(async ({ ctx, input }) => {
         const { limit, cursor } = input;
         const viewerProfileId = await getViewerProfileId(ctx.user?.id ?? null);
         if (!viewerProfileId) throw new TRPCError({ code: 'UNAUTHORIZED' });

         const followingRows = await db.query.follow.findMany({
            where: eq(follow.followerId, viewerProfileId),
            columns: { followingId: true },
         });
         const followingIds = followingRows.map((r) => r.followingId);

         // User follows nobody — return empty rather than crash inArray([])
         if (followingIds.length === 0) {
            return { items: [], nextCursor: null };
         }

         const posts = await db.query.post.findMany({
            where: and(
               inArray(post.profileId, followingIds),
               cursor ? lt(post.createdAt, new Date(cursor)) : undefined,
            ),
            orderBy: [desc(post.createdAt)],
            limit: limit + 1,
            with: postWith,
         });

         let nextCursor: string | null = null;
         if (posts.length > limit) {
            const nextItem = posts.pop()!;
            nextCursor = nextItem.createdAt.toISOString();
         }

         // All posts here are from followed profiles
         return {
            items: posts.map((p) => mapPost(p, viewerProfileId, true)),
            nextCursor,
         };
      }),

   // Explore — recency, excludes followed profiles and own posts
   getExplorePosts: t.procedure
      .input(exploreInputSchema)
      .query(async ({ ctx, input }) => {
         const {
            limit,
            cursor,
            sort,
            category: categorySlug,
            excludeOwn,
         } = input;

         const categoryId = categorySlug
            ? (
                 await db.query.category.findFirst({
                    where: eq(category.slug, categorySlug),
                    columns: { id: true },
                 })
              )?.id
            : undefined;

         const categoryFilter = categoryId
            ? eq(post.categoryId, categoryId)
            : undefined;

         const viewerProfileId = await getViewerProfileId(ctx.user?.id ?? null);

         const excludeOwnFilter =
            excludeOwn && viewerProfileId
               ? notInArray(post.profileId, [viewerProfileId])
               : undefined;

         // popular sort — separate query path
         if (sort === 'popular') {
            const offset = cursor ? parseInt(cursor) : 0;

            const results = await db
               .select({
                  postId: post.id,
                  likeCount: count(like.profileId),
               })
               .from(post)
               .leftJoin(like, eq(like.postId, post.id))
               .where(and(categoryFilter, excludeOwnFilter))
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
                       with: postWith,
                    })
                  : [];

            // restore sort order from join query
            const sorted = postIds.map((id) => posts.find((p) => p.id === id)!);

            return {
               items: sorted.map((p) => mapPost(p, viewerProfileId, false)),
               nextCursor: hasMore ? String(offset + limit) : null,
            };
         }

         // new sort — existing cursor path
         const posts = await db.query.post.findMany({
            where: and(
               cursor ? lt(post.createdAt, new Date(cursor)) : undefined,
               categoryFilter,
               excludeOwnFilter,
            ),
            orderBy: [desc(post.createdAt)],
            limit: limit + 1,
            with: postWith,
         });

         let nextCursor: string | null = null;
         if (posts.length > limit) {
            const nextItem = posts.pop()!;
            nextCursor = nextItem.createdAt.toISOString();
         }

         return {
            items: posts.map((p) => mapPost(p, viewerProfileId, false)),
            nextCursor,
         };
      }),
});
