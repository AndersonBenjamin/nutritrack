import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().default(3000),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  NODE_ENV: z.string().default('development'),
  // Dieta gerada por IA: sem a chave, a rota responde que o recurso não está configurado
  ANTHROPIC_API_KEY: z.string().trim().optional().transform((v) => v || undefined),
  AI_DIET_DAILY_LIMIT: z.coerce.number().int().min(0).default(5),
  // Só para testes: devolve um cardápio fake sem chamar a IA
  AI_DIET_MOCK: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export const env = schema.parse(process.env);
