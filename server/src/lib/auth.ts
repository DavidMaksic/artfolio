import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth/minimal';
import { db } from '@/db/index.js';

export const auth = betterAuth({
   database: drizzleAdapter(db, {
      provider: 'pg',
   }),
});
