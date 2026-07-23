import { toNodeHandler } from 'better-auth/node';
import { Router } from 'express';
import { auth } from '@/lib/auth.js';

const router = Router();

router.all('/*', toNodeHandler(auth));

export { router as authRouter };
