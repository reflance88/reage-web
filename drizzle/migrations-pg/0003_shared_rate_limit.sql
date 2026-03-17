CREATE TABLE "request_rate_limits" (
	"bucketKey" varchar(255) PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "request_rate_limits_expires_at_idx" ON "request_rate_limits" USING btree ("expiresAt");
