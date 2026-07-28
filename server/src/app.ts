import 'dotenv/config';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { createContext } from '@/trpc/context.js';
import { toNodeHandler } from 'better-auth/node';
import { appRouter } from '@/router.js';
import { auth } from '@/lib/auth.js';

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

export const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));

app.all('/api/auth/{*any}', toNodeHandler(auth));
app.use(express.json());

app.use(
   '/trpc',
   createExpressMiddleware({
      router: appRouter,
      createContext,
   }),
);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
