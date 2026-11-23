CREATE TABLE `editions` (
	`slug` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`byline` text NOT NULL,
	`visibility` text DEFAULT 'draft' NOT NULL,
	`sponsor_name` text,
	`sponsor_url` text,
	`sponsor_copy` text,
	`checkout_url` text,
	`payment_link` text,
	`billing_key` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `editions_owner` ON `editions` (`owner`);--> statement-breakpoint
CREATE TABLE `members` (
	`edition` text NOT NULL,
	`email` text NOT NULL,
	`expires` integer,
	`subscription` text,
	`payment_link` text,
	`revoked` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`edition`, `email`),
	FOREIGN KEY (`edition`) REFERENCES `editions`(`slug`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`edition` text NOT NULL,
	`url` text NOT NULL,
	`label` text NOT NULL,
	`mode` text NOT NULL,
	`auto_links` integer NOT NULL,
	`next_check` integer DEFAULT 0 NOT NULL,
	`last_checked` integer,
	`status` text DEFAULT 'Waiting' NOT NULL,
	`etag` text,
	`modified` text,
	FOREIGN KEY (`edition`) REFERENCES `editions`(`slug`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `source_per_edition` ON `sources` (`edition`,`url`);--> statement-breakpoint
CREATE INDEX `sources_due` ON `sources` (`next_check`);--> statement-breakpoint
CREATE TABLE `stories` (
	`id` text PRIMARY KEY NOT NULL,
	`edition` text NOT NULL,
	`url` text NOT NULL,
	`source` text NOT NULL,
	`original_title` text NOT NULL,
	`evidence` text,
	`title` text NOT NULL,
	`note` text NOT NULL,
	`state` text NOT NULL,
	`source_date` text,
	`published_at` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`edition`) REFERENCES `editions`(`slug`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `story_per_edition` ON `stories` (`edition`,`url`);--> statement-breakpoint
CREATE INDEX `stories_edition_state` ON `stories` (`edition`,`state`,`published_at`);