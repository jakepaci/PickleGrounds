import type { Player } from '../../../shared/types';
import { chunkIntoGroups } from './displayUtils';
import { DeckGroupCard } from './DeckGroupCard';

interface DeckSectionProps {
  stack: Player[];
}

export function DeckSection({ stack }: DeckSectionProps) {
  const groups = chunkIntoGroups(stack);
  const waitingCount = stack.length;

  return (
    <section className="shrink-0 border-t border-black/[0.08] px-8 xl:px-10 py-3 bg-[#E1DBD8] font-sans">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-xl xl:text-2xl font-extrabold text-black tracking-[-0.02em]">
            Next Up · The Deck
          </h2>
          <p className="text-sm font-medium text-black/45 mt-0.5">
            Groups play in order — watch for your name
          </p>
        </div>
        <div className="flex items-center gap-2 text-black/50">
          <UsersIcon />
          <span className="text-sm font-bold tabular-nums">
            {waitingCount} player{waitingCount !== 1 ? 's' : ''} waiting
          </span>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="flex items-center justify-center h-20 rounded-xl border-2 border-dashed border-black/12">
          <p className="text-base font-bold text-black/30">No groups in the deck yet</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-1">
          {groups.map((group, index) => (
            <DeckGroupCard
              key={group.map((p) => p.id).join('-') || index}
              players={group}
              index={index}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function UsersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}
