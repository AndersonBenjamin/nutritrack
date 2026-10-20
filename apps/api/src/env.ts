import { z } from 'zod';

// Variável ausente e variável vazia não são a mesma coisa para o zod: o compose
// entrega `OIDC_ISSUER=` como string vazia, e `.url()` a recusa. O `preprocess`
// trata as duas formas como "não configurado".
const unsetWhenBlank = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const optionalString = z.preprocess(unsetWhenBlank, z.string().trim().optional());
const optionalUrl = z.preprocess(unsetWhenBlank, z.url('Informe uma URL válida.').optional());

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().default(3000),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  NODE_ENV: z.string().default('development'),

  // Login pelo app-labs (OIDC). As três precisam existir juntas: com qualquer
  // uma faltando, o recurso inteiro fica desligado e o login por senha continua.
  OIDC_ISSUER: optionalUrl,
  OIDC_CLIENT_ID: optionalString,
  OIDC_REDIRECT_URI: optionalUrl,

  // Login por senha local. Mantenha `true` até o SSO estar validado — é o que
  // torna a integração reversível sem reescrever nada.
  AUTH_LOCAL_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),

  // Dieta gerada por IA: sem a chave, a rota responde que o recurso não está configurado
  ANTHROPIC_API_KEY: z.string().trim().optional().transform((v) => v || undefined),
  AI_DIET_DAILY_LIMIT: z.coerce.number().int().min(0).default(5),
  // Só para testes: devolve um cardápio fake sem chamar a IA nem precisar de chave
  AI_DIET_MOCK: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

const parsed = schema.parse(process.env);

const oidcParts = [parsed.OIDC_ISSUER, parsed.OIDC_CLIENT_ID, parsed.OIDC_REDIRECT_URI];
const oidcConfigured = oidcParts.every(Boolean);

if (!oidcConfigured && oidcParts.some(Boolean)) {
  throw new Error(
    'OIDC_ISSUER, OIDC_CLIENT_ID e OIDC_REDIRECT_URI precisam ser definidas juntas (ou nenhuma).',
  );
}

export const env = {
  ...parsed,
  OIDC_ENABLED: oidcConfigured,
};
