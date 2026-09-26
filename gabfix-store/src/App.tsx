// Gabfix Store — scaffold shell
import { LayoutDashboard } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import StatusBadge from '@/components/StatusBadge';

export default function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-surface text-ink flex items-center justify-center">
      <div className="text-center">
        <LayoutDashboard className="mx-auto h-12 w-12 text-brand" />
        <h1 className="mt-4 text-2xl font-semibold">Gabfix Store</h1>
        <p className="mt-2 text-sm text-muted">App scaffold — routes will be added in later phases.</p>
        <div className="mt-4 flex items-center justify-center gap-3 text-xs">
          <button
            onClick={toggleTheme}
            className="rounded-full border border-line px-3 py-1 transition-colors hover:bg-surface"
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
          <StatusBadge value="Good" />
          <StatusBadge value="Low Stock" />
          <StatusBadge value="Due" />
        </div>
      </div>
    </div>
  );
}
