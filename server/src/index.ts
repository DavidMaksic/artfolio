import 'dotenv/config';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { createContext } from './trpc';
import { appRouter } from './router';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

export const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

app.use(
   '/trpc',
   createExpressMiddleware({
      router: appRouter,
      createContext,
   }),
);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

if (require.main === module) {
   const PORT = Number(process.env.PORT) || 4000;

   app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
   });
}
