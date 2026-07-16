import { describe, it, expect } from 'vitest';
import { app } from '@/app.js';
import request from 'supertest';

describe('GET /health', () => {
   it('returns 200 with status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
   });
});
