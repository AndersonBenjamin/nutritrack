import { prisma } from '../db.js';
import { toDbDate, todayIn } from '../lib/dates.js';
import { HttpError } from '../lib/errors.js';
import type { Identity } from '../lib/oidc.js';
import { DEFAULT_WATER } from './days.js';
import { defaultMeals } from './routines.js';
import { itemData } from './serialize.js';

type NewUser = {
  name: string;
  email: string;
  timezone: string;
  passwordHash?: string;
  externalId?: string;
};

/**
 * Cria a conta com o que todo mundo precisa no primeiro acesso: meta de água e
 * as refeições padrão. Usado tanto pelo cadastro por senha quanto pelo SSO — a
 * diferença entre os dois é só como a pessoa provou quem é.
 */
export async function createUserWithDefaults(input: NewUser) {
  const today = toDbDate(todayIn(input.timezone));

  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      externalId: input.externalId,
      timezone: input.timezone,
      waterGoals: { create: { ...DEFAULT_WATER, effectiveFrom: today } },
      routines: {
        create: defaultMeals().map((m) => ({
          kind: 'MEAL' as const,
          name: m.name,
          time: m.time,
          activeFrom: today,
          items: { create: m.items.map(itemData) },
        })),
      },
    },
  });
}

/**
 * Encontra ou cria o usuário local a partir da identidade do app-labs.
 *
 * **O vínculo é o `sub`, nunca o e-mail.** O e-mail muda no provedor e o `sub`
 * não; usá-lo como chave é o erro que quebra a conta de todo mundo no dia em que
 * alguém troca de endereço.
 *
 * E-mail já usado por uma conta local **não** é vinculado automaticamente:
 * herdar uma conta existente só porque o e-mail coincide seria confiar num
 * e-mail que ninguém provou ser desta pessoa.
 */
export async function userFromIdentity(identity: Identity, timezone: string) {
  const bySub = await prisma.user.findUnique({ where: { externalId: identity.sub } });

  if (bySub) {
    // O nome pode ter mudado no hub. O e-mail local fica o do primeiro acesso:
    // atualizá-lo poderia colidir com uma conta que já usa o endereço novo.
    if (identity.name !== bySub.name) {
      return prisma.user.update({ where: { id: bySub.id }, data: { name: identity.name } });
    }
    return bySub;
  }

  const byEmail = await prisma.user.findUnique({ where: { email: identity.email } });
  if (byEmail) {
    throw new HttpError(
      409,
      'Já existe uma conta com este e-mail no Nutrio. Entre com ela por senha.',
    );
  }

  return createUserWithDefaults({
    name: identity.name,
    email: identity.email,
    timezone,
    externalId: identity.sub,
  });
}
