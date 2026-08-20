CREATE TABLE "registration_invites" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "invitedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "registration_invites_tokenHash_key" ON "registration_invites"("tokenHash");
CREATE INDEX "registration_invites_email_idx" ON "registration_invites"("email");
CREATE INDEX "registration_invites_expiresAt_idx" ON "registration_invites"("expiresAt");
CREATE INDEX "registration_invites_usedAt_idx" ON "registration_invites"("usedAt");
