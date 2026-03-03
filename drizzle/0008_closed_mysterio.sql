CREATE TABLE `certified_instructors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`imageUrl` text NOT NULL,
	`imageKey` varchar(500),
	`name` varchar(200),
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isPublished` boolean NOT NULL DEFAULT true,
	`authorId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `certified_instructors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `memberRole` enum('consumer','professional','membership') NOT NULL DEFAULT 'consumer';--> statement-breakpoint
ALTER TABLE `users` ADD `membershipDiscountRate` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `certified_instructors` ADD CONSTRAINT `certified_instructors_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;