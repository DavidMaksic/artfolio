import { expect, test } from '@/fixtures.js';

test.describe('OTP flows', () => {
   test('magic link', async ({ auth }) => {
      await auth.signInViaMagicLink();
      await expect(auth.page).toHaveURL('/profile-setup');
   });

   test('manual entry', async ({ auth }) => {
      const otp = await auth.emailSubmit();
      await auth.page.locator('input[autocomplete="one-time-code"]').click();
      await auth.page.keyboard.type(otp);
      await expect(auth.page).toHaveURL('/profile-setup');
   });
});

test.describe('session persistence', () => {
   test('session survives page reload', async ({ auth }) => {
      await auth.signInViaMagicLink();
      await expect(auth.page).toHaveURL('/profile-setup');

      await auth.page.reload();
      await expect(auth.page).toHaveURL('/profile-setup');
   });
});

test.describe('sign out', () => {
   test('clears session and redirects to sign-in', async ({ auth }) => {
      await auth.signInViaMagicLink();
      await auth.page.getByRole('button', { name: 'Sign Out' }).click();
      await expect(auth.page).toHaveURL('/');
   });
});
