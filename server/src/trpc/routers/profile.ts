import {
   extractPublicId,
   getViewerProfileId,
   getProfileByUserId,
} from '@/trpc/helpers.js';
import { cloudinary, deleteImage, getImageColors } from '@/lib/cloudinary.js';
import { usernameSchema, updateProfileSchema } from '@artfolio/shared';
import { protectedProcedure } from '@/trpc/middleware.js';
import { TRPCError } from '@trpc/server';
import { follow, profile } from '@/db/schema/profile.js';
import { and, eq } from 'drizzle-orm';
import { post } from '@/db/schema/post.js';
import { db } from '@/db/index.js';
import { t } from '@/trpc/init.js';
import { z } from 'zod';

export const profileRouter = t.router({
   getMe: protectedProcedure.query(async ({ ctx }) =>
      getProfileByUserId(ctx.user.id),
   ),

   getByUsername: t.procedure
      .input(z.object({ username: usernameSchema }))
      .query(async ({ ctx, input }) => {
         const viewerProfileId = await getViewerProfileId(ctx.user?.id ?? null);

         const userProfile = await db.query.profile.findFirst({
            where: eq(profile.username, input.username),
         });

         if (!userProfile) {
            throw new TRPCError({
               code: 'NOT_FOUND',
               message: 'Profile not found',
            });
         }

         const [followerCount, followingCount] = await Promise.all([
            db.$count(follow, eq(follow.followingId, userProfile.id)),
            db.$count(follow, eq(follow.followerId, userProfile.id)),
         ]);

         let userIsFollowing = false;
         if (viewerProfileId && viewerProfileId !== userProfile.id) {
            const existing = await db.query.follow.findFirst({
               where: and(
                  eq(follow.followerId, viewerProfileId),
                  eq(follow.followingId, userProfile.id),
               ),
            });
            userIsFollowing = !!existing;
         }

         return {
            ...userProfile,
            followerCount,
            followingCount,
            userIsFollowing,
         };
      }),

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

         // Fire-and-forget cleanup of old profile image
         if (
            input.profileImageUrl &&
            existing.profileImageUrl &&
            input.profileImageUrl !== existing.profileImageUrl
         ) {
            const publicId = extractPublicId(existing.profileImageUrl);
            if (publicId) {
               deleteImage(publicId).catch(console.error);
            }
         }

         const [updated] = await db
            .update(profile)
            .set({ ...input, updatedAt: new Date() })
            .where(eq(profile.userId, ctx.user.id))
            .returning();

         return updated;
      }),

   deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
      const existing = await getProfileByUserId(ctx.user.id);

      if (existing.profileImageUrl) {
         const publicId = extractPublicId(existing.profileImageUrl);
         if (publicId) {
            deleteImage(publicId).catch(console.error);
         }
      }

      const userPosts = await db.query.post.findMany({
         where: eq(post.profileId, existing.id),
         with: { images: true },
      });

      const postImages = userPosts.flatMap((p) => p.images);

      if (postImages.length > 0) {
         Promise.all(postImages.map((img) => deleteImage(img.publicId))).catch(
            console.error,
         );
      }
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
