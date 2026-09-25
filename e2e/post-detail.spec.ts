import { completeProfileSetup, createPost } from '@/test-helpers';
import { cleanupCloudinaryFolder } from '@/global-setup';
import { test, expect } from './fixtures';

test.afterAll(async () => {
   await cleanupCloudinaryFolder('artfolio/posts');
});

test.describe('post detail modal', () => {
   test('opens when clicking a post cell', async ({ auth }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(auth);
      await createPost(auth, {
         description: 'Modal test post',
      });
      const modal = auth.page.locator('[data-testid="post-modal"]');

      await auth.page.locator('[data-post-id]').first().click();
      await expect(modal).toBeVisible();
      await expect(modal.getByText('Modal test post')).toBeVisible();
   });

   test('closes on Escape key', async ({ auth }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(auth);
      await createPost(auth);
      const modal = auth.page.locator('[data-testid="post-modal"]');

      await auth.page.locator('[data-post-id]').first().click();
      await expect(modal).toBeVisible();

      await auth.page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
   });

   test('previous and next buttons navigate between posts', async ({
      auth,
   }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(auth);

      await createPost(auth, { description: 'First post' });
      await createPost(auth, { description: 'Second post' });
      const modal = auth.page.locator('[data-testid="post-modal"]');

      // Open the first post in grid (most recent = second post)
      await auth.page.locator('[data-post-id]').first().click();
      await expect(modal).toBeVisible();
      await expect(modal.getByText('Second post')).toBeVisible();

      // Navigate to next (older) post
      await auth.page.getByLabel('Next post').click();
      await expect(modal.getByText('First post')).toBeVisible({
         timeout: 10_000,
      });

      // Navigate back
      await auth.page.getByLabel('Previous post').click();
      await expect(modal.getByText('Second post')).toBeVisible({
         timeout: 10_000,
      });
   });
});

test.describe('post edit', () => {
   test('user can edit a post description', async ({ auth }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(auth);
      await createPost(auth, { description: 'Original description' });
      const modal = auth.page.locator('[data-testid="post-modal"]');

      await auth.page.locator('[data-post-id]').first().click();
      await expect(modal).toBeVisible();

      await auth.page.locator('[data-slot="dropdown-menu-trigger"]').click();
      await auth.page
         .locator('[role="menuitem"]')
         .filter({ hasText: 'Edit' })
         .click();
      await expect(auth.page).toHaveURL(/\/posts\/.+\/edit/);

      await auth.page.getByLabel('Description').clear();
      await auth.page.getByLabel('Description').fill('Updated description');

      // User is redirected back to the post on save
      await auth.page.getByRole('button', { name: 'Save changes' }).click();

      // Assert updated description
      await expect(modal.getByText('Updated description')).toBeVisible({
         timeout: 10_000,
      });
   });

   test('non-owner cannot access edit route', async ({ auth, secondAuth }) => {
      // User 1 creates the post
      await auth.signInViaMagicLink();
      await completeProfileSetup(auth);
      await createPost(auth);

      const postId = await auth.page
         .locator('[data-post-id]')
         .first()
         .getAttribute('data-post-id');

      // User 2 tries to access user 1's post edit route
      await secondAuth.signInViaMagicLink();
      await completeProfileSetup(secondAuth);

      await secondAuth.page.goto(`/posts/${postId}/edit`);
      await expect(secondAuth.page).not.toHaveURL(/\/posts\/.+\/edit/);
   });
});

test.describe('post delete', () => {
   test('user can delete a post from the modal', async ({ auth }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(auth);
      await createPost(auth, { description: 'Modal test post' });

      const modal = auth.page.locator('[data-testid="post-modal"]');
      const postId = await auth.page
         .locator('[data-post-id]')
         .first()
         .getAttribute('data-post-id');

      await auth.page.locator('[data-post-id]').first().click();
      await expect(modal).toBeVisible();

      await auth.page.locator('[data-slot="dropdown-menu-trigger"]').click();
      await auth.page
         .locator('[role="menuitem"]')
         .filter({ hasText: 'Delete' })
         .click();

      // Confirm dialog
      await expect(auth.page.getByRole('alertdialog')).toBeVisible();
      await auth.page.getByRole('button', { name: 'Delete' }).click();

      // Modal closes and post disappears from grid
      await expect(modal).not.toBeVisible({ timeout: 10_000 });
      await expect(
         auth.page.locator(`[data-post-id="${postId}"]`),
      ).not.toBeVisible();
   });
});
