import { MATCH_DURATION_MS } from '../../../shared/constants';

interface DisplayHeaderProps {
  activeCourts: number;
  deckGroups: number;
  connected: boolean;
}

export function DisplayHeader({ activeCourts, deckGroups, connected }: DisplayHeaderProps) {
  return (
    <header className="shrink-0 flex items-end justify-between gap-8 px-10 pt-5 pb-3 bg-[#E1DBD8] font-sans">
      <div>
        <p className="text-[#EE6E2B] text-[11px] font-semibold uppercase tracking-[0.3em] mb-1.5 font-sans">
          Open Play · Live
        </p>
        <h1 className="font-display text-[2.75rem] xl:text-[3.25rem] 2xl:text-[3.75rem] font-black text-[#0FAF52] tracking-tighter leading-[0.92]">
          The Pickle Grounds
        </h1>
      </div>

      <div className="flex items-center gap-10 xl:gap-12">
        <Stat label="Courts" value={`${activeCourts}/3 active`} />
        <Stat label="In the Deck" value={`${deckGroups} group${deckGroups !== 1 ? 's' : ''}`} />
        <Stat label="Max court time" value={`${MATCH_DURATION_MS / 60_000}:00`} />
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] ${
            connected
              ? 'bg-[#0FAF52]/15 text-[#0FAF52]'
              : 'bg-red-100 text-red-600 animate-pulse'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-[#0FAF52]' : 'bg-red-500'}`} />
          {connected ? 'Live' : 'Reconnecting'}
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right hidden sm:block">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40 mb-0.5">
        {label}
      </p>
      <p className="text-lg xl:text-xl font-bold text-black tabular-nums">{value}</p>
    </div>
  );
}
