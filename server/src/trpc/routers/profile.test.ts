import {
   createCaller,
   createAuthenticatedCaller,
} from '@/__tests__/helpers/trpc-helper.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockUser, mockProfile } from '@/__tests__/helpers/factories.js';

// Mock the db module
vi.mock('@/db/index.js', () => ({
   db: {
      query: {
         profile: {
            findFirst: vi.fn(),
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

// Mock cloudinary
vi.mock('@/lib/cloudinary.js', () => ({
   cloudinary: {
      utils: {
         api_sign_request: vi.fn(() => 'mock-signature'),
      },
   },
}));

import { db } from '@/db/index.js';

const mockFindFirst = db.query.profile.findFirst as ReturnType<typeof vi.fn>;
const mockUpdate = db.update as ReturnType<typeof vi.fn>;

beforeEach(() => {
   vi.clearAllMocks();
});

// ── getMe ───────────────────────

describe('profile.getMe', () => {
   it('returns the profile for the authenticated user', async () => {
      const user = mockUser();
      const profile = mockProfile({ userId: user.id });
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

      const caller = createAuthenticatedCaller(mockUser());
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
      const profile = mockProfile();
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
      const user = mockUser();
      const existing = mockProfile({ userId: user.id });
      const updated = { ...existing, displayName: 'New Name' };

      mockFindFirst.mockResolvedValueOnce(existing);
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

   it('throws CONFLICT if username is already taken', async () => {
      const user = mockUser();
      const existing = mockProfile({ userId: user.id });
      const taken = mockProfile({
         userId: 'other-user-id',
         username: 'takenuser',
      });

      // first findFirst returns existing, second returns taken
      mockFindFirst
         .mockResolvedValueOnce(existing)
         .mockResolvedValueOnce(taken);

      const caller = createAuthenticatedCaller(user);
      await expect(
         caller.profile.update({ username: 'takenuser' }),
      ).rejects.toThrow(expect.objectContaining({ code: 'CONFLICT' }));
   });

   it('throws NOT_FOUND if profile does not exist', async () => {
      mockFindFirst.mockResolvedValueOnce(undefined);

      const caller = createAuthenticatedCaller(mockUser());
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

// ── setCommissionAvailability ───────────────────────

describe('profile.setCommissionAvailability', () => {
   it('toggles availableForCommissions correctly', async () => {
      const user = mockUser();
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
      const caller = createAuthenticatedCaller(mockUser());
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
