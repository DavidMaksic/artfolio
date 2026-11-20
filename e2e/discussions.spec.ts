import { cleanupCloudinaryFolder } from '@/global-setup';
import { setupDiscussionScenario } from './test-helpers';
import { test, expect } from './fixtures';

test.afterAll(async () => {
   await cleanupCloudinaryFolder('artfolio/posts');
});

test.describe('discussions', () => {
   test('comment by another user appears in discussions sidebar', async ({
      signedIn,
      secondSignedIn,
   }) => {
      await setupDiscussionScenario(signedIn, secondSignedIn, 'Great work!');

      // Go to feed — discussion should appear in sidebar
      await signedIn.page.goto('/');
      await expect(signedIn.page.getByText('Great work!')).toBeVisible({
         timeout: 10_000,
      });
   });

   test("viewer's own comments do not appear in discussions sidebar", async ({
      signedIn,
      secondSignedIn,
   }) => {
      await setupDiscussionScenario(signedIn, secondSignedIn, 'My own comment');

      // User B's own comment should not appear in their discussions sidebar
      await secondSignedIn.page.goto('/');
      await expect(
         secondSignedIn.page.getByText('My own comment'),
      ).toBeHidden();
   });

   test('clicking a discussion item opens the post modal focused on that comment', async ({
      signedIn,
      secondSignedIn,
   }) => {
      const comment = 'Focused comment test';
      await setupDiscussionScenario(signedIn, secondSignedIn, comment);

      await signedIn.page.goto('/');
      await signedIn.page.getByText(comment).click();

      const modal = signedIn.page.getByTestId('post-modal');
      await expect(modal).toBeVisible({ timeout: 10_000 });
      await expect(
         modal.locator('[data-comment-id]').filter({ hasText: comment }),
      ).toBeVisible({ timeout: 10_000 });
   });
});
