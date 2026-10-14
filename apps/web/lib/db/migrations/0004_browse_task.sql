CREATE TABLE `browse_task` (
	`id` text PRIMARY KEY NOT NULL,
	`browser_session_id` text NOT NULL,
	`task` text NOT NULL,
	`start_url` text,
	`status` text NOT NULL,
	`current_goal` text,
	`current_url` text,
	`live_view_url` text,
	`screenshot_url` text,
	`last_step_seen` integer DEFAULT 0 NOT NULL,
	`outcome` text,
	`success` integer,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`checked_at` integer NOT NULL
);
