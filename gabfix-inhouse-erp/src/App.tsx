// Gabfix Portal — scaffold shell
import { LayoutDashboard } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-surface text-ink flex items-center justify-center">
      <div className="text-center">
        <LayoutDashboard className="mx-auto h-12 w-12 text-brand" />
        <h1 className="mt-4 text-2xl font-semibold">Gabfix Portal</h1>
        <p className="mt-2 text-sm text-muted">App scaffold — routes will be added in later phases.</p>
      </div>
    </div>
  );
}