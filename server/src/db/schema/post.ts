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
   title: text().notNull(),
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

export const profileRelations = relations(profile, ({ many }) => ({
   posts: many(post),
}));
