CREATE TABLE `installed_plugins` (
	`plugin_id` text PRIMARY KEY NOT NULL,
	`installed_at` integer NOT NULL,
	`connected` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plugin_tokens` (
	`plugin_id` text PRIMARY KEY NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text,
	`expires_at` integer,
	FOREIGN KEY (`plugin_id`) REFERENCES `installed_plugins`(`plugin_id`) ON UPDATE no action ON DELETE cascade
);
