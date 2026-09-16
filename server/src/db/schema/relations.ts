import {
   tag,
   like,
   post,
   comment,
   postTag,
   category,
   bookmark,
   postImage,
} from '@/db/schema/post.js';
import { relations } from 'drizzle-orm';
import { profile } from './profile.js';
import { follow } from '@/db/schema/profile.js';

export const postRelations = relations(post, ({ one, many }) => ({
   profile: one(profile, {
      fields: [post.profileId],
      references: [profile.id],
   }),
   category: one(category, {
      fields: [post.categoryId],
      references: [category.id],
   }),
   images: many(postImage),
   postTags: many(postTag),
   likes: many(like),
   bookmarks: many(bookmark),
   comments: many(comment),
}));

export const postImageRelations = relations(postImage, ({ one }) => ({
   post: one(post, { fields: [postImage.postId], references: [post.id] }),
}));

export const categoryRelations = relations(category, ({ many }) => ({
   posts: many(post),
}));

export const tagRelations = relations(tag, ({ many }) => ({
   postTags: many(postTag),
}));

export const postTagRelations = relations(postTag, ({ one }) => ({
   post: one(post, { fields: [postTag.postId], references: [post.id] }),
   tag: one(tag, { fields: [postTag.tagId], references: [tag.id] }),
}));

export const likeRelations = relations(like, ({ one }) => ({
   post: one(post, { fields: [like.postId], references: [post.id] }),
   profile: one(profile, {
      fields: [like.profileId],
      references: [profile.id],
   }),
}));

export const bookmarkRelations = relations(bookmark, ({ one }) => ({
   post: one(post, { fields: [bookmark.postId], references: [post.id] }),
   profile: one(profile, {
      fields: [bookmark.profileId],
      references: [profile.id],
   }),
}));

export const commentRelations = relations(comment, ({ one }) => ({
   post: one(post, { fields: [comment.postId], references: [post.id] }),
   profile: one(profile, {
      fields: [comment.profileId],
      references: [profile.id],
   }),
}));

export const profileRelations = relations(profile, ({ many }) => ({
   posts: many(post),
   likes: many(like),
   bookmarks: many(bookmark),
   comments: many(comment),
   followers: many(follow, { relationName: 'profileFollowers' }),
   following: many(follow, { relationName: 'profileFollowing' }),
}));

export const followRelations = relations(follow, ({ one }) => ({
   follower: one(profile, {
      fields: [follow.followerId],
      references: [profile.id],
      relationName: 'profileFollowing',
   }),
   followed: one(profile, {
      fields: [follow.followingId],
      references: [profile.id],
      relationName: 'profileFollowers',
   }),
}));
