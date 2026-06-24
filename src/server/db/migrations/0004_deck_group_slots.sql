CREATE TABLE `stack_queue_new` (
	`deck_group_id` text NOT NULL,
	`deck_group_order` integer NOT NULL,
	`deck_slot` integer NOT NULL,
	`player_id` text,
	`group_id` text,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE no action,
	PRIMARY KEY(`deck_group_id`, `deck_slot`)
);
--> statement-breakpoint
INSERT INTO `stack_queue_new` (`deck_group_id`, `deck_group_order`, `deck_slot`, `player_id`, `group_id`)
SELECT
	'dg_' || (`position` / 4),
	`position` / 4,
	`position` % 4,
	`player_id`,
	`group_id`
FROM `stack_queue`;
--> statement-breakpoint
DROP TABLE `stack_queue`;
--> statement-breakpoint
ALTER TABLE `stack_queue_new` RENAME TO `stack_queue`;
