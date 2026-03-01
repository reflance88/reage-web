CREATE TABLE `admin_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminUserId` int NOT NULL,
	`actionType` varchar(100) NOT NULL,
	`targetType` varchar(50) NOT NULL,
	`targetId` int NOT NULL,
	`before` text,
	`after` text,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `products` ADD `visible` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `admin_audit_logs` ADD CONSTRAINT `admin_audit_logs_adminUserId_users_id_fk` FOREIGN KEY (`adminUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;