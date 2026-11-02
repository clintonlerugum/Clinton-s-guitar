-- Add the optional, protected MuseScore file reference to existing products.
-- This is safe to run on an existing database; it does not alter product data.
ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS "fullMuseScore" TEXT;
