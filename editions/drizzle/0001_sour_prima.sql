ALTER TABLE `editions` ADD `draft_key` text;--> statement-breakpoint
ALTER TABLE `editions` ADD `draft_limit` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `editions` ADD `draft_day` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `editions` ADD `drafts_used` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `stories` ADD `automation` text;