import { cleanupTestUser, loginViaOTP } from "./test-helpers.js";
import { test, expect } from "playwright/test";
import { redis } from "../../server/src/lib/redis.js";

const email = `e2e+${Date.now()}@test.com`;

test.afterAll(async () => {
  await cleanupTestUser(email);
  await redis.quit();
});

test.describe("requiresGuest guard", () => {
  test("unauthenticated user can access sign-in route", async ({ page }) => {
    await page.goto("/auth/sign-in");
    await expect(page).toHaveURL("/auth/sign-in");
  });

  test("authenticated user is redirected to home", async ({ page }) => {
    await loginViaOTP(page, email);
    await page.goto("/auth/sign-in");
    await expect(page).toHaveURL("/");
  });
});
