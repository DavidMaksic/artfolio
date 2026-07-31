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
  // DB — cascades to session, account, verification via FK
  await db.delete(user).where(eq(user.email, email));

  // Redis
  // TODO: This does not work yet
  const keys = await redis.keys(`*${email}*`);
  if (keys.length) await redis.del(...keys);
}

export async function loginViaOTP(page: Page, email: string) {
  // 1. Submit email on sign-in
  await page.goto("/auth/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Continue with email" }).click();

  // 2. Wait for redirect to verify page
  await expect(page).toHaveURL(/\/auth\/verify/);

  // 3. Read OTP key from Redis
  const raw = await redis.get(`verification:sign-in-otp-${email}`);
  const otp = JSON.parse(raw!).value.split(":")[0];

  // 4. Navigate with code in URL - triggers auto-verify on mount
  await page.goto(`/auth/verify?email=${encodeURIComponent(email)}&code=${otp}`);

  // 5. Wait for redirect
  await expect(page).not.toHaveURL(/\/auth/, { timeout: 15_000 });
}
