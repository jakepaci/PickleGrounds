import type { Player } from '../../../shared/types';
import { PLAYERS_PER_COURT } from '../../../shared/constants';

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function chunkIntoGroups(players: Player[], size = PLAYERS_PER_COURT): Player[][] {
  const groups: Player[][] = [];
  for (let i = 0; i < players.length; i += size) {
    groups.push(players.slice(i, i + size));
  }
  return groups;
}

export function deckGroupLabel(index: number): string {
  if (index === 0) return 'Next Up';
  if (index === 1) return 'On Deck';
  return `Group ${index + 1}`;
}
