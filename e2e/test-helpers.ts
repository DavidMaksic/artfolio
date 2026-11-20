import { expect, Locator } from '@playwright/test';
import { AuthFixture } from '@/fixtures';
import { redis } from '@artfolio/server/lib/redis.js';
import path from 'path';

export const TEST_IMAGE = path.resolve('e2e/test-images/post-image.jpg');

export async function getSignInOtp(email: string): Promise<string> {
   const raw = await redis.get(`verification:sign-in-otp-${email}`);
   if (!raw) throw new Error(`No OTP found for ${email}`);
   return JSON.parse(raw).value.split(':')[0];
}

export async function completeProfileSetup(auth: AuthFixture) {
   await auth.page.getByLabel('Username').fill(auth.username);
   await auth.page.getByLabel('Display name').fill(auth.displayName);
   await auth.page.getByRole('button', { name: 'Continue' }).click();
   await auth.page.getByRole('button', { name: 'Finish setup' }).click();
   await expect(auth.page).toHaveURL('/', { timeout: 15_000 });
}

export async function createPost(
   auth: AuthFixture,
   options: { description?: string; tags?: string[]; redirectTo?: string } = {},
) {
   await auth.page.getByLabel('New post').click();
   await expect(auth.page).toHaveURL('/posts/create');

   // Upload an image
   await auth.page.locator('input[type="file"]').setInputFiles(TEST_IMAGE);
   await expect(auth.page.locator("img[src^='blob:']").first()).toBeVisible();

   // Fill description (optional) and select a category
   if (options.description) {
      await auth.page.getByLabel('description').fill(options.description);
   }
   await auth.page.locator('#category').click();
   await auth.page.getByRole('option').first().click();

   // Add tags
   if (options.tags?.length) {
      const tagInput = auth.page.getByPlaceholder(/tag/i);
      for (const tag of options.tags) {
         await tagInput.fill(tag);
         await tagInput.press('Enter');
         await expect(
            auth.page
               .getByText(tag, { exact: true })
               .and(auth.page.locator('span')),
         ).toBeVisible();
      }
   }

   // Upload and create now run in the background after an immediate redirect, so wait for the tRPC mutation to finish before the test moves on
   const created = auth.page.waitForResponse(
      (res) =>
         res.url().includes('post.create') && res.request().method() === 'POST',
      { timeout: 30_000 },
   );

   await auth.page.getByRole('button', { name: 'Publish' }).click();
   await expect(auth.page).toHaveURL('/');

   const response = await created;
   expect(response.ok(), 'post.create should succeed').toBe(true);

   const body = await response.json();
   const item = Array.isArray(body) ? body[0] : body; // batched or not
   const data = item.result.data;
   const id = (data.json ?? data).id as string;

   if (options.redirectTo) {
      await auth.page.goto(options.redirectTo);
   }

   return { id, locator: auth.page.locator(`[data-post-id="${id}"]`) };
}

export async function setupDiscussionScenario(
   author: AuthFixture,
   commenter: AuthFixture,
   comment: string,
) {
   const post = await createPost(author);

   await commenter.page.goto(`/${author.username}`);
   const modal = await openPostModal(commenter, {
      locator: commenter.page.locator(`[data-post-id="${post.id}"]`),
   });

   await modal.locator('textarea[placeholder="Add a comment…"]').fill(comment);
   await modal.getByRole('button', { name: 'Post', exact: true }).click();
   await expect(modal.getByText(comment)).toBeVisible({ timeout: 10_000 });

   await commenter.page.keyboard.press('Escape');
   return post;
}

export async function openPostModal(
   auth: AuthFixture,
   post: { locator: Locator },
) {
   await post.locator.click();
   const modal = auth.page.getByTestId('post-modal');
   await expect(modal).toBeVisible();
   return modal;
}
