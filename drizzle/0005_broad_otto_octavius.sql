CREATE TABLE `card_cancellations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`paymentKey` varchar(200),
	`tid` varchar(200),
	`cancelAmount` decimal(12,0) NOT NULL,
	`cancelType` enum('full','partial') NOT NULL DEFAULT 'full',
	`processedBy` varchar(100),
	`adminNote` text,
	`cancelledAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `card_cancellations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_cancellations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`orderItemId` int,
	`requestedBy` enum('buyer','admin') NOT NULL DEFAULT 'buyer',
	`reason` text,
	`status` enum('requested','processing','completed','rejected') NOT NULL DEFAULT 'requested',
	`cancelType` enum('pre_payment','post_payment') NOT NULL DEFAULT 'post_payment',
	`quantity` int,
	`cancelAmount` decimal(12,0),
	`adminNote` text,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `order_cancellations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_exchanges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`orderItemId` int,
	`reason` text,
	`status` enum('requested','processing','ready','completed','rejected') NOT NULL DEFAULT 'requested',
	`quantity` int,
	`returnTrackingNumber` varchar(100),
	`returnCourierName` varchar(100),
	`reshipTrackingNumber` varchar(100),
	`reshipCourierName` varchar(100),
	`adminNote` text,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `order_exchanges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_refunds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`cancellationId` int,
	`returnId` int,
	`refundMethod` enum('card','bank','point','deposit','mixed') NOT NULL DEFAULT 'card',
	`refundAmount` decimal(12,0) NOT NULL,
	`refundBank` varchar(50),
	`refundAccount` varchar(50),
	`refundAccountHolder` varchar(100),
	`status` enum('pending','completed','hold','rejected') NOT NULL DEFAULT 'pending',
	`refundType` enum('full','partial') NOT NULL DEFAULT 'full',
	`adminNote` text,
	`processedBy` int,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `order_refunds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_returns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`orderItemId` int,
	`reason` text,
	`status` enum('requested','processing','hold','completed','rejected') NOT NULL DEFAULT 'requested',
	`quantity` int,
	`returnTrackingNumber` varchar(100),
	`returnCourierName` varchar(100),
	`adminNote` text,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `order_returns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `third_party_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int,
	`eventType` varchar(100) NOT NULL,
	`provider` varchar(100),
	`payload` text,
	`result` enum('success','failed','skipped') NOT NULL DEFAULT 'success',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `third_party_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `shippingStatus` enum('pending_payment','ready','hold','shipping','delivered','none') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `courierCode` varchar(50);--> statement-breakpoint
ALTER TABLE `orders` ADD `courierName` varchar(100);--> statement-breakpoint
ALTER TABLE `orders` ADD `trackingNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `orders` ADD `shippedAt` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `deliveredAt` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `recipientName` varchar(100);--> statement-breakpoint
ALTER TABLE `orders` ADD `recipientPhone` varchar(30);--> statement-breakpoint
ALTER TABLE `orders` ADD `shippingAddress` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `shippingZipCode` varchar(10);--> statement-breakpoint
ALTER TABLE `orders` ADD `shippingMemo` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `externalOrderId` varchar(200);--> statement-breakpoint
ALTER TABLE `orders` ADD `thirdPartyStatus` enum('none','synced','error') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `thirdPartySyncedAt` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD `adminMemo` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `paymentMethod` varchar(50);--> statement-breakpoint
ALTER TABLE `card_cancellations` ADD CONSTRAINT `card_cancellations_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_cancellations` ADD CONSTRAINT `order_cancellations_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_cancellations` ADD CONSTRAINT `order_cancellations_orderItemId_order_items_id_fk` FOREIGN KEY (`orderItemId`) REFERENCES `order_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_exchanges` ADD CONSTRAINT `order_exchanges_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_exchanges` ADD CONSTRAINT `order_exchanges_orderItemId_order_items_id_fk` FOREIGN KEY (`orderItemId`) REFERENCES `order_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_refunds` ADD CONSTRAINT `order_refunds_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_refunds` ADD CONSTRAINT `order_refunds_cancellationId_order_cancellations_id_fk` FOREIGN KEY (`cancellationId`) REFERENCES `order_cancellations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_refunds` ADD CONSTRAINT `order_refunds_returnId_order_returns_id_fk` FOREIGN KEY (`returnId`) REFERENCES `order_returns`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_refunds` ADD CONSTRAINT `order_refunds_processedBy_users_id_fk` FOREIGN KEY (`processedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_returns` ADD CONSTRAINT `order_returns_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_returns` ADD CONSTRAINT `order_returns_orderItemId_order_items_id_fk` FOREIGN KEY (`orderItemId`) REFERENCES `order_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `third_party_logs` ADD CONSTRAINT `third_party_logs_orderId_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;