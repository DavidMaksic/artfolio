import { completeProfileSetup } from '@/test-helpers';
import { expect, test } from '@/fixtures.js';

test.describe('profile setup', () => {
   test('basic profile setup', async ({ auth }) => {
      await auth.signInViaMagicLink();
      await expect(auth.page).toHaveURL('/profile-setup');
      await completeProfileSetup(auth);
   });

   test('full profile setup', async ({ auth }) => {
      await auth.signInViaMagicLink();
      await expect(auth.page).toHaveURL('/profile-setup');

      await auth.page.getByLabel('Username').fill(auth.username);
      await auth.page.getByLabel('Display name').fill(auth.displayName);
      await auth.page.getByRole('button', { name: 'Continue' }).click();

      await auth.page.getByLabel('Bio').fill("I'm an artist");
      await auth.page.getByLabel('Location').fill('Serbia');
      await auth.page
         .getByLabel('Website')
         .fill('https://ethos-blog.vercel.app');
      await auth.page.getByRole('switch').click();
      await auth.page.getByRole('button', { name: 'Finish setup' }).click();
      await expect(auth.page).toHaveURL('/');
   });

   test('skip profile setup', async ({ auth }) => {
      await auth.signInViaMagicLink();
      await expect(auth.page).toHaveURL('/profile-setup');

      await auth.page.getByLabel('Username').fill(auth.username);
      await auth.page.getByLabel('Display name').fill(auth.displayName);
      await auth.page.getByRole('button', { name: 'Continue' }).click();
      await auth.page.getByRole('button', { name: 'Skip for now' }).click();
      await expect(auth.page).toHaveURL('/');
   });
});

test.describe('profile visit', () => {
   test('public profile visit', async ({ auth }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(auth);
      await auth.page.goto(`/${auth.username}`);
      await expect(auth.page).toHaveURL(`/${auth.username}`);
   });

   test('non-existent profile visit', async ({ auth }) => {
      await auth.page.goto('/thisuserdoesnotexist');
      await expect(auth.page.locator('h1')).toHaveText('Profile not found');
   });
});

test.describe('profile edit', () => {
   test('edit button visible to owner', async ({ auth }) => {
      await auth.signInViaMagicLink();
      await expect(auth.page).toHaveURL('/profile-setup');
      await completeProfileSetup(auth);

      await auth.page.goto(`/${auth.username}`);
      await expect(
         auth.page.getByRole('button', { name: 'Edit profile' }),
      ).toBeVisible();
   });

   test('edit button hidden from visitors', async ({ auth, secondAuth }) => {
      await auth.signInViaMagicLink();
      await completeProfileSetup(auth);

      // Visit someone's profile as a guest
      await secondAuth.page.goto(`/${auth.username}`);
      await expect(
         secondAuth.page.getByRole('button', { name: 'Edit profile' }),
      ).not.toBeVisible();
   });

   test('profile editing', async ({ auth }) => {
      await auth.signInViaMagicLink();
      await expect(auth.page).toHaveURL('/profile-setup');
      await completeProfileSetup(auth);

      await auth.page.goto(`/${auth.username}`);
      await auth.page.getByRole('button', { name: 'Edit profile' }).click();
      await expect(auth.page).toHaveURL('/profile/edit');

      const newUsername = `${auth.username}edited`;
      await auth.page.getByLabel('Username').fill(newUsername);
      await auth.page.getByRole('button', { name: 'Save changes' }).click();
      await expect(auth.page).toHaveURL(`/${newUsername}`);
      await expect(auth.page.getByText(`@${newUsername}`)).toBeVisible();
   });
});
