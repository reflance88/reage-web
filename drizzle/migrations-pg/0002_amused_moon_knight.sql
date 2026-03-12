ALTER TABLE "order_items" DROP CONSTRAINT "order_items_productId_products_id_fk";
--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "productId" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();