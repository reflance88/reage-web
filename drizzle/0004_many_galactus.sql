CREATE TABLE `gallery_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(300) NOT NULL,
	`content` text,
	`coverImageUrl` text,
	`coverImageKey` text,
	`isPublished` boolean NOT NULL DEFAULT true,
	`authorId` int,
	`viewCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gallery_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `magazine_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(300) NOT NULL,
	`subtitle` varchar(500),
	`content` text,
	`coverImageUrl` text,
	`coverImageKey` text,
	`isPublished` boolean NOT NULL DEFAULT true,
	`authorId` int,
	`viewCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `magazine_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `page_views` (
	`id` int AUTO_INCREMENT NOT NULL,
	`path` varchar(500) NOT NULL,
	`deviceType` enum('pc','mobile','tablet') NOT NULL DEFAULT 'pc',
	`sessionId` varchar(128),
	`userId` int,
	`referrer` text,
	`userAgent` text,
	`duration` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `page_views_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `popups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(300) NOT NULL,
	`popupType` enum('pc','mobile','both') NOT NULL DEFAULT 'both',
	`isActive` boolean NOT NULL DEFAULT true,
	`imageUrl` text,
	`imageKey` text,
	`linkUrl` text,
	`linkTarget` enum('_self','_blank') NOT NULL DEFAULT '_blank',
	`displayPosition` varchar(100) NOT NULL DEFAULT 'main',
	`bottomText` enum('today','week','none') NOT NULL DEFAULT 'today',
	`startAt` timestamp,
	`endAt` timestamp,
	`clickCount` int NOT NULL DEFAULT 0,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `popups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `post_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postType` enum('gallery','magazine') NOT NULL,
	`postId` int NOT NULL,
	`imageUrl` text NOT NULL,
	`imageKey` text NOT NULL,
	`fileName` varchar(300),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `post_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `gallery_posts` ADD CONSTRAINT `gallery_posts_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `magazine_posts` ADD CONSTRAINT `magazine_posts_authorId_users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `page_views` ADD CONSTRAINT `page_views_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;