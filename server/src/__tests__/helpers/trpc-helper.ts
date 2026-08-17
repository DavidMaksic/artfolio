import type { Context } from '@/trpc/context.js';
import { appRouter } from '@/router.js';

export function createCaller(
   contextOverrides: Partial<Context> = {},
): ReturnType<typeof appRouter.createCaller> {
   const ctx: Context = {
      req: {} as any,
      res: {} as any,
      session: null,
      user: null,
      ...contextOverrides,
   };

   return appRouter.createCaller(ctx);
}

export function createAuthenticatedCaller(
   user: Context['user'],
): ReturnType<typeof appRouter.createCaller> {
   return createCaller({
      user,
      session: { user, session: {} } as any,
   });
}
