CREATE TYPE "public"."product_status" AS ENUM('new', 'used', 'refurbished');--> statement-breakpoint
CREATE TYPE "public"."shipping_type" AS ENUM('direct', 'warehouse', 'other');--> statement-breakpoint
CREATE TYPE "public"."tax_type" AS ENUM('taxable', 'tax_free', 'exempt');--> statement-breakpoint
CREATE TABLE "design_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"fileName" varchar(300) NOT NULL,
	"fileKey" text NOT NULL,
	"fileUrl" text NOT NULL,
	"thumbnailUrl" text,
	"mediumUrl" text,
	"mimeType" varchar(100),
	"fileSize" integer,
	"folder" varchar(200) DEFAULT 'ROOT',
	"uploadedBy" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "design_folders" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"parentId" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "excel_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"isDefault" boolean DEFAULT false NOT NULL,
	"columns" text NOT NULL,
	"sortConfig" text,
	"authorId" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "priceMembership" numeric(12, 0);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "productCode" varchar(50);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "productStatus" "product_status" DEFAULT 'new';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "summaryDescription" varchar(255);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "shortDescription" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "priceSupply" numeric(12, 0);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "priceConsumerOriginal" numeric(12, 0);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "taxType" "tax_type" DEFAULT 'taxable';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "taxRate" numeric(5, 2) DEFAULT '10.00';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "shippingType" "shipping_type" DEFAULT 'direct';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "weight" numeric(8, 2) DEFAULT '1.00';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "manufacturer" varchar(100);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "brand" varchar(100);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "origin" varchar(100);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seoTitle" varchar(200);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seoDescription" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seoKeywords" varchar(500);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "seoImageAlt" varchar(200);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "adminMemo" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "features" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "howToUse" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "ingredients" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "thumbnailUrl" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "detailPageUrl" varchar(500);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "sortOrder" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "isRecommended" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "isNew" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "design_files" ADD CONSTRAINT "design_files_uploadedBy_users_id_fk" FOREIGN KEY ("uploadedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "excel_templates" ADD CONSTRAINT "excel_templates_authorId_users_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;