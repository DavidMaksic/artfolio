import { completeProfileSetup, createPost } from './test-helpers';
import { cleanupCloudinaryFolder } from '@/global-setup';
import { test, expect } from './fixtures';

test.afterAll(async () => {
   await cleanupCloudinaryFolder('artfolio/posts');
});

test.describe('feed', () => {
   test('guest sees discovery banner and posts on the feed', async ({
      page,
      auth,
   }) => {
      // Create a post as a signed-in user first so the feed has content
      await auth.signInViaMagicLink();
      await completeProfileSetup(page, auth.username, auth.displayName);
      await createPost(page, auth.username);

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
      await createPost(page, auth.username);

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
      await createPost(page, auth.username, { description: 'Modal test post' });

      await page.locator('[data-post-id]').first().click();
      const modal = page.locator('[data-testid="post-modal"]');

      await expect(modal).toBeVisible();
      await expect(modal.getByText('Modal test post')).toBeVisible();
   });
});
