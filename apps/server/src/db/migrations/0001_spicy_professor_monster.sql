CREATE TABLE `setup_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `setup_tokens_token_hash_unique` ON `setup_tokens` (`token_hash`);--> statement-breakpoint
ALTER TABLE `owners` ADD `failed_login_attempts` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `owners` ADD `locked_until` integer;