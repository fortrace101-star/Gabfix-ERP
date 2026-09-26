import type { ReactNode } from 'react';

export interface StatusBadgeProps {
  value: string;
  icon?: ReactNode;
}

/**
 * Maps a human-readable status string to a CSS tone class.
 * Tone logic mirrors the original admin App.tsx inline version (Phase 0a)
 * so the behaviour is preserved when extracted to a standalone component.
 *
 * Tones: success | danger | info | warning
 */
function toneFor(value: string): string {
  const v = value.toLowerCase();
  if ((v.includes('paid') && !v.includes('unpaid')) || ['Completed', 'Ready', 'Good'].includes(value))
    return 'success';
  if (v.includes('overdue') || v.includes('due') || value === 'Cancelled' || v.includes('unpaid'))
    return 'danger';
  if (['In Progress', 'Washing', 'Drying'].includes(value))
    return 'info';
  return 'warning';
}

export default function StatusBadge({ value, icon }: StatusBadgeProps) {
  return (
    <span className={`status ${toneFor(value)}`}>
      {icon ?? <i />}
      {value}
    </span>
  );
}
