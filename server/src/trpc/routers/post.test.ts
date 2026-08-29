import {
   mockUpdateTestPost,
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
      },
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

const mockProfileFindFirst = db.query.profile.findFirst as ReturnType<
   typeof vi.fn
>;
const mockPostFindFirst = db.query.post.findFirst as ReturnType<typeof vi.fn>;
const mockPostFindMany = db.query.post.findMany as ReturnType<typeof vi.fn>;
const mockPostImageFindMany = db.query.postImage.findMany as ReturnType<
   typeof vi.fn
>;
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

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createCaller();
      await expect(caller.post.create(mockTestPost())).rejects.toMatchObject({
         code: 'UNAUTHORIZED',
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

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createCaller();
      await expect(
         caller.post.update(mockUpdateTestPost()),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
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

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createCaller();
      await expect(caller.post.delete({ id: 'post_1' })).rejects.toMatchObject({
         code: 'UNAUTHORIZED',
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

   it('throws UNAUTHORIZED if not logged in', async () => {
      const caller = createCaller();
      await expect(
         caller.post.getPostImageUploadSignature(),
      ).rejects.toMatchObject({
         code: 'UNAUTHORIZED',
      });
   });
});
