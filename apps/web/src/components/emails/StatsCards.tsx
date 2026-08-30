import { useEffect, useRef, useState } from 'react';
import type { EmailStats, EmailStatus } from '../../types';

const cards = [
  { key: 'scheduled' as const, label: 'Scheduled', icon: '◷', color: 'blue', hint: 'Waiting in queue' },
  { key: 'processing' as const, label: 'Processing', icon: '↻', color: 'amber', hint: 'Sending right now' },
  { key: 'sent' as const, label: 'Sent', icon: '✓', color: 'emerald', hint: 'Delivered by SMTP' },
  { key: 'failed' as const, label: 'Failed', icon: '!', color: 'rose', hint: 'Needs attention' }
];

const colors: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
  rose: 'bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20'
};

const bars: Record<string, string> = {
  blue: 'bg-blue-500', amber: 'bg-amber-500', emerald: 'bg-emerald-500', rose: 'bg-rose-500'
};

function AnimatedNumber({ value }: { value: number }) {
  const previous = useRef(value);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const start = previous.current;
    const difference = value - start;
    const startedAt = performance.now();
    let frame = 0;
    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / 420, 1);
      setDisplay(Math.round(start + difference * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(animate);
      else previous.current = value;
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{display.toLocaleString()}</>;
}

export function StatsCards({ stats, onSelect }: { stats: EmailStats; onSelect?: (status: EmailStatus) => void }) {
  const total = Math.max(Object.values(stats).reduce((sum, value) => sum + value, 0), 1);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const percentage = Math.round((stats[card.key] / total) * 100);
        return (
          <button
            type="button"
            key={card.key}
            onClick={() => onSelect?.(card.key)}
            className="group rounded-2xl border border-white/70 bg-white/85 p-5 text-left shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1.5 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/60 dark:border-slate-800 dark:bg-slate-900/85 dark:hover:border-indigo-500/40 dark:hover:shadow-indigo-950/30"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{card.label}</p>
                <p className="mt-2 text-3xl font-black tracking-tight"><AnimatedNumber value={stats[card.key]} /></p>
              </div>
              <span className={`grid h-10 w-10 place-items-center rounded-xl text-lg font-bold ring-1 transition group-hover:scale-110 ${colors[card.color]}`}>{card.icon}</span>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className={`h-full rounded-full transition-all duration-700 ${bars[card.color]}`} style={{ width: `${Math.max(percentage, stats[card.key] ? 6 : 0)}%` }} />
            </div>
            <p className="mt-2 flex justify-between text-xs text-slate-500"><span>{card.hint}</span><span>{percentage}%</span></p>
          </button>
        );
      })}
    </div>
  );
}
