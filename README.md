# Nutrio

App web mobile-first para acompanhar a dieta: refeições planejadas × consumidas, água, remédios/vitaminas e histórico diário.

## Arquitetura

```
apps/
  web/   React + Vite (frontend), servido por nginx, que também faz proxy de /api
  api/   Node + Fastify + TypeScript + Prisma (API REST)
docker-compose.yml       produção: web + api + Postgres
docker-compose.dev.yml   desenvolvimento: só o Postgres
```

```
navegador ──► nginx (web) ──/api──► api (Fastify) ──► Postgres
```

- **Autenticação:** senha com hash argon2id e sessão em cookie `httpOnly` (no banco fica só o hash do token). O logout invalida a sessão.
- **Isolamento:** todas as consultas filtram pelo usuário da sessão. Recurso de outro usuário responde 404.
- **Planejado × realizado:** o plano (`routines` + `routine_items`) é separado dos registros (`routine_logs` + `routine_log_items`). Os registros guardam uma cópia dos itens, então editar ou remover o plano não altera o histórico. Itens removidos do plano são arquivados, não apagados.
- **Água:** cada copo é um registro (`water_logs`). A meta tem histórico (`water_goals`), então dias antigos comparam com a meta da época.
- **Remédios/vitaminas:** funcionam como as refeições: um horário com itens (nome + quantidade). No dia, basta marcar como tomado.

## Desenvolvimento

Requisitos: Node 22+ e Docker.

```bash
# 1. Banco
docker compose -f docker-compose.dev.yml up -d

# 2. API (http://localhost:3000)
cd apps/api
cp .env.example .env
npm install
npx prisma migrate dev     # aplica as migrações e gera o Prisma Client
npm run dev

# 3. Frontend (http://localhost:5173, com proxy de /api para a API)
cd apps/web
npm install
npm run dev
```

Para alterar o banco, edite `apps/api/prisma/schema.prisma` e rode `npx prisma migrate dev --name descricao`.

## Produção (Docker)

```bash
cp .env.example .env       # defina POSTGRES_PASSWORD
docker compose up -d --build --remove-orphans
```

O app fica em http://localhost:8091. A API aplica as migrações pendentes sozinha ao subir. Como o cookie de sessão é `Secure`, o acesso precisa ser por HTTPS (na VPS, o nginx do host com certbot). Para testar localmente via http, use `COOKIE_SECURE=false` no `.env`.

Backup do banco:

```bash
docker compose exec -T db pg_dump -U nutrio nutrio | gzip > backup-$(date +%F).sql.gz
```

## API

Todas as rotas ficam em `/api`. Exceto as de autenticação, todas exigem sessão.

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/register` · `/auth/login` · `/auth/logout` | Cadastro, login e logout |
| GET | `/auth/me` | Usuário da sessão |
| GET/PUT | `/routines/meals` · `/routines/medications` | Plano de refeições ou de remédios (PUT salva a lista inteira) |
| GET/PUT | `/water-goal` | Meta de água e tamanho do copo (vale a partir de hoje) |
| GET | `/days/:date` | Resumo do dia: planejado × realizado, água, remédios e progresso |
| POST | `/days/:date/logs` | Registra um item do plano (`routineId`, itens opcionais) ou uma refeição avulsa |
| PUT/DELETE | `/logs/:id` | Ajusta ou remove um registro |
| POST | `/days/:date/water` | Registra água (`amountMl`) |
| DELETE | `/water-logs/:id` | Remove um registro de água |
| GET | `/history?from=&to=` | Resumo por dia (até 92 dias) |
