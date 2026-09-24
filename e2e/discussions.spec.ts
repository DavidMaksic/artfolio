import { cleanupCloudinaryFolder } from '@/global-setup';
import { setupDiscussionScenario } from './test-helpers';
import { test, expect } from './fixtures';

test.afterAll(async () => {
   await cleanupCloudinaryFolder('artfolio/posts');
});

test.describe('discussions', () => {
   test('comment by another user appears in discussions sidebar', async ({
      auth,
      secondAuth,
   }) => {
      await setupDiscussionScenario(auth, secondAuth, 'Great work!');

      // Go to feed — discussion should appear in sidebar
      await auth.page.goto('/');
      await expect(auth.page.getByText('Great work!')).toBeVisible({
         timeout: 10_000,
      });
   });

   test("viewer's own comments do not appear in discussions sidebar", async ({
      auth,
      secondAuth,
   }) => {
      await setupDiscussionScenario(auth, secondAuth, 'My own comment');

      // User B's own comment should NOT appear in their discussions sidebar
      await secondAuth.page.goto('/');
      await expect(
         secondAuth.page.getByText('My own comment'),
      ).not.toBeVisible();
   });

   test('clicking a discussion item opens the post modal focused on that comment', async ({
      auth,
      secondAuth,
   }) => {
      await setupDiscussionScenario(auth, secondAuth, 'Focused comment test');

      // Go to feed and click the discussion item
      await auth.page.goto('/');
      await auth.page.getByText('Focused comment test').click();
      await auth.page.waitForLoadState('networkidle');

      // Comment is visible on detail modal
      const modal = auth.page.locator('[data-testid="post-modal"]');
      await expect(modal).toBeVisible({ timeout: 10_000 });
      await expect(
         modal
            .locator('[data-comment-id]')
            .filter({ hasText: 'Focused comment test' }),
      ).toBeVisible({ timeout: 10_000 });
   });
});
