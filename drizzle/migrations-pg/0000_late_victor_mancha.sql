CREATE TYPE "public"."bottom_text" AS ENUM('today', 'week', 'none');--> statement-breakpoint
CREATE TYPE "public"."cancel_type" AS ENUM('pre_payment', 'post_payment');--> statement-breakpoint
CREATE TYPE "public"."cancellation_requested_by" AS ENUM('buyer', 'admin');--> statement-breakpoint
CREATE TYPE "public"."cancellation_status" AS ENUM('requested', 'processing', 'completed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."card_cancel_type" AS ENUM('full', 'partial');--> statement-breakpoint
CREATE TYPE "public"."device_type" AS ENUM('pc', 'mobile', 'tablet');--> statement-breakpoint
CREATE TYPE "public"."exchange_status" AS ENUM('requested', 'processing', 'ready', 'completed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."link_target" AS ENUM('_self', '_blank');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('consumer', 'professional', 'membership');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('created', 'paid', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."popup_type" AS ENUM('pc', 'mobile', 'both');--> statement-breakpoint
CREATE TYPE "public"."post_type" AS ENUM('gallery', 'magazine');--> statement-breakpoint
CREATE TYPE "public"."pro_status_snapshot" AS ENUM('none', 'pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."pro_verification_status" AS ENUM('none', 'pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."refund_method" AS ENUM('card', 'bank', 'point', 'deposit', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('pending', 'completed', 'hold', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."refund_type" AS ENUM('full', 'partial');--> statement-breakpoint
CREATE TYPE "public"."return_status" AS ENUM('requested', 'processing', 'hold', 'completed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."review_category" AS ENUM('before_after', 'device', 'education', 'event', 'etc');--> statement-breakpoint
CREATE TYPE "public"."shipping_status" AS ENUM('pending_payment', 'ready', 'hold', 'shipping', 'delivered', 'none');--> statement-breakpoint
CREATE TYPE "public"."third_party_result" AS ENUM('success', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."third_party_status" AS ENUM('none', 'synced', 'error');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_role_snapshot" AS ENUM('consumer', 'professional');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('none', 'pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "admin_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"adminUserId" integer NOT NULL,
	"actionType" varchar(100) NOT NULL,
	"targetType" varchar(50) NOT NULL,
	"targetId" integer NOT NULL,
	"before" text,
	"after" text,
	"note" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"businessNumber" varchar(30) NOT NULL,
	"businessName" varchar(200) NOT NULL,
	"contactPhone" varchar(30),
	"fileUrl" text NOT NULL,
	"fileKey" text NOT NULL,
	"fileName" varchar(300),
	"status" "verification_status" DEFAULT 'pending' NOT NULL,
	"rejectReason" text,
	"submittedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "card_cancellations" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"paymentKey" varchar(200),
	"tid" varchar(200),
	"cancelAmount" numeric(12, 0) NOT NULL,
	"cancelType" "card_cancel_type" DEFAULT 'full' NOT NULL,
	"processedBy" varchar(100),
	"adminNote" text,
	"cancelledAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certified_instructors" (
	"id" serial PRIMARY KEY NOT NULL,
	"imageUrl" text NOT NULL,
	"imageKey" varchar(500),
	"name" varchar(200),
	"description" text,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"isPublished" boolean DEFAULT true NOT NULL,
	"authorId" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupon_issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"couponNumber" varchar(30) NOT NULL,
	"couponId" integer NOT NULL,
	"userId" integer,
	"isUsed" boolean DEFAULT false NOT NULL,
	"usedAt" timestamp with time zone,
	"orderId" integer,
	"isDeleted" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupon_issues_couponNumber_unique" UNIQUE("couponNumber")
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"benefitType" varchar(50) DEFAULT 'discount_rate' NOT NULL,
	"benefitValue" integer DEFAULT 0 NOT NULL,
	"issueType" varchar(50) DEFAULT 'customer_download' NOT NULL,
	"targetMember" varchar(20) DEFAULT 'all' NOT NULL,
	"displayTiming" varchar(20) DEFAULT 'immediate' NOT NULL,
	"scheduledAt" timestamp with time zone,
	"startDate" timestamp with time zone,
	"endDate" timestamp with time zone,
	"periodType" varchar(30) DEFAULT 'fixed' NOT NULL,
	"validDays" integer,
	"usePc" boolean DEFAULT true NOT NULL,
	"useMobile" boolean DEFAULT true NOT NULL,
	"applyScope" varchar(20) DEFAULT 'order' NOT NULL,
	"productScope" varchar(20) DEFAULT 'all' NOT NULL,
	"minAmountType" varchar(30) DEFAULT 'none' NOT NULL,
	"minAmount" integer DEFAULT 0 NOT NULL,
	"calcBasis" varchar(30) DEFAULT 'before_discount' NOT NULL,
	"maxUsagePerOrder" integer DEFAULT 1 NOT NULL,
	"paymentMethodLimit" varchar(20) DEFAULT 'none' NOT NULL,
	"imageType" varchar(20) DEFAULT 'default' NOT NULL,
	"imageUrl" text,
	"notifyOnLogin" boolean DEFAULT false NOT NULL,
	"sendSms" boolean DEFAULT false NOT NULL,
	"sendEmail" boolean DEFAULT false NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"totalIssued" integer DEFAULT 0 NOT NULL,
	"authorId" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discount_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"code" varchar(100) NOT NULL,
	"discountRate" integer DEFAULT 0 NOT NULL,
	"truncateUnit" integer DEFAULT 0 NOT NULL,
	"maxDiscountPerProduct" integer,
	"startDate" timestamp with time zone,
	"endDate" timestamp with time zone,
	"applyScope" varchar(20) DEFAULT 'all' NOT NULL,
	"minOrderAmountType" varchar(20) DEFAULT 'none' NOT NULL,
	"minOrderAmount" integer DEFAULT 0 NOT NULL,
	"maxUsageType" varchar(20) DEFAULT 'none' NOT NULL,
	"maxUsageCount" integer,
	"targetType" varchar(20) DEFAULT 'none' NOT NULL,
	"samePersonLimitType" varchar(20) DEFAULT 'none' NOT NULL,
	"samePersonLimitCount" integer,
	"usedCount" integer DEFAULT 0 NOT NULL,
	"authorId" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discount_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "gallery_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(300) NOT NULL,
	"content" text,
	"coverImageUrl" text,
	"coverImageKey" text,
	"isPublished" boolean DEFAULT true NOT NULL,
	"authorId" integer,
	"viewCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "magazine_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(300) NOT NULL,
	"subtitle" varchar(500),
	"content" text,
	"coverImageUrl" text,
	"coverImageKey" text,
	"isPublished" boolean DEFAULT true NOT NULL,
	"authorId" integer,
	"viewCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_cancellations" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"orderItemId" integer,
	"requestedBy" "cancellation_requested_by" DEFAULT 'buyer' NOT NULL,
	"reason" text,
	"status" "cancellation_status" DEFAULT 'requested' NOT NULL,
	"cancelType" "cancel_type" DEFAULT 'post_payment' NOT NULL,
	"quantity" integer,
	"cancelAmount" numeric(12, 0),
	"adminNote" text,
	"processedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_exchanges" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"orderItemId" integer,
	"reason" text,
	"status" "exchange_status" DEFAULT 'requested' NOT NULL,
	"quantity" integer,
	"returnTrackingNumber" varchar(100),
	"returnCourierName" varchar(100),
	"reshipTrackingNumber" varchar(100),
	"reshipCourierName" varchar(100),
	"adminNote" text,
	"processedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"productId" integer NOT NULL,
	"productName" varchar(200) NOT NULL,
	"quantity" integer NOT NULL,
	"unitPrice" numeric(12, 0) NOT NULL,
	"subtotal" numeric(12, 0) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_refunds" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"cancellationId" integer,
	"returnId" integer,
	"refundMethod" "refund_method" DEFAULT 'card' NOT NULL,
	"refundAmount" numeric(12, 0) NOT NULL,
	"refundBank" varchar(50),
	"refundAccount" varchar(50),
	"refundAccountHolder" varchar(100),
	"status" "refund_status" DEFAULT 'pending' NOT NULL,
	"refundType" "refund_type" DEFAULT 'full' NOT NULL,
	"adminNote" text,
	"processedBy" integer,
	"processedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_returns" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer NOT NULL,
	"orderItemId" integer,
	"reason" text,
	"status" "return_status" DEFAULT 'requested' NOT NULL,
	"quantity" integer,
	"returnTrackingNumber" varchar(100),
	"returnCourierName" varchar(100),
	"adminNote" text,
	"processedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" varchar(100) NOT NULL,
	"userId" integer NOT NULL,
	"userRoleSnapshot" "user_role_snapshot" NOT NULL,
	"proStatusSnapshot" "pro_status_snapshot" NOT NULL,
	"totalAmount" numeric(12, 0) NOT NULL,
	"status" "order_status" DEFAULT 'created' NOT NULL,
	"shippingStatus" "shipping_status" DEFAULT 'none' NOT NULL,
	"courierCode" varchar(50),
	"courierName" varchar(100),
	"trackingNumber" varchar(100),
	"shippedAt" timestamp with time zone,
	"deliveredAt" timestamp with time zone,
	"recipientName" varchar(100),
	"recipientPhone" varchar(30),
	"shippingAddress" text,
	"shippingAddressDetail" text,
	"shippingZipCode" varchar(10),
	"shippingMemo" text,
	"externalOrderId" varchar(200),
	"thirdPartyStatus" "third_party_status" DEFAULT 'none' NOT NULL,
	"thirdPartySyncedAt" timestamp with time zone,
	"adminMemo" text,
	"paymentKey" varchar(200),
	"paymentMethod" varchar(50),
	"paidAt" timestamp with time zone,
	"orderName" varchar(300),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_orderId_unique" UNIQUE("orderId")
);
--> statement-breakpoint
CREATE TABLE "page_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"path" varchar(500) NOT NULL,
	"deviceType" "device_type" DEFAULT 'pc' NOT NULL,
	"sessionId" varchar(128),
	"userId" integer,
	"referrer" text,
	"userAgent" text,
	"duration" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "popups" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(300) NOT NULL,
	"popupType" "popup_type" DEFAULT 'both' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"imageUrl" text,
	"imageKey" text,
	"linkUrl" text,
	"linkTarget" "link_target" DEFAULT '_blank' NOT NULL,
	"displayPosition" varchar(100) DEFAULT 'main' NOT NULL,
	"bottomText" "bottom_text" DEFAULT 'today' NOT NULL,
	"startAt" timestamp with time zone,
	"endAt" timestamp with time zone,
	"clickCount" integer DEFAULT 0 NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"postType" "post_type" NOT NULL,
	"postId" integer NOT NULL,
	"imageUrl" text NOT NULL,
	"imageKey" text NOT NULL,
	"fileName" varchar(300),
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"priceConsumer" numeric(12, 0) NOT NULL,
	"pricePro" numeric(12, 0) NOT NULL,
	"isProOnly" boolean DEFAULT false NOT NULL,
	"stock" integer DEFAULT 999 NOT NULL,
	"imageUrl" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "remind_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"alertType" varchar(50) DEFAULT 'cart' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"channel" varchar(10) DEFAULT 'email' NOT NULL,
	"startDate" timestamp with time zone,
	"endDate" timestamp with time zone,
	"frequency" varchar(20) DEFAULT 'weekly' NOT NULL,
	"sendDayOfWeek" integer DEFAULT 5 NOT NULL,
	"sendHour" integer DEFAULT 9 NOT NULL,
	"targetType" varchar(50) DEFAULT 'all' NOT NULL,
	"targetDays" integer DEFAULT 30 NOT NULL,
	"sendToOptOut" boolean DEFAULT false NOT NULL,
	"sendToSpecial" boolean DEFAULT true NOT NULL,
	"sendToBad" boolean DEFAULT true NOT NULL,
	"senderName" varchar(100),
	"senderEmail" varchar(200),
	"emailSubject" varchar(300),
	"emailBody" text,
	"benefitEnabled" boolean DEFAULT false NOT NULL,
	"benefitDays" integer DEFAULT 30 NOT NULL,
	"benefitTrigger" varchar(30) DEFAULT 'order_complete' NOT NULL,
	"benefitContent" varchar(30) DEFAULT 'coupon' NOT NULL,
	"benefitCouponId" integer,
	"totalSent" integer DEFAULT 0 NOT NULL,
	"authorId" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" "review_category" DEFAULT 'etc' NOT NULL,
	"categoryLabel" varchar(100),
	"imageUrl" text NOT NULL,
	"imageKey" varchar(500),
	"title" varchar(200),
	"description" text,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"isPublished" boolean DEFAULT true NOT NULL,
	"authorId" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "third_party_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderId" integer,
	"eventType" varchar(100) NOT NULL,
	"provider" varchar(100),
	"payload" text,
	"result" "third_party_result" DEFAULT 'success' NOT NULL,
	"errorMessage" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"phone" varchar(30),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"memberRole" "member_role" DEFAULT 'consumer' NOT NULL,
	"membershipDiscountRate" integer DEFAULT 0 NOT NULL,
	"proVerificationStatus" "pro_verification_status" DEFAULT 'none' NOT NULL,
	"passwordHash" varchar(255),
	"emailVerified" boolean DEFAULT false NOT NULL,
	"resetToken" varchar(128),
	"resetTokenExpiresAt" timestamp with time zone,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_adminUserId_users_id_fk" FOREIGN KEY ("adminUserId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_verifications" ADD CONSTRAINT "business_verifications_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_cancellations" ADD CONSTRAINT "card_cancellations_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certified_instructors" ADD CONSTRAINT "certified_instructors_authorId_users_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_issues" ADD CONSTRAINT "coupon_issues_couponId_coupons_id_fk" FOREIGN KEY ("couponId") REFERENCES "public"."coupons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_issues" ADD CONSTRAINT "coupon_issues_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_authorId_users_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_authorId_users_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_posts" ADD CONSTRAINT "gallery_posts_authorId_users_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "magazine_posts" ADD CONSTRAINT "magazine_posts_authorId_users_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_cancellations" ADD CONSTRAINT "order_cancellations_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_cancellations" ADD CONSTRAINT "order_cancellations_orderItemId_order_items_id_fk" FOREIGN KEY ("orderItemId") REFERENCES "public"."order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_exchanges" ADD CONSTRAINT "order_exchanges_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_exchanges" ADD CONSTRAINT "order_exchanges_orderItemId_order_items_id_fk" FOREIGN KEY ("orderItemId") REFERENCES "public"."order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_cancellationId_order_cancellations_id_fk" FOREIGN KEY ("cancellationId") REFERENCES "public"."order_cancellations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_returnId_order_returns_id_fk" FOREIGN KEY ("returnId") REFERENCES "public"."order_returns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_processedBy_users_id_fk" FOREIGN KEY ("processedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_returns" ADD CONSTRAINT "order_returns_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_returns" ADD CONSTRAINT "order_returns_orderItemId_order_items_id_fk" FOREIGN KEY ("orderItemId") REFERENCES "public"."order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remind_alerts" ADD CONSTRAINT "remind_alerts_benefitCouponId_coupons_id_fk" FOREIGN KEY ("benefitCouponId") REFERENCES "public"."coupons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remind_alerts" ADD CONSTRAINT "remind_alerts_authorId_users_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_authorId_users_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "third_party_logs" ADD CONSTRAINT "third_party_logs_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;