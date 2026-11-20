import {
   createPost,
   openPostModal,
   setupDiscussionScenario,
} from '@/test-helpers';
import { cleanupCloudinaryFolder } from '@/global-setup';
import { test, expect } from './fixtures';

test.afterAll(async () => {
   await cleanupCloudinaryFolder('artfolio/posts');
});

test.describe('likes', () => {
   test('guest sees like count but is redirected to sign in on click', async ({
      withPost: { auth, post },
   }) => {
      await auth.page.getByRole('button', { name: 'Sign out' }).click();
      await post.locator.getByTestId('like-button').click();
      await expect(auth.page).toHaveURL(/\/auth\/sign-in/);
   });

   test('signed in user can like and unlike a post', async ({
      withPost: { auth, post },
   }) => {
      const modal = await openPostModal(auth, post);
      const likeButton = modal.getByTestId('like-button');

      await likeButton.click();
      await expect(likeButton).toHaveAttribute('data-liked', 'true');

      await likeButton.click();
      await expect(likeButton).toHaveAttribute('data-liked', 'false');
   });
});

test.describe('bookmarks', () => {
   test('guest is redirected to sign in on bookmark click', async ({
      signedIn,
   }) => {
      const post = await createPost(signedIn);
      await signedIn.page.getByRole('button', { name: 'Sign out' }).click();

      await post.locator.getByTestId('bookmark-button').click();
      await expect(signedIn.page).toHaveURL(/\/auth\/sign-in/);
   });

   test('signed in user can bookmark and unbookmark a post', async ({
      withPost: { auth, post },
   }) => {
      const modal = await openPostModal(auth, post);
      const bookmarkButton = modal.getByTestId('bookmark-button');

      await bookmarkButton.click();
      await expect(bookmarkButton).toHaveAttribute('data-bookmarked', 'true');

      await bookmarkButton.click();
      await expect(bookmarkButton).toHaveAttribute('data-bookmarked', 'false');
   });
});

test.describe('comments', () => {
   test('guest sees sign in prompt instead of comment input', async ({
      signedIn,
   }) => {
      const post = await createPost(signedIn);

      await signedIn.page.getByRole('button', { name: 'Sign out' }).click();
      await expect(
         signedIn.page.getByRole('button', { name: 'Sign out' }),
      ).toBeHidden();
      await signedIn.page.goto(`/${signedIn.username}`);

      const modal = await openPostModal(signedIn, post);
      await expect(modal.getByText('Sign in to comment')).toBeVisible();
      await expect(modal.getByTestId('comment-input')).not.toBeVisible();
   });

   test('signed in user can submit a comment', async ({
      withPost: { auth, post },
   }) => {
      const modal = await openPostModal(auth, post);

      await modal.getByTestId('comment-input').fill('Great post!');
      await modal.getByRole('button', { name: 'Post', exact: true }).click();

      await expect(modal.getByText('Great post!')).toBeVisible({
         timeout: 10_000,
      });
   });

   test('comment author can edit their own comment', async ({
      withPost: { auth, post },
   }) => {
      const modal = await openPostModal(auth, post);

      // Submit a comment
      await modal.getByTestId('comment-input').fill('Original comment');
      await modal.getByRole('button', { name: 'Post', exact: true }).click();
      await expect(modal.getByText('Original comment')).toBeVisible({
         timeout: 10_000,
      });

      // Open dropdown and click Edit
      const comment = modal.locator('[data-comment-id]').first();
      await comment.hover();
      await comment.locator('[data-slot="dropdown-menu-trigger"]').click();
      await auth.page.getByRole('menuitem', { name: 'Edit' }).click();

      // Edit the comment
      await modal.getByTestId('comment-edit-input').fill('Edited comment');
      await modal.getByTestId('save-comment-button').click();

      await expect(modal.getByText('Edited comment')).toBeVisible({
         timeout: 10_000,
      });
      await expect(modal.getByText('Original comment')).not.toBeVisible();
   });

   test('post owner can delete a comment left by another user', async ({
      signedIn,
      secondSignedIn,
   }) => {
      const post = await setupDiscussionScenario(
         signedIn,
         secondSignedIn,
         'User 2 comment',
      );

      await signedIn.page.goto(`/${signedIn.username}`);
      const modal = await openPostModal(signedIn, post);
      await expect(modal.getByText('User 2 comment')).toBeVisible({
         timeout: 10_000,
      });

      const comment = modal.locator('[data-comment-id]').first();
      await comment.hover();
      await comment.locator('[data-slot="dropdown-menu-trigger"]').click();

      await signedIn.page.getByRole('menuitem', { name: 'Delete' }).click();
      const dialog = signedIn.page.getByRole('alertdialog');
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Delete' }).click();

      await expect(modal.getByText('User 2 comment')).not.toBeVisible({
         timeout: 10_000,
      });
   });
});
