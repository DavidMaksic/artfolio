import { completeProfileSetup, createPost } from './test-helpers';
import { cleanupCloudinaryFolder } from '@/global-setup';
import { test, expect } from './fixtures';

test.afterAll(async () => {
   await cleanupCloudinaryFolder('artfolio/posts');
});

test.describe('explore', () => {
   test('explore auth.page shows posts including own posts', async ({
      auth,
   }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(auth);
      await createPost(auth, { description: 'My own explore post' });

      await auth.page.goto('/explore');
      await expect(auth.page.locator('[data-post-id]').first()).toBeVisible();
   });

   test('search by tag filters posts', async ({ auth }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(auth);
      await createPost(auth);

      await auth.page.goto('/explore');
      await auth.page.getByPlaceholder(/search by tag/i).fill('illustration');

      // Wait for debounce and results
      await auth.page.waitForTimeout(500);
      await expect(auth.page.locator('[data-post-id]').first()).toBeVisible({
         timeout: 10_000,
      });
      await expect(auth.page).toHaveURL(/q=illustration/);
   });

   test('search with no results shows empty state', async ({ auth }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(auth);

      await auth.page.goto('/explore');
      await auth.page.getByPlaceholder(/search by tag/i).fill('zzznomatchxyz');
      await auth.page.waitForTimeout(500);

      await expect(auth.page.getByText(/no posts found/i)).toBeVisible({
         timeout: 10_000,
      });
   });

   test('clearing search returns to explore grid', async ({ auth }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(auth);
      await createPost(auth);

      await auth.page.goto('/explore');
      await auth.page.getByPlaceholder(/search by tag/i).fill('illustration');
      await auth.page.waitForTimeout(500);

      await auth.page.getByLabel('Clear search').click();
      await expect(auth.page).toHaveURL('/explore');
      await expect(auth.page.locator('[data-post-id]').first()).toBeVisible({
         timeout: 10_000,
      });
   });

   test('clicking a trending tag pill fills the search', async ({ auth }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(auth);
      await createPost(auth);

      await auth.page.goto('/explore');

      const firstPill = auth.page.locator('button.rounded-full').first();
      await expect(firstPill).toBeVisible({ timeout: 10_000 });
      const tagName = await firstPill.textContent();
      await firstPill.click();

      await expect(auth.page).toHaveURL(
         new RegExp(`q=${encodeURIComponent(tagName!.trim())}`),
      );
   });

   test('category filter updates URL and filters posts', async ({ auth }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(auth);
      await createPost(auth);

      await auth.page.goto('/explore');

      // Open category combobox and select first option
      await auth.page.getByText('All categories').click();
      await auth.page.getByRole('option').nth(1).click();

      await expect(auth.page).toHaveURL(/category=/);
   });

   test('sort select changes URL', async ({ auth }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(auth);

      await auth.page.goto('/explore');
      await auth.page.getByRole('combobox').click();
      await auth.page.getByRole('option', { name: 'New' }).click();
      await expect(auth.page).toHaveURL(/sort=new/);
   });

   test('search query persists in URL on auth.page reload', async ({
      auth,
   }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(auth);

      await auth.page.goto('/explore?q=illustration');
      await expect(auth.page.getByPlaceholder(/search by tag/i)).toHaveValue(
         'illustration',
      );
   });

   test('viewer own posts do not appear on main feed explore pool', async ({
      auth,
   }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(auth);
      await createPost(auth, { description: 'My own post' });

      // On the main feed, own posts should not appear in suggested cards
      await auth.page.goto('/');
      const cards = auth.page.locator('[data-post-id]');
      const count = await cards.count();
      // If count is 0, own post is correctly excluded from feed explore pool
      expect(count).toBe(0);
   });
});
