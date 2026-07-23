import { Context } from '@/trpc/context.js';
import { initTRPC } from '@trpc/server';
import { ZodError } from 'zod';

export const t = initTRPC.context<Context>().create({
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
export const procedure = t.procedure;
export const middleware = t.middleware;
