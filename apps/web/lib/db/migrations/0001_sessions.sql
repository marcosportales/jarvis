CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`created_at` integer NOT NULL,
	`last_activity_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sessions_last_activity` ON `sessions` (`last_activity_at`,`id`);--> statement-breakpoint
CREATE TABLE `turns` (
	`session_id` text NOT NULL,
	`position` integer NOT NULL,
	`owner_text` text NOT NULL,
	`reply_text` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`session_id`, `position`),
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
