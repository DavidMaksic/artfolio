import {
   primaryKey,
   timestamp,
   pgTable,
   integer,
   text,
} from 'drizzle-orm/pg-core';
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

// Junction tables

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
