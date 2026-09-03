import { expect, Page } from '@playwright/test';
import { redis } from '@artfolio/server/lib/redis.js';
import path from 'path';

export const TEST_IMAGE = path.resolve('e2e/test-images/post-image.jpg');

export async function getSignInOtp(email: string): Promise<string> {
   const raw = await redis.get(`verification:sign-in-otp-${email}`);
   if (!raw) throw new Error(`No OTP found for ${email}`);
   return JSON.parse(raw).value.split(':')[0];
}

export async function completeProfileSetup(
   page: Page,
   username: string,
   displayName: string,
) {
   await page.getByLabel('Username').fill(username);
   await page.getByLabel('Display name').fill(displayName);
   await page.getByRole('button', { name: 'Continue' }).click();
   await page.getByRole('button', { name: 'Finish setup' }).click();
   await expect(page).toHaveURL('/');
}

export async function createPost(
   page: Page,
   username: string,
   options: { description?: string } = {},
) {
   await page.getByLabel('New post').click();
   await expect(page).toHaveURL('/posts/create');

   // Upload an image
   await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE);
   await expect(page.locator("img[src^='blob:']").first()).toBeVisible();

   // Fill describe input (if it exists) and select a category
   if (options.description) {
      await page.getByLabel('description').fill(options.description);
   }
   await page.locator('#category').click();
   await page.getByRole('option').first().click();

   // Submit — this triggers the Cloudinary upload, then the tRPC mutation. Allow generous timeout for the network round-trips.
   await page.getByRole('button', { name: 'Publish' }).click();
   await expect(page).toHaveURL('/', { timeout: 30_000 });

   await page.goto(`/${username}`);
   await expect(page.locator('[data-post-id]').first()).toBeVisible({
      timeout: 10_000,
   });
}
