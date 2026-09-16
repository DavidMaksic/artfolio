import {
   mockFollowRow,
   mockProfile,
   mockUser,
} from '@/__tests__/helpers/factories.js';
import {
   createCaller,
   createAuthenticatedCaller,
} from '@/__tests__/helpers/trpc-helper.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/db/index.js';

vi.mock('@/db/index.js', () => ({
   db: {
      query: {
         profile: { findFirst: vi.fn() },
         follow: {
            findFirst: vi.fn(),
            findMany: vi.fn(),
         },
      },
      insert: vi.fn(() => ({ values: vi.fn() })),
      delete: vi.fn(() => ({ where: vi.fn() })),
   },
}));

const mockProfileFindFirst = db.query.profile.findFirst as ReturnType<
   typeof vi.fn
>;
const mockFollowFindFirst = db.query.follow.findFirst as ReturnType<
   typeof vi.fn
>;
const mockFollowFindMany = db.query.follow.findMany as ReturnType<typeof vi.fn>;
const mockInsert = db.insert as ReturnType<typeof vi.fn>;
const mockDelete = db.delete as ReturnType<typeof vi.fn>;

const user = mockUser();
const profile = mockProfile();

beforeEach(() => {
   vi.clearAllMocks();
});

// ── toggleFollow ───────────────────────────────────────────────

describe('follow.toggleFollow', () => {
   it('follows a profile and returns { following: true }', async () => {
      mockProfileFindFirst.mockResolvedValueOnce(profile);
      mockFollowFindFirst.mockResolvedValueOnce(undefined); // not yet following
      mockInsert.mockReturnValue({
         values: vi.fn().mockResolvedValue(undefined),
      });

      const caller = createAuthenticatedCaller(user);
      const result = await caller.follow.toggleFollow({
         followingId: 'other-profile-id',
      });

      expect(result).toEqual({ following: true });
   });

   it('unfollows a profile and returns { following: false }', async () => {
      mockProfileFindFirst.mockResolvedValueOnce(profile);
      mockFollowFindFirst.mockResolvedValueOnce(mockFollowRow()); // already following
      mockDelete.mockReturnValue({
         where: vi.fn().mockResolvedValue(undefined),
      });

      const caller = createAuthenticatedCaller(user);
      const result = await caller.follow.toggleFollow({
         followingId: 'other-profile-id',
      });

      expect(result).toEqual({ following: false });
   });

   it('throws BAD_REQUEST if user tries to follow themselves', async () => {
      mockProfileFindFirst.mockResolvedValueOnce(profile);

      const caller = createAuthenticatedCaller(user);
      await expect(
         caller.follow.toggleFollow({ followingId: profile.id }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
   });
});

// ── getFollowers ───────────────────────────────────────────────

describe('follow.getFollowers', () => {
   it('returns paginated followers', async () => {
      mockFollowFindMany.mockResolvedValueOnce([
         {
            ...mockFollowRow(),
            follower: mockProfile({
               id: 'other-profile-id',
               username: 'otheruser',
            }),
         },
      ]);

      const caller = createCaller();
      const result = await caller.follow.getFollowers({
         profileId: profile.id,
         limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({ username: 'otheruser' });
      expect(result.nextCursor).toBeNull();
   });

   it('returns nextCursor when more results exist', async () => {
      const rows = Array.from({ length: 21 }, (_, i) => ({
         ...mockFollowRow(),
         createdAt: new Date(Date.now() - i * 1000),
         follower: mockProfile({
            id: `profile-${i}`,
            username: `user${i}`,
         }),
      }));
      mockFollowFindMany.mockResolvedValueOnce(rows);

      const caller = createCaller();
      const result = await caller.follow.getFollowers({
         profileId: profile.id,
         limit: 20,
      });

      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).not.toBeNull();
   });
});

// ── getFollowing ───────────────────────────────────────────────

describe('follow.getFollowing', () => {
   it('returns paginated following', async () => {
      mockFollowFindMany.mockResolvedValueOnce([
         {
            ...mockFollowRow(),
            followed: mockProfile({
               id: 'other-profile-id',
               username: 'otheruser',
            }),
         },
      ]);

      const caller = createCaller();
      const result = await caller.follow.getFollowing({
         profileId: profile.id,
         limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({ username: 'otheruser' });
      expect(result.nextCursor).toBeNull();
   });
});

// ── Protected procedures ───────────────────────────────────────

describe('protected procedures', () => {
   it('toggleFollow throws UNAUTHORIZED if not authenticated', async () => {
      const caller = createCaller();
      await expect(
         caller.follow.toggleFollow({ followingId: 'other-profile-id' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
   });
});
