import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCaller } from '@/__tests__/helpers/trpc-helper.js';
import { mockCategory } from '@/__tests__/helpers/factories.js';
import { db } from '@/db/index.js';

vi.mock('@/db/index.js', () => ({
   db: {
      select: vi.fn(),
   },
}));

const mockSelect = db.select as ReturnType<typeof vi.fn>;

beforeEach(() => {
   vi.clearAllMocks();
});

// ── getTrending ───────────────────────────────────────────────

describe('tag.getTrending', () => {
   it('returns up to 4 trending tags', async () => {
      const tags = Array.from({ length: 4 }, (_, i) => ({
         id: `tag-${i}`,
         name: `Tag ${i}`,
         slug: `tag-${i}`,
         count: 10 - i,
      }));

      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
               groupBy: vi.fn(() => ({
                  orderBy: vi.fn(() => ({
                     limit: vi.fn().mockResolvedValue(tags),
                  })),
               })),
            })),
         })),
      });

      const caller = createCaller();
      const result = await caller.tag.getTrending();

      expect(result.tags).toHaveLength(4);
      expect(result.tags[0].name).toBe('Tag 0');
   });

   it('returns empty when no tags exist', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
               groupBy: vi.fn(() => ({
                  orderBy: vi.fn(() => ({
                     limit: vi.fn().mockResolvedValue([]),
                  })),
               })),
            })),
         })),
      });

      const caller = createCaller();
      const result = await caller.tag.getTrending();

      expect(result.tags).toHaveLength(0);
   });
});

// ── getCategories ───────────────────────────────────────────────

describe('tag.getCategories', () => {
   it('returns all categories', async () => {
      const categories = [
         mockCategory(),
         mockCategory({
            id: 'cat_photography',
            name: 'Photography',
            slug: 'photography',
         }),
      ];

      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            orderBy: vi.fn().mockResolvedValue(categories),
         })),
      });

      const caller = createCaller();
      const result = await caller.tag.getCategories();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Illustration');
   });

   it('returns empty when no categories exist', async () => {
      mockSelect.mockReturnValueOnce({
         from: vi.fn(() => ({
            orderBy: vi.fn().mockResolvedValue([]),
         })),
      });

      const caller = createCaller();
      const result = await caller.tag.getCategories();

      expect(result).toHaveLength(0);
   });
});
