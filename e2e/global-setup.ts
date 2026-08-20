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
   // any pre-suite DB seeding here
}

export async function cleanupTestUser(email: string) {
   await db.delete(user).where(eq(user.email, email));
}
