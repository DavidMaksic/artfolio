import { category } from '@artfolio/server/db/schema/post.js';
import { user } from '@artfolio/server/db/schema/auth.js';
import { db } from '@artfolio/server/db/index.js';
import { eq } from 'drizzle-orm';

// Load server's env variables
import dotenv from 'dotenv';
import path from 'path';
if (!process.env.CI) {
   dotenv.config({ path: path.resolve('server/.env') });
}

export default async function globalSetup() {
   await seedCategories();
}

export async function seedCategories() {
   await db
      .insert(category)
      .values([
         { id: 'cat_illustration', name: 'Illustration', slug: 'illustration' },
      ])
      .onConflictDoNothing();
}

export async function cleanupTestUser(email: string) {
   await db.delete(user).where(eq(user.email, email));
}
