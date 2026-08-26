import { expect, Page } from '@playwright/test';
import { redis } from '@artfolio/server/lib/redis.js';
import path from 'path';

export async function getSignInOtp(email: string): Promise<string> {
   const raw = await redis.get(`verification:sign-in-otp-${email}`);
   if (!raw) throw new Error(`No OTP found for ${email}`);
   return JSON.parse(raw).value.split(':')[0];
}

export async function completeProfileSetup(
   page: Page,
   username: string,
   displayName: string,
) {
   await page.getByLabel('Username').fill(username);
   await page.getByLabel('Display name').fill(displayName);
   await page.getByRole('button', { name: 'Continue' }).click();
   await page.getByRole('button', { name: 'Finish setup' }).click();
   await expect(page).toHaveURL(`/${username}`);
}

export const TEST_IMAGE = path.resolve('e2e/test-images/post-image.jpg');
