import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { DialogHost } from './components/DialogHost';
import { DisplayView } from './views/DisplayView/DisplayView';
import { AdminView } from './views/AdminView/AdminView';

export function App() {
  return (
    <>
      <DialogHost />
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
    </>
  );
}
