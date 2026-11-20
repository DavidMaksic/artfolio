import { cleanupCloudinaryFolder } from '@/global-setup';
import { test, expect } from './fixtures';
import { TEST_IMAGE } from './test-helpers';

test.afterAll(async () => {
   await cleanupCloudinaryFolder('artfolio/posts');
});

test.describe('post creation', () => {
   test('user can create a post and see it on their profile', async ({
      signedIn,
   }) => {
      const page = signedIn.page;
      await page.getByLabel('New post').click();
      await expect(page).toHaveURL('/posts/create');

      await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE);
      await expect(page.locator("img[src^='blob:']").first()).toBeVisible();

      await page.getByLabel('description').fill('My first E2E test post');
      await page.locator('#category').click();
      await page.getByRole('option').first().click();

      const tagInput = page.getByPlaceholder('Add a tag...');
      await tagInput.fill('e2e');
      await tagInput.press('Enter');
      await expect(page.getByText('e2e', { exact: true })).toBeVisible();

      const created = page.waitForResponse(
         (res) =>
            res.url().includes('post.create') &&
            res.request().method() === 'POST',
         { timeout: 30_000 },
      );
      await page.getByRole('button', { name: 'Publish' }).click();
      await expect(page).toHaveURL('/');
      expect((await created).ok(), 'post.create should succeed').toBe(true);

      // Persistence check: full reload on profile
      await page.goto(`/${signedIn.username}`);
      const post = page.locator('[data-post-id]', {
         hasText: 'My first E2E test post',
      });
      await expect(post).toBeVisible({ timeout: 15_000 });
   });
});
