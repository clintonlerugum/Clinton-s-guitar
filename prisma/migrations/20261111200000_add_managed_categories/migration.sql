CREATE TABLE IF NOT EXISTS "Category" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "image" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Category_slug_key" ON "Category"("slug");

CREATE TABLE IF NOT EXISTS "ProductCategory" (
  "productId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("productId", "categoryId"),
  CONSTRAINT "ProductCategory_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProductCategory_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProductCategory_categoryId_idx" ON "ProductCategory"("categoryId");

INSERT INTO "Category" ("id", "name", "slug", "description", "image", "active")
VALUES
  ('starter-classical-guitar', 'Classical Guitar', 'classical-guitar', 'Explore expressive classical guitar arrangements.', '/placeholders/cover1.jpg', true),
  ('starter-fingerstyle', 'Fingerstyle', 'fingerstyle', 'Discover arrangements made for fingerstyle playing.', '/placeholders/cover2.jpg', true),
  ('starter-kenyan-african-music', 'Kenyan & African Music', 'kenyan-african-music', 'Play songs and sounds from across Kenya and Africa.', '/placeholders/cover3.jpg', true),
  ('starter-pop-contemporary', 'Pop & Contemporary', 'pop-contemporary', 'Find familiar pop songs in guitar arrangement form.', '/placeholders/hero-guitar.jpg', true),
  ('starter-romantic-love-songs', 'Romantic & Love Songs', 'romantic-love-songs', 'Explore melodies for romantic moments and love songs.', '/placeholders/cover1.jpg', true),
  ('starter-instrumental-soundtracks', 'Instrumental & Soundtracks', 'instrumental-soundtracks', 'Browse instrumental music and soundtrack arrangements.', '/placeholders/cover2.jpg', true)
ON CONFLICT ("slug") DO NOTHING;
