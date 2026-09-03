-- CreateTable
CREATE TABLE "RatingRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "leadId" TEXT,
    "rating" INTEGER,
    "comment" TEXT,
    "submittedAt" DATETIME,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RatingRequest_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "Referrer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RatingRequest_token_key" ON "RatingRequest"("token");

-- CreateIndex
CREATE INDEX "RatingRequest_referrerId_idx" ON "RatingRequest"("referrerId");

-- CreateIndex
CREATE INDEX "RatingRequest_expiresAt_idx" ON "RatingRequest"("expiresAt");
