-- Migrate all image URLs from old R2 bucket (CF Account 1) to new bucket (CF Account 2)
-- Old: pub-5569bc19a5204e58992bc90d707ff0fb.r2.dev
-- New: pub-514aadb1987048d890f62384dd33854e.r2.dev

UPDATE products
SET image_url = REPLACE(image_url, 'pub-5569bc19a5204e58992bc90d707ff0fb', 'pub-514aadb1987048d890f62384dd33854e')
WHERE image_url LIKE '%pub-5569bc19a5204e58992bc90d707ff0fb%';

UPDATE products
SET base_image_url = REPLACE(base_image_url, 'pub-5569bc19a5204e58992bc90d707ff0fb', 'pub-514aadb1987048d890f62384dd33854e')
WHERE base_image_url LIKE '%pub-5569bc19a5204e58992bc90d707ff0fb%';

UPDATE product_variants
SET image_url = REPLACE(image_url, 'pub-5569bc19a5204e58992bc90d707ff0fb', 'pub-514aadb1987048d890f62384dd33854e')
WHERE image_url LIKE '%pub-5569bc19a5204e58992bc90d707ff0fb%';
