-- Add tenant ownership and the reusable StoreProduct assignment table.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;

CREATE TABLE IF NOT EXISTS "StoreProduct" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StoreProduct_pkey" PRIMARY KEY ("id")
);

-- Recreate the old Product.storeId visibility before removing that column.
INSERT INTO "StoreProduct" ("id", "storeId", "productId", "active", "createdAt", "updatedAt")
SELECT
    'sp_' || p."id",
    p."storeId",
    p."id",
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Product" p
WHERE NOT EXISTS (
    SELECT 1
    FROM "StoreProduct" sp
    WHERE sp."storeId" = p."storeId" AND sp."productId" = p."id"
);

UPDATE "Product" p
SET "ownerId" = s."ownerId"
FROM "Store" s
WHERE s."id" = p."storeId" AND p."ownerId" IS NULL;

DO $$
DECLARE
    conflict_record RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM "Product" WHERE "ownerId" IS NULL) THEN
        RAISE EXCEPTION 'Cannot migrate products: one or more products have no owner';
    END IF;

    -- Category and image remain those of the oldest canonical Product. Abort only
    -- when core catalog metadata differs and a silent merge would be unsafe.
    FOR conflict_record IN
        SELECT "ownerId", "barcode"
        FROM "Product"
        GROUP BY "ownerId", "barcode"
        HAVING COUNT(*) > 1
        AND COUNT(DISTINCT ("name", "price", "vatRate", "unit")) > 1
    LOOP
        RAISE EXCEPTION 'Product metadata conflict for owner % and barcode %; resolve before migration',
            conflict_record."ownerId", conflict_record."barcode";
    END LOOP;
END $$;

ALTER TABLE "Product" ALTER COLUMN "ownerId" SET NOT NULL;

-- Canonicalize duplicate Products by owner and barcode, preferring the oldest Product.
CREATE TEMP TABLE "ProductCanonicalMap" ON COMMIT DROP AS
SELECT
    duplicate."id" AS "duplicateId",
    canonical."id" AS "canonicalId"
FROM "Product" duplicate
CROSS JOIN LATERAL (
        SELECT candidate."id"
        FROM "Product" candidate
        WHERE candidate."ownerId" = duplicate."ownerId"
            AND candidate."barcode" = duplicate."barcode"
            AND candidate."id" <> duplicate."id"
        ORDER BY candidate."createdAt" ASC, candidate."id" ASC
        LIMIT 1
) canonical
WHERE EXISTS (
        SELECT 1
        FROM "Product" other
        WHERE other."ownerId" = duplicate."ownerId"
            AND other."barcode" = duplicate."barcode"
            AND (
                    other."createdAt" < duplicate."createdAt"
                    OR (other."createdAt" = duplicate."createdAt" AND other."id" < duplicate."id")
            )
);

-- Preserve historical sales while changing only the Product foreign key reference.
UPDATE "SaleItem" item
SET "productId" = map."canonicalId"
FROM "ProductCanonicalMap" map
WHERE item."productId" = map."duplicateId";

-- Preserve stock movement history and its Store association.
UPDATE "StockMovement" movement
SET "productId" = map."canonicalId"
FROM "ProductCanonicalMap" map
WHERE movement."productId" = map."duplicateId";

-- Merge Inventory only when both rows belong to the same Store.
DO $$
DECLARE
    inventory_record RECORD;
BEGIN
    FOR inventory_record IN
        SELECT duplicate."storeId", duplicate."productId" AS "duplicateId", map."canonicalId", duplicate."quantity"
        FROM "Inventory" duplicate
        JOIN "ProductCanonicalMap" map ON map."duplicateId" = duplicate."productId"
        WHERE EXISTS (
            SELECT 1
            FROM "Inventory" canonical
            WHERE canonical."storeId" = duplicate."storeId"
              AND canonical."productId" = map."canonicalId"
        )
    LOOP
        UPDATE "Inventory"
        SET "quantity" = "quantity" + inventory_record."quantity"
        WHERE "storeId" = inventory_record."storeId"
          AND "productId" = inventory_record."canonicalId";

        DELETE FROM "Inventory"
        WHERE "storeId" = inventory_record."storeId"
          AND "productId" = inventory_record."duplicateId";
    END LOOP;

    UPDATE "Inventory" inventory
    SET "productId" = map."canonicalId"
    FROM "ProductCanonicalMap" map
    WHERE inventory."productId" = map."duplicateId";
END $$;

-- Merge StoreProduct assignments without duplicate (storeId, productId) rows.
DO $$
DECLARE
    assignment_record RECORD;
BEGIN
    FOR assignment_record IN
        SELECT duplicate."id" AS "duplicateAssignmentId", duplicate."storeId", map."canonicalId", duplicate."active"
        FROM "StoreProduct" duplicate
        JOIN "ProductCanonicalMap" map ON map."duplicateId" = duplicate."productId"
    LOOP
        IF EXISTS (
            SELECT 1
            FROM "StoreProduct"
            WHERE "storeId" = assignment_record."storeId"
              AND "productId" = assignment_record."canonicalId"
        ) THEN
            UPDATE "StoreProduct"
            SET "active" = "active" OR assignment_record."active",
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE "storeId" = assignment_record."storeId"
              AND "productId" = assignment_record."canonicalId";

            DELETE FROM "StoreProduct"
            WHERE "id" = assignment_record."duplicateAssignmentId";
        ELSE
            UPDATE "StoreProduct"
            SET "productId" = assignment_record."canonicalId",
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE "id" = assignment_record."duplicateAssignmentId";
        END IF;
    END LOOP;
END $$;

-- All references have moved; remove only duplicate Product rows.
DELETE FROM "Product" duplicate
USING "ProductCanonicalMap" map
WHERE duplicate."id" = map."duplicateId";

CREATE UNIQUE INDEX IF NOT EXISTS "StoreProduct_storeId_productId_key" ON "StoreProduct"("storeId", "productId");
CREATE INDEX IF NOT EXISTS "StoreProduct_productId_idx" ON "StoreProduct"("productId");
CREATE INDEX IF NOT EXISTS "StoreProduct_storeId_idx" ON "StoreProduct"("storeId");
CREATE INDEX IF NOT EXISTS "Product_ownerId_idx" ON "Product"("ownerId");
CREATE UNIQUE INDEX IF NOT EXISTS "Product_barcode_key" ON "Product"("barcode");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StoreProduct_storeId_fkey') THEN
        ALTER TABLE "StoreProduct"
        ADD CONSTRAINT "StoreProduct_storeId_fkey"
        FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StoreProduct_productId_fkey') THEN
        ALTER TABLE "StoreProduct"
        ADD CONSTRAINT "StoreProduct_productId_fkey"
        FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Product_ownerId_fkey') THEN
        ALTER TABLE "Product"
        ADD CONSTRAINT "Product_ownerId_fkey"
        FOREIGN KEY ("ownerId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DROP INDEX IF EXISTS "Product_storeId_idx";
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_storeId_fkey";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "storeId";
