import { redis } from '../server/src/lib/redis.js';

export async function getSignInOtp(email: string): Promise<string> {
   const raw = await redis.get(`verification:sign-in-otp-${email}`);
   if (!raw) throw new Error(`No OTP found for ${email}`);
   return JSON.parse(raw).value.split(':')[0];
}
