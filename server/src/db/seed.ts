import 'dotenv/config';
import { category, post } from '@/db/schema/post.js';
import { notInArray } from 'drizzle-orm';
import { db } from '@/db/index.js';

const categories = [
   { id: 'cat_illustration', name: 'Illustration', slug: 'illustration' },
   { id: 'cat_traditional', name: 'Traditional', slug: 'traditional' },
   { id: 'cat_digital', name: 'Digital', slug: 'digital' },
   { id: 'cat_photography', name: 'Photography', slug: 'photography' },
   { id: 'cat_3d', name: '3D', slug: '3d' },
   { id: 'cat_animation', name: 'Animation', slug: 'animation' },
   {
      id: 'cat_character_design',
      name: 'Character Design',
      slug: 'character-design',
   },
   { id: 'cat_concept_art', name: 'Concept Art', slug: 'concept-art' },
   { id: 'cat_typography', name: 'Typography', slug: 'typography' },
   { id: 'cat_other', name: 'Other', slug: 'other' },
];

async function seed() {
   console.log('Seeding categories...');

   const slugs = categories.map((c) => c.slug);
   const ids = categories.map((c) => c.id);

   // 1. Reassign posts in removed categories to "other"
   await db
      .update(post)
      .set({ categoryId: 'cat_other' })
      .where(notInArray(post.categoryId, ids));

   // 2. Remove categories no longer in the list
   await db.delete(category).where(notInArray(category.slug, slugs));

   // 3. Upsert current list
   await db.insert(category).values(categories).onConflictDoNothing();

   console.log('Done.');
   process.exit(0);
}

seed().catch((err) => {
   console.error(err);
   process.exit(1);
});
