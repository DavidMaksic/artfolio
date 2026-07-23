import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '@/lib/auth.js';

export const createContext = async ({
   req,
   res,
}: CreateExpressContextOptions) => {
   const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
   });

   return {
      req,
      res,
      session,
      user: session?.user ?? null,
   };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
