import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCaller } from '@/__tests__/helpers/trpc-helper.js';
import { mockPosts } from '@/__tests__/helpers/factories.js';
import { db } from '@/db/index.js';

vi.mock('@/db/index.js', () => ({
   db: {
      query: {
         post: {
            findMany: vi.fn(),
         },
      },
   },
}));

const mockPostFindMany = db.query.post.findMany as ReturnType<typeof vi.fn>;

beforeEach(() => {
   vi.clearAllMocks();
});

// ── getFeed ───────────────────────

describe('feed.getFeed', () => {
   it('returns first page and a nextCursor when more posts exist', async () => {
      const posts = mockPosts(21);
      const expectedCursor = posts[20].createdAt!.toISOString();
      mockPostFindMany.mockResolvedValueOnce(posts);

      const caller = createCaller();
      const result = await caller.feed.getFeed({ limit: 20 });

      // Only 20 items returned — the extra one is consumed for cursor calculation
      expect(result.items).toHaveLength(20);

      // nextCursor is the createdAt of the 21st post (the one that was popped)
      expect(result.nextCursor).toBe(expectedCursor);
   });

   it('returns null nextCursor on the last page', async () => {
      // Fewer posts than limit — no next page
      const posts = mockPosts(8);
      mockPostFindMany.mockResolvedValueOnce(posts);

      const caller = createCaller();
      const result = await caller.feed.getFeed({ limit: 20 });

      expect(result.items).toHaveLength(8);
      expect(result.nextCursor).toBeNull();
   });

   it('passes the cursor as a date filter when provided', async () => {
      const cursor = '2024-05-15T10:00:00.000Z';
      mockPostFindMany.mockResolvedValueOnce([]);

      const caller = createCaller();
      await caller.feed.getFeed({ limit: 20, cursor });

      const callArgs = mockPostFindMany.mock.calls[0][0];

      // Verify a where clause is present (cursor was forwarded)
      // The procedure wraps cursor in lt(post.createdAt, new Date(cursor))
      expect(callArgs.where).toBeDefined();
   });

   it('does not apply a where clause when no cursor is given', async () => {
      mockPostFindMany.mockResolvedValueOnce([]);

      const caller = createCaller();
      await caller.feed.getFeed({ limit: 20 });

      const callArgs = mockPostFindMany.mock.calls[0][0];
      expect(callArgs.where).toBeUndefined();
   });

   it('maps db rows into the expected FeedItem shape', async () => {
      const [dbPost] = mockPosts(1);
      mockPostFindMany.mockResolvedValueOnce([dbPost]);

      const caller = createCaller();
      const result = await caller.feed.getFeed({ limit: 20 });
      const item = result.items[0];

      expect(item).toMatchObject({
         id: dbPost.id,
         categoryId: dbPost.categoryId,
         createdAt: dbPost.createdAt,
         imageCount: 1,
         coverImage: dbPost.images[0],
         category: dbPost.category,
         tags: [{ id: 'tag-1', name: 'digital', slug: 'digital' }],
         profile: {
            username: 'alice',
            displayName: 'Alice',
            profileImageUrl: null,
         },
      });
   });

   it('returns empty items and null nextCursor when there are no posts', async () => {
      mockPostFindMany.mockResolvedValueOnce([]);

      const caller = createCaller();
      const result = await caller.feed.getFeed({ limit: 20 });

      expect(result.items).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
   });

   it('is accessible without authentication', async () => {
      mockPostFindMany.mockResolvedValueOnce([]);

      // createCaller() with no session — must not throw UNAUTHORIZED
      const caller = createCaller();
      await expect(caller.feed.getFeed({ limit: 20 })).resolves.toBeDefined();
   });
});
