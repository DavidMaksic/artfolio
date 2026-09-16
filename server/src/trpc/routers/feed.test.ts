import {
   mockFeedPost,
   mockProfile,
   mockUser,
} from '@/__tests__/helpers/factories.js';
import {
   createCaller,
   createAuthenticatedCaller,
} from '@/__tests__/helpers/trpc-helper.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/db/index.js';
import { getViewerProfileId } from '@/trpc/helpers.js';

vi.mock('@/db/index.js', () => ({
   db: {
      query: {
         profile: { findFirst: vi.fn() },
         post: { findMany: vi.fn() },
         follow: { findMany: vi.fn() },
      },
   },
}));

vi.mock('@/trpc/helpers.js', () => ({
   getViewerProfileId: vi.fn(),
   getProfileByUserId: vi.fn(),
   getProfileByUsername: vi.fn(),
   assertPostOwner: vi.fn(),
}));

const mockProfileFindFirst = db.query.profile.findFirst as ReturnType<
   typeof vi.fn
>;
const mockPostFindMany = db.query.post.findMany as ReturnType<typeof vi.fn>;
const mockFollowFindMany = db.query.follow.findMany as ReturnType<typeof vi.fn>;
const mockGetViewerProfileId = getViewerProfileId as ReturnType<typeof vi.fn>;

const user = mockUser();
const profile = mockProfile();

beforeEach(() => {
   vi.clearAllMocks();
});

// ── getFeed ────────────────────────────────────────────────────

describe('feed.getFeed', () => {
   it('returns feed items with engagement fields and userIsFollowing: false', async () => {
      mockProfileFindFirst.mockResolvedValueOnce(null); // guest
      mockPostFindMany.mockResolvedValueOnce([mockFeedPost()]);

      const caller = createCaller();
      const result = await caller.feed.getFeed({ limit: 5 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
         likeCount: 0,
         bookmarkCount: 0,
         commentCount: 0,
         userHasLiked: false,
         userHasBookmarked: false,
         profile: expect.objectContaining({ userIsFollowing: false }),
      });
      expect(result.nextCursor).toBeNull();
   });

   it('returns nextCursor when more results exist', async () => {
      mockProfileFindFirst.mockResolvedValueOnce(null);
      mockPostFindMany.mockResolvedValueOnce(
         Array.from({ length: 6 }, () => mockFeedPost()),
      );

      const caller = createCaller();
      const result = await caller.feed.getFeed({ limit: 5 });

      expect(result.items).toHaveLength(5);
      expect(result.nextCursor).not.toBeNull();
   });
});

// ── getFollowingFeed ───────────────────────────────────────────

describe('feed.getFollowingFeed', () => {
   it('returns empty when viewer follows nobody', async () => {
      mockGetViewerProfileId.mockResolvedValueOnce(profile.id);
      mockFollowFindMany.mockResolvedValueOnce([]); // following nobody

      const caller = createAuthenticatedCaller(user);
      const result = await caller.feed.getFollowingFeed({ limit: 5 });

      expect(result.items).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
   });

   it('returns posts from followed profiles with userIsFollowing: true', async () => {
      mockGetViewerProfileId.mockResolvedValueOnce(profile.id);
      mockFollowFindMany.mockResolvedValueOnce([
         { followingId: 'other-profile-id' },
      ]);
      mockPostFindMany.mockResolvedValueOnce([
         mockFeedPost({ profileId: 'other-profile-id' }),
      ]);
      const caller = createAuthenticatedCaller(user);
      const result = await caller.feed.getFollowingFeed({ limit: 5 });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].profile.userIsFollowing).toBe(true);
      expect(result.nextCursor).toBeNull();
   });

   it('returns nextCursor when more results exist', async () => {
      mockGetViewerProfileId.mockResolvedValueOnce(profile.id);
      mockFollowFindMany.mockResolvedValueOnce([
         { followingId: 'other-profile-id' },
      ]);
      mockPostFindMany.mockResolvedValueOnce(
         Array.from({ length: 6 }, () =>
            mockFeedPost({ profileId: 'other-profile-id' }),
         ),
      );
      const caller = createAuthenticatedCaller(user);
      const result = await caller.feed.getFollowingFeed({ limit: 5 });
      expect(result.items).toHaveLength(5);
      expect(result.nextCursor).not.toBeNull();
   });
});

// ── getExplorePosts ────────────────────────────────────────────

describe('feed.getExplorePosts', () => {
   it('returns posts for a guest with userIsFollowing: false', async () => {
      mockProfileFindFirst.mockResolvedValueOnce(null); // guest
      mockPostFindMany.mockResolvedValueOnce([mockFeedPost()]);

      const caller = createCaller();
      const result = await caller.feed.getExplorePosts({ limit: 5 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].profile.userIsFollowing).toBe(false);
   });

   it('excludes followed profiles and own profile for authenticated viewer', async () => {
      mockProfileFindFirst.mockResolvedValueOnce(profile);
      mockFollowFindMany.mockResolvedValueOnce([
         { followingId: 'followed-profile-id' },
      ]);
      // DB filtering is done by notInArray
      mockPostFindMany.mockResolvedValueOnce([
         mockFeedPost({ profileId: 'stranger-profile-id' }),
      ]);

      const caller = createAuthenticatedCaller(user);
      const result = await caller.feed.getExplorePosts({ limit: 5 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].profile.userIsFollowing).toBe(false);
   });

   it('returns nextCursor when more results exist', async () => {
      mockProfileFindFirst.mockResolvedValueOnce(null);
      mockPostFindMany.mockResolvedValueOnce(
         Array.from({ length: 6 }, () => mockFeedPost()),
      );

      const caller = createCaller();
      const result = await caller.feed.getExplorePosts({ limit: 5 });

      expect(result.items).toHaveLength(5);
      expect(result.nextCursor).not.toBeNull();
   });
});

// ── Protected procedures ───────────────────────────────────────

describe('protected procedures', () => {
   it('getFollowingFeed throws UNAUTHORIZED if not authenticated', async () => {
      const caller = createCaller();
      await expect(
         caller.feed.getFollowingFeed({ limit: 5 }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});
