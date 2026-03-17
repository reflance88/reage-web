DO $$
BEGIN
	ALTER TYPE "public"."user_role_snapshot" ADD VALUE IF NOT EXISTS 'membership';
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saved_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"label" varchar(100) NOT NULL,
	"recipientName" varchar(100) NOT NULL,
	"recipientPhone" varchar(30) NOT NULL,
	"shippingZipCode" varchar(10) NOT NULL,
	"shippingAddress" text NOT NULL,
	"shippingAddressDetail" text,
	"isDefault" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "saved_addresses_user_idx" ON "saved_addresses" USING btree ("userId");
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shippingAmount" numeric(12, 0) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "promotionLabel" varchar(200);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "couponIssueId" integer;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discountCodeId" integer;
--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "productId" uuid;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reviews_product_idx" ON "reviews" USING btree ("productId");
--> statement-breakpoint
DO $$
BEGIN
	ALTER TABLE "saved_addresses"
		ADD CONSTRAINT "saved_addresses_userId_profiles_id_fk"
		FOREIGN KEY ("userId") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	ALTER TABLE "reviews"
		ADD CONSTRAINT "reviews_productId_products_id_fk"
		FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
