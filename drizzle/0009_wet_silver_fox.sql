CREATE TABLE `coupon_issues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couponNumber` varchar(30) NOT NULL,
	`couponId` int NOT NULL,
	`userId` int,
	`isUsed` boolean NOT NULL DEFAULT false,
	`usedAt` timestamp,
	`orderId` int,
	`isDeleted` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coupon_issues_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupon_issues_couponNumber_unique` UNIQUE(`couponNumber`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`benefitType` varchar(50) NOT NULL DEFAULT 'discount_rate',
	`benefitValue` int NOT NULL DEFAULT 0,
	`issueType` varchar(50) NOT NULL DEFAULT 'customer_download',
	`targetMember` varchar(20) NOT NULL DEFAULT 'all',
	`displayTiming` varchar(20) NOT NULL DEFAULT 'immediate',
	`scheduledAt` timestamp,
	`startDate` timestamp,
	`endDate` timestamp,
	`periodType` varchar(30) NOT NULL DEFAULT 'fixed',
	`validDays` int,
	`usePc` boolean NOT NULL DEFAULT true,
	`useMobile` boolean NOT NULL DEFAULT true,
	`applyScope` varchar(20) NOT NULL DEFAULT 'order',
	`productScope` varchar(20) NOT NULL DEFAULT 'all',
	`minAmountType` varchar(30) NOT NULL DEFAULT 'none',
	`minAmount` int NOT NULL DEFAULT 0,
	`calcBasis` varchar(30) NOT NULL DEFAULT 'before_discount',
	`maxUsagePerOrder` int NOT NULL DEFAULT 1,
	`paymentMethodLimit` varchar(20) NOT NULL DEFAULT 'none',
	`imageType` varchar(20) NOT NULL DEFAULT 'default',
	`imageUrl` text,
	`notifyOnLogin` boolean NOT NULL DEFAULT false,
	`sendSms` boolean NOT NULL DEFAULT false,
	`sendEmail` boolean NOT NULL DEFAULT false,
	`status` varchar(20) NOT NULL DEFAULT 'active',
	`totalIssued` int NOT NULL DEFAULT 0,
	`authorId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `discount_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`code` varchar(100) NOT NULL,
	`discountRate` int NOT NULL DEFAULT 0,
	`truncateUnit` int NOT NULL DEFAULT 0,
	`maxDiscountPerProduct` int,
	`startDate` timestamp,
	`endDate` timestamp,
	`applyScope` varchar(20) NOT NULL DEFAULT 'all',
	`minOrderAmountType` varchar(20) NOT NULL DEFAULT 'none',
	`minOrderAmount` int NOT NULL DEFAULT 0,
	`maxUsageType` varchar(20) NOT NULL DEFAULT 'none',
	`maxUsageCount` int,
	`targetType` varchar(20) NOT NULL DEFAULT 'none',
	`samePersonLimitType` varchar(20) NOT NULL DEFAULT 'none',
	`samePersonLimitCount` int,
	`usedCount` int NOT NULL DEFAULT 0,
	`authorId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `discount_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `discount_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `remind_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`alertType` varchar(50) NOT NULL DEFAULT 'cart',
	`isActive` boolean NOT NULL DEFAULT true,
	`channel` varchar(10) NOT NULL DEFAULT 'email',
	`startDate` timestamp,
	`endDate` timestamp,
	`frequency` varchar(20) NOT NULL DEFAULT 'weekly',
	`sendDayOfWeek` int NOT NULL DEFAULT 5,
	`sendHour` int NOT NULL DEFAULT 9,
	`targetType` varchar(50) NOT NULL DEFAULT 'all',
	`targetDays` int NOT NULL DEFAULT 30,
	`sendToOptOut` boolean NOT NULL DEFAULT false,
	`sendToSpecial` boolean NOT NULL DEFAULT true,
	`sendToBad` boolean NOT NULL DEFAULT true,
	`senderName` varchar(100),
	`senderEmail` varchar(200),
	`emailSubject` varchar(300),
	`emailBody` text,
	`benefitEnabled` boolean NOT NULL DEFAULT false,
	`benefitDays` int NOT NULL DEFAULT 30,
	`benefitTrigger` varchar(30) NOT NULL DEFAULT 'order_complete',
	`benefitContent` varchar(30) NOT NULL DEFAULT 'coupon',
	`benefitCouponId` int,
	`totalSent` int NOT NULL DEFAULT 0,
	`authorId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `remind_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `coupon_issues` ADD CONSTRAINT `coupon_issues_couponId_coupons_id_fk` FOREIGN KEY (`couponId`) REFERENCES `coupons`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_issues` ADD CONSTRAINT `coupon_issues_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupons` ADD CONSTRAINT `coupons_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `discount_codes` ADD CONSTRAINT `discount_codes_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `remind_alerts` ADD CONSTRAINT `remind_alerts_benefitCouponId_coupons_id_fk` FOREIGN KEY (`benefitCouponId`) REFERENCES `coupons`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `remind_alerts` ADD CONSTRAINT `remind_alerts_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;