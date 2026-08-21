import { expect, test } from '@/fixtures.js';

test.describe('OTP flows', () => {
   test('magic link', async ({ page, auth }) => {
      await auth.signInViaMagicLink();
      await expect(page).toHaveURL('/profile-setup');
   });

   test('manual entry', async ({ page, auth }) => {
      const otp = await auth.emailSubmit();
      await page.keyboard.type(otp);
      await expect(page).toHaveURL('/profile-setup');
   });
});

test.describe('session persistence', () => {
   test('session survives page reload', async ({ page, auth }) => {
      await auth.signInViaMagicLink();
      await expect(page).toHaveURL('/profile-setup');

      await page.reload();
      await expect(page).toHaveURL('/profile-setup');
   });
});

test.describe('sign out', () => {
   test('clears session and redirects to sign-in', async ({ page, auth }) => {
      await auth.signInViaMagicLink();
      await page.getByRole('button', { name: 'Sign Out' }).click();
      await expect(page).toHaveURL('/auth/sign-in');
   });
});
