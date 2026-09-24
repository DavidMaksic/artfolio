import { completeProfileSetup, createPost } from './test-helpers';
import { cleanupCloudinaryFolder } from '@/global-setup';
import { test, expect } from './fixtures';

test.afterAll(async () => {
   await cleanupCloudinaryFolder('artfolio/posts');
});

test.describe('feed', () => {
   test('guest sees discovery banner and posts on the feed', async ({
      auth,
   }) => {
      // Create a post as a signed-in user first so the feed has content
      await auth.signInViaMagicLink();
      await completeProfileSetup(auth);
      await createPost(auth);

      // Sign out
      await auth.page.getByRole('button', { name: 'Sign out' }).click();
      await expect(auth.page).toHaveURL('/');

      // Guest lands on feed and sees discovery banner
      await expect(
         auth.page.getByText(/discover work from artists/i),
      ).toBeVisible();

      // At least one post card is visible
      await expect(auth.page.locator('[data-post-id]').first()).toBeVisible();
   });

   test('signed-in user does not see the discovery banner', async ({
      auth,
   }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(auth);
      await createPost(auth);

      await expect(
         auth.page.getByText(/discover work from artists/i),
      ).not.toBeVisible();

      await expect(auth.page.locator('[data-post-id]').first()).toBeVisible();
   });

   test('clicking a feed card opens the post detail modal', async ({
      auth,
   }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(auth);
      await createPost(auth, {
         description: 'Modal test post',
      });

      await auth.page.locator('[data-post-id]').first().click();
      const modal = auth.page.locator('[data-testid="post-modal"]');

      await expect(modal).toBeVisible();
      await expect(modal.getByText('Modal test post')).toBeVisible();
   });
});
