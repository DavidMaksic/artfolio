import { completeProfileSetup, createPost } from './test-helpers';
import { cleanupCloudinaryFolder } from '@/global-setup';
import { test, expect } from './fixtures';

test.afterAll(async () => {
   await cleanupCloudinaryFolder('artfolio/posts');
});

test.describe('explore', () => {
   test('explore page shows posts including own posts', async ({
      signedIn,
   }) => {
      const post = await createPost(signedIn);
      await signedIn.page.goto('/explore');
      await expect(post.locator).toBeVisible();
   });

   test('search by tag filters for posts', async ({ signedIn }) => {
      const post = await createPost(signedIn, { tags: ['illustration'] });

      await signedIn.page.goto('/explore');
      await signedIn.page
         .getByPlaceholder(/search by tag/i)
         .fill('illustration');

      await expect(signedIn.page).toHaveURL(/q=illustration/);
      await expect(post.locator).toBeVisible({ timeout: 10_000 });
   });

   test('search with no results shows empty state', async ({ signedIn }) => {
      await signedIn.page.goto('/explore');
      await signedIn.page
         .getByPlaceholder(/search by tag/i)
         .fill('zzznomatchxyz');

      await expect(signedIn.page.getByText(/no posts found/i)).toBeVisible({
         timeout: 10_000,
      });
   });

   test('clearing search returns to explore grid', async ({ signedIn }) => {
      const post = await createPost(signedIn);

      await signedIn.page.goto('/explore');
      await signedIn.page
         .getByPlaceholder(/search by tag/i)
         .fill('illustration');
      await expect(signedIn.page).toHaveURL(/q=illustration/);

      await signedIn.page.getByLabel('Clear search').click();
      await expect(signedIn.page).toHaveURL('/explore');
      await expect(post.locator).toBeVisible({ timeout: 10_000 });
   });

   test('clicking a trending tag pill fills the search', async ({
      signedIn,
   }) => {
      await createPost(signedIn, { tags: ['e2e'] });

      await signedIn.page.goto('/explore');
      await signedIn.page.getByTestId('filters-button').click();

      const pill = signedIn.page
         .getByTestId('tag-button')
         .filter({ hasText: 'e2e' });
      await expect(pill).toBeVisible({ timeout: 10_000 });
      await pill.click();

      await expect(signedIn.page).toHaveURL(/q=e2e/);
   });

   test('category filter updates URL and filters posts', async ({
      withPost,
   }) => {
      const { page } = withPost.auth;
      await page.goto('/explore');
      await page.getByTestId('filters-button').click();

      // Open category combobox and select first option
      await page.getByTestId('category-button').click();
      await page.getByRole('option').nth(1).click();

      await expect(page).toHaveURL(/category=/);
   });

   test('sort select changes URL', async ({ signedIn }) => {
      const page = signedIn.page;
      await page.goto('/explore');
      await page.getByTestId('filters-button').click();

      await page.getByRole('combobox').click();
      await page.getByRole('option', { name: 'New' }).click();
      await expect(signedIn.page).toHaveURL(/sort=new/);
   });

   test('search query persists in URL on page reload', async ({ signedIn }) => {
      await signedIn.page.goto('/explore?q=illustration');
      await expect(
         signedIn.page.getByPlaceholder(/search by tag/i),
      ).toHaveValue('illustration');
   });

   test('viewer own posts do not appear on main feed explore pool', async ({
      signedIn,
   }) => {
      await createPost(signedIn, { description: 'My own post' });

      const feedLoaded = signedIn.page.waitForResponse(
         (res) => res.url().includes('feed') && res.ok(),
      );
      await signedIn.page.goto('/');
      await feedLoaded;

      await expect(signedIn.page.locator('[data-post-id]')).toHaveCount(0);
   });
});
