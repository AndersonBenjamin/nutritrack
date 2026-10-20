-- Integração com o app-labs: a identidade passa a poder vir do hub (OIDC).
-- Quem entra por SSO não tem senha local, e o vínculo é pelo `sub`, nunca pelo e-mail.

ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

ALTER TABLE "users" ADD COLUMN "external_id" TEXT;

CREATE UNIQUE INDEX "users_external_id_key" ON "users"("external_id");
