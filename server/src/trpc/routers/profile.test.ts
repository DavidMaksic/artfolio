import {
   createCaller,
   createAuthenticatedCaller,
} from '@/__tests__/helpers/trpc-helper.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockUser, mockProfile } from '@/__tests__/helpers/factories.js';
import { deleteImage } from '@/lib/cloudinary.js';
import { db } from '@/db/index.js';

vi.mock('@/db/index.js', () => ({
   db: {
      query: {
         profile: {
            findFirst: vi.fn(),
         },
         post: {
            findMany: vi.fn(),
         },
      },
      update: vi.fn(() => ({
         set: vi.fn(() => ({
            where: vi.fn(() => ({
               returning: vi.fn(),
            })),
         })),
      })),
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

const mockFindFirst = db.query.profile.findFirst as ReturnType<typeof vi.fn>;
const mockPostFindMany = db.query.post.findMany as ReturnType<typeof vi.fn>;
const mockUpdate = db.update as ReturnType<typeof vi.fn>;
const mockDeleteImage = deleteImage as ReturnType<typeof vi.fn>;

const user = mockUser();
const profile = mockProfile({ userId: user.id });

beforeEach(() => {
   vi.clearAllMocks();
});

// ── getMe ───────────────────────

describe('profile.getMe', () => {
   it('returns the profile for the authenticated user', async () => {
      mockFindFirst.mockResolvedValueOnce(profile);

      const caller = createAuthenticatedCaller(user);
      const result = await caller.profile.getMe();

      expect(result).toMatchObject({
         username: profile.username,
         userId: user.id,
      });
   });

   it('throws NOT_FOUND if profile does not exist', async () => {
      mockFindFirst.mockResolvedValueOnce(undefined);

      const caller = createAuthenticatedCaller(user);
      await expect(caller.profile.getMe()).rejects.toThrow(
         expect.objectContaining({ code: 'NOT_FOUND' }),
      );
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createCaller();
      await expect(caller.profile.getMe()).rejects.toThrow(
         expect.objectContaining({ code: 'UNAUTHORIZED' }),
      );
   });
});

// ── getByUsername ───────────────────────

describe('profile.getByUsername', () => {
   it('returns the profile for a valid username', async () => {
      mockFindFirst.mockResolvedValueOnce(profile);

      const caller = createCaller();
      const result = await caller.profile.getByUsername({
         username: 'testuser',
      });

      expect(result).toMatchObject({ username: 'testuser' });
   });

   it('throws NOT_FOUND for a username that does not exist', async () => {
      mockFindFirst.mockResolvedValueOnce(undefined);

      const caller = createCaller();
      await expect(
         caller.profile.getByUsername({ username: 'testuser' }),
      ).rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' }));
   });
});

// ── update ───────────────────────

describe('profile.update', () => {
   it('updates profile fields correctly', async () => {
      const updated = { ...profile, displayName: 'New Name' };
      mockFindFirst.mockResolvedValueOnce(profile);
      mockUpdate.mockReturnValueOnce({
         set: vi.fn(() => ({
            where: vi.fn(() => ({
               returning: vi.fn().mockResolvedValueOnce([updated]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(user);
      const result = await caller.profile.update({ displayName: 'New Name' });

      expect(result.displayName).toBe('New Name');
   });

   it('deletes old profile image from Cloudinary when a new one is provided', async () => {
      const profileWithImage = mockProfile({
         userId: user.id,
         profileImageUrl:
            'https://res.cloudinary.com/mock/image/upload/artfolio/profiles/old-image.jpg',
      });
      const updated = {
         ...profileWithImage,
         profileImageUrl:
            'https://res.cloudinary.com/mock/image/upload/artfolio/profiles/new-image.jpg',
      };

      mockFindFirst.mockResolvedValueOnce(profileWithImage);
      mockUpdate.mockReturnValueOnce({
         set: vi.fn(() => ({
            where: vi.fn(() => ({
               returning: vi.fn().mockResolvedValueOnce([updated]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(user);
      await caller.profile.update({
         profileImageUrl:
            'https://res.cloudinary.com/mock/image/upload/artfolio/profiles/new-image.jpg',
      });

      await vi.waitFor(() => {
         expect(mockDeleteImage).toHaveBeenCalledWith(
            'artfolio/profiles/old-image',
         );
      });
   });

   it('does not delete Cloudinary image when profile image has not changed', async () => {
      const profileWithImage = mockProfile({
         userId: user.id,
         profileImageUrl:
            'https://res.cloudinary.com/mock/image/upload/artfolio/profiles/same-image.jpg',
      });

      mockFindFirst.mockResolvedValueOnce(profileWithImage);
      mockUpdate.mockReturnValueOnce({
         set: vi.fn(() => ({
            where: vi.fn(() => ({
               returning: vi.fn().mockResolvedValueOnce([profileWithImage]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(user);
      await caller.profile.update({ displayName: 'New Name' });

      expect(mockDeleteImage).not.toHaveBeenCalled();
   });

   it('throws CONFLICT if username is already taken', async () => {
      const taken = mockProfile({
         userId: 'other-user-id',
         username: 'takenuser',
      });
      mockFindFirst.mockResolvedValueOnce(profile).mockResolvedValueOnce(taken);

      const caller = createAuthenticatedCaller(user);
      await expect(
         caller.profile.update({ username: 'takenuser' }),
      ).rejects.toThrow(expect.objectContaining({ code: 'CONFLICT' }));
   });

   it('throws NOT_FOUND if profile does not exist', async () => {
      mockFindFirst.mockResolvedValueOnce(undefined);

      const caller = createAuthenticatedCaller(user);
      await expect(
         caller.profile.update({ displayName: 'New Name' }),
      ).rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' }));
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createCaller();
      await expect(
         caller.profile.update({ displayName: 'New Name' }),
      ).rejects.toThrow(expect.objectContaining({ code: 'UNAUTHORIZED' }));
   });
});

// ── deleteAccount ───────────────────────

describe('profile.deleteAccount', () => {
   it('deletes profile image from Cloudinary when one exists', async () => {
      const profileWithImage = mockProfile({
         userId: user.id,
         profileImageUrl:
            'https://res.cloudinary.com/mock/image/upload/artfolio/profiles/avatar.jpg',
      });

      mockFindFirst.mockResolvedValueOnce(profileWithImage);
      mockPostFindMany.mockResolvedValueOnce([]);

      const caller = createAuthenticatedCaller(user);
      await caller.profile.deleteAccount();

      await vi.waitFor(() => {
         expect(mockDeleteImage).toHaveBeenCalledWith(
            'artfolio/profiles/avatar',
         );
      });
   });

   it('deletes all post images from Cloudinary', async () => {
      mockFindFirst.mockResolvedValueOnce(profile);
      mockPostFindMany.mockResolvedValueOnce([
         {
            images: [
               { publicId: 'artfolio/posts/image-1' },
               { publicId: 'artfolio/posts/image-2' },
            ],
         },
         {
            images: [{ publicId: 'artfolio/posts/image-3' }],
         },
      ]);

      const caller = createAuthenticatedCaller(user);
      await caller.profile.deleteAccount();

      await vi.waitFor(() => {
         expect(mockDeleteImage).toHaveBeenCalledWith('artfolio/posts/image-1');
         expect(mockDeleteImage).toHaveBeenCalledWith('artfolio/posts/image-2');
         expect(mockDeleteImage).toHaveBeenCalledWith('artfolio/posts/image-3');
      });
   });

   it('does not call deleteImage when profile has no image and no posts', async () => {
      mockFindFirst.mockResolvedValueOnce(profile); // profileImageUrl: null
      mockPostFindMany.mockResolvedValueOnce([]);

      const caller = createAuthenticatedCaller(user);
      await caller.profile.deleteAccount();

      expect(mockDeleteImage).not.toHaveBeenCalled();
   });

   it('throws NOT_FOUND if profile does not exist', async () => {
      mockFindFirst.mockResolvedValueOnce(undefined);

      const caller = createAuthenticatedCaller(user);
      await expect(caller.profile.deleteAccount()).rejects.toThrow(
         expect.objectContaining({ code: 'NOT_FOUND' }),
      );
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createCaller();
      await expect(caller.profile.deleteAccount()).rejects.toThrow(
         expect.objectContaining({ code: 'UNAUTHORIZED' }),
      );
   });
});

// ── setCommissionAvailability ───────────────────────

describe('profile.setCommissionAvailability', () => {
   it('toggles availableForCommissions correctly', async () => {
      const updated = mockProfile({
         userId: user.id,
         availableForCommissions: true,
      });
      mockUpdate.mockReturnValueOnce({
         set: vi.fn(() => ({
            where: vi.fn(() => ({
               returning: vi.fn().mockResolvedValueOnce([updated]),
            })),
         })),
      });

      const caller = createAuthenticatedCaller(user);
      const result = await caller.profile.setCommissionAvailability({
         available: true,
      });

      expect(result.availableForCommissions).toBe(true);
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createCaller();
      await expect(
         caller.profile.setCommissionAvailability({ available: true }),
      ).rejects.toThrow(expect.objectContaining({ code: 'UNAUTHORIZED' }));
   });
});

// ── getProfileImageUploadSignature ───────────────────────

describe('profile.getProfileImageUploadSignature', () => {
   it('returns all required Cloudinary fields', async () => {
      const caller = createAuthenticatedCaller(user);
      const result = await caller.profile.getProfileImageUploadSignature();

      expect(result).toHaveProperty('signature');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('folder');
      expect(result).toHaveProperty('apiKey');
      expect(result).toHaveProperty('cloudName');
   });

   it('throws UNAUTHORIZED if not signed in', async () => {
      const caller = createCaller();
      await expect(
         caller.profile.getProfileImageUploadSignature(),
      ).rejects.toThrow(expect.objectContaining({ code: 'UNAUTHORIZED' }));
   });
});
