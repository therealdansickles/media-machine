CREATE TABLE `private_mail` (
	`id` text PRIMARY KEY NOT NULL,
	`edition` text NOT NULL,
	`digest` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`received` integer NOT NULL,
	FOREIGN KEY (`edition`) REFERENCES `editions`(`slug`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mail_duplicate` ON `private_mail` (`edition`,`digest`);--> statement-breakpoint
CREATE INDEX `mail_received` ON `private_mail` (`edition`,`received`);--> statement-breakpoint
ALTER TABLE `editions` ADD `mail_alias` text;--> statement-breakpoint
ALTER TABLE `editions` ADD `mail_base` text;--> statement-breakpoint
ALTER TABLE `editions` ADD `mail_password_hash` text;--> statement-breakpoint
CREATE UNIQUE INDEX `editions_mail_alias` ON `editions` (`mail_alias`);