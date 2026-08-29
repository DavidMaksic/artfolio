import { getProfileByUserId, getProfileByUsername } from '@/trpc/helpers.js';
import { usernameSchema, updateProfileSchema } from '@artfolio/shared';
import { cloudinary, getImageColors } from '@/lib/cloudinary.js';
import { protectedProcedure } from '@/trpc/middleware.js';
import { TRPCError } from '@trpc/server';
import { profile } from '@/db/schema/profile.js';
import { db } from '@/db/index.js';
import { eq } from 'drizzle-orm';
import { t } from '@/trpc/init.js';
import { z } from 'zod';

export const profileRouter = t.router({
   getMe: protectedProcedure.query(async ({ ctx }) =>
      getProfileByUserId(ctx.user.id),
   ),

   getByUsername: t.procedure
      .input(z.object({ username: usernameSchema }))
      .query(async ({ input }) => getProfileByUsername(input.username)),

   update: protectedProcedure
      .input(updateProfileSchema)
      .mutation(async ({ ctx, input }) => {
         const existing = await getProfileByUserId(ctx.user.id);

         if (input.username && input.username !== existing.username) {
            const taken = await db.query.profile.findFirst({
               where: eq(profile.username, input.username),
            });
            if (taken)
               throw new TRPCError({
                  code: 'CONFLICT',
                  message: 'Username is already taken.',
               });
         }

         const [updated] = await db
            .update(profile)
            .set({ ...input, updatedAt: new Date() })
            .where(eq(profile.userId, ctx.user.id))
            .returning();

         return updated;
      }),

   setCommissionAvailability: protectedProcedure
      .input(z.object({ available: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
         const [updated] = await db
            .update(profile)
            .set({
               availableForCommissions: input.available,
               updatedAt: new Date(),
            })
            .where(eq(profile.userId, ctx.user.id))
            .returning();

         if (!updated)
            throw new TRPCError({
               code: 'NOT_FOUND',
               message: 'Profile not found.',
            });

         return { availableForCommissions: updated.availableForCommissions };
      }),

   getProfileImageUploadSignature: protectedProcedure.mutation(({ ctx }) => {
      const timestamp = Math.round(Date.now() / 1000);

      const params = {
         timestamp,
         folder: `artfolio/profile-images/${ctx.user.id}`,
         transformation: 'c_fill,w_400,h_400,q_auto,f_auto',
      };

      const signature = cloudinary.utils.api_sign_request(
         params,
         process.env.CLOUDINARY_API_SECRET!,
      );

      return {
         signature,
         timestamp,
         folder: params.folder,
         transformation: params.transformation,
         apiKey: process.env.CLOUDINARY_API_KEY!,
         cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
      };
   }),

   getProfilePalette: t.procedure
      .input(z.object({ profileImageUrl: z.url() }))
      .query(async ({ input }) => {
         const match = input.profileImageUrl.match(
            /\/upload\/(?:v\d+\/)?(.+?)(?:\.[^/.]+)?$/,
         );

         const publicId = match?.[1];
         if (!publicId) return { colors: [] };

         const colors = await getImageColors(publicId);
         return { colors };
      }),
});
