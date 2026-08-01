import { expect, Page } from "@playwright/test";
import { redis } from "../../server/src/lib/redis.js";
import { user } from "../../server/src/db/schema/auth.js";
import { db } from "../../server/src/db/index.js";
import { eq } from "drizzle-orm";

// Look up /server's env variables
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve("../server/.env") });

export async function cleanupTestUser(email: string) {
  await db.delete(user).where(eq(user.email, email));
}

export async function loginViaMagicLink(page: Page, email: string) {
  const otp = await emailSubmit(page, email);
  await page.goto(`/auth/verify?email=${encodeURIComponent(email)}&code=${otp}`);
}

export async function emailSubmit(page: Page, email: string): Promise<string> {
  // Submit email on sign-in
  await page.goto("/auth/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Continue with email" }).click();

  // Wait for redirect to verify page
  await expect(page).toHaveURL(/\/auth\/verify/);

  // Read OTP key from Redis
  const raw = await redis.get(`verification:sign-in-otp-${email}`);
  const otp = JSON.parse(raw!).value.split(":")[0];

  return otp;
}
