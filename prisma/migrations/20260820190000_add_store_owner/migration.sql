-- Add the owner relation as nullable first so existing stores can be backfilled.
ALTER TABLE "Store" ADD COLUMN "ownerId" TEXT;

-- Assign existing stores to the current OWNER account represented by the earliest OWNER employee.
UPDATE "Store"
SET "ownerId" = (
    SELECT "id"
    FROM "Employee"
    WHERE "role" = 'OWNER'
    ORDER BY "createdAt" ASC
    LIMIT 1
)
WHERE "ownerId" IS NULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "Store" WHERE "ownerId" IS NULL) THEN
        RAISE EXCEPTION 'Cannot assign existing stores: no OWNER account was found';
    END IF;
END $$;

-- Existing data must have an owner before the relation becomes required.
ALTER TABLE "Store" ALTER COLUMN "ownerId" SET NOT NULL;

CREATE INDEX "Store_ownerId_idx" ON "Store"("ownerId");

ALTER TABLE "Store"
ADD CONSTRAINT "Store_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;