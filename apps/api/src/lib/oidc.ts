import * as client from 'openid-client';
import { env } from '../env.js';
import { HttpError } from './errors.js';

/**
 * Login pelo app-labs (OIDC Authorization Code + PKCE).
 *
 * O Nutrio **não** delega a sessão: ele troca o código, confere o `id_token`,
 * faz o vínculo local pelo `sub` e emite o **próprio** cookie (`nutrio_session`),
 * como sempre fez. O que o app-labs substitui é a tela de senha, não o mecanismo
 * de sessão — é isso que torna a integração barata e reversível.
 *
 * O cliente é **público** (sem secret) porque não há como guardar segredo no
 * navegador: a prova de que o código foi pedido por este app é o PKCE.
 */

let configuration: Promise<client.Configuration> | null = null;

/** Descoberta do provedor — buscada uma vez e reaproveitada (JWKS incluído). */
function configuration_(): Promise<client.Configuration> {
  configuration ??= client.discovery(
    new URL(env.OIDC_ISSUER ?? ''),
    env.OIDC_CLIENT_ID ?? '',
    undefined,
    client.None(),
  );
  return configuration;
}

/** O que precisa sobreviver entre o `/start` e o `/callback` — guardado em cookie. */
export type PendingLogin = { state: string; codeVerifier: string };

export function newPendingLogin(): PendingLogin {
  return { state: client.randomState(), codeVerifier: client.randomPKCECodeVerifier() };
}

export async function authorizationUrl(pending: PendingLogin): Promise<string> {
  const config = await configuration_();

  return client.buildAuthorizationUrl(config, {
    redirect_uri: env.OIDC_REDIRECT_URI ?? '',
    // Sem `offline_access`: o Nutrio não guarda token nenhum depois do login.
    scope: 'openid profile email',
    state: pending.state,
    code_challenge: await client.calculatePKCECodeChallenge(pending.codeVerifier),
    code_challenge_method: 'S256',
  }).href;
}

/** Identidade mínima que o app precisa — o `sub` é a chave, o resto é cópia. */
export type Identity = { sub: string; name: string; email: string };

/**
 * Troca o código pelo token e **valida** o `id_token` (assinatura contra o JWKS,
 * `iss`, `aud` e `exp`) — não é só decodificar o JWT.
 */
export async function identityFromCallback(
  currentUrl: URL,
  pending: PendingLogin,
): Promise<Identity> {
  const config = await configuration_();

  const tokens = await client.authorizationCodeGrant(config, currentUrl, {
    expectedState: pending.state,
    pkceCodeVerifier: pending.codeVerifier,
    idTokenExpected: true,
  });

  const claims = tokens.claims();
  const sub = claims?.sub;
  const email = typeof claims?.email === 'string' ? claims.email : undefined;

  if (!sub || !email) {
    throw new HttpError(401, 'O app-labs não devolveu um e-mail para esta conta.');
  }

  const name = typeof claims?.name === 'string' && claims.name.trim() ? claims.name.trim() : email;

  return { sub, name, email };
}
