-- CreateEnum
CREATE TYPE "RoutineKind" AS ENUM ('MEAL', 'MEDICATION');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routines" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "RoutineKind" NOT NULL,
    "name" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "notes" TEXT,
    "active_from" DATE NOT NULL,
    "archived_on" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_items" (
    "id" UUID NOT NULL,
    "routine_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "kcal" DOUBLE PRECISION,
    "protein_g" DOUBLE PRECISION,
    "carbs_g" DOUBLE PRECISION,
    "fat_g" DOUBLE PRECISION,

    CONSTRAINT "routine_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "routine_id" UUID,
    "kind" "RoutineKind" NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routine_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_log_items" (
    "id" UUID NOT NULL,
    "log_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "unit" TEXT,
    "kcal" DOUBLE PRECISION,
    "protein_g" DOUBLE PRECISION,
    "carbs_g" DOUBLE PRECISION,
    "fat_g" DOUBLE PRECISION,

    CONSTRAINT "routine_log_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_goals" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "goal_ml" INTEGER NOT NULL,
    "cup_ml" INTEGER NOT NULL,
    "effective_from" DATE NOT NULL,

    CONSTRAINT "water_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "amount_ml" INTEGER NOT NULL,
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "water_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "routines_user_id_kind_idx" ON "routines"("user_id", "kind");

-- CreateIndex
CREATE INDEX "routine_items_routine_id_idx" ON "routine_items"("routine_id");

-- CreateIndex
CREATE INDEX "routine_logs_user_id_date_idx" ON "routine_logs"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "routine_logs_user_id_routine_id_date_key" ON "routine_logs"("user_id", "routine_id", "date");

-- CreateIndex
CREATE INDEX "routine_log_items_log_id_idx" ON "routine_log_items"("log_id");

-- CreateIndex
CREATE UNIQUE INDEX "water_goals_user_id_effective_from_key" ON "water_goals"("user_id", "effective_from");

-- CreateIndex
CREATE INDEX "water_logs_user_id_date_idx" ON "water_logs"("user_id", "date");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routines" ADD CONSTRAINT "routines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_items" ADD CONSTRAINT "routine_items_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_logs" ADD CONSTRAINT "routine_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_logs" ADD CONSTRAINT "routine_logs_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "routines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_log_items" ADD CONSTRAINT "routine_log_items_log_id_fkey" FOREIGN KEY ("log_id") REFERENCES "routine_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_goals" ADD CONSTRAINT "water_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_logs" ADD CONSTRAINT "water_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
