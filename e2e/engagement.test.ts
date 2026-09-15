import { completeProfileSetup, createPost } from '@/test-helpers';
import { cleanupCloudinaryFolder } from '@/global-setup';
import { test, expect } from './fixtures';

test.afterAll(async () => {
   await cleanupCloudinaryFolder('artfolio/posts');
});

test.describe('likes', () => {
   test('guest sees like count but is redirected to sign in on click', async ({
      page,
      auth,
   }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(page, auth.username, auth.displayName);
      await createPost(page, auth.username);
      await page.getByRole('button', { name: 'Sign out' }).click();

      await page.locator('[data-testid="like-button"]').first().click();
      await expect(page).toHaveURL(/\/auth\/sign-in/);
   });

   test('signed in user can like and unlike a post', async ({ page, auth }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(page, auth.username, auth.displayName);
      await createPost(page, auth.username);

      const likeButton = page.locator('[data-testid="like-button"]').first();

      // Like
      await likeButton.click();
      await expect(
         page.locator('[data-testid="like-button"][data-liked="true"]').first(),
      ).toBeVisible();

      // Unlike
      await likeButton.click();
      await expect(
         page
            .locator('[data-testid="like-button"][data-liked="false"]')
            .first(),
      ).toBeVisible();
   });
});

test.describe('bookmarks', () => {
   test('guest is redirected to sign in on bookmark click', async ({
      page,
      auth,
   }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(page, auth.username, auth.displayName);
      await createPost(page, auth.username);
      await page.getByRole('button', { name: 'Sign out' }).click();

      await page.locator('[data-testid="bookmark-button"]').first().click();
      await expect(page).toHaveURL(/\/auth\/sign-in/);
   });

   test('signed in user can bookmark and unbookmark a post', async ({
      page,
      auth,
   }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(page, auth.username, auth.displayName);
      await createPost(page, auth.username);

      const bookmarkButton = page
         .locator('[data-testid="bookmark-button"]')
         .first();

      // Bookmark
      await bookmarkButton.click();
      await expect(
         page
            .locator('[data-testid="bookmark-button"][data-bookmarked="true"]')
            .first(),
      ).toBeVisible();

      // Unbookmark
      await bookmarkButton.click();
      await expect(
         page
            .locator('[data-testid="bookmark-button"][data-bookmarked="false"]')
            .first(),
      ).toBeVisible();
   });
});

test.describe('comments', () => {
   test('guest sees sign in prompt instead of comment input', async ({
      page,
      auth,
   }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(page, auth.username, auth.displayName);
      await createPost(page, auth.username);
      await page.getByRole('button', { name: 'Sign out' }).click();

      await page.locator('[data-post-id]').first().click();
      const modal = page.locator('[data-testid="post-modal"]');
      await expect(modal).toBeVisible();

      await expect(modal.getByText('Sign in to comment')).toBeVisible();
      await expect(
         modal.locator('input[placeholder="Add a comment…"]'),
      ).not.toBeVisible();
   });

   test('signed in user can submit a comment', async ({ page, auth }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(page, auth.username, auth.displayName);
      await createPost(page, auth.username);

      await page.locator('[data-post-id]').first().click();
      const modal = page.locator('[data-testid="post-modal"]');
      await expect(modal).toBeVisible();

      await modal
         .locator('input[placeholder="Add a comment…"]')
         .fill('Great post!');
      await modal.getByRole('button', { name: 'Post', exact: true }).click();

      await expect(modal.getByText('Great post!')).toBeVisible({
         timeout: 10_000,
      });
   });

   test('comment author can delete their own comment', async ({
      page,
      auth,
   }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(page, auth.username, auth.displayName);
      await createPost(page, auth.username);

      await page.locator('[data-post-id]').first().click();
      const modal = page.locator('[data-testid="post-modal"]');
      await expect(modal).toBeVisible();

      await modal
         .locator('input[placeholder="Add a comment…"]')
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
      page,
      auth,
      secondAuth,
   }) => {
      // User 1 creates the post
      await auth.signInViaMagicLink();
      await completeProfileSetup(page, auth.username, auth.displayName);
      await createPost(page, auth.username);
      await page.getByRole('button', { name: 'Sign out' }).click();

      // User 2 leaves a comment
      await secondAuth.signInViaMagicLink();
      await completeProfileSetup(
         page,
         secondAuth.username,
         secondAuth.displayName,
      );

      await page.locator('[data-post-id]').first().click();
      const modal = page.locator('[data-testid="post-modal"]');
      await expect(modal).toBeVisible();

      await modal
         .locator('input[placeholder="Add a comment…"]')
         .fill('User 2 comment');
      await modal.getByRole('button', { name: 'Post', exact: true }).click();
      await expect(modal.getByText('User 2 comment')).toBeVisible({
         timeout: 10_000,
      });
      await modal.locator('button[aria-label="Close button"]').click();
      await page.getByRole('button', { name: 'Sign out' }).click();

      // User 1 deletes user 2's comment
      await auth.signInViaMagicLink();
      await page.locator('[data-post-id]').first().click();
      await expect(modal).toBeVisible();
      await expect(modal.getByText('User 2 comment')).toBeVisible({
         timeout: 10_000,
      });

      await modal.getByText('User 2 comment').hover();
      await modal.getByLabel('Delete comment').click();
      await expect(modal.getByText('User 2 comment')).not.toBeVisible({
         timeout: 10_000,
      });
   });
});
