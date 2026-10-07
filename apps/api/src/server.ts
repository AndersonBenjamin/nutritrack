import { buildApp } from './app.js';
import { prisma } from './db.js';
import { env } from './env.js';

const app = await buildApp();

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => {
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  });
}

await app.listen({ host: '0.0.0.0', port: env.PORT });
