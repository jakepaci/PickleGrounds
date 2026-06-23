CREATE TABLE `court_players` (
	`court_id` integer NOT NULL,
	`slot` integer NOT NULL,
	`player_id` text,
	FOREIGN KEY (`court_id`) REFERENCES `courts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `courts` (
	`id` integer PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'Idle' NOT NULL,
	`reservation_paid` integer DEFAULT false NOT NULL,
	`match_ends_at` integer
);
--> statement-breakpoint
CREATE TABLE `finances` (
	`id` integer PRIMARY KEY NOT NULL,
	`total_income` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payment_events` (
	`id` text PRIMARY KEY NOT NULL,
	`amount` real NOT NULL,
	`source` text NOT NULL,
	`player_id` text,
	`court_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`court_id`) REFERENCES `courts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`skill` text NOT NULL,
	`paid` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stack_queue` (
	`position` integer PRIMARY KEY NOT NULL,
	`player_id` text NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action
);
