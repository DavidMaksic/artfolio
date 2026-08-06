import { cleanupTestUser } from "./global-setup.js";
import { expect, test } from "./fixtures.js";

test.describe("OTP flows", () => {
  const magicLinkEmail = `e2e+magic+${Date.now()}@test.com`;
  const manualEmail = `e2e+manual+${Date.now()}@test.com`;

  test.afterAll(async () => {
    await cleanupTestUser(magicLinkEmail);
    await cleanupTestUser(manualEmail);
  });

  test("magic link", async ({ page, loginViaMagicLink }) => {
    await loginViaMagicLink(magicLinkEmail);
    await expect(page).toHaveURL("/");
  });

  test("manual entry", async ({ page, emailSubmit }) => {
    const otp = await emailSubmit(manualEmail);
    await page.keyboard.type(otp);
    await expect(page).toHaveURL("/");
  });
});

test.describe("session persistence", () => {
  const email = `e2e+session+${Date.now()}@test.com`;

  test.afterAll(async () => {
    await cleanupTestUser(email);
  });

  test("session survives page reload", async ({ page, loginViaMagicLink }) => {
    await loginViaMagicLink(email);
    await expect(page).toHaveURL("/");

    await page.reload();
    await expect(page).toHaveURL("/");
  });
});

test.describe("sign out", () => {
  const email = `e2e+signout+${Date.now()}@test.com`;

  test.afterAll(async () => {
    await cleanupTestUser(email);
  });

  test("clears session and redirects to sign-in", async ({ page, loginViaMagicLink }) => {
    await loginViaMagicLink(email);
    await page.getByRole("button", { name: "Sign Out" }).click();
    await expect(page).toHaveURL("/auth/sign-in");

    await page.goto("/");
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });
});
