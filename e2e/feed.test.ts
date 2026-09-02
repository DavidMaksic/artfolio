import { completeProfileSetup, createPost } from './test-helpers';
import { test, expect } from './fixtures';

test.describe('feed', () => {
   test('guest sees discovery banner and posts on the feed', async ({
      page,
      auth,
   }) => {
      // Create a post as a signed-in user first so the feed has content
      await auth.signInViaMagicLink();
      await completeProfileSetup(page, auth.username, auth.displayName);
      await createPost(page);

      // Sign out
      await page.getByRole('button', { name: 'Sign out' }).click();
      await expect(page).toHaveURL('/');

      // Guest lands on feed and sees discovery banner
      await expect(page.getByText(/discover work from artists/i)).toBeVisible();

      // At least one post card is visible
      await expect(page.locator('[data-post-id]').first()).toBeVisible();
   });

   test('signed-in user does not see the discovery banner', async ({
      page,
      auth,
   }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(page, auth.username, auth.displayName);
      await createPost(page);

      await page.goto('/');
      await expect(
         page.getByText(/discover work from artists/i),
      ).not.toBeVisible();

      await expect(page.locator('[data-post-id]').first()).toBeVisible();
   });

   test('clicking a feed card opens the post detail modal', async ({
      page,
      auth,
   }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(page, auth.username, auth.displayName);
      await createPost(page, { description: 'Modal test post' });

      await page.goto('/');
      await page.locator('[data-post-id]').first().click();

      const modal = page.locator('[data-testid="post-modal"]');
      await expect(modal).toBeVisible();
      await expect(modal.getByText('Modal test post')).toBeVisible();
   });

   test('load more button is not shown when posts fit on one page', async ({
      page,
      auth,
   }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(page, auth.username, auth.displayName);
      await createPost(page);
      await page.goto('/');

      // With a single post the next page cursor is null — button should be absent
      await expect(
         page.getByRole('button', { name: 'Load more' }),
      ).not.toBeVisible();
   });
});
