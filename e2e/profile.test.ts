import { completeProfileSetup } from '@/test-helpers';
import { expect, test } from '@/fixtures.js';

test.describe('profile setup', () => {
   test('basic profile setup', async ({ page, auth }) => {
      await auth.signInViaMagicLink();
      await expect(page).toHaveURL('/profile-setup');
      await completeProfileSetup(page, auth.username, auth.displayName);
   });

   test('full profile setup', async ({ page, auth }) => {
      await auth.signInViaMagicLink();
      await expect(page).toHaveURL('/profile-setup');

      await page.getByLabel('Username').fill(auth.username);
      await page.getByLabel('Display name').fill(auth.displayName);
      await page.getByRole('button', { name: 'Continue' }).click();

      await page.getByLabel('Bio').fill("I'm an artist");
      await page.getByLabel('Location').fill('Serbia');
      await page.getByLabel('Website').fill('https://ethos-blog.vercel.app');
      await page.getByRole('switch').click();
      await page.getByRole('button', { name: 'Finish setup' }).click();
      await expect(page).toHaveURL('/');
   });

   test('skip profile setup', async ({ page, auth }) => {
      await auth.signInViaMagicLink();
      await expect(page).toHaveURL('/profile-setup');

      await page.getByLabel('Username').fill(auth.username);
      await page.getByLabel('Display name').fill(auth.displayName);
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.getByRole('button', { name: 'Skip for now' }).click();
      await expect(page).toHaveURL('/');
   });
});

test.describe('profile visit', () => {
   test('public profile visit', async ({ page, auth }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(page, auth.username, auth.displayName);
      await page.goto(`/${auth.username}`);
      await expect(page).toHaveURL(`/${auth.username}`);
   });

   test('non-existent profile visit', async ({ page }) => {
      await page.goto('/thisuserdoesnotexist');
      await expect(page.locator('h1')).toHaveText('Profile not found');
   });
});

test.describe('profile edit', () => {
   test('edit button visible to owner', async ({ page, auth }) => {
      await auth.signInViaMagicLink();
      await expect(page).toHaveURL('/profile-setup');
      await completeProfileSetup(page, auth.username, auth.displayName);
      await expect(
         page.getByRole('button', { name: 'Edit profile' }),
      ).toBeVisible();
   });

   test('edit button hidden from visitors', async ({ page }) => {
      // TODO: Sprint 9 — visit a real profile as a guest, once shared seed DB with stable test users is in place
      await page.goto('/thisuserdoesnotexist');
      await expect(
         page.getByRole('button', { name: 'Edit profile' }),
      ).not.toBeVisible();
   });

   test('profile editing', async ({ page, auth }) => {
      await auth.signInViaMagicLink();
      await expect(page).toHaveURL('/profile-setup');
      await completeProfileSetup(page, auth.username, auth.displayName);

      await page.getByRole('button', { name: 'Edit profile' }).click();
      await expect(page).toHaveURL('/profile/edit');

      const newUsername = `${auth.username}edited`;
      await page.getByLabel('Username').fill(newUsername);
      await page.getByRole('button', { name: 'Save changes' }).click();
      await expect(page).toHaveURL(`/${newUsername}`);
      await expect(page.getByText(`@${newUsername}`)).toBeVisible();
   });
});
