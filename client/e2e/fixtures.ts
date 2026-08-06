import { test as base, expect } from "@playwright/test";
import { redis } from "../../server/src/lib/redis.js";

export const test = base.extend<{
  emailSubmit: (email: string) => Promise<string>;
  loginViaMagicLink: (email: string) => Promise<void>;
}>({
  emailSubmit: async ({ page }, use) => {
    await use(async (email: string) => {
      await page.goto("/auth/sign-in");
      await page.getByLabel("Email address").fill(email);
      await page.getByRole("button", { name: "Continue with email" }).click();
      await expect(page).toHaveURL(/\/auth\/verify/);

      const raw = await redis.get(`verification:sign-in-otp-${email}`);
      const otp = JSON.parse(raw!).value.split(":")[0];
      return otp;
    });
  },

  loginViaMagicLink: async ({ page, emailSubmit }, use) => {
    await use(async (email: string) => {
      const otp = await emailSubmit(email);
      await page.goto(`/auth/verify?email=${encodeURIComponent(email)}&code=${otp}`);
    });
  },
});

export { expect } from "@playwright/test";
