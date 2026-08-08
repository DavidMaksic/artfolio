import { profileRouter } from '@/trpc/routers/profile.router.js';
import { router } from '@/trpc/init.js';

export const appRouter = router({ profile: profileRouter });

export type AppRouter = typeof appRouter;
