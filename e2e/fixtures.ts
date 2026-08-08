import { test as base, expect } from '@playwright/test';
import { cleanupTestUser } from '@/global-setup.js';
import { getSignInOtp } from '@/test-helpers.js';

interface AuthFixture {
   email: string;
   emailSubmit: () => Promise<string>;
   loginViaMagicLink: () => Promise<void>;
}

interface Fixtures {
   auth: AuthFixture;
}

export const test = base.extend<Fixtures>({
   auth: async ({ page }, use, testInfo) => {
      const slug = testInfo.title.toLowerCase().replace(/\s+/g, '-');
      const email = `e2e+${slug}+${Date.now()}@test.com`;

      const emailSubmit = async () => {
         await page.goto('/auth/sign-in');
         await page.getByLabel('Email address').fill(email);
         await page
            .getByRole('button', { name: 'Continue with email' })
            .click();
         await expect(page).toHaveURL(/\/auth\/verify/);
         return getSignInOtp(email);
      };

      const loginViaMagicLink = async () => {
         const otp = await emailSubmit();
         await page.goto(
            `/auth/verify?email=${encodeURIComponent(email)}&code=${otp}`,
         );
      };

      await use({ email, emailSubmit, loginViaMagicLink });
      await cleanupTestUser(email);
   },
});

export { expect } from '@playwright/test';
