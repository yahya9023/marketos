-- Add the relationship as nullable first so existing products can be backfilled.
ALTER TABLE "Product" ADD COLUMN "storeId" TEXT;

-- Existing products belonged to the store selected by the former first-store convention.
UPDATE "Product"
SET "storeId" = (
    SELECT "id"
    FROM "Store"
    ORDER BY "createdAt" ASC
    LIMIT 1
)
WHERE "storeId" IS NULL;

-- Do not allow the relationship to remain incomplete after the backfill.
ALTER TABLE "Product" ALTER COLUMN "storeId" SET NOT NULL;

DROP INDEX "Product_barcode_key";
CREATE INDEX "Product_storeId_idx" ON "Product"("storeId");
CREATE UNIQUE INDEX "Product_storeId_barcode_key" ON "Product"("storeId", "barcode");

ALTER TABLE "Product"
ADD CONSTRAINT "Product_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;