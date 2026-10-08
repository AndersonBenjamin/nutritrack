import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyError } from 'fastify';
import { ZodError } from 'zod';
import { prisma } from './db.js';
import { env } from './env.js';
import { requireAuth } from './lib/auth.js';
import { HttpError } from './lib/errors.js';
import { aiDietRoutes } from './routes/aiDiet.js';
import { authRoutes } from './routes/auth.js';
import { dayRoutes } from './routes/days.js';
import { planRoutes } from './routes/plan.js';

export async function buildApp() {
  const app = Fastify({
    logger: { level: env.NODE_ENV === 'production' ? 'info' : 'debug' },
    // Confia nos N proxies à frente (nginx do container e nginx do host) para obter o IP real
    trustProxy: (_address, hop) => hop < env.TRUST_PROXY,
    bodyLimit: 256 * 1024,
  });

  await app.register(helmet);
  await app.register(cookie);
  await app.register(rateLimit, { global: false });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof ZodError) {
      const first = error.issues[0];
      return reply.status(400).send({ error: first?.message ?? 'Dados inválidos.', issues: error.issues });
    }
    if (error instanceof HttpError) return reply.status(error.statusCode).send({ error: error.message });
    if (error.statusCode === 429) return reply.status(429).send({ error: 'Muitas tentativas. Aguarde um minuto e tente novamente.' });
    if (error.statusCode && error.statusCode < 500) return reply.status(error.statusCode).send({ error: error.message });

    request.log.error(error);
    return reply.status(500).send({ error: 'Erro interno. Tente novamente.' });
  });

  app.setNotFoundHandler((_request, reply) => reply.status(404).send({ error: 'Rota não encontrada.' }));

  await app.register(
    async (api) => {
      api.get('/health', async () => {
        await prisma.$queryRaw`SELECT 1`;
        return { ok: true };
      });

      await api.register(authRoutes);

      // Tudo daqui para baixo exige sessão; as consultas sempre filtram por request.user.id
      await api.register(async (privateApi) => {
        privateApi.addHook('preHandler', requireAuth);
        await privateApi.register(planRoutes);
        await privateApi.register(dayRoutes);
        await privateApi.register(aiDietRoutes);
      });
    },
    { prefix: '/api' },
  );

  return app;
}
