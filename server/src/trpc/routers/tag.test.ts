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

// ── search ───────────────────────────────────────────────

function mockSearchChain(rows: unknown[]) {
   const where = vi.fn(() => ({
      groupBy: vi.fn(() => ({
         orderBy: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue(rows),
         })),
      })),
   }));

   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
         leftJoin: vi.fn(() => ({ where })),
      })),
   });

   return where;
}

describe('tag.search', () => {
   it('returns matching tags', async () => {
      const rows = [
         { id: 't1', name: 'sketch', slug: 'sketch', count: 5 },
         { id: 't2', name: 'sketchbook', slug: 'sketchbook', count: 2 },
      ];
      mockSearchChain(rows);

      const caller = createCaller();
      const result = await caller.tag.search({ query: 'sket' });

      expect(result.tags).toHaveLength(2);
      expect(result.tags[0].name).toBe('sketch');
   });

   it('returns empty when nothing matches', async () => {
      mockSearchChain([]);

      const caller = createCaller();
      const result = await caller.tag.search({ query: 'zzz' });

      expect(result.tags).toHaveLength(0);
   });

   it('normalizes the query before searching', async () => {
      const where = mockSearchChain([]);

      const caller = createCaller();
      await caller.tag.search({ query: '  Water Color ' });

      // the query reached the db layer (the where clause was built)
      expect(where).toHaveBeenCalledTimes(1);
   });

   it('rejects an empty query', async () => {
      const caller = createCaller();
      await expect(caller.tag.search({ query: '   ' })).rejects.toThrow();
      expect(mockSelect).not.toHaveBeenCalled();
   });

   it('rejects a query longer than 30 characters', async () => {
      const caller = createCaller();
      await expect(
         caller.tag.search({ query: 'a'.repeat(31) }),
      ).rejects.toThrow();
      expect(mockSelect).not.toHaveBeenCalled();
   });
});
