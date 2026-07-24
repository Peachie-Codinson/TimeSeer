CREATE TABLE `activity_log` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`detail_json` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `archive_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`task_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `areas` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`color` text,
	`icon` text,
	`starts_at` integer,
	`ends_at` integer,
	`active` integer DEFAULT 1 NOT NULL,
	`external_source` text,
	`external_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `event_exceptions` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`original_start` integer NOT NULL,
	`kind` text NOT NULL,
	`replacement_start` integer,
	`replacement_end` integer,
	`override_json` text,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`area_id` text,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`timezone` text NOT NULL,
	`all_day` integer DEFAULT 0 NOT NULL,
	`recurrence_rule` text,
	`location_name` text,
	`location_url` text,
	`meeting_url` text,
	`travel_minutes` integer,
	`preparation_minutes` integer,
	`locked` integer DEFAULT 1 NOT NULL,
	`external_source` text,
	`external_id` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `owners` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`timezone` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `owners_email_unique` ON `owners` (`email`);--> statement-breakpoint
CREATE TABLE `quotas` (
	`id` text PRIMARY KEY NOT NULL,
	`scope_type` text NOT NULL,
	`scope_id` text,
	`period` text NOT NULL,
	`weekday` integer,
	`minimum_minutes` integer,
	`target_minutes` integer,
	`maximum_minutes` integer,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scheduled_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`run_at` integer NOT NULL,
	`payload_json` text,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` integer,
	`last_error` text,
	`created_at` integer NOT NULL,
	`completed_at` integer
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`device_name` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash_unique` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE TABLE `task_resolutions` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`resolved_at` integer NOT NULL,
	`notes` text,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`issue_number` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`state` text NOT NULL,
	`area_id` text,
	`priority` integer DEFAULT 0 NOT NULL,
	`position` integer NOT NULL,
	`earliest_start` integer,
	`preferred_start` integer,
	`preferred_end` integer,
	`soft_deadline` integer,
	`hard_deadline` integer,
	`estimated_minutes` integer,
	`remaining_minutes` integer,
	`session_minutes` integer,
	`is_splittable` integer DEFAULT 1 NOT NULL,
	`scheduling_mode` text DEFAULT 'suggested' NOT NULL,
	`progress_percent` integer DEFAULT 0 NOT NULL,
	`blocked_reason` text,
	`archive_protected` integer DEFAULT 0 NOT NULL,
	`resolved_at` integer,
	`archived_at` integer,
	`archive_batch_id` text,
	`external_source` text,
	`external_id` text,
	`external_url` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_issue_number_unique` ON `tasks` (`issue_number`);--> statement-breakpoint
CREATE TABLE `work_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`planned_minutes` integer NOT NULL,
	`actual_minutes` integer,
	`status` text NOT NULL,
	`locked` integer DEFAULT 0 NOT NULL,
	`automatically_added` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE no action
);
