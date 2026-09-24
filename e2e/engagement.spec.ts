import { completeProfileSetup, createPost } from '@/test-helpers';
import { cleanupCloudinaryFolder } from '@/global-setup';
import { test, expect } from './fixtures';

test.afterAll(async () => {
   await cleanupCloudinaryFolder('artfolio/posts');
});

test.describe('likes', () => {
   test('guest sees like count but is redirected to sign in on click', async ({
      auth,
   }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(auth);
      await createPost(auth);
      await auth.page.getByRole('button', { name: 'Sign out' }).click();

      await auth.page.locator('[data-testid="like-button"]').first().click();
      await expect(auth.page).toHaveURL(/\/auth\/sign-in/);
   });

   test('signed in user can like and unlike a post', async ({ auth }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(auth);
      await createPost(auth);

      const modal = auth.page.locator('[data-testid="post-modal"]');
      await auth.page.locator('[data-post-id]').first().click();
      await expect(modal).toBeVisible();

      const likeButton = auth.page
         .locator('[data-testid="like-button"]')
         .first();

      // Like
      await likeButton.click();
      await expect(
         auth.page
            .locator('[data-testid="like-button"][data-liked="true"]')
            .first(),
      ).toBeVisible();

      // Unlike
      await likeButton.click();
      await expect(
         auth.page
            .locator('[data-testid="like-button"][data-liked="false"]')
            .first(),
      ).toBeVisible();
   });
});

test.describe('bookmarks', () => {
   test('guest is redirected to sign in on bookmark click', async ({
      auth,
   }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(auth);
      await createPost(auth);
      await auth.page.getByRole('button', { name: 'Sign out' }).click();

      await auth.page
         .locator('[data-testid="bookmark-button"]')
         .first()
         .click();
      await expect(auth.page).toHaveURL(/\/auth\/sign-in/);
   });

   test('signed in user can bookmark and unbookmark a post', async ({
      auth,
   }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(auth);
      await createPost(auth);

      const modal = auth.page.locator('[data-testid="post-modal"]');
      await auth.page.locator('[data-post-id]').first().click();
      await expect(modal).toBeVisible();

      const bookmarkButton = auth.page
         .locator('[data-testid="bookmark-button"]')
         .first();

      // Bookmark
      await bookmarkButton.click();
      await expect(
         auth.page
            .locator('[data-testid="bookmark-button"][data-bookmarked="true"]')
            .first(),
      ).toBeVisible();

      // Unbookmark
      await bookmarkButton.click();
      await expect(
         auth.page
            .locator('[data-testid="bookmark-button"][data-bookmarked="false"]')
            .first(),
      ).toBeVisible();
   });
});

test.describe('comments', () => {
   test('guest sees sign in prompt instead of comment input', async ({
      auth,
   }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(auth);
      await createPost(auth);

      await auth.page.getByRole('button', { name: 'Sign out' }).click();
      await expect(auth.page).toHaveURL('/');
      await auth.page.goto(`${auth.username}`);

      await auth.page.locator('[data-post-id]').first().click();
      const modal = auth.page.locator('[data-testid="post-modal"]');
      await expect(modal).toBeVisible();

      await expect(modal.getByText('Sign in to comment')).toBeVisible();
      await expect(
         modal.locator('input[placeholder="Add a comment…"]'),
      ).not.toBeVisible();
   });

   test('signed in user can submit a comment', async ({ auth }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(auth);
      await createPost(auth);

      await auth.page.locator('[data-post-id]').first().click();
      const modal = auth.page.locator('[data-testid="post-modal"]');
      await expect(modal).toBeVisible();

      await modal
         .locator('textarea[placeholder="Add a comment…"]')
         .fill('Great post!');
      await modal.getByRole('button', { name: 'Post', exact: true }).click();

      await expect(modal.getByText('Great post!')).toBeVisible({
         timeout: 10_000,
      });
   });

   test('comment author can delete their own comment', async ({ auth }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(auth);
      await createPost(auth);

      await auth.page.locator('[data-post-id]').first().click();
      const modal = auth.page.locator('[data-testid="post-modal"]');
      await expect(modal).toBeVisible();

      await modal
         .locator('textarea[placeholder="Add a comment…"]')
         .fill('Delete me');
      await modal.getByRole('button', { name: 'Post', exact: true }).click();
      await expect(modal.getByText('Delete me')).toBeVisible({
         timeout: 10_000,
      });

      await modal.getByText('Delete me').hover();
      await modal.getByLabel('Delete comment').click();
      await expect(modal.getByText('Delete me')).not.toBeVisible({
         timeout: 10_000,
      });
   });

   test('post owner can delete a comment left by another user', async ({
      auth,
      secondAuth,
   }) => {
      // User 1 creates post
      await auth.signInViaMagicLink();
      await completeProfileSetup(auth);
      await createPost(auth);

      // User 2 comments — independent session, no sign out needed
      await secondAuth.signInViaMagicLink();
      await completeProfileSetup(secondAuth);
      await secondAuth.page.goto(`/${auth.username}`);
      await secondAuth.page.locator('[data-post-id]').first().click();
      const modal2 = secondAuth.page.locator('[data-testid="post-modal"]');

      await expect(modal2).toBeVisible();
      await modal2
         .locator('textarea[placeholder="Add a comment…"]')
         .fill('User 2 comment');
      await modal2.getByRole('button', { name: 'Post', exact: true }).click();
      await expect(modal2.getByText('User 2 comment')).toBeVisible({
         timeout: 10_000,
      });

      // User 1 deletes the comment — still signed in, no re-auth needed
      await auth.page.goto(`/${auth.username}`);
      await auth.page.locator('[data-post-id]').first().click();
      const modal1 = auth.page.locator('[data-testid="post-modal"]');

      await expect(modal1).toBeVisible();
      await expect(modal1.getByText('User 2 comment')).toBeVisible({
         timeout: 10_000,
      });
      await modal1.getByText('User 2 comment').hover();
      await modal1.getByLabel('Delete comment').click();
      await expect(modal1.getByText('User 2 comment')).not.toBeVisible({
         timeout: 10_000,
      });
   });
});
