import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { DialogHost } from './components/DialogHost';

const DisplayView = lazy(() =>
  import('./views/DisplayView/DisplayView').then((m) => ({ default: m.DisplayView })),
);
const AdminView = lazy(() =>
  import('./views/AdminView/AdminView').then((m) => ({ default: m.AdminView })),
);

function RouteFallback() {
  return (
    <div className="min-h-screen bg-pickle-cream text-black font-sans flex items-center justify-center">
      <p className="text-sm font-medium text-black/50">Loading…</p>
    </div>
  );
}

export function App() {
  return (
    <>
      <DialogHost />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/display" replace />} />
          <Route path="/display" element={<DisplayView />} />
          <Route path="/admin" element={<AdminView />} />
          <Route
            path="*"
            element={
              <div className="min-h-screen bg-pickle-cream text-black font-sans flex flex-col items-center justify-center gap-4">
                <p className="text-xl font-semibold">Page not found</p>
                <div className="flex gap-4">
                  <Link to="/display" className="text-pickle-green font-semibold underline">
                    Display
                  </Link>
                  <Link to="/admin" className="text-pickle-orange font-semibold underline">
                    Admin
                  </Link>
                </div>
              </div>
            }
          />
        </Routes>
      </Suspense>
    </>
  );
}
