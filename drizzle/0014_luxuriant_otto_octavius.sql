CREATE TABLE `excelTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`isDefault` boolean NOT NULL DEFAULT false,
	`columns` text NOT NULL,
	`sortConfig` text,
	`authorId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `excelTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `excelTemplates` ADD CONSTRAINT `excelTemplates_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;