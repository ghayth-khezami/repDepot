ALTER TABLE "deposit_requests"
ADD COLUMN "userId" TEXT;

ALTER TABLE "deposit_requests"
ADD CONSTRAINT "deposit_requests_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "deposit_requests_userId_idx" ON "deposit_requests"("userId");
