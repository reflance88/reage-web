CREATE TABLE `business_verifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`businessNumber` varchar(30) NOT NULL,
	`businessName` varchar(200) NOT NULL,
	`contactPhone` varchar(30),
	`fileUrl` text NOT NULL,
	`fileKey` text NOT NULL,
	`fileName` varchar(300),
	`status` enum('none','pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`rejectReason` text,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `business_verifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(200) NOT NULL,
	`quantity` int NOT NULL,
	`unitPrice` decimal(12,0) NOT NULL,
	`subtotal` decimal(12,0) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` varchar(100) NOT NULL,
	`userId` int NOT NULL,
	`userRoleSnapshot` enum('consumer','professional') NOT NULL,
	`proStatusSnapshot` enum('none','pending','approved','rejected') NOT NULL,
	`totalAmount` decimal(12,0) NOT NULL,
	`status` enum('created','paid','failed','cancelled') NOT NULL DEFAULT 'created',
	`paymentKey` varchar(200),
	`paidAt` timestamp,
	`orderName` varchar(300),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderId_unique` UNIQUE(`orderId`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(100) NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`priceConsumer` decimal(12,0) NOT NULL,
	`pricePro` decimal(12,0) NOT NULL,
	`isProOnly` boolean NOT NULL DEFAULT false,
	`stock` int NOT NULL DEFAULT 999,
	`imageUrl` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(30);--> statement-breakpoint
ALTER TABLE `users` ADD `memberRole` enum('consumer','professional') DEFAULT 'consumer' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `proVerificationStatus` enum('none','pending','approved','rejected') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `business_verifications` ADD CONSTRAINT `business_verifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;