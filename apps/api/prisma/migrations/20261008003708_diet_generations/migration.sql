-- CreateTable
CREATE TABLE "diet_generations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "input" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diet_generations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "diet_generations_user_id_created_at_idx" ON "diet_generations"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "diet_generations" ADD CONSTRAINT "diet_generations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
