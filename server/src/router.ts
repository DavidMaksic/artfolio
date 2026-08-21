import { profileRouter } from '@/trpc/routers/profile.js';
import { postRouter } from '@/trpc/routers/post.js';
import { router } from '@/trpc/init.js';

export const appRouter = router({ profile: profileRouter, post: postRouter });

export type AppRouter = typeof appRouter;
