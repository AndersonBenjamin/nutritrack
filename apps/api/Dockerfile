# Etapa 1: dependências, Prisma Client e compilação do TypeScript
FROM node:22-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# O prisma.config.ts exige a variável, mas o build não acessa o banco
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# Etapa 2: imagem final só com o necessário para rodar
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/prisma.config.ts ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
# Aplica as migrações pendentes e sobe a API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
