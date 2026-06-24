import { useRealtimeState } from '../../hooks/useRealtimeState';
import { useAppStore } from '../../store/appStore';
import { DisplayHeader } from './DisplayHeader';
import { CourtsArena } from './CourtsArena';
import { DeckSection } from './DeckSection';

export function DisplayView() {
  useRealtimeState();
  const { courts, stack, stackGroups } = useAppStore((s) => s.state);
  const connected = useAppStore((s) => s.connected);

  const activeCourts = courts.filter(
    (c) => c.status === 'Occupied' || c.status === 'Reserved',
  ).length;
  const deckGroups = stackGroups.filter((g) => g.slots.some((p) => p != null)).length;

  const courtSlots = ([1, 2, 3] as const).map(
    (id) => courts.find((c) => c.id === id) ?? null,
  );

  return (
    <div className="h-screen flex flex-col bg-[#E1DBD8] text-black overflow-hidden font-sans antialiased">
      <DisplayHeader
        activeCourts={activeCourts}
        deckGroups={deckGroups}
        connected={connected}
      />

      <CourtsArena courts={courtSlots} />

      <DeckSection stackGroups={stackGroups} waitingCount={stack.length} />
    </div>
  );
}
