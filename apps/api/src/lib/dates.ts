// Datas "de calendário" (YYYY-MM-DD) são gravadas como DATE no Postgres.
// O Prisma representa DATE como meia-noite UTC; estes helpers convertem nos dois sentidos.
import { z } from 'zod';
import { badRequest } from './errors.js';

export const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD');

export const toDbDate = (day: string) => new Date(`${day}T00:00:00.000Z`);
export const fromDbDate = (d: Date) => d.toISOString().slice(0, 10);

export function todayIn(timezone: string, now = new Date()) {
  // en-CA formata como AAAA-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now);
}

export function timeIn(timezone: string, now = new Date()) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
}

export function isValidTimezone(tz: string) {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function addDays(day: string, n: number) {
  const d = toDbDate(day);
  d.setUTCDate(d.getUTCDate() + n);
  return fromDbDate(d);
}

export function daysBetween(from: string, to: string) {
  return Math.round((toDbDate(to).getTime() - toDbDate(from).getTime()) / 86_400_000);
}

/** Valida uma data recebida na URL: real, não no futuro (com 1 dia de folga por fuso) e não absurda. */
export function parseDay(value: string, timezone: string) {
  const day = dateString.parse(value);
  if (Number.isNaN(toDbDate(day).getTime()) || fromDbDate(toDbDate(day)) !== day) throw badRequest('Data inválida.');
  if (day < '2000-01-01' || day > addDays(todayIn(timezone), 1)) throw badRequest('Data fora do intervalo permitido.');
  return day;
}
