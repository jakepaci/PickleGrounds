ALTER TABLE `courts` ADD `timer_paused` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `courts` ADD `timer_remaining_seconds` integer;