import {
   createPost,
   openPostModal,
   completeProfileSetup,
} from '@/test-helpers';
import { cleanupCloudinaryFolder } from '@/global-setup';
import { test, expect } from './fixtures';

test.afterAll(async () => {
   await cleanupCloudinaryFolder('artfolio/posts');
});

test.describe('post detail modal', () => {
   test('opens when clicking a post cell', async ({ signedIn }) => {
      const description = 'Modal test post';
      const post = await createPost(signedIn, { description });

      await post.locator.click();

      const modal = signedIn.page.getByTestId('post-modal');
      await expect(modal).toBeVisible();
      await expect(modal.getByText(description)).toBeVisible();
   });

   test('closes on Escape key', async ({ withPost: { auth, post } }) => {
      const modal = await openPostModal(auth, post);

      await auth.page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
   });

   test('previous and next buttons navigate between posts', async ({
      signedIn,
   }) => {
      await createPost(signedIn, { description: 'First post' });
      const second = await createPost(signedIn, { description: 'Second post' });

      await signedIn.page.goto(`/${signedIn.username}`);
      const modal = await openPostModal(signedIn, second);
      await expect(modal.getByText('Second post')).toBeVisible();

      await signedIn.page.getByLabel('Next post').click();
      await expect(modal.getByText('First post')).toBeVisible({
         timeout: 10_000,
      });

      await signedIn.page.getByLabel('Previous post').click();
      await expect(modal.getByText('Second post')).toBeVisible({
         timeout: 10_000,
      });
   });
});

test.describe('post edit', () => {
   test('user can edit a post description', async ({ signedIn }) => {
      const post = await createPost(signedIn, {
         description: 'Original description',
      });
      const modal = await openPostModal(signedIn, post);

      await modal.locator('[data-slot="dropdown-menu-trigger"]').click();
      await signedIn.page.getByRole('menuitem', { name: 'Edit' }).click();
      await expect(signedIn.page).toHaveURL(/\/posts\/.+\/edit/);

      await signedIn.page.getByLabel('Description').fill('Updated description');
      await signedIn.page.getByRole('button', { name: 'Save changes' }).click();

      await expect(modal.getByText('Updated description')).toBeVisible({
         timeout: 10_000,
      });
   });

   test('non-owner cannot access edit route', async ({
      signedIn,
      secondAuth,
   }) => {
      const { id } = await createPost(signedIn);

      await secondAuth.signInViaMagicLink();
      await completeProfileSetup(secondAuth);

      // User 2 tries to access user 1's post edit route
      await secondAuth.page.goto(`/posts/${id}/edit`);
      await expect(secondAuth.page).not.toHaveURL(/\/posts\/.+\/edit/);
   });
});

test.describe('post delete', () => {
   test('user can delete a post from the modal', async ({
      withPost: { auth, post },
   }) => {
      const modal = await openPostModal(auth, post);

      await modal.locator('[data-slot="dropdown-menu-trigger"]').click();
      await auth.page.getByRole('menuitem', { name: 'Delete' }).click();

      // Confirm dialog
      const dialog = auth.page.getByRole('alertdialog');
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Delete' }).click();

      // Modal closes and post disappears
      await expect(modal).not.toBeVisible({ timeout: 10_000 });
      await expect(post.locator).not.toBeVisible();
   });
});
