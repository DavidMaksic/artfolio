import { buildSignInEmail, buildWelcomeEmail } from './emails/auth-email.js';
import { betterAuth, generateId } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP } from 'better-auth/plugins';
import { resend } from './resend.js';
import { redis } from './redis.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema/index.js';

const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';
const FROM_EMAIL = 'onboarding@resend.dev';

export const auth = betterAuth({
   database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
         user: schema.user,
         session: schema.session,
         account: schema.account,
         verification: schema.verification,
      },
   }),

   secondaryStorage: {
      get: async (key) => {
         const value = await redis.get(key);
         return value ?? null;
      },
      set: async (key, value, ttl) => {
         if (ttl) {
            await redis.set(key, value, 'EX', ttl);
         } else {
            await redis.set(key, value);
         }
      },
      delete: async (key) => {
         await redis.del(key);
      },

      getAndDelete: async (key) => {
         const value = await redis.getdel(key);
         return value ?? null;
      },
   },

   plugins: [
      emailOTP({
         otpLength: 6,
         expiresIn: 600, // 10 minutes

         // Single email carries both the OTP code and a "magic link"
         async sendVerificationOTP({ email, otp }) {
            const params = new URLSearchParams({ email, code: otp });
            const magicLinkUrl = `${CLIENT_URL}/auth/verify?${params}`;

            await resend.emails.send({
               from: FROM_EMAIL,
               to: email,
               subject: 'Your Artfolio sign-in code',
               html: buildSignInEmail({ otp, magicLinkUrl }),
            });
         },
      }),
   ],

   socialProviders: {
      google: {
         clientId: process.env.GOOGLE_CLIENT_ID!,
         clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
      discord: {
         clientId: process.env.DISCORD_CLIENT_ID!,
         clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      },
   },

   databaseHooks: {
      user: {
         create: {
            after: async (user) => {
               // Fire-and-forget: create an empty profile row
               await db.insert(schema.profile).values({
                  id: generateId(),
                  userId: user.id,
                  username: `user_${user.id.slice(0, 8)}`,
                  availableForCommissions: false,
                  createdAt: new Date(),
                  updatedAt: new Date(),
               });

               // Fire-and-forget: send welcome email
               resend.emails
                  .send({
                     from: FROM_EMAIL,
                     to: user.email,
                     subject: 'Welcome to Artfolio 🎨',
                     html: buildWelcomeEmail(user.name),
                  })
                  .catch((err) => {
                     console.error('[auth] Failed to send welcome email:', err);
                  });
            },
         },
      },
   },

   user: {
      deleteUser: {
         enabled: true,
      },
   },

   trustedOrigins: [CLIENT_URL],
});

export type Auth = typeof auth;
