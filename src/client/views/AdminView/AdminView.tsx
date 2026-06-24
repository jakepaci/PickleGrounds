import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useRealtimeState } from '../../hooks/useRealtimeState';
import { useAppStore } from '../../store/appStore';
import { PlayerPanel } from './PlayerPanel';
import { CourtPanel } from './CourtPanel';
import { StackPanel } from './StackPanel';
import { StartSessionDialog } from './StartSessionDialog';

export function AdminView() {
  useRealtimeState();
  const connected = useAppStore((s) => s.connected);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-pickle-cream text-black font-sans antialiased">
      <header className="border-b border-black/10 px-4 py-4 flex items-center justify-between sticky top-0 bg-pickle-cream/95 backdrop-blur z-10">
        <div>
          <p className="text-pickle-orange text-[11px] font-semibold uppercase tracking-[0.25em] mb-1">
            Facility Management
          </p>
          <h1 className="font-display text-2xl font-black text-pickle-green tracking-tight leading-none">
            Picklegrounds Admin
          </h1>
          <p className="text-xs text-black/45 mt-1">Manage courts &amp; players</p>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <button
            type="button"
            onClick={() => setSessionDialogOpen(true)}
            className="text-xs px-3 py-1.5 rounded border border-black/15 bg-white hover:bg-black/5 font-semibold text-black/70"
          >
            Start new session
          </button>
          <span
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              connected
                ? 'bg-pickle-green/15 text-pickle-green'
                : 'bg-red-100 text-red-600 animate-pulse'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-pickle-green' : 'bg-red-500'}`} />
            {connected ? 'Live' : 'Offline'}
          </span>
          <Link
            to="/display"
            target="_blank"
            className="text-pickle-orange hover:text-pickle-orange/80 font-semibold underline underline-offset-2"
          >
            Open Display ↗
          </Link>
        </div>
      </header>

      <StartSessionDialog open={sessionDialogOpen} onClose={() => setSessionDialogOpen(false)} />

      <main className="p-4 grid grid-cols-1 xl:grid-cols-2 gap-4 max-w-[1600px] mx-auto xl:items-stretch">
        <PlayerPanel />
        <div className="flex flex-col min-h-0 xl:h-full">
          <StackPanel />
        </div>
        <div className="xl:col-span-2">
          <CourtPanel />
        </div>
      </main>
    </div>
  );
}
