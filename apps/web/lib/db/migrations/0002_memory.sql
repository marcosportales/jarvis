CREATE TABLE `memories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`topic_key` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`source_session_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`source_session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `memories_topic_key_unique` ON `memories` (`topic_key`);--> statement-breakpoint
ALTER TABLE `turns` ADD `memory_events` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
-- Search over Memories; remove_diacritics makes "Lucia" find "Lucía".
CREATE VIRTUAL TABLE `memories_fts` USING fts5(
	title,
	content,
	content='memories',
	content_rowid='id',
	tokenize='unicode61 remove_diacritics 2'
);
--> statement-breakpoint
CREATE TRIGGER `memories_fts_insert` AFTER INSERT ON `memories` BEGIN
	INSERT INTO memories_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;
--> statement-breakpoint
CREATE TRIGGER `memories_fts_delete` AFTER DELETE ON `memories` BEGIN
	INSERT INTO memories_fts(memories_fts, rowid, title, content) VALUES ('delete', old.id, old.title, old.content);
END;
--> statement-breakpoint
CREATE TRIGGER `memories_fts_update` AFTER UPDATE ON `memories` BEGIN
	INSERT INTO memories_fts(memories_fts, rowid, title, content) VALUES ('delete', old.id, old.title, old.content);
	INSERT INTO memories_fts(rowid, title, content) VALUES (new.id, new.title, new.content);
END;
