import { AuthFixture } from '@/fixtures';
import { expect } from '@playwright/test';
import { redis } from '@artfolio/server/lib/redis.js';
import path from 'path';

export const TEST_IMAGE = path.resolve('e2e/test-images/post-image.jpg');

export async function getSignInOtp(email: string): Promise<string> {
   const raw = await redis.get(`verification:sign-in-otp-${email}`);
   if (!raw) throw new Error(`No OTP found for ${email}`);
   return JSON.parse(raw).value.split(':')[0];
}

export async function completeProfileSetup(auth: AuthFixture) {
   await auth.page.getByLabel('Username').fill(auth.username);
   await auth.page.getByLabel('Display name').fill(auth.displayName);
   await auth.page.getByRole('button', { name: 'Continue' }).click();
   await auth.page.getByRole('button', { name: 'Finish setup' }).click();
   await expect(auth.page).toHaveURL('/', { timeout: 15_000 });
}

export async function createPost(
   auth: AuthFixture,
   options: { description?: string; redirectTo?: string } = {},
) {
   await auth.page.getByLabel('New post').click();
   await expect(auth.page).toHaveURL('/posts/create');

   // Upload an image
   await auth.page.locator('input[type="file"]').setInputFiles(TEST_IMAGE);
   await expect(auth.page.locator("img[src^='blob:']").first()).toBeVisible();

   // Fill describe input (if it exists) and select a category
   if (options.description) {
      await auth.page.getByLabel('description').fill(options.description);
   }
   await auth.page.locator('#category').click();
   await auth.page.getByRole('option').first().click();

   // Submit — this triggers the Cloudinary upload, then the tRPC mutation. Allow generous timeout for the network round-trips.
   await auth.page.getByRole('button', { name: 'Publish' }).click();
   await expect(auth.page).toHaveURL('/', { timeout: 30_000 });

   await auth.page.goto(`/${auth.username}`);
   await expect(auth.page.locator('[data-post-id]').first()).toBeVisible({
      timeout: 15_000,
   });

   if (options.redirectTo) {
      await auth.page.goto(options.redirectTo);
      await auth.page.waitForLoadState('networkidle');
   }
}

export async function setupDiscussionScenario(
   auth: AuthFixture,
   secondAuth: AuthFixture,
   comment: string,
) {
   // User A creates a post
   await auth.signInViaMagicLink();
   await completeProfileSetup(auth);
   await createPost(auth);

   // User B comments on user A's post
   await secondAuth.signInViaMagicLink();
   await completeProfileSetup(secondAuth);

   await secondAuth.page.goto(`/${auth.username}`);
   await secondAuth.page.locator('[data-post-id]').first().click();
   const modal = secondAuth.page.locator('[data-testid="post-modal"]');

   await expect(modal).toBeVisible();
   await modal.locator('textarea[placeholder="Add a comment…"]').fill(comment);
   await modal.getByRole('button', { name: 'Post', exact: true }).click();

   await expect(modal.getByText(comment)).toBeVisible({ timeout: 10_000 });
   await secondAuth.page.keyboard.press('Escape');
}
