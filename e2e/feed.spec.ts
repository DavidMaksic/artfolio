import { cleanupCloudinaryFolder } from '@/global-setup';
import { test, expect } from './fixtures';
import { createPost } from './test-helpers';

test.afterAll(async () => {
   await cleanupCloudinaryFolder('artfolio/posts');
});

test.describe('feed', () => {
   test('guest sees discovery banner and posts on the feed', async ({
      withPost: { auth },
   }) => {
      await auth.page.getByRole('button', { name: 'Sign out' }).click();
      await expect(auth.page).toHaveURL('/');

      await expect(
         auth.page.getByText(/discover work from artists/i),
      ).toBeVisible();
      await expect(auth.page.locator('[data-post-id]').first()).toBeVisible();
   });

   test('signed-in user does not see the discovery banner', async ({
      withPost: { auth, post },
   }) => {
      await expect(post.locator).toBeVisible();
      await expect(
         auth.page.getByText(/discover work from artists/i),
      ).not.toBeVisible();
   });

   test('clicking a feed card opens the post detail modal', async ({
      signedIn,
   }) => {
      const description = 'Modal test post';
      const post = await createPost(signedIn, { description });

      await post.locator.click();

      const modal = signedIn.page.getByTestId('post-modal');
      await expect(modal).toBeVisible();
      await expect(modal.getByText(description)).toBeVisible();
   });
});
