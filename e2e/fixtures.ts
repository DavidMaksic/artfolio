import {
   test as base,
   Page,
   expect,
   Browser,
   TestInfo,
   BrowserContext,
} from '@playwright/test';
import { cleanupTestUser } from '@/global-setup.js';
import { getSignInOtp } from '@/test-helpers.js';

export interface AuthFixture {
   email: string;
   username: string;
   displayName: string;
   page: Page;
   context: BrowserContext;
   emailSubmit: () => Promise<string>;
   signInViaMagicLink: () => Promise<void>;
}

interface Fixtures {
   auth: AuthFixture;
   secondAuth: AuthFixture;
}

async function createAuthFixture(
   browser: Browser,
   testInfo: TestInfo,
   suffix: string = '',
) {
   const slug = testInfo.title.toLowerCase().replace(/\s+/g, '-');
   const tag = `${Date.now()}${suffix}`;
   const email = `e2e+${slug}+${tag}@test.com`;
   const username = `user${tag}`;
   const displayName = `Test User ${tag}`;

   const context: BrowserContext = await browser.newContext();
   const page: Page = await context.newPage();

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

   return {
      email,
      username,
      displayName,
      page,
      emailSubmit,
      signInViaMagicLink,
      context,
   };
}

export const test = base.extend<Fixtures>({
   auth: async ({ browser }, use, testInfo) => {
      const fixture = await createAuthFixture(browser, testInfo);
      await use(fixture);
      await fixture.context.close();
      await cleanupTestUser(fixture.email);
   },
   secondAuth: async ({ browser }, use, testInfo) => {
      const fixture = await createAuthFixture(browser, testInfo, 'b');
      await use(fixture);
      await fixture.context.close();
      await cleanupTestUser(fixture.email);
   },
});

export { expect } from '@playwright/test';
