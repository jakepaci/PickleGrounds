import type { Court } from '../../../shared/types';
import { MATCH_DURATION_MS } from '../../../shared/constants';
import { CourtVisualizer, FLOOR_CLIP } from './CourtVisualizer';
import { formatTime } from './displayUtils';

interface CourtsArenaProps {
  courts: (Court | null)[];
}

/** Labels sit on cream above the trapezoid; courts live inside the green board only. */
export function CourtsArena({ courts }: CourtsArenaProps) {
  return (
    <main className="flex-1 min-h-0 px-2 sm:px-3 pb-2 bg-[#E1DBD8] flex flex-col font-sans">
      <div className="flex-1 min-h-0 flex flex-col [filter:drop-shadow(0_14px_36px_rgba(0,0,0,0.14))]">
        {/* Court names — outside trapezoid, aligned to column centers */}
        <div
          className="shrink-0 grid grid-cols-3 mb-1.5"
          style={{ paddingInline: '2.5%' }}
        >
          {courts.map((court, i) => (
            <CourtLabel
              key={court?.id ?? i}
              courtNumber={court?.id ?? ((i + 1) as 1 | 2 | 3)}
            />
          ))}
        </div>

        {/* Green trapezoid — courts fill full width AND height */}
        <div
          className="flex-1 min-h-0 bg-[#0FAF52] flex flex-col px-[0.75%] py-[1%]"
          style={{ clipPath: FLOOR_CLIP }}
        >
          <div className="flex-1 min-h-0 w-full grid grid-cols-3 items-stretch">
            {courts.map((court, i) =>
              court ? (
                <CourtGraphic key={court.id} court={court} />
              ) : (
                <CourtGraphicPlaceholder key={i} />
              ),
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function CourtLabel({ courtNumber }: { courtNumber: 1 | 2 | 3 }) {
  return (
    <h2 className="text-center font-semibold uppercase tracking-[0.14em] text-black text-[clamp(0.85rem,1.6vw,1.45rem)] leading-none">
      Court {courtNumber}
    </h2>
  );
}

function CourtGraphic({ court }: { court: Court }) {
  const isOccupied = court.status === 'Occupied';
  const timerStarted = court.timerStarted;
  const display =
    isOccupied && timerStarted
      ? formatTime(court.secondsRemaining)
      : isOccupied
        ? `${formatTime(MATCH_DURATION_MS / 1000)} · READY`
        : '15:00';

  return (
    <div className="h-full min-h-0 w-full min-w-0 px-[1.5%] flex flex-col">
      <CourtVisualizer
        players={court.players}
        timer={court.timerPaused ? `${formatTime(court.secondsRemaining)} · PAUSED` : display}
        className="block w-full h-full flex-1 min-h-0"
      />
    </div>
  );
}

function CourtGraphicPlaceholder() {
  return (
    <div className="h-full min-h-0 w-full min-w-0 px-[1.5%] opacity-40">
      <div className="w-full h-full min-h-[8rem] border-2 border-dashed border-white/25" />
    </div>
  );
}
