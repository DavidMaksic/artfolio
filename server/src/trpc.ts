import { initTRPC } from '@trpc/server';
import { ZodError } from 'zod';
import { db } from './db';

export const createContext = () => ({
   db,
   user: null as { id: string; email: string } | null,
});

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
   errorFormatter({ shape, error }) {
      return {
         ...shape,
         data: {
            ...shape.data,
            zodError:
               error.cause instanceof ZodError ? error.cause.issues : null,
         },
      };
   },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
   if (!ctx.user) throw new Error('UNAUTHORIZED');
   return next({ ctx: { ...ctx, user: ctx.user } });
});
