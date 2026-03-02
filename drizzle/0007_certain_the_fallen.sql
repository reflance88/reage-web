CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('before_after','device','education','event','etc') NOT NULL DEFAULT 'etc',
	`categoryLabel` varchar(100),
	`imageUrl` text NOT NULL,
	`imageKey` varchar(500),
	`title` varchar(200),
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isPublished` boolean NOT NULL DEFAULT true,
	`authorId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;