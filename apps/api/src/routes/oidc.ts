import type { FastifyPluginAsync } from 'fastify';

import { env } from '../env.js';
import { createSession } from '../lib/auth.js';
import { isValidTimezone } from '../lib/dates.js';
import { HttpError } from '../lib/errors.js';
import { authorizationUrl, identityFromCallback, newPendingLogin, type PendingLogin } from '../lib/oidc.js';
import { userFromIdentity } from '../services/users.js';

/**
 * Login pelo app-labs.
 *
 * Duas rotas, e o estado entre elas vive num cookie httpOnly de vida curta —
 * nada de estado no servidor. O `state` e o `code_verifier` precisam ser os
 * mesmos nas duas pontas; é o que impede que um código de outra pessoa (ou um
 * callback forjado) complete o login.
 */

const OIDC_COOKIE = 'nutrio_oidc';
const OIDC_COOKIE_PATH = '/api/auth/oidc';
const PENDING_MINUTES = 10;

type PendingCookie = PendingLogin & { timezone?: string };

const authRateLimit = { rateLimit: { max: 10, timeWindow: '1 minute' } };

/** Falha no meio do fluxo nunca vira JSON na cara da pessoa: volta para a tela de login. */
const backToLogin = (code: string) => `/?login=${code}`;

export const oidcRoutes: FastifyPluginAsync = async (app) => {
  app.get('/auth/oidc/start', { config: authRateLimit }, async (request, reply) => {
    if (!env.OIDC_ENABLED) throw new HttpError(404, 'Login pelo app-labs não está configurado.');

    const pending = newPendingLogin();

    // O fuso vem do navegador e é usado só se a conta for criada agora. O provedor
    // não tem como saber em que fuso a pessoa está.
    const tz = (request.query as { tz?: string }).tz;
    const timezone = tz && tz.length <= 64 && isValidTimezone(tz) ? tz : undefined;

    const payload: PendingCookie = { ...pending, ...(timezone ? { timezone } : {}) };

    reply.setCookie(OIDC_COOKIE, JSON.stringify(payload), {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: 'lax',
      path: OIDC_COOKIE_PATH,
      maxAge: PENDING_MINUTES * 60,
    });

    return reply.redirect(await authorizationUrl(pending));
  });

  app.get('/auth/oidc/callback', async (request, reply) => {
    if (!env.OIDC_ENABLED) throw new HttpError(404, 'Login pelo app-labs não está configurado.');

    reply.clearCookie(OIDC_COOKIE, { path: OIDC_COOKIE_PATH });

    const raw = request.cookies[OIDC_COOKIE];
    if (!raw) return reply.redirect(backToLogin('expirado'));

    let pending: PendingCookie;
    try {
      pending = JSON.parse(raw) as PendingCookie;
    } catch {
      return reply.redirect(backToLogin('expirado'));
    }

    try {
      // `request.protocol`/`host` respeitam o proxy (TRUST_PROXY): com HTTPS na
      // frente, a URL conferida aqui é a mesma que o navegador acessou.
      const currentUrl = new URL(request.url, `${request.protocol}://${request.host}`);

      const identity = await identityFromCallback(currentUrl, pending);
      const user = await userFromIdentity(identity, pending.timezone ?? 'America/Sao_Paulo');

      await createSession(reply, user.id);
      return reply.redirect('/');
    } catch (error) {
      if (error instanceof HttpError && error.statusCode === 409) {
        request.log.info({ err: error }, 'e-mail do app-labs já pertence a uma conta local');
        return reply.redirect(backToLogin('conflito'));
      }

      request.log.warn({ err: error }, 'falhou o login pelo app-labs');
      return reply.redirect(backToLogin('falhou'));
    }
  });
};
