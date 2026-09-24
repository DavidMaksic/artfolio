import {
   mockUpdateTestPost,
   mockSearchPost,
   mockTestPost,
   mockCategory,
   mockProfile,
   mockImage,
   mockUser,
   mockPost,
} from '@/__tests__/helpers/factories.js';
import {
   createAuthenticatedCaller,
   createCaller,
} from '@/__tests__/helpers/trpc-helper.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/db/index.js';

vi.mock('@/db/index.js', () => ({
   db: {
      query: {
         profile: {
            findFirst: vi.fn(),
         },
         post: {
            findFirst: vi.fn(),
            findMany: vi.fn(),
         },
         postImage: {
            findMany: vi.fn(),
         },
         category: {
            findFirst: vi.fn(),
         },
      },
      select: vi.fn(() => ({
         from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
               where: vi.fn(),
            })),
            where: vi.fn(),
         })),
      })),
      insert: vi.fn(() => ({
         values: vi.fn(),
      })),
      update: vi.fn(() => ({
         set: vi.fn(() => ({
            where: vi.fn(),
         })),
      })),
      delete: vi.fn(() => ({
         where: vi.fn(),
      })),
      transaction: vi.fn((fn) => fn(db)),
   },
}));

vi.mock('@/lib/cloudinary.js', () => ({
   cloudinary: {
      utils: {
         api_sign_request: vi.fn(() => 'mock-signature'),
      },
   },
   generateUploadSignature: vi.fn(() => ({
      signature: 'mock-signature',
      timestamp: 123456789,
      folder: 'artfolio/posts',
      apiKey: 'mock-api-key',
      cloudName: 'mock-cloud-name',
   })),
   deleteImage: vi.fn().mockResolvedValue(undefined),
}));

function setupSelects(
   tagMatches: any[],
   categoryMatches: any[],
   profileMatches: any[],
) {
   mockCategoryFindFirst.mockResolvedValueOnce(undefined);
   mockSelect
      .mockReturnValueOnce({
         // tag subquery
         from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
               where: vi.fn().mockResolvedValue(tagMatches),
            })),
         })),
      })
      .mockReturnValueOnce({
         // category subquery
         from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue(categoryMatches),
         })),
      })
      .mockReturnValueOnce({
         // profile subquery
         from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue(profileMatches),
         })),
      });
}

const mockProfileFindFirst = db.query.profile.findFirst as ReturnType<
   typeof vi.fn
>;
const mockPostFindFirst = db.query.post.findFirst as ReturnType<typeof vi.fn>;
const mockPostFindMany = db.query.post.findMany as ReturnType<typeof vi.fn>;
const mockPostImageFindMany = db.query.postImage.findMany as ReturnType<
   typeof vi.fn
>;
const mockCategoryFindFirst = db.query.category.findFirst as ReturnType<
   typeof vi.fn
>;
const mockSelect = db.select as ReturnType<typeof vi.fn>;
const mockInsert = db.insert as ReturnType<typeof vi.fn>;
const mockDelete = db.delete as ReturnType<typeof vi.fn>;

const user = mockUser();
const profile = mockProfile();

beforeEach(() => {
   vi.clearAllMocks();
});

// ── create ───────────────────────

describe('post.create', () => {
   it('creates a post and returns its id', async () => {
      mockProfileFindFirst.mockResolvedValueOnce(profile);
      mockInsert.mockReturnValue({
         values: vi.fn().mockResolvedValue(undefined),
      });

      const caller = createAuthenticatedCaller(user);
      const result = await caller.post.create(mockTestPost());

      expect(result).toMatchObject({ id: expect.any(String) });
   });

   it('throws NOT_FOUND if profile does not exist', async () => {
      mockProfileFindFirst.mockResolvedValueOnce(undefined);

      const caller = createAuthenticatedCaller(user);
      await expect(caller.post.create(mockTestPost())).rejects.toMatchObject({
         code: 'NOT_FOUND',
      });
   });
});

// ── update ───────────────────────

describe('post.update', () => {
   it('updates a post and returns its id', async () => {
      const existingPost = mockPost();
      mockProfileFindFirst.mockResolvedValueOnce(profile);
      mockPostFindFirst.mockResolvedValueOnce(existingPost);
      mockPostImageFindMany.mockResolvedValueOnce([]);

      mockInsert.mockReturnValue({
         values: vi.fn().mockResolvedValue(undefined),
      });
      mockDelete.mockReturnValue({
         where: vi.fn().mockResolvedValue(undefined),
      });

      const caller = createAuthenticatedCaller(user);
      const result = await caller.post.update(mockUpdateTestPost());

      expect(result).toMatchObject({ id: existingPost.id });
   });

   it('throws NOT_FOUND if post does not exist', async () => {
      mockProfileFindFirst.mockResolvedValueOnce(profile);
      mockPostFindFirst.mockResolvedValueOnce(undefined);

      const caller = createAuthenticatedCaller(user);
      await expect(
         caller.post.update(mockUpdateTestPost()),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
   });

   it('throws FORBIDDEN if post belongs to another profile', async () => {
      mockProfileFindFirst.mockResolvedValueOnce(profile);
      mockPostFindFirst.mockResolvedValueOnce(
         mockPost({ profileId: 'someone-elses-profile-id' }),
      );

      const caller = createAuthenticatedCaller(user);
      await expect(
         caller.post.update(mockUpdateTestPost()),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
   });
});

// ── delete ───────────────────────

describe('post.delete', () => {
   it('deletes a post and returns its id', async () => {
      const existingPost = mockPost();
      mockProfileFindFirst.mockResolvedValueOnce(profile);
      mockPostFindFirst.mockResolvedValueOnce(existingPost);
      mockPostImageFindMany.mockResolvedValueOnce([mockImage()]);

      mockDelete.mockReturnValue({
         where: vi.fn().mockResolvedValue(undefined),
      });

      const caller = createAuthenticatedCaller(user);
      const result = await caller.post.delete({ id: existingPost.id });

      expect(result).toMatchObject({ id: existingPost.id });
   });

   it('throws NOT_FOUND if post does not exist', async () => {
      mockProfileFindFirst.mockResolvedValueOnce(profile);
      mockPostFindFirst.mockResolvedValueOnce(undefined);

      const caller = createAuthenticatedCaller(user);
      await expect(
         caller.post.delete({ id: 'nonexistent-id' }),
      ).rejects.toMatchObject({
         code: 'NOT_FOUND',
      });
   });

   it('throws FORBIDDEN if post belongs to another profile', async () => {
      mockProfileFindFirst.mockResolvedValueOnce(profile);
      mockPostFindFirst.mockResolvedValueOnce(
         mockPost({ profileId: 'someone-elses-profile-id' }),
      );

      const caller = createAuthenticatedCaller(user);
      await expect(caller.post.delete({ id: 'post_1' })).rejects.toMatchObject({
         code: 'FORBIDDEN',
      });
   });
});

// ── getById ───────────────────────

describe('post.getById', () => {
   it('returns a post with images, category, tags and profile', async () => {
      const existingPost = mockPost();
      mockPostFindFirst.mockResolvedValueOnce({
         ...existingPost,
         images: [mockImage()],
         category: mockCategory(),
         postTags: [],
         profile,
         likes: [],
         bookmarks: [],
         comments: [],
      });

      const caller = createCaller();
      const result = await caller.post.getById({ id: existingPost.id });

      expect(result).toMatchObject({
         id: existingPost.id,
         description: existingPost.description,
         category: { slug: 'illustration' },
         tags: [],
         profile: {
            username: profile.username,
            displayName: profile.displayName,
            profileImageUrl: profile.profileImageUrl,
         },
         likeCount: 0,
         bookmarkCount: 0,
         commentCount: 0,
         userHasLiked: false,
         userHasBookmarked: false,
      });
      expect(result.images).toHaveLength(1);
   });

   it('throws NOT_FOUND for unknown id', async () => {
      mockPostFindFirst.mockResolvedValueOnce(undefined);

      const caller = createCaller();
      await expect(
         caller.post.getById({ id: 'nonexistent-id' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
   });
});

// ── getByUsername ───────────────────────

describe('post.getByUsername', () => {
   it('returns posts for a valid username', async () => {
      const post = mockPost();
      mockProfileFindFirst.mockResolvedValueOnce(profile);
      mockPostFindMany.mockResolvedValueOnce([
         {
            ...post,
            images: [mockImage()],
            category: mockCategory(),
            postTags: [],
            likes: [],
            bookmarks: [],
            comments: [],
         },
      ]);

      const caller = createCaller();
      const result = await caller.post.getByUsername({ username: 'testuser' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
         id: post.id,
         description: post.description,
      });
   });

   it('throws NOT_FOUND for unknown username', async () => {
      mockProfileFindFirst.mockResolvedValueOnce(undefined);

      const caller = createCaller();
      await expect(
         caller.post.getByUsername({ username: 'nobody' }),
      ).rejects.toMatchObject({
         code: 'NOT_FOUND',
      });
   });
});

// ── getPostImageUploadSignature ───────────────────────

describe('post.getPostImageUploadSignature', () => {
   it('returns signature fields', async () => {
      const caller = createAuthenticatedCaller(user);
      const result = await caller.post.getPostImageUploadSignature();

      expect(result).toMatchObject({
         signature: expect.any(String),
         timestamp: expect.any(Number),
         folder: 'artfolio/posts',
         apiKey: expect.any(String),
         cloudName: expect.any(String),
      });
   });
});

// ── search ───────────────────────

describe('post.search', () => {
   it('returns posts matching by tag', async () => {
      setupSelects([{ postId: 'post-1' }], [], []);
      mockPostFindMany.mockResolvedValueOnce([
         mockSearchPost({ id: 'post-1' }),
      ]);

      const caller = createCaller();
      const result = await caller.post.search({
         query: 'landscape',
         limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
   });

   it('returns posts matching by category', async () => {
      setupSelects([], [{ id: 'cat-1' }], []);
      mockPostFindMany.mockResolvedValueOnce([
         mockSearchPost({ categoryId: 'cat-1' }),
      ]);

      const caller = createCaller();
      const result = await caller.post.search({
         query: 'photography',
         limit: 20,
      });

      expect(result.items).toHaveLength(1);
   });

   it('returns posts matching by profile username', async () => {
      setupSelects([], [], [{ id: 'profile-1' }]);
      mockPostFindMany.mockResolvedValueOnce([
         mockSearchPost({ profileId: 'profile-1' }),
      ]);

      const caller = createCaller();
      const result = await caller.post.search({ query: 'johndoe', limit: 20 });

      expect(result.items).toHaveLength(1);
   });

   it('returns empty when no matches', async () => {
      setupSelects([], [], []);
      mockPostFindMany.mockResolvedValueOnce([]);

      const caller = createCaller();
      const result = await caller.post.search({
         query: 'nomatch',
         limit: 20,
      });

      expect(result.items).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
   });

   it('paginates correctly', async () => {
      setupSelects([], [], []);
      mockPostFindMany.mockResolvedValueOnce(
         Array.from({ length: 6 }, () => mockSearchPost()),
      );

      const caller = createCaller();
      const result = await caller.post.search({ query: 'art', limit: 5 });

      expect(result.items).toHaveLength(5);
      expect(result.nextCursor).not.toBeNull();
   });
});

// ── Protected procedures ──────────────────────────────────────

describe('protected procedures', () => {
   it('throws UNAUTHORIZED if user is not signed in', async () => {
      const caller = createCaller();
      await Promise.all([
         expect(caller.post.create(mockTestPost())).rejects.toMatchObject({
            code: 'UNAUTHORIZED',
         }),
         expect(caller.post.update(mockUpdateTestPost())).rejects.toMatchObject(
            { code: 'UNAUTHORIZED' },
         ),
         expect(caller.post.delete({ id: 'post_1' })).rejects.toMatchObject({
            code: 'UNAUTHORIZED',
         }),
         expect(
            caller.post.getPostImageUploadSignature(),
         ).rejects.toMatchObject({ code: 'UNAUTHORIZED' }),
      ]);
   });
});
