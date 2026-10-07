import { createHash, randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../db.js';
import { env } from '../env.js';
import { HttpError } from './errors.js';

export const SESSION_COOKIE = 'nutrio_session';
const SESSION_DAYS = 30;
const DAY_MS = 86_400_000;

// argon2id com os parâmetros recomendados pela OWASP
const ARGON_OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

export const hashPassword = (password: string) => hash(password, ARGON_OPTS);
export const verifyPassword = (passwordHash: string, password: string) => verify(passwordHash, password).catch(() => false);

// Usado quando o e-mail não existe, para o login levar o mesmo tempo nos dois casos
let dummyHash: Promise<string> | null = null;
export const dummyVerify = async (password: string) => {
  dummyHash ??= hashPassword('nutrio-dummy-password');
  await verifyPassword(await dummyHash, password);
};

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

function setSessionCookie(reply: FastifyReply, token: string, expiresAt: Date) {
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function createSession(reply: FastifyReply, userId: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY_MS);
  await prisma.session.create({ data: { userId, tokenHash: sha256(token), expiresAt } });
  setSessionCookie(reply, token, expiresAt);
}

export async function destroySession(request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies[SESSION_COOKIE];
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  reply.clearCookie(SESSION_COOKIE, { path: '/' });
}

declare module 'fastify' {
  interface FastifyRequest {
    user: { id: string; name: string; email: string; timezone: string; createdAt: Date };
  }
}

/** preHandler das rotas protegidas: valida o cookie e carrega o usuário em request.user. */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies[SESSION_COOKIE];
  if (!token) throw new HttpError(401, 'Não autenticado.');

  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { select: { id: true, name: true, email: true, timezone: true, createdAt: true } } },
  });
  if (!session || session.expiresAt <= new Date()) {
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    throw new HttpError(401, 'Sessão expirada. Entre novamente.');
  }

  // Sessão deslizante: renova quando passou da metade da validade
  if (session.expiresAt.getTime() - Date.now() < (SESSION_DAYS / 2) * DAY_MS) {
    const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY_MS);
    await prisma.session.update({ where: { id: session.id }, data: { expiresAt } });
    setSessionCookie(reply, token, expiresAt);
  }

  request.user = session.user;
}
