import { z } from 'zod';

// ── Shared schemas ────────────────────────────────────────

export const postImageSchema = z.object({
   id: z.string(),
   imageUrl: z.string(),
   publicId: z.string(),
   order: z.number(),
   width: z.number(),
   height: z.number(),
   createdAt: z.date(),
});

const imageInputSchema = z.object({
   imageUrl: z.string({ error: 'Image URL is required' }),
   publicId: z.string({ error: 'Public ID is required' }),
   order: z.number().int().min(0),
   width: z.number().int().positive(),
   height: z.number().int().positive(),
});

const categorySchema = z.object({
   id: z.string(),
   name: z.string(),
   slug: z.string(),
});

const tagSchema = z.object({
   id: z.string(),
   name: z.string(),
   slug: z.string(),
});

const profileSchema = z.object({
   username: z.string(),
   displayName: z.string().nullable(),
   profileImageUrl: z.string().nullable(),
   userIsFollowing: z.boolean(),
});

// ── Engagement ────────────────────────────────────────

export const engagementSchema = z.object({
   likeCount: z.number(),
   bookmarkCount: z.number(),
   commentCount: z.number(),
   userHasLiked: z.boolean(),
   userHasBookmarked: z.boolean(),
});

// ── Input schemas ────────────────────────────────────────

export const createPostSchema = z.object({
   description: z.string().max(2000).optional(),
   categoryId: z.string({ error: 'Category is required' }),
   tags: z.array(z.string().min(1).max(30)).max(10).default([]),
   images: z
      .array(imageInputSchema)
      .min(1, {
         error: 'At least one image is required',
      })
      .max(10),
});

export const updatePostSchema = createPostSchema.extend({
   id: z.string(),
   removedImageIds: z.array(z.string()).default([]),
});

export const feedInputSchema = z.object({
   limit: z.number().int().min(1).max(50).default(20),
   cursor: z.string().optional(),
});

export const sortSchema = z.enum(['new', 'popular']);

export const exploreInputSchema = z.object({
   limit: z.number().int().min(1).max(50).default(20),
   cursor: z.string().optional(),
   sort: sortSchema.default('new'),
   category: z.string().optional(),
   excludeOwn: z.boolean().default(false),
});

export const searchInputSchema = feedInputSchema.extend({
   query: z.string().min(1).max(100).trim(),
   sort: sortSchema.default('new'),
   category: z.string().optional(),
});

// ── Post response schemas ────────────────────────────────────────

const postSummarySchema = z.object({
   id: z.string(),
   profileId: z.string(),
   categoryId: z.string(),
   createdAt: z.date(),
   coverImage: postImageSchema,
   description: z.string().nullable().optional(),
   imageCount: z.number(),
   category: categorySchema,
   tags: z.array(tagSchema),
});

export const postSchema = postSummarySchema.extend(engagementSchema.shape);
export const feedItemSchema = postSchema.extend({
   profile: profileSchema,
});
export const searchResultSchema = postSummarySchema.extend({
   profile: profileSchema,
});

// ── Full post detail ────────────────────────────────────────

export const postDetailSchema = z
   .object({
      id: z.string(),
      profileId: z.string(),
      description: z.string().nullable(),
      categoryId: z.string(),
      createdAt: z.date(),
      updatedAt: z.date(),
      images: z.array(postImageSchema),
      category: categorySchema,
      tags: z.array(tagSchema),
   })
   .extend(engagementSchema.shape)
   .extend({
      profile: profileSchema,
   });

// ── Comment schemas ────────────────────────────────────────

export const commentSchema = z.object({
   id: z.string(),
   postId: z.string(),
   body: z.string(),
   createdAt: z.date(),
   profile: profileSchema,
});

export const createCommentSchema = z.object({
   postId: z.string(),
   body: z.string().min(1).max(1000),
});

export const deleteCommentSchema = z.object({
   commentId: z.string(),
   postId: z.string(),
});

export const getCommentsSchema = z.object({
   postId: z.string(),
   limit: z.number().int().min(1).max(50).default(20),
   cursor: z.string().optional(),
});

export const discussionItemSchema = z.object({
   id: z.string(),
   body: z.string(),
   postId: z.string(),
   coverImage: postImageSchema,
   profile: z.object({
      username: z.string(),
      displayName: z.string().nullable(),
      profileImageUrl: z.string().nullable(),
   }),
});

// ── Types ────────────────────────────────────────

export type Post = z.infer<typeof postSchema>;
export type PostDetail = z.infer<typeof postDetailSchema>;
export type FeedItem = z.infer<typeof feedItemSchema>;
export type FeedInput = z.infer<typeof feedInputSchema>;

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

export type Comment = z.infer<typeof commentSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>;
export type GetCommentsInput = z.infer<typeof getCommentsSchema>;
export type DiscussionItem = z.infer<typeof discussionItemSchema>;

export type SearchResult = z.infer<typeof searchResultSchema>;
export type SearchInput = z.infer<typeof searchInputSchema>;
export type Sort = z.infer<typeof sortSchema>;
export type ExploreInput = z.infer<typeof exploreInputSchema>;
