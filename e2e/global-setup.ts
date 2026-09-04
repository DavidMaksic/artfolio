import { v2 as cloudinary } from 'cloudinary';
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

export async function cleanupCloudinaryFolder(folder: string) {
   cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
   });

   const { resources } = await cloudinary.api.resources({
      type: 'upload',
      prefix: folder,
      max_results: 500,
   });

   if (resources.length === 0) return;

   const publicIds = resources.map((r: { public_id: string }) => r.public_id);
   await cloudinary.api.delete_resources(publicIds);
}
