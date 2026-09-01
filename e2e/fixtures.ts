import { test as base, expect, Page, TestInfo } from '@playwright/test';
import { cleanupTestUser } from '@/global-setup.js';
import { getSignInOtp } from '@/test-helpers.js';

interface AuthFixture {
   email: string;
   username: string;
   displayName: string;
   emailSubmit: () => Promise<string>;
   signInViaMagicLink: () => Promise<void>;
}

interface Fixtures {
   auth: AuthFixture;
   secondAuth: AuthFixture;
}

function createAuthFixture(
   page: Page,
   testInfo: TestInfo,
   suffix: string = '',
) {
   const slug = testInfo.title.toLowerCase().replace(/\s+/g, '-');
   const tag = `${Date.now()}${suffix}`;
   const email = `e2e+${slug}+${tag}@test.com`;
   const username = `user${tag}`;
   const displayName = `Test User ${tag}`;

   const emailSubmit = async () => {
      await page.goto('/auth/sign-in');
      await page.getByLabel('Email address').fill(email);
      await page.getByRole('button', { name: 'Continue with email' }).click();
      await expect(page).toHaveURL(/\/auth\/verify/);
      return getSignInOtp(email);
   };

   const signInViaMagicLink = async () => {
      const otp = await emailSubmit();
      await page.goto(
         `/auth/verify?email=${encodeURIComponent(email)}&code=${otp}`,
      );
   };

   return { email, username, displayName, emailSubmit, signInViaMagicLink };
}

export const test = base.extend<Fixtures>({
   auth: async ({ page }, use, testInfo) => {
      const fixture = createAuthFixture(page, testInfo);
      await use(fixture);
      await cleanupTestUser(fixture.email);
   },
   secondAuth: async ({ page }, use, testInfo) => {
      const fixture = createAuthFixture(page, testInfo, 'b');
      await use(fixture);
      await cleanupTestUser(fixture.email);
   },
});

export { expect } from '@playwright/test';
