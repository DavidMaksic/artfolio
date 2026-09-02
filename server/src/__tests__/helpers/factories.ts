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
      images: [
         {
            imageUrl: 'https://res.cloudinary.com/test/image.jpg',
            publicId: 'artfolio/posts/image',
            order: 0,
            width: 1200,
            height: 800,
         },
      ],
      ...overrides,
   };
}

export function mockUpdateTestPost(overrides = {}) {
   return {
      id: 'post_1',
      description: 'Updated description',
      categoryId: 'cat_illustration',
      tags: [],
      images: [
         {
            imageUrl: 'https://res.cloudinary.com/test/image.jpg',
            publicId: 'artfolio/posts/image',
            order: 0,
            width: 1200,
            height: 800,
         },
      ],
      removedImageIds: [],
      ...overrides,
   };
}

export function mockFeedPost(
   overrides?: Partial<{ createdAt: Date; id: string }>,
) {
   const id = overrides?.id ?? crypto.randomUUID();
   const createdAt = overrides?.createdAt;
   return {
      id,
      profileId: 'profile-1',
      description: 'Test post',
      categoryId: 'cat-1',
      createdAt,
      updatedAt: createdAt,
      images: [
         {
            id: 'img-1',
            postId: id,
            imageUrl: 'https://example.com/image.jpg',
            publicId: 'artfolio/posts/image',
            order: 0,
            width: 1200,
            height: 800,
            createdAt,
         },
      ],
      category: { id: 'cat-1', name: 'Illustration', slug: 'illustration' },
      postTags: [{ tag: { id: 'tag-1', name: 'digital', slug: 'digital' } }],
      profile: {
         username: 'alice',
         displayName: 'Alice',
         profileImageUrl: null,
      },
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
