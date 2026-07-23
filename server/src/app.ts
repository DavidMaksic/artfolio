import 'dotenv/config';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { createContext } from '@/trpc/context.js';
import { authRouter } from '@/routes/auth.route.js';
import { appRouter } from '@/router.js';

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

export const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use('/api/auth', authRouter);
app.use(express.json());

app.use(
   '/trpc',
   createExpressMiddleware({
      router: appRouter,
      createContext,
   }),
);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
