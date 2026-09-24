import { completeProfileSetup, TEST_IMAGE } from './test-helpers';
import { cleanupCloudinaryFolder } from '@/global-setup';
import { test, expect } from './fixtures';

test.afterAll(async () => {
   await cleanupCloudinaryFolder('artfolio/posts');
});

test.describe('post creation', () => {
   test('user can create a post and see it on their profile', async ({
      auth,
   }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(auth);
      await auth.page.getByLabel('New post').click();
      await expect(auth.page).toHaveURL('/posts/create');

      // Upload an image
      await auth.page.locator('input[type="file"]').setInputFiles(TEST_IMAGE);
      await expect(
         auth.page.locator(".image-preview, img[src^='blob:']").first(),
      ).toBeVisible();

      // Fill describe input and select a category
      await auth.page.getByLabel('description').fill('My first E2E test post');
      await auth.page.locator('#category').click();
      await auth.page.getByRole('option').first().click();

      // Add a tag
      const tagInput = auth.page.getByPlaceholder(/tag/i);
      await tagInput.fill('e2e');
      await tagInput.press('Enter');
      await expect(auth.page.getByText('e2e')).toBeVisible();

      // Submit
      await auth.page.getByRole('button', { name: 'Publish' }).click();
      await expect(auth.page).toHaveURL('/', { timeout: 30_000 });
      await auth.page.goto(`${auth.username}`);
      await expect(auth.page.locator('[data-post-id]').first()).toBeVisible({
         timeout: 15_000,
      });
   });
});
