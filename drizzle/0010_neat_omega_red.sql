ALTER TABLE `products` ADD `productCode` varchar(50);--> statement-breakpoint
ALTER TABLE `products` ADD `productStatus` enum('new','used','refurbished') DEFAULT 'new';--> statement-breakpoint
ALTER TABLE `products` ADD `summaryDescription` varchar(255);--> statement-breakpoint
ALTER TABLE `products` ADD `shortDescription` text;--> statement-breakpoint
ALTER TABLE `products` ADD `priceSupply` decimal(12,0);--> statement-breakpoint
ALTER TABLE `products` ADD `priceConsumerOriginal` decimal(12,0);--> statement-breakpoint
ALTER TABLE `products` ADD `taxType` enum('taxable','tax_free','exempt') DEFAULT 'taxable';--> statement-breakpoint
ALTER TABLE `products` ADD `taxRate` decimal(5,2) DEFAULT '10.00';--> statement-breakpoint
ALTER TABLE `products` ADD `shippingType` enum('direct','warehouse','other') DEFAULT 'direct';--> statement-breakpoint
ALTER TABLE `products` ADD `weight` decimal(8,2) DEFAULT '1.00';--> statement-breakpoint
ALTER TABLE `products` ADD `manufacturer` varchar(100);--> statement-breakpoint
ALTER TABLE `products` ADD `brand` varchar(100);--> statement-breakpoint
ALTER TABLE `products` ADD `origin` varchar(100);--> statement-breakpoint
ALTER TABLE `products` ADD `seoTitle` varchar(200);--> statement-breakpoint
ALTER TABLE `products` ADD `seoDescription` text;--> statement-breakpoint
ALTER TABLE `products` ADD `seoKeywords` varchar(500);--> statement-breakpoint
ALTER TABLE `products` ADD `seoImageAlt` varchar(200);--> statement-breakpoint
ALTER TABLE `products` ADD `adminMemo` text;--> statement-breakpoint
ALTER TABLE `products` ADD `thumbnailUrl` text;--> statement-breakpoint
ALTER TABLE `products` ADD `detailPageUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `products` ADD `sortOrder` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `products` ADD `isRecommended` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `isNew` boolean DEFAULT false NOT NULL;