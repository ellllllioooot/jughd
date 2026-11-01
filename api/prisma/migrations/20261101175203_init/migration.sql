-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'QUOTA_EXHAUSTED');

-- CreateEnum
CREATE TYPE "AlertCategory" AS ENUM ('NECK', 'SHOULDER', 'SLOUCH');

-- CreateEnum
CREATE TYPE "AlertVerdict" AS ENUM ('UNCONFIRMED', 'REAL', 'FALSE');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "username" VARCHAR(32) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "tier" "Tier" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Baseline" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "landmarks" JSONB NOT NULL,
    "torsoScale" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Baseline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitoringSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMPTZ(3),
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "alertCount" INTEGER NOT NULL DEFAULT 0,
    "postureScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "baselineId" UUID NOT NULL,

    CONSTRAINT "MonitoringSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostureAlert" (
    "id" UUID NOT NULL,
    "clientKey" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "category" "AlertCategory" NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "landmarksSnapshot" JSONB NOT NULL,
    "verdict" "AlertVerdict" NOT NULL DEFAULT 'UNCONFIRMED',
    "verdictAt" TIMESTAMPTZ(3),

    CONSTRAINT "PostureAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "Baseline_userId_idx" ON "Baseline"("userId");

-- CreateIndex
CREATE INDEX "MonitoringSession_userId_startedAt_idx" ON "MonitoringSession"("userId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PostureAlert_clientKey_key" ON "PostureAlert"("clientKey");

-- CreateIndex
CREATE INDEX "PostureAlert_sessionId_idx" ON "PostureAlert"("sessionId");

-- CreateIndex
CREATE INDEX "PostureAlert_userId_idx" ON "PostureAlert"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- AddForeignKey
ALTER TABLE "Baseline" ADD CONSTRAINT "Baseline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoringSession" ADD CONSTRAINT "MonitoringSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoringSession" ADD CONSTRAINT "MonitoringSession_baselineId_fkey" FOREIGN KEY ("baselineId") REFERENCES "Baseline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostureAlert" ADD CONSTRAINT "PostureAlert_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MonitoringSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostureAlert" ADD CONSTRAINT "PostureAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
