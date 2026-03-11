CREATE TABLE `design_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileName` varchar(300) NOT NULL,
	`fileKey` text NOT NULL,
	`fileUrl` text NOT NULL,
	`mimeType` varchar(100),
	`fileSize` int,
	`folder` varchar(200) DEFAULT 'ROOT',
	`uploadedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `design_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `design_folders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`parentId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `design_folders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `products` ADD `priceMembership` decimal(12,0);