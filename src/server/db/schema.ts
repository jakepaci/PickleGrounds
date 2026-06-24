import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';

const skillCategories = ['Beginner', 'Novice', 'Intermediate', 'Expert'] as const;
const courtStatuses = ['Reserved', 'Occupied', 'Idle'] as const;
const reservationRates = ['regular', 'peak'] as const;

export const players = sqliteTable('players', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  skill: text('skill', { enum: skillCategories }).notNull(),
  paid: integer('paid', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const courts = sqliteTable('courts', {
  id: integer('id').primaryKey(),
  status: text('status', { enum: courtStatuses }).notNull().default('Idle'),
  reservationPaid: integer('reservation_paid', { mode: 'boolean' }).notNull().default(false),
  reservationRate: text('reservation_rate', { enum: reservationRates }),
  matchEndsAt: integer('match_ends_at', { mode: 'timestamp' }),
  timerPaused: integer('timer_paused', { mode: 'boolean' }).notNull().default(false),
  timerRemainingSeconds: integer('timer_remaining_seconds'),
});

export const courtPlayers = sqliteTable('court_players', {
  courtId: integer('court_id')
    .notNull()
    .references(() => courts.id),
  slot: integer('slot').notNull(),
  playerId: text('player_id').references(() => players.id),
});

export const stackQueue = sqliteTable(
  'stack_queue',
  {
    deckGroupId: text('deck_group_id').notNull(),
    deckGroupOrder: integer('deck_group_order').notNull(),
    deckSlot: integer('deck_slot').notNull(),
    playerId: text('player_id').references(() => players.id),
    groupId: text('group_id'),
  },
  (table) => [primaryKey({ columns: [table.deckGroupId, table.deckSlot] })],
);

export const finances = sqliteTable('finances', {
  id: integer('id').primaryKey(),
  totalIncome: real('total_income').notNull().default(0),
});

export const paymentEvents = sqliteTable('payment_events', {
  id: text('id').primaryKey(),
  amount: real('amount').notNull(),
  source: text('source', { enum: ['player', 'court_reservation'] }).notNull(),
  playerId: text('player_id').references(() => players.id),
  courtId: integer('court_id').references(() => courts.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
