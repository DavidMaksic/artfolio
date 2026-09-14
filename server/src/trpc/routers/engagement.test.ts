import {
   mockComment,
   mockProfile,
   mockUser,
} from '@/__tests__/helpers/factories.js';
import {
   createCaller,
   createAuthenticatedCaller,
} from '@/__tests__/helpers/trpc-helper.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db/index.js';

vi.mock('@/db/index.js', () => ({
   db: {
      query: {
         profile: {
            findFirst: vi.fn(),
         },
         like: {
            findFirst: vi.fn(),
         },
         bookmark: {
            findFirst: vi.fn(),
         },
         comment: {
            findFirst: vi.fn(),
            findMany: vi.fn(),
         },
      },
      insert: vi.fn(() => ({
         values: vi.fn(),
      })),
      delete: vi.fn(() => ({
         where: vi.fn(),
      })),
   },
}));

const mockProfileFindFirst = db.query.profile.findFirst as ReturnType<
   typeof vi.fn
>;
const mockLikeFindFirst = db.query.like.findFirst as ReturnType<typeof vi.fn>;
const mockBookmarkFindFirst = db.query.bookmark.findFirst as ReturnType<
   typeof vi.fn
>;
const mockCommentFindFirst = db.query.comment.findFirst as ReturnType<
   typeof vi.fn
>;
const mockCommentFindMany = db.query.comment.findMany as ReturnType<
   typeof vi.fn
>;
const mockInsert = db.insert as ReturnType<typeof vi.fn>;
const mockDelete = db.delete as ReturnType<typeof vi.fn>;

const user = mockUser();
const profile = mockProfile();

beforeEach(() => {
   vi.clearAllMocks();
});

// ── toggleLike ──────────────────────────────────────

describe('engagement.toggleLike', () => {
   it('should insert a like and return { liked: true } when not yet liked', async () => {
      mockProfileFindFirst.mockResolvedValueOnce(profile);
      mockLikeFindFirst.mockResolvedValueOnce(undefined);
      mockInsert.mockReturnValue({
         values: vi.fn().mockResolvedValue(undefined),
      });

      const caller = createAuthenticatedCaller(user);
      const result = await caller.engagement.toggleLike({
         postId: 'test-post-id',
      });

      expect(result).toEqual({ liked: true });
      expect(mockInsert).toHaveBeenCalled();
   });

   it('should delete the like and return { liked: false } when already liked', async () => {
      mockProfileFindFirst.mockResolvedValueOnce(profile);
      mockLikeFindFirst.mockResolvedValueOnce({
         postId: 'test-post-id',
         profileId: profile.id,
      });
      mockDelete.mockReturnValue({
         where: vi.fn().mockResolvedValue(undefined),
      });

      const caller = createAuthenticatedCaller(user);
      const result = await caller.engagement.toggleLike({
         postId: 'test-post-id',
      });

      expect(result).toEqual({ liked: false });
      expect(mockDelete).toHaveBeenCalled();
   });
});

// ── toggleBookmark ──────────────────────────────────────

describe('engagement.toggleBookmark', () => {
   it('should insert a bookmark and return { bookmarked: true } when not yet bookmarked', async () => {
      mockProfileFindFirst.mockResolvedValueOnce(profile);
      mockBookmarkFindFirst.mockResolvedValueOnce(undefined);
      mockInsert.mockReturnValue({
         values: vi.fn().mockResolvedValue(undefined),
      });

      const caller = createAuthenticatedCaller(user);
      const result = await caller.engagement.toggleBookmark({
         postId: 'test-post-id',
      });

      expect(result).toEqual({ bookmarked: true });
      expect(mockInsert).toHaveBeenCalled();
   });

   it('should delete the bookmark and return { bookmarked: false } when already bookmarked', async () => {
      mockProfileFindFirst.mockResolvedValueOnce(profile);
      mockBookmarkFindFirst.mockResolvedValueOnce({
         postId: 'test-post-id',
         profileId: profile.id,
      });
      mockDelete.mockReturnValue({
         where: vi.fn().mockResolvedValue(undefined),
      });

      const caller = createAuthenticatedCaller(user);
      const result = await caller.engagement.toggleBookmark({
         postId: 'test-post-id',
      });

      expect(result).toEqual({ bookmarked: false });
      expect(mockDelete).toHaveBeenCalled();
   });
});

// ── getComments ──────────────────────────────────────

describe('engagement.getComments', () => {
   it('should return first page of comments for a post', async () => {
      const comments = [
         mockComment(),
         mockComment({ id: 'test-comment-id-2' }),
      ];
      mockCommentFindMany.mockResolvedValueOnce(comments);

      const caller = createCaller();
      const result = await caller.engagement.getComments({
         postId: 'test-post-id',
         limit: 20,
      });

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBeNull();
   });

   it('should return nextCursor when more comments exist beyond the limit', async () => {
      const comments = Array.from({ length: 21 }, (_, i) =>
         mockComment({
            id: `comment-${i}`,
            createdAt: new Date(
               `2024-01-${String(21 - i).padStart(2, '0')}T00:00:00.000Z`,
            ),
         }),
      );
      mockCommentFindMany.mockResolvedValueOnce(comments);

      const caller = createCaller();
      const result = await caller.engagement.getComments({
         postId: 'test-post-id',
         limit: 20,
      });

      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).not.toBeNull();
   });

   it('should return null nextCursor on the last page', async () => {
      const comments = [mockComment()];
      mockCommentFindMany.mockResolvedValueOnce(comments);

      const caller = createCaller();
      const result = await caller.engagement.getComments({
         postId: 'test-post-id',
         limit: 20,
      });

      expect(result.nextCursor).toBeNull();
   });

   it('should use cursor to return the next page of comments', async () => {
      const cursor = new Date('2024-01-10T00:00:00.000Z').toISOString();
      const comments = [
         mockComment({ createdAt: new Date('2024-01-09T00:00:00.000Z') }),
      ];
      mockCommentFindMany.mockResolvedValueOnce(comments);

      const caller = createCaller();
      const result = await caller.engagement.getComments({
         postId: 'test-post-id',
         limit: 20,
         cursor,
      });

      expect(result.items).toHaveLength(1);
      expect(mockCommentFindMany).toHaveBeenCalledWith(
         expect.objectContaining({ limit: 21 }),
      );
   });

   it('should return empty items array for a post with no comments', async () => {
      mockCommentFindMany.mockResolvedValueOnce([]);

      const caller = createCaller();
      const result = await caller.engagement.getComments({
         postId: 'test-post-id',
         limit: 20,
      });

      expect(result.items).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
   });
});

// ── createComment ──────────────────────────────────────

describe('engagement.createComment', () => {
   it('should insert a comment and return the created comment shape', async () => {
      mockProfileFindFirst.mockResolvedValueOnce(profile);
      mockInsert.mockReturnValue({
         values: vi.fn().mockResolvedValue(undefined),
      });

      const caller = createAuthenticatedCaller(user);
      const result = await caller.engagement.createComment({
         postId: 'test-post-id',
         body: 'Great post!',
      });

      expect(result).toMatchObject({
         id: expect.any(String),
         postId: 'test-post-id',
         body: 'Great post!',
         createdAt: expect.any(Date),
         profile: {
            username: profile.username,
            displayName: profile.displayName,
            profileImageUrl: profile.profileImageUrl,
         },
      });
   });

   it('should throw if body is empty', async () => {
      const caller = createAuthenticatedCaller(user);
      await expect(
         caller.engagement.createComment({ postId: 'test-post-id', body: '' }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
   });

   it('should throw if body exceeds 1000 characters', async () => {
      const caller = createAuthenticatedCaller(user);
      await expect(
         caller.engagement.createComment({
            postId: 'test-post-id',
            body: 'a'.repeat(1001),
         }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
   });
});

// ── deleteComment ──────────────────────────────────────

describe('engagement.deleteComment', () => {
   it('should allow the comment author to delete their own comment', async () => {
      mockProfileFindFirst.mockResolvedValueOnce(profile);
      mockCommentFindFirst.mockResolvedValueOnce(
         mockComment({
            profileId: profile.id,
            post: { profileId: 'someone-elses-profile-id' },
         }),
      );
      mockDelete.mockReturnValue({
         where: vi.fn().mockResolvedValue(undefined),
      });

      const caller = createAuthenticatedCaller(user);
      await expect(
         caller.engagement.deleteComment({
            commentId: 'test-comment-id',
            postId: 'test-post-id',
         }),
      ).resolves.not.toThrow();
      expect(mockDelete).toHaveBeenCalled();
   });

   it('should allow the post owner to delete a comment left by another user', async () => {
      mockProfileFindFirst.mockResolvedValueOnce(profile);
      mockCommentFindFirst.mockResolvedValueOnce(
         mockComment({
            profileId: 'someone-elses-profile-id',
            post: { profileId: profile.id },
         }),
      );
      mockDelete.mockReturnValue({
         where: vi.fn().mockResolvedValue(undefined),
      });

      const caller = createAuthenticatedCaller(user);
      await expect(
         caller.engagement.deleteComment({
            commentId: 'test-comment-id',
            postId: 'test-post-id',
         }),
      ).resolves.not.toThrow();
      expect(mockDelete).toHaveBeenCalled();
   });

   it('should throw NOT_FOUND if comment does not exist', async () => {
      mockProfileFindFirst.mockResolvedValueOnce(profile);
      mockCommentFindFirst.mockResolvedValueOnce(undefined);

      const caller = createAuthenticatedCaller(user);
      await expect(
         caller.engagement.deleteComment({
            commentId: 'test-comment-id',
            postId: 'test-post-id',
         }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
   });

   it('should throw FORBIDDEN if user is neither comment author nor post owner', async () => {
      mockProfileFindFirst.mockResolvedValueOnce(profile);
      mockCommentFindFirst.mockResolvedValueOnce(
         mockComment({
            profileId: 'someone-elses-profile-id',
            post: { profileId: 'another-profile-id' },
         }),
      );

      const caller = createAuthenticatedCaller(user);
      await expect(
         caller.engagement.deleteComment({
            commentId: 'test-comment-id',
            postId: 'test-post-id',
         }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
   });
});

// ── Protected procedures ──────────────────────────────────────

describe('protected procedures', () => {
   it('throws UNAUTHORIZED if user is not signed in', async () => {
      const caller = createCaller();
      await Promise.all([
         expect(
            caller.engagement.toggleLike({ postId: 'test-post-id' }),
         ).rejects.toMatchObject({ code: 'UNAUTHORIZED' }),
         expect(
            caller.engagement.toggleBookmark({ postId: 'test-post-id' }),
         ).rejects.toMatchObject({ code: 'UNAUTHORIZED' }),
         expect(
            caller.engagement.createComment({
               postId: 'test-post-id',
               body: 'hi',
            }),
         ).rejects.toMatchObject({ code: 'UNAUTHORIZED' }),
         expect(
            caller.engagement.deleteComment({
               commentId: 'test-comment-id',
               postId: 'test-post-id',
            }),
         ).rejects.toMatchObject({ code: 'UNAUTHORIZED' }),
      ]);
   });
});
