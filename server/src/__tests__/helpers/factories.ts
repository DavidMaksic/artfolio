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
