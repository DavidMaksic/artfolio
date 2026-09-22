import { engagementRouter } from '@/trpc/routers/engagement.js';
import { profileRouter } from '@/trpc/routers/profile.js';
import { followRouter } from '@/trpc/routers/follow.js';
import { postRouter } from '@/trpc/routers/post.js';
import { feedRouter } from '@/trpc/routers/feed.js';
import { tagRouter } from '@/trpc/routers/tag.js';
import { router } from '@/trpc/init.js';

export const appRouter = router({
   profile: profileRouter,
   post: postRouter,
   feed: feedRouter,
   engagement: engagementRouter,
   follow: followRouter,
   tag: tagRouter,
});

export type AppRouter = typeof appRouter;
