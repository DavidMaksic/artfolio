import { TRPCError } from '@trpc/server';
import { t } from '@/trpc/init.js';

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
   if (!ctx.user) {
      throw new TRPCError({
         code: 'UNAUTHORIZED',
         message: 'You must be signed in to do that.',
      });
   }
   return next({ ctx: { ...ctx, user: ctx.user } });
});
