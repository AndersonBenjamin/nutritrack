# Nutrio

App web mobile-first (React + Vite) para controlar a dieta: refeições do dia e consumo de água.

## Rodar

```bash
npm install
npm run dev      # abre em http://localhost:5173
npm run build    # gera a versão de produção em dist/
```

Para abrir no celular na mesma rede: `npm run dev -- --host` e acesse o IP mostrado no terminal.

## Telas

- **Login** e **Cadastro** — contas salvas no próprio navegador (localStorage), com senha em hash SHA-256.
- **Plano** — cria/edita refeições (nome, horário, kcal, o que comer), meta diária de água e tamanho do copo.
- **Hoje** — progresso do dia, registro de água por copos e cards das refeições:
  - consumidas → card branco com check preenchido
  - próxima → card laranja em destaque
  - seguintes → card branco com check vazio

Os registros são separados por dia, então tudo zera automaticamente no dia seguinte.

## Estrutura

```
src/
  App.jsx               rotas simples, sessão e persistência
  lib/store.js          localStorage, hash de senha, plano padrão
  components/           ícones, navegação inferior, layout de login
  screens/              Login, Register, Home, Plan
  styles.css            tema escuro + amarelo/laranja
```

> Não há servidor: para usar em vários aparelhos com a mesma conta, seria preciso um backend (ex.: Supabase ou Firebase).
