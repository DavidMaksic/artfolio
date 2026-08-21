import 'dotenv/config';
import { category } from '@/db/schema/post.js';
import { db } from '@/db/index.js';

const categories = [
   { id: 'cat_illustration', name: 'Illustration', slug: 'illustration' },
   { id: 'cat_photography', name: 'Photography', slug: 'photography' },
   { id: 'cat_3d', name: '3D', slug: '3d' },
   { id: 'cat_animation', name: 'Animation', slug: 'animation' },
   { id: 'cat_graphic_design', name: 'Graphic Design', slug: 'graphic-design' },
   {
      id: 'cat_character_design',
      name: 'Character Design',
      slug: 'character-design',
   },
   { id: 'cat_concept_art', name: 'Concept Art', slug: 'concept-art' },
   { id: 'cat_typography', name: 'Typography', slug: 'typography' },
   { id: 'cat_ui_ux', name: 'UI / UX', slug: 'ui-ux' },
   { id: 'cat_other', name: 'Other', slug: 'other' },
];

async function seed() {
   console.log('Seeding categories...');

   await db.insert(category).values(categories).onConflictDoNothing();

   console.log('Done.');
   process.exit(0);
}

seed().catch((err) => {
   console.error(err);
   process.exit(1);
});
