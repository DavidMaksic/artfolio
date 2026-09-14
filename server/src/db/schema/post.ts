import {
   primaryKey,
   timestamp,
   pgTable,
   integer,
   text,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { profile } from './profile.js';

export const post = pgTable('post', {
   id: text().primaryKey(),
   profileId: text()
      .notNull()
      .references(() => profile.id, { onDelete: 'cascade' }),
   description: text(),
   categoryId: text()
      .notNull()
      .references(() => category.id),
   createdAt: timestamp().notNull(),
   updatedAt: timestamp().notNull(),
});

export const postImage = pgTable('post_image', {
   id: text().primaryKey(),
   postId: text()
      .notNull()
      .references(() => post.id, { onDelete: 'cascade' }),
   imageUrl: text().notNull(),
   publicId: text().notNull(),
   order: integer().notNull().default(0),
   width: integer().notNull(),
   height: integer().notNull(),
   createdAt: timestamp().notNull(),
});

export const category = pgTable('category', {
   id: text().primaryKey(),
   name: text().notNull().unique(),
   slug: text().notNull().unique(),
});

export const tag = pgTable('tag', {
   id: text().primaryKey(),
   name: text().notNull().unique(),
   slug: text().notNull().unique(),
});

// Junction table

export const postTag = pgTable(
   'post_tag',
   {
      postId: text()
         .notNull()
         .references(() => post.id, { onDelete: 'cascade' }),
      tagId: text()
         .notNull()
         .references(() => tag.id, { onDelete: 'cascade' }),
   },
   (t) => [primaryKey({ columns: [t.postId, t.tagId] })],
);

export const like = pgTable(
   'like',
   {
      postId: text()
         .notNull()
         .references(() => post.id, { onDelete: 'cascade' }),
      profileId: text()
         .notNull()
         .references(() => profile.id, { onDelete: 'cascade' }),
      createdAt: timestamp().notNull(),
   },
   (t) => [primaryKey({ columns: [t.postId, t.profileId] })],
);

export const bookmark = pgTable(
   'bookmark',
   {
      postId: text()
         .notNull()
         .references(() => post.id, { onDelete: 'cascade' }),
      profileId: text()
         .notNull()
         .references(() => profile.id, { onDelete: 'cascade' }),
      createdAt: timestamp().notNull(),
   },
   (t) => [primaryKey({ columns: [t.postId, t.profileId] })],
);

export const comment = pgTable('comment', {
   id: text().primaryKey(),
   postId: text()
      .notNull()
      .references(() => post.id, { onDelete: 'cascade' }),
   profileId: text()
      .notNull()
      .references(() => profile.id, { onDelete: 'cascade' }),
   body: text().notNull(),
   createdAt: timestamp().notNull(),
   updatedAt: timestamp().notNull(),
});

// Relations

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
}));
