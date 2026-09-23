import { profile } from '@/db/schema/profile.js';

export function mockUser(overrides = {}) {
   return {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
   };
}

export function mockProfile(overrides = {}) {
   return {
      id: 'test-profile-id',
      userId: 'test-user-id',
      username: 'testuser',
      displayName: 'Test User',
      bio: null,
      profileImageUrl: null,
      location: null,
      website: null,
      availableForCommissions: false,
      profileSetupSkipped: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
   };
}

export function mockPost(overrides = {}) {
   return {
      id: 'post_1',
      profileId: 'test-profile-id',
      description: null,
      categoryId: 'cat_illustration',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
   };
}

export function mockImage(overrides = {}) {
   return {
      id: 'img_1',
      postId: 'post_1',
      imageUrl: 'https://res.cloudinary.com/test/image.jpg',
      publicId: 'artfolio/posts/image',
      order: 0,
      width: 1200,
      height: 800,
      createdAt: new Date(),
      ...overrides,
   };
}

export function mockCategory(overrides = {}) {
   return {
      id: 'cat_illustration',
      name: 'Illustration',
      slug: 'illustration',
      ...overrides,
   };
}

export function mockTestPost(overrides = {}) {
   return {
      description: 'Test post description',
      categoryId: 'cat_illustration',
      tags: [],
      images: [mockImage()],
      ...overrides,
   };
}

export function mockUpdateTestPost(overrides = {}) {
   return {
      id: 'post_1',
      description: 'Updated description',
      categoryId: 'cat_illustration',
      tags: [],
      images: [mockImage()],
      removedImageIds: [],
      ...overrides,
   };
}

export function mockFeedPost(overrides = {}) {
   return {
      id: crypto.randomUUID(),
      profileId: 'other-profile-id',
      categoryId: 'cat-1',
      createdAt: new Date(),
      description: null,
      images: [mockImage()],
      category: { id: 'cat-1', name: 'Illustration' },
      postTags: [],
      profile: {
         username: 'otheruser',
         displayName: 'Other User',
         profileImageUrl: null,
      },
      likes: [],
      bookmarks: [],
      comments: [],
      ...overrides,
   };
}

export function mockPosts(
   count: number,
   baseDate = new Date('2024-06-01T12:00:00Z'),
) {
   return Array.from({ length: count }, (_, i) =>
      mockFeedPost({
         id: `post-${i}`,
         // Each post is 1 minute older than the previous — gives distinct cursors
         createdAt: new Date(baseDate.getTime() - i * 60_000),
      }),
   );
}

export function mockComment(overrides = {}) {
   return {
      id: 'test-comment-id',
      postId: 'test-post-id',
      profileId: 'test-profile-id',
      body: 'Great post!',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      profile: {
         username: 'testuser',
         displayName: 'Test User',
         profileImageUrl: null,
      },
      post: {
         profileId: 'test-profile-id',
      },
      ...overrides,
   };
}

export function mockDiscussionComment(overrides = {}) {
   return mockComment({
      post: {
         images: [mockImage()],
      },
      ...overrides,
   });
}

export function mockFollowRow(overrides = {}) {
   return {
      followerId: profile.id,
      followingId: 'other-profile-id',
      createdAt: new Date(),
      ...overrides,
   };
}

export function mockSearchPost(overrides = {}) {
   return {
      id: crypto.randomUUID(),
      profileId: 'default-profile-id',
      categoryId: 'cat-1',
      createdAt: new Date(),
      description: null,
      images: [mockImage()],
      imageCount: 1,
      category: { id: 'cat-1', name: 'Photography', slug: 'photography' },
      postTags: [],
      profile: {
         username: 'testuser',
         displayName: 'Test User',
         profileImageUrl: null,
      },
      ...overrides,
   };
}
