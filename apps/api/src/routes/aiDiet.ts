import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { dietProfileSchema } from '../lib/nutrition.js';
import { routineSchema } from '../lib/schemas.js';
import { dietStatus, generateDiet, swapMeal } from '../services/aiDiet.js';

const swapBody = z.object({
  generationId: z.uuid(),
  // A dieta como está na tela (já com trocas anteriores), para a IA não repetir alimentos
  meals: z.array(routineSchema).min(1).max(6),
  index: z.number().int().min(0),
  request: z.string().trim().max(120, 'Use no máximo 120 caracteres no pedido.').default(''),
});

/**
 * Dieta gerada por IA. As rotas só devolvem uma prévia; para usá-la, o app salva as
 * refeições pelo PUT /routines/meals, que arquiva o plano anterior e preserva o histórico.
 */
export const aiDietRoutes: FastifyPluginAsync = async (app) => {
  app.get('/ai-diet', async (request) => dietStatus(request.user.id));

  app.post('/ai-diet/generate', async (request) => {
    const profile = dietProfileSchema.parse(request.body);
    return generateDiet(request.user.id, profile, request.log);
  });

  app.post('/ai-diet/swap', async (request) => {
    const body = swapBody.parse(request.body);
    return swapMeal(request.user.id, body, request.log);
  });
};
