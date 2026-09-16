import {
   text,
   boolean,
   pgTable,
   timestamp,
   primaryKey,
} from 'drizzle-orm/pg-core';
import { user } from './auth.js';

export const profile = pgTable('profile', {
   id: text().primaryKey(),
   userId: text()
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),
   username: text().notNull().unique(),
   displayName: text(),
   bio: text(),
   profileImageUrl: text(),
   location: text(),
   website: text(),
   availableForCommissions: boolean().notNull().default(false),
   profileSetupSkipped: boolean().notNull().default(false),
   createdAt: timestamp().notNull(),
   updatedAt: timestamp().notNull(),
});

// Junction table

export const follow = pgTable(
   'follow',
   {
      followerId: text()
         .notNull()
         .references(() => profile.id, { onDelete: 'cascade' }),
      followingId: text()
         .notNull()
         .references(() => profile.id, { onDelete: 'cascade' }),
   },
   (t) => [primaryKey({ columns: [t.followerId, t.followingId] })],
);
