import { post, postTag, tag } from '@/db/schema/post.js';
import { TRPCError } from '@trpc/server';
import { profile } from '@/db/schema/profile.js';
import { db } from '@/db/index.js';
import { eq } from 'drizzle-orm';

export async function getProfileByUserId(userId: string) {
   const userProfile = await db.query.profile.findFirst({
      where: eq(profile.userId, userId),
   });

   if (!userProfile) {
      throw new TRPCError({
         code: 'NOT_FOUND',
         message: 'Profile not found',
      });
   }

   return userProfile;
}

export async function getProfileByUsername(username: string) {
   const userProfile = await db.query.profile.findFirst({
      where: eq(profile.username, username),
   });

   if (!userProfile) {
      throw new TRPCError({
         code: 'NOT_FOUND',
         message: 'Profile not found',
      });
   }

   return userProfile;
}

export async function assertPostOwner(postId: string, profileId: string) {
   const existing = await db.query.post.findFirst({
      where: eq(post.id, postId),
   });

   if (!existing)
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' });

   if (existing.profileId !== profileId)
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your post' });

   return existing;
}

export async function upsertTagsForPost(
   tx: any,
   postId: string,
   tagNames: string[],
) {
   await tx.delete(postTag).where(eq(postTag.postId, postId));

   for (const tagName of tagNames) {
      const slug = tagName.toLowerCase().replace(/\s+/g, '-');
      const existingTag = await tx.query.tag.findFirst({
         where: eq(tag.slug, slug),
      });

      let tagId: string;

      if (existingTag) {
         tagId = existingTag.id;
      } else {
         tagId = crypto.randomUUID();
         await tx.insert(tag).values({ id: tagId, name: tagName, slug });
      }

      await tx.insert(postTag).values({ postId, tagId });
   }
}
