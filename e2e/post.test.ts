import { completeProfileSetup, TEST_IMAGE } from './test-helpers';
import { cleanupCloudinaryFolder } from '@/global-setup';
import { test, expect } from './fixtures';

test.afterAll(async () => {
   await cleanupCloudinaryFolder('artfolio/posts');
});

test.describe('post creation', () => {
   test('user can create a post and see it on their profile', async ({
      page,
      auth,
   }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(page, auth.username, auth.displayName);
      await page.getByLabel('New post').click();
      await expect(page).toHaveURL('/posts/create');

      // Upload an image
      await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE);
      await expect(
         page.locator(".image-preview, img[src^='blob:']").first(),
      ).toBeVisible();

      // Fill describe input and select a category
      await page.getByLabel('description').fill('My first E2E test post');
      await page.locator('#category').click();
      await page.getByRole('option').first().click();

      // Add a tag
      const tagInput = page.getByPlaceholder(/tag/i);
      await tagInput.fill('e2e');
      await tagInput.press('Enter');
      await expect(page.getByText('e2e')).toBeVisible();

      // Submit — this triggers the Cloudinary upload, then the tRPC mutation. Allow generous timeout for the network round-trips.
      await page.getByRole('button', { name: 'Publish' }).click();
      await expect(page).toHaveURL('/', { timeout: 30_000 });
      await expect(page.locator('[data-post-id]').first()).toBeVisible({
         timeout: 15_000,
      });
   });
});
