import { completeProfileSetup, TEST_IMAGE } from './test-helpers';
import { test, expect } from './fixtures';

test.describe('Post creation', () => {
   test('user can create a post and see it on their profile', async ({
      page,
      auth,
   }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(page, auth.username, auth.displayName);
      await page.getByRole('button', { name: 'New post' }).click();
      await expect(page).toHaveURL('/posts/create');

      // Upload an image
      await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE);
      await expect(
         page.locator(".image-preview, img[src^='blob:']").first(),
      ).toBeVisible();

      // Fill describe input and select a category
      await page.getByLabel('description').fill('My first E2E test post');
      await expect(
         page.locator('#category option:nth-child(2)'),
      ).toBeAttached();
      await page.locator('#category').selectOption({ index: 1 });

      // Add a tag
      const tagInput = page.getByPlaceholder(/tag/i);
      await tagInput.fill('e2e');
      await tagInput.press('Enter');
      await expect(page.getByText('e2e')).toBeVisible();

      // Submit — this triggers the Cloudinary upload, then the tRPC mutation. Allow generous timeout for the network round-trips.
      await page.getByRole('button', { name: 'Publish' }).click();
      await expect(page).toHaveURL(`/${auth.username}`, { timeout: 30_000 });
      await expect(page.locator('[data-post-id]').first()).toBeVisible({
         timeout: 10_000,
      });
   });
});
