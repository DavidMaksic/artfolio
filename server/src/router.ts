import { router } from './trpc/init.js';

export const appRouter = router({});

export type AppRouter = typeof appRouter;
