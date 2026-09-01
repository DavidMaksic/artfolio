import { completeProfileSetup, createPost } from '@/test-helpers';
import { test, expect } from './fixtures';

test.describe('post detail modal', () => {
   test('opens when clicking a post cell', async ({ page, auth }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(page, auth.username, auth.displayName);
      await createPost(page, { description: 'Modal test post' });
      const modal = page.locator('[data-testid="post-modal"]');

      await page.locator('[data-post-id]').first().click();
      await expect(modal).toBeVisible();
      await expect(modal.getByText('Modal test post')).toBeVisible();
   });

   test('closes on Escape key', async ({ page, auth }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(page, auth.username, auth.displayName);
      await createPost(page);
      const modal = page.locator('[data-testid="post-modal"]');

      await page.locator('[data-post-id]').first().click();
      await expect(modal).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
   });

   test('previous and next buttons navigate between posts', async ({
      page,
      auth,
   }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(page, auth.username, auth.displayName);

      await createPost(page, { description: 'First post' });
      await createPost(page, { description: 'Second post' });
      const modal = page.locator('[data-testid="post-modal"]');

      // Open the first post in grid (most recent = second post)
      await page.locator('[data-post-id]').first().click();
      await expect(modal).toBeVisible();
      await expect(modal.getByText('Second post')).toBeVisible();

      // Navigate to next (older) post
      await page.getByLabel('Next post').click();
      await expect(modal.getByText('First post')).toBeVisible({
         timeout: 10_000,
      });

      // Navigate back
      await page.getByLabel('Previous post').click();
      await expect(modal.getByText('Second post')).toBeVisible({
         timeout: 10_000,
      });
   });

   test.describe('post edit', () => {
      test('user can edit a post description', async ({ page, auth }) => {
         await auth.signInViaMagicLink();
         await completeProfileSetup(page, auth.username, auth.displayName);
         await createPost(page, { description: 'Original description' });
         const modal = page.locator('[data-testid="post-modal"]');

         await page.locator('[data-post-id]').first().click();
         await expect(modal).toBeVisible();

         await page.getByLabel('Edit button').click();
         await expect(page).toHaveURL(/\/posts\/.+\/edit/);

         await page.getByLabel('Description').clear();
         await page.getByLabel('Description').fill('Updated description');
         await page.getByRole('button', { name: 'Save changes' }).click();

         await expect(page).toHaveURL(`/${auth.username}`, { timeout: 10_000 });

         // Reopen modal and assert updated description
         await page.locator('[data-post-id]').first().click();
         await expect(modal.getByText('Updated description')).toBeVisible({
            timeout: 10_000,
         });
      });

      test('non-owner cannot access edit route', async ({
         page,
         auth,
         secondAuth,
      }) => {
         // User 1 creates the post
         await auth.signInViaMagicLink();
         await completeProfileSetup(page, auth.username, auth.displayName);
         await createPost(page);

         const postId = await page
            .locator('[data-post-id]')
            .first()
            .getAttribute('data-post-id');

         await page.getByRole('button', { name: 'Sign out' }).click();

         // User 2 tries to access user 1's post edit route
         await secondAuth.signInViaMagicLink();
         await completeProfileSetup(
            page,
            secondAuth.username,
            secondAuth.displayName,
         );

         await page.goto(`/posts/${postId}/edit`);
         await expect(page).not.toHaveURL(/\/posts\/.+\/edit/);
      });
   });

   test.describe('post delete', () => {
      test('user can delete a post from the modal', async ({ page, auth }) => {
         await auth.signInViaMagicLink();
         await completeProfileSetup(page, auth.username, auth.displayName);
         await createPost(page, { description: 'Modal test post' });

         const modal = page.locator('[data-testid="post-modal"]');
         const postId = await page
            .locator('[data-post-id]')
            .first()
            .getAttribute('data-post-id');

         await page.locator('[data-post-id]').first().click();
         await expect(modal).toBeVisible();
         await page.getByRole('button', { name: 'Delete' }).click();

         // Confirm dialog
         await expect(page.getByRole('alertdialog')).toBeVisible();
         await page.getByRole('button', { name: 'Delete' }).click();

         // Modal closes and post disappears from grid
         await expect(modal).not.toBeVisible({ timeout: 10_000 });
         await expect(
            page.locator(`[data-post-id="${postId}"]`),
         ).not.toBeVisible();
      });
   });
});
