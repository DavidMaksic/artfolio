import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';
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
   createdAt: timestamp().notNull(),
   updatedAt: timestamp().notNull(),
});
