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
      title: 'Test Post',
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
      title: 'Test Post',
      categoryId: 'cat_illustration',
      tags: [],
      images: [
         {
            imageUrl: 'https://res.cloudinary.com/test/image.jpg',
            publicId: 'artfolio/posts/image',
            order: 0,
         },
      ],
      ...overrides,
   };
}
